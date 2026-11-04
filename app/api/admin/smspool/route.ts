import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import { requireAdmin } from "../../../lib/requireAdmin";
import { smspoolFetch } from "../../../lib/smspool";
import { usdToNgnCost } from "../../../lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const r2 = (n: number) => Math.round(n * 100) / 100;
const ms = (v: any): number => (v?.toMillis ? v.toMillis() : typeof v === "number" ? v : 0);

// GET /api/admin/smspool → live SMSPool balance + the top-ups you've logged
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
      // Set SMSPOOL_DEPOSIT_URL in Vercel to the page you use to add funds
      depositUrl: process.env.SMSPOOL_DEPOSIT_URL || "https://www.smspool.net/",
      totals: {
        count: all.length,
        funded: r2(all.reduce((s, x) => s + x.amount, 0)),
        fees: r2(all.reduce((s, x) => s + x.fee, 0)),
      },
      topups: all.slice(0, 30),
    });
  } catch (err) {
    console.error("Admin smspool error:", err);
    return NextResponse.json({ error: "Couldn't load SMSPool data" }, { status: 500 });
  }
}