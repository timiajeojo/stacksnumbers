import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import { requireAdmin } from "../../../lib/requireAdmin";
import { smspoolFetch } from "../../../lib/smspool";
import { usdToNgnCost } from "../../../lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const r2 = (n: number) => Math.round(n * 100) / 100;
const ms = (v: any): number => (v?.toMillis ? v.toMillis() : typeof v === "number" ? v : 0);

// Reads a non-negative number from an env var, or null if it's missing/invalid
const envNum = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === "") return null;
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? x : null;
};

// GET /api/admin/smspool → live SMSPool balance, deposit fee rate, and every top-up you've recorded
//
// SMSPool's public API only exposes the balance. It has no deposit-history or fee endpoint,
// so funding totals and transactions come from the top-ups recorded in Firestore.
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    // Live balance (USD), shown in naira at your cost rate
    let balanceUsd: number | null = null;
    let balanceNgn: number | null = null;
    try {
      const { ok, data } = await smspoolFetch("/request/balance", {});
      const b = Number(data?.balance);
      if (ok && Number.isFinite(b)) {
        balanceUsd = b;
        balanceNgn = r2(usdToNgnCost(b));
      }
    } catch {
      // leave null → the page shows "Unavailable"
    }

    // Deposit fee = amount × percent / 100 + flat (both in naira). Set these in Vercel:
    //   SMSPOOL_DEPOSIT_FEE_PERCENT  e.g. 3.5
    //   SMSPOOL_DEPOSIT_FEE_FLAT     e.g. 100   (optional)
    // If neither is set, depositFee is null and the page lets you type the fee by hand.
    const feePercent = envNum(process.env.SMSPOOL_DEPOSIT_FEE_PERCENT);
    const feeFlat = envNum(process.env.SMSPOOL_DEPOSIT_FEE_FLAT);
    const depositFee =
      feePercent === null && feeFlat === null ? null : { percent: feePercent ?? 0, flat: feeFlat ?? 0 };

    const snap = await adminDb.collection("smspoolTopups").get();
    const all = snap.docs
      .map((d) => {
        const x = d.data();
        return { id: d.id, t: ms(x.createdAt), amount: Number(x.amount) || 0, fee: Number(x.fee) || 0, note: String(x.note || "") };
      })
      .sort((a, b) => b.t - a.t);

    return NextResponse.json({
      balanceUsd,
      balanceNgn,
      // The deposit page of the SMSPool account. Override with SMSPOOL_DEPOSIT_URL if needed.
      depositUrl: process.env.SMSPOOL_DEPOSIT_URL || "https://www.smspool.net/balance/deposit",
      depositFee,
      totals: {
        count: all.length,
        funded: r2(all.reduce((s, x) => s + x.amount, 0)),
        fees: r2(all.reduce((s, x) => s + x.fee, 0)),
      },
      topups: all.slice(0, 200),
    });
  } catch (err) {
    console.error("Admin smspool error:", err);
    return NextResponse.json({ error: "Couldn't load SMSPool data" }, { status: 500 });
  }
}
