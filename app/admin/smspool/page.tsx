"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

type Topup = { id: string; t: number; amount: number; fee: number; note: string };
type FeeRate = { percent: number; flat: number };
type Data = {
  balanceUsd: number | null;
  balanceNgn: number | null;
  depositUrl: string;
  depositFee: FeeRate | null;
  totals: { count: number; funded: number; fees: number };
  topups: Topup[];
};
type Pending = { amount: number; fee: number; note: string };

const SHOWN = 15;

const n = (v: number) => "₦" + v.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (t: number) =>
  t ? new Date(t).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }) : "—";
const parse = (s: string) => {
  const v = Number(s.replace(/,/g, ""));
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const calcFee = (amount: number, r: FeeRate) => Math.round((amount * r.percent / 100 + r.flat) * 100) / 100;

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
  const [pending, setPending] = useState<Pending | null>(null);
  const [showAll, setShowAll] = useState(false);
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

  // Live deposit fee: recalculated on every keystroke from the configured rate
  const amountNum = parse(form.amount);
  const rate = data?.depositFee ?? null;
  const autoFee = rate && amountNum > 0 ? calcFee(amountNum, rate) : null;
  const feeNum = rate ? autoFee ?? 0 : parse(form.fee);

  // Opens SMSPool's deposit page, then waits for you to confirm the payment before recording it
  function startTopup() {
    if (!data || amountNum <= 0) return;
    setFormErr("");
    const w = window.open(data.depositUrl, "_blank");
    if (w) w.opener = null;
    else setFormErr("Your browser blocked the SMSPool tab. Use the “Fund SMSPool” link at the top instead.");
    setPending({ amount: amountNum, fee: feeNum, note: form.note });
  }

  async function confirmTopup() {
    if (!pending) return;
    setBusy(true);
    setFormErr("");
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pending.amount, fee: pending.fee, note: pending.note }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Couldn't save");
      setForm({ amount: "", fee: "", note: "" });
      setPending(null);
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

  const rows = showAll ? data.topups : data.topups.slice(0, SHOWN);

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
            <div className="adm-sub">{data.totals.count} top-up{data.totals.count === 1 ? "" : "s"} recorded</div>
          </div>
        </div>
        <div className="adm-card adm-stat">
          <div className="adm-ico amber">🧾</div>
          <div>
            <div className="adm-lbl">Funding Fees</div>
            <div className="adm-val">{n(data.totals.fees)}</div>
            <div className="adm-sub">Deposit fees paid to SMSPool</div>
          </div>
        </div>
      </div>

      <div className="adm-card" style={{ marginBottom: 14 }}>
        <h2>Add a top-up</h2>
        <div className="adm-sub" style={{ marginBottom: 10 }}>
          Enter the amount you want to send. The deposit fee updates as you type. “Add top-up” opens SMSPool’s deposit page.
        </div>
        <div className="adm-form">
          <input
            inputMode="decimal"
            placeholder="Amount to send (₦)"
            value={form.amount}
            disabled={!!pending}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <input
            inputMode="decimal"
            placeholder="Deposit fee (₦)"
            value={rate ? (autoFee != null ? String(autoFee) : "") : form.fee}
            readOnly={!!rate}
            disabled={!!pending}
            onChange={(e) => setForm({ ...form, fee: e.target.value })}
          />
          <input
            className="wide"
            placeholder="Note (optional)"
            value={form.note}
            disabled={!!pending}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <button className="adm-btn" disabled={busy || !!pending || amountNum <= 0} onClick={startTopup}>Add top-up ↗</button>
        </div>
        <div className="adm-sub" style={{ marginTop: 8 }}>
          {rate
            ? amountNum > 0
              ? `Deposit fee: ${n(feeNum)} (${rate.percent}%${rate.flat ? ` + ${n(rate.flat)}` : ""})`
              : `Fee rate: ${rate.percent}%${rate.flat ? ` + ${n(rate.flat)}` : ""}. Enter an amount to see the fee.`
            : "No fee rate is set, so type the fee yourself. Set SMSPOOL_DEPOSIT_FEE_PERCENT on the server to get it calculated live."}
        </div>

        {pending && (
          <div className="adm-sub" style={{ marginTop: 12 }}>
            SMSPool’s deposit page is open in a new tab. Once your payment goes through, record {n(pending.amount)} (fee {n(pending.fee)}) so your totals stay accurate.
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="adm-btn" disabled={busy} onClick={confirmTopup}>{busy ? "Saving…" : "I’ve paid, record it"}</button>
              <button className="adm-sel" disabled={busy} onClick={() => setPending(null)} style={{ cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
        {formErr && <div className="adm-down">{formErr}</div>}
      </div>

      <div className="adm-card">
        <h2>Recent transactions</h2>
        {data.topups.length === 0 && <div className="adm-sub">No top-ups recorded yet.</div>}
        {rows.map((x) => (
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
        {data.topups.length > SHOWN && (
          <button className="adm-sel" onClick={() => setShowAll(!showAll)} style={{ cursor: "pointer", marginTop: 10 }}>
            {showAll ? "Show fewer" : `Show all (${data.topups.length})`}
          </button>
        )}
      </div>
    </>
  );
}
