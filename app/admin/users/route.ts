import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import { requireAdmin } from "../../../lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WAT = 3600000; // Nigeria is UTC+1 all year
const r2 = (n: number) => Math.round(n * 100) / 100;
const ms = (v: any): number => (v?.toMillis ? v.toMillis() : typeof v === "number" ? v : 0);

// GET /api/admin/users → everyone who has an account (a document in `users`)
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const snap = await adminDb.collection("users").get();
    const rows = snap.docs
      .map((d) => {
        const u = d.data();
        return {
          uid: d.id,
          name: String(u.fullName || ""),
          email: String(u.email || ""),
          balance: Number(u.walletBalance) || 0,
          t: ms(u.createdAt),
        };
      })
      .sort((a, b) => b.t - a.t);

    // Start of this month in Nigerian time
    const w = new Date(Date.now() + WAT);
    const monthStart = Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), 1) - WAT;

    return NextResponse.json({
      total: rows.length,
      newThisMonth: rows.filter((r) => r.t >= monthStart).length,
      walletTotal: r2(rows.reduce((s, r) => s + r.balance, 0)),
      rows: rows.slice(0, 1000),
    });
  } catch (err) {
    console.error("Admin users error:", err);
    return NextResponse.json({ error: "Couldn't load users" }, { status: 500 });
  }
}
