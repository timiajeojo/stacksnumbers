import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import { requireAdmin } from "../../../lib/requireAdmin";
import { MARKUP_MULTIPLIER } from "../../../lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 86400000;
const WAT = 3600000; // Nigeria is UTC+1 all year
const r2 = (n: number) => Math.round(n * 100) / 100;

// Start of the chosen period: "7"/"30"/… days back, or this month / this year in Nigerian time.
function periodStart(p: string, now: number): number {
  const w = new Date(now + WAT);
  if (p === "all") return 0;
  if (p === "month") return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), 1) - WAT;
  if (p === "year") return Date.UTC(w.getUTCFullYear(), 0, 1) - WAT;
  const d = Number(p);
  return now - (d > 0 && d <= 365 ? d : 30) * DAY;
}
const ms = (v: any): number => (v?.toMillis ? v.toMillis() : typeof v === "number" ? v : 0);
const statusOf = (s: string) =>
  s === "received" ? "success" : s === "waiting" ? "pending" : s === "refunded" ? "refunded" : "other";

// Price the customer paid and what SMSPool charged. Orders saved before we
// recorded the real cost get an estimate (price ÷ multiplier), flagged as such.
function money(x: any) {
  const price = Number(x.costNaira) || 0;
  const real = typeof x.smspoolCostNgn === "number";
  return { price, cost: real ? (x.smspoolCostNgn as number) : r2(price / MARKUP_MULTIPLIER), estimated: !real };
}

// GET /api/admin/purchases                    → list of orders
// GET /api/admin/purchases?order=ID&user=UID  → one order in full
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const order = req.nextUrl.searchParams.get("order");
  const user = req.nextUrl.searchParams.get("user");

  try {
    if (order && user) {
      const userRef = adminDb.collection("users").doc(user);
      const [u, o, debit, refund] = await Promise.all([
        userRef.get(),
        userRef.collection("rentals").doc(order).get(),
        userRef.collection("transactions").doc(`order_${order}`).get(),
        userRef.collection("transactions").doc(`refund_${order}`).get(),
      ]);
      if (!o.exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });

      const x = o.data()!;
      const { price, cost, estimated } = money(x);
      const ud = u.data() || {};
      const rd = refund.data();
      return NextResponse.json({
        detail: {
          orderId: order,
          uid: user,
          who: ud.fullName || String(ud.email || "").split("@")[0] || "user",
          email: ud.email || "",
          number: String(x.number || ""),
          service: String(x.service || ""),
          country: String(x.country || ""),
          status: statusOf(String(x.status || "")),
          rawStatus: String(x.status || ""),
          price,
          cost,
          estimated,
          costUsd: typeof x.smspoolCostUsd === "number" ? x.smspoolCostUsd : null,
          profit: r2(price - cost),
          purchasedAt: ms(x.purchasedAt),
          chargedAt: ms(debit.data()?.createdAt),
          refundedAt: ms(x.refundedAt) || ms(rd?.createdAt),
          refundedAmount: rd ? Number(rd.amount) || 0 : null,
          refundReason: x.refundReason ? String(x.refundReason) : null,
        },
      });
    }

    const from = periodStart(req.nextUrl.searchParams.get("period") || "30", Date.now());
    const [usersSnap, orderSnap] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collectionGroup("rentals").get(),
    ]);
    const people = new Map<string, { who: string; email: string }>();
    usersSnap.forEach((d) => {
      const u = d.data();
      people.set(d.id, { who: u.fullName || String(u.email || "").split("@")[0] || "user", email: u.email || "" });
    });

    const counts = { all: 0, success: 0, pending: 0, refunded: 0 };
    const totals = { count: 0, price: 0, cost: 0, profit: 0, estimated: 0 };
    const rows: any[] = [];
    orderSnap.forEach((d) => {
      const x = d.data();
      const t = ms(x.purchasedAt);
      if (t < from) return;
      const uid = d.ref.parent.parent?.id || "";
      const p = people.get(uid);
      const { price, cost, estimated } = money(x);
      const status = statusOf(String(x.status || ""));
      counts.all++;
      if (status === "success" || status === "pending" || status === "refunded") counts[status]++;
      // Cost and profit only exist for successful orders (SMSPool refunds the rest)
      if (status === "success") {
        totals.count++;
        totals.price += price;
        totals.cost += cost;
        totals.profit += price - cost;
        if (estimated) totals.estimated++;
      }
      rows.push({
        orderId: d.id, uid, who: p?.who || "user", email: p?.email || "",
        number: String(x.number || ""), service: String(x.service || ""), country: String(x.country || ""),
        status, price, t, estimated,
        cost: status === "success" ? cost : null,
        profit: status === "success" ? r2(price - cost) : null,
      });
    });
    rows.sort((a, b) => b.t - a.t);

    return NextResponse.json({
      counts,
      totals: { count: totals.count, price: r2(totals.price), cost: r2(totals.cost), profit: r2(totals.profit), estimated: totals.estimated },
      rows: rows.slice(0, 500),
    });
  } catch (err) {
    console.error("Admin purchases error:", err);
    return NextResponse.json({ error: "Couldn't load purchases" }, { status: 500 });
  }
}
