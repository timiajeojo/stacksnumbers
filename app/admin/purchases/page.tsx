"use client";

import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { auth } from "../../lib/firebase";

type Status = "success" | "pending" | "refunded" | "other";
type Row = {
  orderId: string; uid: string; who: string; email: string; number: string; service: string; country: string;
  status: Status; price: number; t: number; cost: number | null; profit: number | null; estimated: boolean;
};
type Detail = Row & {
  rawStatus: string; cost: number; estimated: boolean; costUsd: number | null; profit: number;
  purchasedAt: number; chargedAt: number; refundedAt: number; refundedAmount: number | null; refundReason: string | null;
};

const n = (v: number) => "₦" + v.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (t: number) =>
  t ? new Date(t).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const day = (t: number) =>
  t
    ? new Date(t).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })
    : "—";
const PILL: Record<Status, [string, string]> = {
  success: ["Successful", "ok"], pending: ["Pending", "wait"], refunded: ["Refunded", "off"], other: ["Closed", "off"],
};
const REASON: Record<string, string> = {
  provider_refund: "SMSPool refunded the order",
  no_code: "No code arrived in time",
};

async function call(path: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  const res = await fetch(path, { headers: { Authorization: `Bearer ${await u.getIdToken()}` }, cache: "no-store" });
  return { status: res.status, body: res.ok ? await res.json() : null };
}

function Denied({ code }: { code: number }) {
  return (
    <div className="adm-center">
      <div>
        <h1>{code === 403 || code === 401 ? "No admin access" : code === 404 ? "Order not found" : "Couldn’t load purchases"}</h1>
        <p><Link href="/admin/purchases">Back to purchases</Link></p>
      </div>
    </div>
  );
}

function List() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState({ all: 0, success: 0, pending: 0, refunded: 0 });
  const [totals, setTotals] = useState({ count: 0, price: 0, cost: 0, profit: 0, estimated: 0 });
  const [fail, setFail] = useState(0);
  const [period, setPeriod] = useState("30");
  const [tab, setTab] = useState<"all" | "success" | "pending" | "refunded">("all");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(50);

  useEffect(() => {
    setShown(50);
    call(`/api/admin/purchases?period=${period}`)
      .then((r) => {
        if (r.body) {
          setRows(r.body.rows);
          setCounts(r.body.counts);
          setTotals(r.body.totals);
          setFail(0);
        } else setFail(r.status);
      })
      .catch(() => setFail(500));
  }, [period]);

  if (fail) return <Denied code={fail} />;
  if (!rows) return <div className="adm-center">Loading purchases…</div>;

  const needle = q.trim().toLowerCase();
  const list = rows.filter(
    (r) =>
      (tab === "all" || r.status === tab) &&
      (!needle || `${r.number} ${r.orderId} ${r.who} ${r.email} ${r.service} ${r.country}`.toLowerCase().includes(needle))
  );

  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Purchases</h1>
          <div className="adm-sub">{counts.all} orders · {counts.success} successful · {counts.pending} pending · {counts.refunded} refunded</div>
        </div>
        <select className="adm-sel" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="adm-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
        {([["Successful purchases", String(totals.count)], ["Customers paid", n(totals.price)], ["SMSPool cost", n(totals.cost)], ["Profit", n(totals.profit)]] as const).map(([l, v]) => (
          <div className="adm-card" key={l}>
            <div className="adm-lbl">{l}</div>
            <div className="adm-val">{v}</div>
          </div>
        ))}
      </div>
      {totals.estimated > 0 && <div className="adm-note">SMSPool cost for {totals.estimated} older order{totals.estimated > 1 ? "s" : ""} is estimated; newer orders use the real cost.</div>}

      <div className="adm-tools">
        <div className="adm-tabs" role="group" aria-label="Filter">
          {([["all", "All"], ["success", "Successful"], ["pending", "Pending"], ["refunded", "Refunded"]] as const).map(([k, label]) => (
            <button key={k} className={`adm-tab ${tab === k ? "on" : ""}`} aria-pressed={tab === k} onClick={() => { setTab(k); setShown(50); }}>{label}</button>
          ))}
        </div>
        <input className="adm-search" placeholder="Search number, order ID, customer or service" value={q} onChange={(e) => { setQ(e.target.value); setShown(50); }} />
      </div>

      <div className="adm-card">
        {list.length === 0 && <div className="adm-sub">No purchases match.</div>}
        {list.slice(0, shown).map((r) => (
          <Link key={r.uid + r.orderId} className="adm-pr" href={`/admin/purchases?order=${encodeURIComponent(r.orderId)}&user=${encodeURIComponent(r.uid)}`}>
            <div className="adm-pr-top">
              <div className="adm-txt">
                <b>{r.service || "Number"}{r.country ? ` · ${r.country}` : ""}</b>
                <span>{r.who}{r.email ? ` · ${r.email}` : ""}</span>
                <span>{day(r.t)}</span>
              </div>
              <span className={`adm-pill ${PILL[r.status][1]}`}>{PILL[r.status][0]}</span>
            </div>
            <div className="adm-prm">
              <div><span>Cost{r.estimated && r.cost != null ? " (est.)" : ""}</span><b>{r.cost != null ? n(r.cost) : "—"}</b></div>
              <div><span>Price</span><b>{n(r.price)}</b></div>
              <div><span>Profit</span><b className={r.profit != null && r.profit > 0 ? "adm-in" : ""}>{r.profit != null ? n(r.profit) : "—"}</b></div>
            </div>
          </Link>
        ))}
        {shown < list.length && <button className="adm-btn adm-more" onClick={() => setShown(shown + 50)}>Show more</button>}
      </div>
    </>
  );
}

