import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../lib/firebaseAdmin";
import { verifyRequestUser } from "../../../lib/verifyAuth";
import { smspoolFetch } from "../../../lib/smspool";
import { usdToNgn } from "../../../lib/pricing";

// One-time verification number purchase (what the Buy Number page calls).
// Body: { country: "<id>", service: "<id>" }
//
// Order of operations is chosen so users are never charged for a number they
// didn't get, and can't spend the same balance twice:
//   1. price it server-side (never trust a price from the browser)
//   2. take the money from the wallet inside a transaction
//   3. buy the number from SMSPool
//   4. if that fails for any reason, put the money back

type RawPricing = { pool: number | string; price: string | number };

export async function POST(req: NextRequest) {
  const uid = await verifyRequestUser(req);
  if (!uid) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let country = "";
  let service = "";
  try {
    const body = await req.json();
    country = String(body?.country ?? "");
    service = String(body?.service ?? "");
  } catch {
    // handled by the check below
  }
  if (!/^\d+$/.test(country) || !/^\d+$/.test(service)) {
    return NextResponse.json(
      { error: "country and service are required" },
      { status: 400 }
    );
  }

  const userRef = adminDb.collection("users").doc(uid);

  // 1. Price it
  let pool: string;
  let costNaira: number;
  try {
    const { ok, data } = await smspoolFetch("/request/pricing", {
      country,
      service,
    });
    if (!ok || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "No numbers available for this country/service" },
        { status: 404 }
      );
    }
    // Same rule as the pricing route the page uses: cheapest pool wins
    const cheapest = (data as RawPricing[]).reduce((min, p) =>
      Number(p.price) < Number(min.price) ? p : min
    );
    const usdPrice = Number(cheapest.price);
    if (!Number.isFinite(usdPrice) || usdPrice <= 0) {
      return NextResponse.json(
        { error: "Couldn't price this number. Please try again." },
        { status: 502 }
      );
    }
    pool = String(cheapest.pool);
    costNaira = Math.ceil(usdToNgn(usdPrice));
  } catch (err) {
    console.error("SMSPool purchase pricing error:", err);
    return NextResponse.json(
      { error: "Server error pricing this number" },
      { status: 500 }
    );
  }

  // 2. Take the money (balance check and deduction in one transaction)
  try {
    await adminDb.runTransaction(async (t) => {
      const snap = await t.get(userRef);
      const balance = snap.exists ? Number(snap.data()?.walletBalance || 0) : 0;
      if (balance < costNaira) {
        throw Object.assign(new Error("Insufficient wallet balance"), {
          code: "INSUFFICIENT",
        });
      }
      t.set(
        userRef,
        { walletBalance: FieldValue.increment(-costNaira) },
        { merge: true }
      );
    });
  } catch (err: any) {
    if (err?.code === "INSUFFICIENT") {
      return NextResponse.json(
        { error: "Insufficient wallet balance" },
        { status: 400 }
      );
    }
    console.error("Wallet deduction error:", err);
    return NextResponse.json(
      { error: "Server error placing order" },
      { status: 500 }
    );
  }

  async function refund(reason: string) {
    try {
      await userRef.set(
        { walletBalance: FieldValue.increment(costNaira) },
        { merge: true }
      );
    } catch (err) {
      // Needs manual follow-up: the user was charged and not refunded.
      console.error("REFUND FAILED", { uid, costNaira, reason }, err);
    }
  }

  // 3. Buy the number
  let order: any;
  try {
    const buyRes = await smspoolFetch("/purchase/sms", {
      country,
      service,
      pool,
    });
    const ok =
      buyRes.ok &&
      buyRes.data &&
      Number(buyRes.data.success) === 1 &&
      buyRes.data.order_id;

    if (!ok) {
      await refund("smspool refused");
      const message = String(buyRes.data?.message || "").slice(0, 200);
      return NextResponse.json(
        {
          error:
            message ||
            "Couldn't get a number right now. Please try another country or service. You haven't been charged.",
        },
        { status: 422 }
      );
    }
    order = buyRes.data;
  } catch (err) {
    console.error("SMSPool purchase error:", err);
    await refund("smspool unreachable");
    return NextResponse.json(
      {
        error:
          "Couldn't reach the number provider. You haven't been charged. Please try again.",
      },
      { status: 502 }
    );
  }

  // 4. Save the order so it shows up on the Verifications page
  const orderId = String(order.order_id);
  const expiresIn = Number(order.expires_in);
  const expiresAt =
    Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 600) * 1000;
  const serviceName = String(order.service || "Service");

  try {
    const batch = adminDb.batch();
    batch.set(userRef.collection("rentals").doc(orderId), {
      number: String(order.number ?? ""),
      country: String(order.country || ""),
      countryCode: "",
      service: serviceName,
      status: "waiting",
      otpsReceived: 0,
      lastCode: null,
      costNaira, // used to refund the wallet if SMSPool later refunds the order
      expiresAt,
      purchasedAt: FieldValue.serverTimestamp(),
    });
    batch.set(userRef.collection("transactions").doc(`order_${orderId}`), {
      kind: "debit",
      status: "ok",
      method: `Number rental - ${serviceName}`,
      amount: costNaira,
      orderId,
      completed: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    // The number was bought and the wallet charged, but we couldn't record it.
    console.error("CHARGED BUT NOT SAVED", { uid, orderId, number: order.number, costNaira }, err);
    return NextResponse.json(
      {
        error: `Your number was bought but couldn't be saved. Please contact support with order ID ${orderId}.`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, orderId });
}
