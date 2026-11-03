import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../lib/firebaseAdmin";
import { requireAdmin } from "../../../lib/requireAdmin";
import { smspoolFetch } from "../../../lib/smspool";
import { usdToNgnCost } from "../../../lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 86400000;
const MARKUP = 1.7; // same as lib/pricing.ts; only used to estimate the cost of older orders
const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = <T>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0);
const ms = (v: any): number => (v?.toMillis ? v.toMillis() : typeof v === "number" ? v : 0);
// Paystack local fee: 1.5% (+₦100 from ₦2,500), capped at ₦2,000. Only for payments saved before we stored the real fee.
const estFee = (a: number) => Math.min(a * 0.015 + (a >= 2500 ? 100 : 0), 2000);

type Dep = { t: number; amount: number; fee: number; est: boolean; uid: string };
type Ord = { t: number; price: number; cost: number; uid: string };

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dp = req.nextUrl.searchParams.get("days") || "30";
  const days = dp === "all" ? 0 : Math.max(1, Math.min(365, Number(dp) || 30));
  const now = Date.now();
  const from = days ? now - days * DAY : 0;

  try {
    const [usersSnap, txSnap, orderSnap, topupSnap] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collectionGroup("transactions").get(),
      adminDb.collectionGroup("rentals").get(),
      adminDb.collection("smspoolTopups").get(),
    ]);

    const people = new Map<string, string>();
    let walletTotal = 0;
    usersSnap.forEach((d) => {
      const u = d.data();
      walletTotal += Number(u.walletBalance) || 0;
      people.set(d.id, u.fullName || String(u.email || "").split("@")[0] || "user");
    });
    const who = (uid: string) => people.get(uid) || "user";

    const deposits: Dep[] = [];
    txSnap.forEach((d) => {
      const x = d.data();
      if (x.kind !== "credit" || x.method !== "Paystack") return;
      const amount = Number(x.amount) || 0;
      const real = typeof x.paystackFee === "number";
      deposits.push({
        t: ms(x.createdAt),
        amount,
        fee: real ? x.paystackFee : r2(estFee(amount)),
        est: !real,
        uid: d.ref.parent.parent?.id || "",
      });
    });

    // Only successful orders (code received) count as used / cost / profit.
    // Refunded orders are out, and "waiting" ones aren't counted until they succeed.
    const orders: Ord[] = [];
    let pendingHeld = 0; // paid for, but SMSPool hasn't delivered the code yet
    orderSnap.forEach((d) => {
      const x = d.data();
      const price = Number(x.costNaira) || 0;
      if (x.status === "waiting") pendingHeld += price;
      if (x.status !== "received") return;
      orders.push({
        t: ms(x.purchasedAt),
        price,
        cost: typeof x.smspoolCostNgn === "number" ? x.smspoolCostNgn : r2(price / MARKUP),
        uid: d.ref.parent.parent?.id || "",
      });
    });

    const topups = topupSnap.docs
      .map((d) => {
        const x = d.data();
        return { id: d.id, t: ms(x.createdAt), amount: Number(x.amount) || 0, fee: Number(x.fee) || 0, note: String(x.note || "") };
      })
      .sort((a, b) => b.t - a.t);

    const inWin = (t: number, a: number, b: number) => t >= a && t < b;
    const calc = (a: number, b: number) => {
      const dep = deposits.filter((x) => inWin(x.t, a, b));
      const ord = orders.filter((x) => inWin(x.t, a, b));
      const tp = topups.filter((x) => inWin(x.t, a, b));
      const used = sum(ord, (x) => x.price);
      const reserve = sum(ord, (x) => x.cost);
      const gross = used - reserve;
      const fees = sum(dep, (x) => x.fee) + sum(tp, (x) => x.fee);
      return {
        totalDeposits: r2(sum(dep, (x) => x.amount)),
        used: r2(used),
        reserve: r2(reserve),
        gross: r2(gross),
        net: r2(gross - fees),
        funding: r2(sum(tp, (x) => x.amount)),
      };
    };
    const cur = calc(from, now + 1);
    const prev = days ? calc(from - days * DAY, from) : null;
    const pct = (k: keyof typeof cur) =>
      prev && prev[k] > 0 ? Math.round(((cur[k] - prev[k]) / prev[k]) * 1000) / 10 : null;
    const change = {
      totalDeposits: pct("totalDeposits"), used: pct("used"), reserve: pct("reserve"),
      gross: pct("gross"), net: pct("net"), funding: pct("funding"),
    };

    // Lifetime figures
    const allDeposits = sum(deposits, (x) => x.amount);
    const allUsed = sum(orders, (x) => x.price);
    const unused = r2(allDeposits - allUsed);

    // Live SMSPool balance (USD), shown in naira at your cost rate
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
      // leave as null → the card shows "Unavailable"
    }

    // Daily chart, at most ~30 points
    const span = days || 30;
    const step = Math.ceil(span / 30);
    const start = now - span * DAY;
    const series = Array.from({ length: Math.ceil(span / step) }, (_, i) => {
      const a = start + i * step * DAY;
      const b = a + step * DAY;
      const dep = deposits.filter((x) => inWin(x.t, a, b));
      const ord = orders.filter((x) => inWin(x.t, a, b));
      return {
        d: new Date(a).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        deposits: r2(sum(dep, (x) => x.amount)),
        purchases: r2(sum(ord, (x) => x.price)),
        profit: r2(sum(ord, (x) => x.price - x.cost)),
      };
    });

    const activity = [
      ...deposits.map((x) => ({ kind: "deposit", amount: x.amount, who: who(x.uid), t: x.t })),
      ...orders.map((x) => ({ kind: "purchase", amount: x.price, who: who(x.uid), t: x.t })),
    ].sort((a, b) => b.t - a.t).slice(0, 8);

    return NextResponse.json({
      days: dp,
      period: cur,
      change,
      unused,
      lifetime: { deposits: r2(allDeposits), used: r2(allUsed) },
      balanceNgn,
      balanceUsd,
      series,
      activity,
      quick: { users: usersSnap.size, purchases: orders.length, transactions: txSnap.size },
      topups: topups.slice(0, 6),
      // Sanity check: unused deposits should equal what customers hold in wallets
      walletTotal: r2(walletTotal),
      pendingHeld: r2(pendingHeld),
      estimatedFees: deposits.filter((x) => x.est).length,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Couldn't load stats" }, { status: 500 });
  }
}

// Log money you sent to SMSPool: { amount, fee, note }, both in naira.
export async function POST(req: NextRequest) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // handled below
  }
  const amount = Number(body?.amount);
  const fee = Number(body?.fee || 0);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(fee) || fee < 0) {
    return NextResponse.json({ error: "Enter a valid amount and fee" }, { status: 400 });
  }
  await adminDb.collection("smspoolTopups").add({
    amount,
    fee,
    note: String(body?.note || "").slice(0, 120),
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}
