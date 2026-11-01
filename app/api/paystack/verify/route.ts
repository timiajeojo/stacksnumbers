import { NextRequest, NextResponse } from "next/server";
import { verifyRequestUser } from "../../../lib/verifyAuth";
import { creditPaystackPayment } from "../../../lib/paystackCredit";

export async function POST(req: NextRequest) {
  // Who is calling comes from the Firebase ID token, never from the body.
  const uid = await verifyRequestUser(req);
  if (!uid) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let reference: unknown;
  try {
    ({ reference } = await req.json());
  } catch {
    reference = undefined;
  }
  if (typeof reference !== "string" || !reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    const result = await creditPaystackPayment(reference, { expectedUid: uid });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      success: true,
      amount: result.amount,
      alreadyCredited: !result.credited,
    });
  } catch (err) {
    console.error("Paystack verify error:", err);
    return NextResponse.json(
      { error: "Something went wrong verifying the payment" },
      { status: 500 }
    );
  }
}