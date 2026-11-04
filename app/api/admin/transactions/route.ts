import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import { requireAdmin } from "../../../lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 86400000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const ms = (v: any): number => (v?.toMillis ? v.toMillis() : typeof v === "number" ? v : 0);

// GET /api/admin/transactions?type=all|deposit|debit&days=7|30|90|all
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const t = sp.get("type");
  const type = t === "deposit" || t === "debit" ? t : "all";
  const dp = sp.get("days") || "30";
  const days = dp === "all" ? 0 : Math.max(1, Math.min(365, Number(dp) || 30));
  const from = days ? Date.now() - days * DAY : 0;

  try {
    const [usersSnap, txSnap, orderSnap] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collectionGroup("transactions").get(),
      adminDb.collectionGroup("rentals").get(),
    ]);

    const people = new Map<string, { name: string; email: string }>();
    usersSnap.forEach((d) => {
      const u = d.data();
      people.set(d.id, { name: u.fullName || "", email: u.email || "" });
    });

    // Order status (waiting / received / refunded) for each debit, keyed uid/orderId
    const orders = new Map<string, { status: string; service: string; t: number }>();
    orderSnap.forEach((d) => {
      const x = d.data();
      orders.set(`${d.ref.parent.parent?.id}/${d.id}`, {
        status: String(x.status || ""),
        service: String(x.service || ""),
        t: ms(x.purchasedAt),
      });
    });

    const totals = { deposits: 0, depositCount: 0, debits: 0, debitCount: 0, pending: 0, refunded: 0, refundedCount: 0 };
    const rows: any[] = [];

    txSnap.forEach((d) => {
      const x = d.data();
      const uid = d.ref.parent.parent?.id || "";
      const p = people.get(uid);
      const who = p?.name || p?.email.split("@")[0] || "user";
      const email = p?.email || "";

      if (x.kind === "credit" && x.method === "Paystack") {
        const time = ms(x.createdAt);
        if (time < from) return;
        const amount = Number(x.amount) || 0;
        totals.deposits += amount;
        totals.depositCount++;
        rows.push({ id: d.id, type: "deposit", t: time, uid, who, email, amount, title: "Deposit via Paystack", status: "success" });
      } else if (x.kind === "debit") {
        const orderId = String(x.orderId || d.id.replace(/^order_/, ""));
        const o = orders.get(`${uid}/${orderId}`);
        const time = ms(x.createdAt) || o?.t || 0;
        if (time < from) return;
        const amount = Number(x.amount) || 0;
        const status =
          o?.status === "received" ? "success" : o?.status === "waiting" ? "pending" : o?.status === "refunded" ? "refunded" : "other";
        if (status === "success") { totals.debits += amount; totals.debitCount++; }
        else if (status === "pending") totals.pending += amount;
        else if (status === "refunded") { totals.refunded += amount; totals.refundedCount++; }
        const service = o?.service || String(x.method || "").replace("Number rental - ", "");
        rows.push({ id: d.id, type: "debit", t: time, uid, who, email, amount, title: `Number purchase · ${service || "Number"}`, orderId, status });
      }
    });

    const list = rows
      .filter((r) => type === "all" || r.type === type)
      .sort((a, b) => b.t - a.t);

    return NextResponse.json({
      totals: {
        deposits: r2(totals.deposits), depositCount: totals.depositCount,
        debits: r2(totals.debits), debitCount: totals.debitCount,
        pending: r2(totals.pending), refunded: r2(totals.refunded), refundedCount: totals.refundedCount,
      },
      matched: list.length,
      rows: list.slice(0, 300),
    });
  } catch (err) {
    console.error("Admin transactions error:", err);
    return NextResponse.json({ error: "Couldn't load transactions" }, { status: 500 });
  }
}
