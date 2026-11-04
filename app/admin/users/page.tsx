"use client";

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

type Row = { uid: string; name: string; email: string; balance: number; t: number };
type Data = { total: number; newThisMonth: number; walletTotal: number; rows: Row[] };

const n = (v: number) => "₦" + v.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const joined = (t: number) =>
  t ? new Date(t).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : "Date unknown";

export default function UsersPage() {
  const [data, setData] = useState<Data | null>(null);
  const [fail, setFail] = useState(0);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(50);

  useEffect(() => {
    (async () => {
      try {
        const u = auth.currentUser;
        if (!u) return;
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${await u.getIdToken()}` },
          cache: "no-store",
        });
        if (!res.ok) return setFail(res.status);
        setData(await res.json());
      } catch {
        setFail(500);
      }
    })();
  }, []);

  if (fail)
    return (
      <div className="adm-center">
        <div><h1>{fail === 403 || fail === 401 ? "No admin access" : "Couldn’t load users"}</h1></div>
      </div>
    );
  if (!data) return <div className="adm-center">Loading users…</div>;

  const needle = q.trim().toLowerCase();
  const list = data.rows.filter((r) => !needle || `${r.name} ${r.email}`.toLowerCase().includes(needle));

  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Users</h1>
          <div className="adm-sub">People who have created an account</div>
        </div>
      </div>

      <div className="adm-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <div className="adm-card adm-stat">
          <div className="adm-ico blue">👥</div>
          <div>
            <div className="adm-lbl">Total Users</div>
            <div className="adm-val">{data.total.toLocaleString()}</div>
          </div>
        </div>
        <div className="adm-card adm-stat">
          <div className="adm-ico green">🆕</div>
          <div>
            <div className="adm-lbl">New This Month</div>
            <div className="adm-val">{data.newThisMonth.toLocaleString()}</div>
          </div>
        </div>
        <div className="adm-card adm-stat">
          <div className="adm-ico amber">👛</div>
          <div>
            <div className="adm-lbl">Total Wallet Balances</div>
            <div className="adm-val">{n(data.walletTotal)}</div>
          </div>
        </div>
      </div>

      <div className="adm-tools">
        <input className="adm-search" placeholder="Search by name or email" value={q} onChange={(e) => { setQ(e.target.value); setShown(50); }} />
      </div>

      <div className="adm-card">
        {list.length === 0 && <div className="adm-sub">No users match.</div>}
        {list.slice(0, shown).map((r) => (
          <div className="adm-tx" key={r.uid}>
            <div className="adm-txi out">{(r.name || r.email || "?").charAt(0).toUpperCase()}</div>
            <div className="adm-txt">
              <b>{r.name || r.email.split("@")[0] || "No name"}</b>
              <span>{r.email || "No email"}</span>
              <span>Joined {joined(r.t)}</span>
            </div>
            <div className="adm-txr">
              <b>{n(r.balance)}</b>
              <span className="adm-sub">Wallet</span>
            </div>
          </div>
        ))}
        {shown < list.length && <button className="adm-btn adm-more" onClick={() => setShown(shown + 50)}>Show more</button>}
      </div>
    </>
  );
}
