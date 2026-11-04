"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "../../lib/firebase";

type Row = {
  id: string; type: "deposit" | "debit"; t: number; uid: string; who: string; email: string;
  amount: number; title: string; orderId?: string; status: "success" | "pending" | "refunded" | "other";
};
type Data = {
  totals: { deposits: number; depositCount: number; debits: number; debitCount: number; pending: number; refunded: number; refundedCount: number };
  matched: number;
  rows: Row[];
};

const n = (v: number) => "₦" + v.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (t: number) =>
  t ? new Date(t).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const PILL = {
  success: ["Successful", "ok"], pending: ["Pending", "wait"], refunded: ["Refunded", "off"], other: ["Closed", "off"],
} as const;

export default function TransactionsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<"forbidden" | "error" | null>(null);
  const [type, setType] = useState<"all" | "deposit" | "debit">("all");
  const [days, setDays] = useState("30");
  const [shown, setShown] = useState(50);

  const load = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      const token = await u.getIdToken();
      const res = await fetch(`/api/admin/transactions?type=${type}&days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) return setErr("forbidden");
      if (!res.ok) throw new Error();
      setData(await res.json());
      setErr(null);
    } catch {
      setErr("error");
    }
  }, [type, days]);

  useEffect(() => {
    setShown(50);
    load();
  }, [load]);

  if (err === "forbidden")
    return <div className="adm-center"><div><h1>No admin access</h1><p>Your account isn’t on the admin list.</p></div></div>;
  if (err === "error" && !data)
    return <div className="adm-center"><div><h1>Couldn’t load transactions</h1><p>Check the Vercel logs for /api/admin/transactions.</p></div></div>;
  if (!data) return <div className="adm-center">Loading transactions…</div>;

  const t = data.totals;
  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Transactions</h1>
          <div className="adm-sub">Customer deposits and debits</div>
        </div>
        <select className="adm-sel" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Period">
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="adm-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        <div className="adm-card adm-stat">
          <div className="adm-ico green">⬇️</div>
          <div>
            <div className="adm-lbl">Total Deposits</div>
            <div className="adm-val">{n(t.deposits)}</div>
            <div className="adm-sub">{t.depositCount} successful deposit{t.depositCount === 1 ? "" : "s"}</div>
          </div>
        </div>
        <div className="adm-card adm-stat">
          <div className="adm-ico violet">⬆️</div>
          <div>
            <div className="adm-lbl">Total Debits</div>
            <div className="adm-val">{n(t.debits)}</div>
            <div className="adm-sub">
              {t.debitCount} successful purchase{t.debitCount === 1 ? "" : "s"}
              {t.pending > 0 ? ` · ${n(t.pending)} pending` : ""}
              {t.refundedCount > 0 ? ` · ${n(t.refunded)} refunded` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="adm-tabs" role="group" aria-label="Filter">
        {([["all", "All"], ["deposit", "Deposits"], ["debit", "Debits"]] as const).map(([k, label]) => (
          <button key={k} className={`adm-tab ${type === k ? "on" : ""}`} aria-pressed={type === k} onClick={() => setType(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="adm-card">
        {data.rows.length === 0 && <div className="adm-sub">No transactions in this period.</div>}
        {data.rows.slice(0, shown).map((r) => {
          const body = (
            <>
              <div className={`adm-txi ${r.type === "deposit" ? "in" : "out"}`}>{r.type === "deposit" ? "+" : "−"}</div>
              <div className="adm-txt">
                <b>{r.title}</b>
                <span>{r.who}{r.email ? ` · ${r.email}` : ""}</span>
                <span>{when(r.t)}</span>
              </div>
              <div className="adm-txr">
                <b className={r.type === "deposit" ? "adm-in" : ""}>{r.type === "deposit" ? "+" : "−"}{n(r.amount)}</b>
                <span className={`adm-pill ${PILL[r.status][1]}`}>{PILL[r.status][0]}</span>
              </div>
            </>
          );
          return r.type === "debit" ? (
            <Link key={r.id + r.uid} className="adm-tx" href={`/admin/purchases?order=${encodeURIComponent(r.orderId || "")}&user=${encodeURIComponent(r.uid)}`}>
              {body}
            </Link>
          ) : (
            <div key={r.id + r.uid} className="adm-tx">{body}</div>
          );
        })}
        {shown < data.rows.length && (
          <button className="adm-btn adm-more" onClick={() => setShown(shown + 50)}>Show more</button>
        )}
        {data.matched > data.rows.length && (
          <div className="adm-sub" style={{ marginTop: 10 }}>Showing the newest {data.rows.length} of {data.matched}. Narrow the period to see older ones.</div>
        )}
      </div>
    </>
  );
}
