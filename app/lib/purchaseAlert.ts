import { adminAuth, adminDb } from "./firebaseAdmin";

// Emails the admin whenever a customer buys something.
//
// Sent through Resend's HTTP API with plain fetch, so there's nothing to
// install. Set these in your environment (Vercel → Settings → Environment
// Variables):
//   RESEND_API_KEY      API key from resend.com
//   ADMIN_ALERT_EMAIL   where the alerts go (comma-separate for several)
//   ALERT_FROM_EMAIL    optional sender, e.g. "Stacks Numbers <alerts@yourdomain.com>".
//                       Defaults to Resend's test sender, which can only deliver
//                       to the email you signed up to Resend with. Verify your own
//                       domain in Resend to send to any address.
//
// A failure here is logged and swallowed: an email problem must never break a
// customer's purchase.

export type PurchaseAlert = {
  uid: string;
  product: string; // e.g. "WhatsApp Number"
  country: string;
  purchaseAmount: number; // what the customer paid (₦)
  smspoolCost: number; // what SMSPool charged us (₦)
  previousBalance: number; // wallet before the purchase (₦)
};

const r2 = (n: number) => Math.round(n * 100) / 100;

function naira(n: number): string {
  return `₦${r2(n).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

async function customerEmail(uid: string): Promise<string> {
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    const fromDoc = String(snap.data()?.email || "").trim();
    if (fromDoc) return fromDoc;
  } catch {
    // fall through to Firebase Auth
  }
  try {
    return (await adminAuth.getUser(uid)).email || "Unknown";
  } catch {
    return "Unknown";
  }
}

export async function sendPurchaseAlert(p: PurchaseAlert): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const to = (process.env.ADMIN_ALERT_EMAIL || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!apiKey || to.length === 0) {
      console.warn(
        "Purchase alert skipped: RESEND_API_KEY or ADMIN_ALERT_EMAIL is not set"
      );
      return;
    }

    const email = await customerEmail(p.uid);
    const profit = r2(p.purchaseAmount - p.smspoolCost);
    const remaining = r2(p.previousBalance - p.purchaseAmount);

    const text = [
      "NEW PURCHASE ALERT",
      "",
      "A customer has just purchased a number on your website.",
      "",
      "Purchase Details:",
      "",
      `- Customer: ${email}`,
      `- Product: ${p.product}`,
      `- Country: ${p.country || "Unknown"}`,
      `- Purchase Amount: ${naira(p.purchaseAmount)}`,
      `- Actual SMSPool Cost: ${naira(p.smspoolCost)}`,
      `- Gross Profit: ${naira(profit)}`,
      "",
      "Wallet Details:",
      "",
      `- Previous Wallet Balance: ${naira(p.previousBalance)}`,
      `- Amount Deducted: ${naira(p.purchaseAmount)}`,
      `- Remaining Wallet Balance: ${naira(remaining)}`,
      "",
      "Transaction Status: Successful",
      "",
      "Check your admin dashboard for more details.",
    ].join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.ALERT_FROM_EMAIL ||
          "Stacks Numbers <onboarding@resend.dev>",
        to,
        subject: `New purchase: ${p.product} (${naira(p.purchaseAmount)})`,
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(
        "Purchase alert email failed:",
        res.status,
        (await res.text()).slice(0, 300)
      );
    }
  } catch (err) {
    console.error("Purchase alert email error:", err);
  }
}