function OrderDetail({ order, user }: { order: string; user: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [fail, setFail] = useState(0);

  useEffect(() => {
    call(`/api/admin/purchases?order=${encodeURIComponent(order)}&user=${encodeURIComponent(user)}`)
      .then((r) => (r.body ? setD(r.body.detail) : setFail(r.status)))
      .catch(() => setFail(500));
  }, [order, user]);

  if (fail) return <Denied code={fail} />;
  if (!d) return <div className="adm-center">Loading order…</div>;

  const margin = d.price > 0 ? Math.round((d.profit / d.price) * 1000) / 10 : 0;
  const kv = (k: string, v: ReactNode) => (
    <div className="adm-row"><span className="adm-sub">{k}</span><span style={{ textAlign: "right", overflowWrap: "anywhere" }}>{v}</span></div>
  );

  return (
    <>
      <Link href="/admin/purchases" className="adm-back">← Back to purchases</Link>
      <div className="adm-top">
        <div>
          <h1>Order {d.orderId}</h1>
          <div className="adm-sub">{d.service || "Number"}{d.country ? ` · ${d.country}` : ""}</div>
        </div>
        <span className={`adm-pill ${PILL[d.status][1]}`}>{PILL[d.status][0]}</span>
      </div>

      <div className="adm-two" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <div className="adm-card">
          <h2>Order</h2>
          {kv("Number", d.number || "—")}
          {kv("Service", d.service || "—")}
          {kv("Country", d.country || "—")}
          {kv("Status", d.rawStatus || "—")}
        </div>
        <div className="adm-card">
          <h2>Customer</h2>
          {kv("Name", d.who)}
          {kv("Email", d.email || "—")}
          {kv("User ID", d.uid)}
        </div>
        <div className="adm-card">
          <h2>Money</h2>
          {kv("Customer paid", n(d.price))}
          {kv(d.estimated ? "SMSPool cost (estimated)" : "SMSPool cost", <>{n(d.cost)}{d.costUsd != null ? ` ($${d.costUsd.toFixed(2)})` : ""}</>)}
          {kv("Profit", d.status === "success" ? <>{n(d.profit)} <span className="adm-sub">({margin}% margin)</span></> : "Counted once the code is received")}
        </div>
        <div className="adm-card">
          <h2>Timeline</h2>
          {kv("Purchased", when(d.purchasedAt))}
          {kv("Wallet charged", when(d.chargedAt || d.purchasedAt))}
          {d.refundedAt > 0 && kv("Refunded", `${when(d.refundedAt)}${d.refundedAmount != null ? ` · ${n(d.refundedAmount)}` : ""}`)}
          {d.refundReason && kv("Refund reason", REASON[d.refundReason] || d.refundReason)}
        </div>
      </div>
    </>
  );
}

function Content() {
  const sp = useSearchParams();
  const order = sp.get("order");
  const user = sp.get("user");
  return order && user ? <OrderDetail order={order} user={user} /> : <List />;
}

export default function PurchasesPage() {
  return (
    <Suspense fallback={<div className="adm-center">Loading…</div>}>
      <Content />
    </Suspense>
  );
}
