"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase"; // ← your client-side Firebase file; change the path/name if yours differs
import "./admin.css";

type Pt = { d: string; deposits: number; purchases: number; profit: number };
type Stats = {
  period: Record<"totalDeposits" | "used" | "reserve" | "gross" | "net" | "funding", number>;
  change: Record<"totalDeposits" | "used" | "reserve" | "gross" | "net" | "funding", number | null>;
  unused: number;
  lifetime: { deposits: number; used: number };
  balanceNgn: number | null;
  balanceUsd: number | null;
  series: Pt[];
  activity: { kind: string; amount: number; who: string; t: number }[];
  quick: { users: number; purchases: number; transactions: number };
  topups: { id: string; t: number; amount: number; fee: number; note: string }[];
  walletTotal: number;
  estimatedFees: number;
};

const n = (v: number | null | undefined) =>
  v == null ? "Unavailable" : "₦" + v.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "K" : String(Math.round(v)));
const ago = (t: number) => {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} mins ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hrs ago`;
  return `${Math.floor(s / 86400)} days ago`;
};

function Lines({ pts }: { pts: Pt[] }) {
  const W = 640, H = 230, L = 44, R = 10, T = 10, B = 28;
  const max = Math.max(1, ...pts.flatMap((p) => [p.deposits, p.purchases, p.profit]));
  const x = (i: number) => L + (pts.length < 2 ? 0 : (i * (W - L - R)) / (pts.length - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = (k: "deposits" | "purchases" | "profit") =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const every = Math.ceil(pts.length / 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart" role="img" aria-label="Deposits, purchases and profit over time">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="#e8ebf3" />
          <text x={L - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#64748b">{short(max * f)}</text>
        </g>
      ))}
      <path d={path("deposits")} stroke="#3d8fff" fill="none" strokeWidth="2.5" />
      <path d={path("purchases")} stroke="#8b5cf6" fill="none" strokeWidth="2.5" />
      <path d={path("profit")} stroke="#10b981" fill="none" strokeWidth="2.5" />
      {pts.map((p, i) =>
        i % every === 0 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{p.d}</text>
        ) : null
      )}
    </svg>
  );
}

function Donut({ used, unused }: { used: number; unused: number }) {
  const total = used + unused;
  const R = 70, C = 2 * Math.PI * R;
  const len = total > 0 ? (Math.max(0, used) / total) * C : 0;
  return (
    <svg viewBox="0 0 180 180" className="adm-donut" role="img" aria-label="Used versus unused deposits">
      <circle cx="90" cy="90" r={R} fill="none" stroke="#8b5cf6" strokeWidth="26" />
      <circle cx="90" cy="90" r={R} fill="none" stroke="#3d8fff" strokeWidth="26" strokeDasharray={`${len} ${C}`} transform="rotate(-90 90 90)" />
      <text x="90" y="88" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">₦{short(total)}</text>
      <text x="90" y="108" textAnchor="middle" fontSize="11" fill="#64748b">Total Deposits</text>
    </svg>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<"forbidden" | "error" | null>(null);
  const [days, setDays] = useState("30");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", fee: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");

  const load = useCallback(async (d: string) => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      const token = await u.getIdToken();
      const res = await fetch(`/api/admin/stats?days=${d}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) return setErr("forbidden");
      if (!res.ok) throw new Error();
      setStats(await res.json());
      setErr(null);
    } catch {
      setErr("error");
    }
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (!u) router.replace("/auth");
        else load(days);
      }),
    [days, load, router]
  );

  async function addTopup() {
    const u = auth.currentUser;
    if (!u) return;
    setBusy(true);
    setFormErr("");
    try {
      const token = await u.getIdToken();
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(form.amount), fee: Number(form.fee || 0), note: form.note }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Couldn't save");
      setForm({ amount: "", fee: "", note: "" });
      await load(days);
    } catch (e: any) {
      setFormErr(e?.message || "Couldn't save the top-up");
    } finally {
      setBusy(false);
    }
  }

  if (err === "forbidden")
    return <div className="adm adm-center"><div><h1>No admin access</h1><p>Your account isn’t an admin. Set <b>isAdmin</b> to true on your user document in Firestore, then reload.</p></div></div>;
  if (err === "error" && !stats)
    return <div className="adm adm-center"><div><h1>Couldn’t load the dashboard</h1><p>Check the Vercel logs for /api/admin/stats, then reload.</p></div></div>;
  if (!stats) return <div className="adm adm-center">Loading dashboard…</div>;

  const p = stats.period, c = stats.change;
  const cards: { t: string; v: number | null; c?: number | null; i: string; tone: string; note?: string }[] = [
    { t: "Total Customer Deposits", v: p.totalDeposits, c: c.totalDeposits, i: "💳", tone: "blue" },
    { t: "Used Deposits (Customer Purchases)", v: p.used, c: c.used, i: "🛒", tone: "green" },
    { t: "Unused Customer Deposits", v: stats.unused, i: "👛", tone: "amber", note: "Held in customer wallets now" },
    { t: "SMSPool Replenishment Reserve", v: p.reserve, c: c.reserve, i: "🛡️", tone: "violet" },
    { t: "Total SMSPool Funding", v: p.funding, c: c.funding, i: "📊", tone: "teal" },
    { t: "Gross Profit", v: p.gross, c: c.gross, i: "📈", tone: "green" },
    { t: "Net Profit", v: p.net, c: c.net, i: "💰", tone: "violet" },
    { t: "Current SMSPool Balance", v: stats.balanceNgn, i: "💬", tone: "indigo", note: stats.balanceUsd != null ? `$${stats.balanceUsd.toFixed(2)} live from SMSPool` : "Couldn’t reach SMSPool" },
  ];
  const mismatch = Math.abs(stats.walletTotal - stats.unused) > 1;
  const nav = ["Transactions", "Users", "Purchases", "SMSPool", "Settings", "Reports"];

  return (
    <div className="adm">
      <div className={`adm-scrim ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`adm-side ${open ? "open" : ""}`}>
        <div className="adm-logo">▲ Stacksnumbers</div>
        <span className="adm-badge">Admin</span>
        <button className="adm-nav on" onClick={() => setOpen(false)}>▦ Dashboard</button>
        {nav.map((x) => (
          <span key={x} className="adm-nav soon" title="Coming soon">• {x}</span>
        ))}
        <div className="adm-spacer" />
        <button className="adm-nav" onClick={() => signOut(auth).then(() => router.replace("/auth"))}>⎋ Logout</button>
      </aside>

      <main className="adm-main">
        <div className="adm-top">
          <div>
            <h1>Admin Dashboard</h1>
            <div className="adm-sub">Overview of your platform’s performance</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select className="adm-sel" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Period">
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="all">All time</option>
            </select>
            <button className="adm-burger" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          </div>
        </div>

        {mismatch && (
          <div className="adm-note">Unused deposits ({n(stats.unused)}) don’t match the wallet balances in Firestore ({n(stats.walletTotal)}). A balance may have been edited by hand, or a payment wasn’t recorded.</div>
        )}
        {stats.estimatedFees > 0 && (
          <div className="adm-note">Paystack fees for {stats.estimatedFees} older payment{stats.estimatedFees > 1 ? "s" : ""} are estimated; new payments use the real fee. Older orders use cost = price ÷ 1.7.</div>
        )}

        <div className="adm-grid">
          {cards.map((k) => (
            <div className="adm-card adm-stat" key={k.t}>
              <div className={`adm-ico ${k.tone}`}>{k.i}</div>
              <div style={{ minWidth: 0 }}>
                <div className="adm-lbl">{k.t}</div>
                <div className="adm-val">{n(k.v)}</div>
                {k.c != null ? (
                  <div className={k.c >= 0 ? "adm-up" : "adm-down"}>{k.c >= 0 ? "▲ +" : "▼ "}{k.c}% <span className="adm-sub">vs previous period</span></div>
                ) : (
                  <div className="adm-sub">{k.note || ""}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="adm-two">
          <div className="adm-card">
            <h2>Platform Overview</h2>
            <div className="adm-key">
              <span><i style={{ background: "#3d8fff" }} />Deposits</span>
              <span><i style={{ background: "#8b5cf6" }} />Purchases</span>
              <span><i style={{ background: "#10b981" }} />Profit</span>
            </div>
            <Lines pts={stats.series} />
          </div>
          <div className="adm-card">
            <h2>Deposit Breakdown</h2>
            <div className="adm-donutwrap">
              <Donut used={stats.lifetime.used} unused={stats.unused} />
              <div>
                <div className="adm-leg"><span style={{ color: "#3d8fff" }}>●</span> Used Deposits<b>{n(stats.lifetime.used)}</b></div>
                <div className="adm-leg" style={{ marginTop: 10 }}><span style={{ color: "#8b5cf6" }}>●</span> Unused Deposits<b>{n(stats.unused)}</b></div>
              </div>
            </div>
          </div>
        </div>

        <div className="adm-two" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
          <div className="adm-card">
            <h2>Quick Stats</h2>
            <div className="adm-quick">
              <div><span className="adm-sub">Total Users</span><b>{stats.quick.users.toLocaleString()}</b></div>
              <div><span className="adm-sub">Total Purchases</span><b>{stats.quick.purchases.toLocaleString()}</b></div>
              <div><span className="adm-sub">Total Transactions</span><b>{stats.quick.transactions.toLocaleString()}</b></div>
            </div>
          </div>
          <div className="adm-card">
            <h2>Recent Activity</h2>
            {stats.activity.length === 0 && <div className="adm-sub">No activity yet.</div>}
            {stats.activity.map((a, i) => (
              <div className="adm-row" key={i}>
                <span>{a.kind === "deposit" ? `New deposit of ${n(a.amount)} from ${a.who}` : `Purchase of ${n(a.amount)} by ${a.who}`}</span>
                <span className="adm-sub" style={{ whiteSpace: "nowrap" }}>{a.t ? ago(a.t) : ""}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-card">
          <h2>SMSPool Top-ups</h2>
          <div className="adm-sub" style={{ marginBottom: 10 }}>Log each time you fund SMSPool (in naira). The fee counts against net profit.</div>
          <div className="adm-form">
            <input inputMode="decimal" placeholder="Amount sent (₦)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input inputMode="decimal" placeholder="Deposit fee (₦)" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
            <input className="wide" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button className="adm-btn" disabled={busy || !form.amount} onClick={addTopup}>{busy ? "Saving…" : "Add top-up"}</button>
          </div>
          {formErr && <div className="adm-down">{formErr}</div>}
          {stats.topups.map((t) => (
            <div className="adm-row" key={t.id}>
              <span>{n(t.amount)} <span className="adm-sub">fee {n(t.fee)}{t.note ? ` · ${t.note}` : ""}</span></span>
              <span className="adm-sub" style={{ whiteSpace: "nowrap" }}>{t.t ? ago(t.t) : ""}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
