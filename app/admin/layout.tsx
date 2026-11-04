"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase"; // same Firebase import the dashboard page uses
import "./admin.css";

// Pages marked soon: true aren't built yet.
const NAV = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/transactions", label: "Transactions", icon: "⇄" },
  { href: "/admin/users", label: "Users", icon: "◔" },
  { href: "/admin/purchases", label: "Purchases", icon: "🛒" },
  { href: "/admin/smspool", label: "SMSPool", icon: "◈", soon: true },
  { href: "/admin/settings", label: "Settings", icon: "⚙", soon: true },
  { href: "/admin/reports", label: "Reports", icon: "▤", soon: true },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  // Pages inside /admin only render once someone is signed in, so they can
  // safely use auth.currentUser. Who is an admin is decided by the API.
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (!u) router.replace("/auth");
        else setReady(true);
      }),
    [router]
  );
  useEffect(() => setOpen(false), [path]);

  if (!ready) return <div className="adm adm-center" style={{ minHeight: "100vh" }}>Loading…</div>;

  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  return (
    <div className="adm">
      <div className={`adm-scrim ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`adm-side ${open ? "open" : ""}`}>
        <div className="adm-logo">▲ Stacksnumbers</div>
        <span className="adm-badge">Admin</span>
        {NAV.map((x) =>
          x.soon ? (
            <span key={x.href} className="adm-nav soon" title="Coming soon">{x.icon} {x.label}</span>
          ) : (
            <Link key={x.href} href={x.href} className={`adm-nav ${active(x.href) ? "on" : ""}`}>
              {x.icon} {x.label}
            </Link>
          )
        )}
        <div className="adm-spacer" />
        <button className="adm-nav" onClick={() => signOut(auth).then(() => router.replace("/auth"))}>⎋ Logout</button>
      </aside>
      <main className="adm-main">
        <div className="adm-mbar">
          <button className="adm-burger" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <b>Admin</b>
        </div>
        {children}
      </main>
    </div>
  );
}
