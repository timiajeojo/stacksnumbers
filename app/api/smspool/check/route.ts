import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import { verifyRequestUser } from "../../../lib/verifyAuth";
import { smspoolFetch } from "../../../lib/smspool";
import { FieldValue } from "firebase-admin/firestore";

// Called by the Verifications page every ~25s for orders still "waiting".
//
// Possible outcomes for a waiting order:
//   - code arrived                       -> "received"
//   - SMSPool refunded the order         -> user's wallet refunded
//   - time ran out and no code arrived   -> user's wallet refunded
//   - anything else                      -> stays "waiting"
//
// Every outcome is applied inside ONE transaction that re-reads the order, so
// overlapping checks (two tabs, two devices, retries) can never both win:
// an order ends up received OR refunded, once, never both.

export async function GET(req: NextRequest) {
  const uid = await verifyRequestUser(req);
  if (!uid) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const rentalId = req.nextUrl.searchParams.get("rentalId");
  if (!rentalId) {
    return NextResponse.json({ error: "rentalId is required" }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  const rentalRef = userRef.collection("rentals").doc(rentalId);

  try {
    const snap = await rentalRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }
    const rental = snap.data()!;

    // Only "waiting" orders can change. received / refunded / expired are final.
    if (rental.status !== "waiting") {
      return NextResponse.json({ status: rental.status });
    }

    const { ok, data } = await smspoolFetch("/sms/check", {
      orderid: rentalId,
    });
    // null = we couldn't get a trustworthy answer from SMSPool this time
    const providerStatus: number | null =
      ok && data && data.status !== undefined && data.status !== null
        ? Number(data.status)
        : null;

    const timedOut = !!rental.expiresAt && Date.now() > rental.expiresAt;

    let outcome: "received" | "refunded" | null = null;
    if (providerStatus === 3) {
      outcome = "received"; // a code always wins, even right at expiry
    } else if (providerStatus === 6) {
      outcome = "refunded"; // SMSPool refunded the order
    } else if (timedOut && providerStatus !== null) {
      // Time is up and SMSPool (reachable) says no code. Don't refund on a
      // failed lookup: we couldn't rule out a code, so just try again later.
      outcome = "refunded";
    }

    if (!outcome) {
      return NextResponse.json({ status: "waiting" });
    }

    const result = await adminDb.runTransaction(async (t) => {
      const fresh = await t.get(rentalRef);
      const current = fresh.data();
      if (!current) return { status: "waiting" };
      if (current.status !== "waiting") return { status: current.status as string };

      if (outcome === "received") {
        t.set(
          rentalRef,
          {
            status: "received",
            lastCode: data.sms || null,
            lastSmsText: data.full_sms || null,
            otpsReceived: FieldValue.increment(1),
          },
          { merge: true }
        );
        return { status: "received" };
      }

      const amount = Number(current.costNaira) || 0;
      t.set(
        rentalRef,
        {
          status: "refunded",
          refundedAt: FieldValue.serverTimestamp(),
          refundReason: providerStatus === 6 ? "provider_refund" : "no_code",
        },
        { merge: true }
      );
      if (amount > 0) {
        t.set(
          userRef,
          { walletBalance: FieldValue.increment(amount) },
          { merge: true }
        );
        // Shows up in the user's wallet history next to their other entries
        t.set(userRef.collection("transactions").doc(`refund_${rentalId}`), {
          kind: "credit",
          status: "ok",
          method: `Refund - ${current.service || "number"}`,
          amount,
          orderId: rentalId,
          completed: true,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      return { status: "refunded" };
    });

    if (result.status === "received") {
      return NextResponse.json({ status: "received", code: data.sms });
    }
    return NextResponse.json({ status: result.status });
  } catch (err: any) {
    console.error("SMSPool check error:", err);
    return NextResponse.json(
      { error: "Server error checking status" },
      { status: 500 }
    );
  }
}
