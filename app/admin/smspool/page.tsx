"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

type Topup = { id: string; t: number; amount: number; fee: number; note: string };
type Data = {
  balanceUsd: number | null;
  balanceNgn: number | null;
  depositUrl: string;
  totals: { count: number; funded: number; fees: number };
  topups: Topup[];
};

const n = (v: number) => "₦" + v.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (t: number) =>
  t ? new Date(t).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }) : "—";

async function token() {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  return u.getIdToken();
}

export default function SmspoolPage() {
  const [data, setData] = useState<Data | null>(null);
  const [fail, setFail] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ amount: "", fee: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/smspool", { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
      if (!res.ok) return setFail(res.status);
      setData(await res.json());
      setFail(0);
    } catch {
      setFail(500);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addTopup() {
    setBusy(true);
    setFormErr("");
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(form.amount), fee: Number(form.fee || 0), note: form.note }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Couldn't save");
      setForm({ amount: "", fee: "", note: "" });
      await load();
    } catch (e: any) {
      setFormErr(e?.message || "Couldn't save the top-up");
    } finally {
      setBusy(false);
    }
  }

  if (fail && !data)
    return (
      <div className="adm-center">
        <div><h1>{fail === 403 || fail === 401 ? "No admin access" : "Couldn’t load SMSPool"}</h1></div>
      </div>
    );
  if (!data) return <div className="adm-center">Loading SMSPool…</div>;

  return (
    <>
      <div className="adm-top">
        <div>
          <h1>SMSPool</h1>
          <div className="adm-sub">Your SMSPool balance and funding history</div>
        </div>
        <a className="adm-fund" href={data.depositUrl} target="_blank" rel="noopener noreferrer">Fund SMSPool ↗</a>
      </div>

      <div className="adm-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        <div className="adm-card adm-stat" style={{ gridColumn: "1 / -1" }}>
          <div className="adm-ico indigo">💬</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="adm-lbl">Current SMSPool Balance</div>
            <div className="adm-val" style={{ fontSize: 30 }}>{data.balanceNgn != null ? n(data.balanceNgn) : "Unavailable"}</div>
            <div className="adm-sub">
              {data.balanceUsd != null ? `$${data.balanceUsd.toFixed(2)} live from SMSPool, shown in naira at your cost rate` : "Couldn’t reach SMSPool right now"}
            </div>
          </div>
          <button className="adm-sel" onClick={load} disabled={refreshing} style={{ cursor: "pointer" }}>{refreshing ? "Refreshing…" : "Refresh"}</button>
        </div>
        <div className="adm-card adm-stat">
          <div className="adm-ico teal">📊</div>
          <div>
            <div className="adm-lbl">Total Funded</div>
            <div className="adm-val">{n(data.totals.funded)}</div>
            <div className="adm-sub">{data.totals.count} top-up{data.totals.count === 1 ? "" : "s"} logged</div>
          </div>
        </div>
        <div className="adm-card adm-stat">
          <div className="adm-ico amber">🧾</div>
          <div>
            <div className="adm-lbl">Funding Fees</div>
            <div className="adm-val">{n(data.totals.fees)}</div>
            <div className="adm-sub">Paid to fund SMSPool</div>
          </div>
        </div>
      </div>

      <div className="adm-card" style={{ marginBottom: 14 }}>
        <h2>Log a top-up</h2>
        <div className="adm-sub" style={{ marginBottom: 10 }}>After you fund SMSPool, record it here (in naira) so funding and net profit stay correct.</div>
        <div className="adm-form">
          <input inputMode="decimal" placeholder="Amount sent (₦)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input inputMode="decimal" placeholder="Deposit fee (₦)" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
          <input className="wide" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button className="adm-btn" disabled={busy || !form.amount} onClick={addTopup}>{busy ? "Saving…" : "Add top-up"}</button>
        </div>
        {formErr && <div className="adm-down">{formErr}</div>}
      </div>

      <div className="adm-card">
        <h2>Recent top-ups</h2>
        {data.topups.length === 0 && <div className="adm-sub">No top-ups logged yet.</div>}
        {data.topups.map((x) => (
          <div className="adm-tx" key={x.id}>
            <div className="adm-txi in">+</div>
            <div className="adm-txt">
              <b>Funded SMSPool</b>
              <span>{x.note || "No note"}</span>
              <span>{when(x.t)}</span>
            </div>
            <div className="adm-txr">
              <b className="adm-in">+{n(x.amount)}</b>
              <span className="adm-sub">Fee {n(x.fee)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
