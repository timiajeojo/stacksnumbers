import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { creditPaystackPayment } from "../../../lib/paystackCredit";

export const runtime = "nodejs";

// Paystack calls this itself after a successful charge, so the wallet still
// gets credited if the customer closes the tab or loses signal mid-payment.
// Set it as the "Live Webhook URL" in Paystack → Settings → API Keys & Webhooks.
export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // The signature is an HMAC-SHA512 of the exact raw body, so read it as text.
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");

  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only successful charges matter here; acknowledge everything else.
  if (event?.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference = event?.data?.reference;
  if (typeof reference !== "string" || !reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    // Re-verifies with Paystack's API rather than trusting the webhook body.
    const result = await creditPaystackPayment(reference);

    if (!result.ok) {
      console.error("Paystack webhook could not credit:", reference, result.error);
      // Temporary failures (Paystack/Firebase unreachable) → 500 so Paystack
      // retries. Permanent ones (unknown email, wrong currency) → 200 so it
      // stops; they're logged above for manual follow-up.
      if (result.status >= 500) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ received: true, credited: false });
    }

    return NextResponse.json({ received: true, credited: result.credited });
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
