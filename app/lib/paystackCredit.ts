import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin";

// Shared by the browser-triggered verify route and the Paystack webhook, so
// both paths credit a payment in exactly the same (idempotent) way.

export type CreditResult =
  | { ok: true; credited: boolean; uid: string; amount: number }
  | { ok: false; status: number; error: string };

export async function creditPaystackPayment(
  reference: string,
  opts: { expectedUid?: string } = {}
): Promise<CreditResult> {
  // 1. Ask Paystack directly. Nothing from the browser or the webhook body is
  //    trusted for the amount, status or payer.
  let res: Response;
  try {
    res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        cache: "no-store",
      }
    );
  } catch {
    return { ok: false, status: 502, error: "Couldn't reach Paystack" };
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // fall through — handled below
  }

  if (!res.ok || !body?.data) {
    return {
      ok: false,
      status: res.status >= 500 ? 502 : 400,
      error: "Payment verification failed",
    };
  }

  const data = body.data;
  if (data.status !== "success") {
    return { ok: false, status: 400, error: "Payment was not successful" };
  }
  if (data.currency !== "NGN") {
    return { ok: false, status: 400, error: "Unsupported currency" };
  }

  // Paystack amounts are in kobo
  const amount = Number(data.amount) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 400, error: "Invalid payment amount" };
  }

  // Paystack's own fee on this payment (also in kobo). Saved so the admin
  // dashboard can subtract it when working out net profit.
  const rawFee = Number(data.fees) / 100;
  const paystackFee = Number.isFinite(rawFee) && rawFee >= 0 ? rawFee : 0;

  // 2. Work out whose payment it is from the email Paystack recorded. The
  //    deposits page always pays with the signed-in user's own email.
  const email = String(data.customer?.email || "").trim().toLowerCase();
  if (!email) {
    return { ok: false, status: 400, error: "Payment has no customer email" };
  }

  let uid: string;
  try {
    uid = (await adminAuth.getUserByEmail(email)).uid;
  } catch (err: any) {
    if (err?.code === "auth/user-not-found") {
      console.error("Paystack payment with no matching account:", reference, email);
      return { ok: false, status: 404, error: "No account matches this payment" };
    }
    return { ok: false, status: 502, error: "Couldn't look up the account" };
  }

  if (opts.expectedUid && opts.expectedUid !== uid) {
    return {
      ok: false,
      status: 403,
      error: "This payment belongs to a different account",
    };
  }

  // 3. Credit once. A global claim doc keyed by the Paystack reference stops
  //    the same payment being credited to more than one account; the
  //    per-user transaction doc keeps older, already-credited payments safe.
  const userRef = adminDb.collection("users").doc(uid);
  const txRef = userRef.collection("transactions").doc(reference);
  const claimRef = adminDb.collection("paystackPayments").doc(reference);

  const credited = await adminDb.runTransaction(async (t) => {
    const claim = await t.get(claimRef);
    const existing = await t.get(txRef);
    if (claim.exists || existing.exists) return false;

    t.set(claimRef, {
      uid,
      amount,
      paystackFee,
      email,
      claimedAt: FieldValue.serverTimestamp(),
    });
    t.set(txRef, {
      kind: "credit",
      status: "ok",
      method: "Paystack",
      amount,
      paystackFee,
      reference,
      completed: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    t.set(
      userRef,
      { walletBalance: FieldValue.increment(amount) },
      { merge: true }
    );
    return true;
  });

  return { ok: true, credited, uid, amount };
}
