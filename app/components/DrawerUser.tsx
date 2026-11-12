"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ChevronDown, Settings, LogOut, MessageSquare, Headphones, Users } from "lucide-react";
import { auth, db } from "../lib/firebase";

// ─────────────────────────────────────────────────────────────
// PUT YOUR LINKS HERE. While a link is empty, its item shows
// greyed out and does nothing.
// ─────────────────────────────────────────────────────────────
const BUY_LOGS_URL = "https://stackslogs.vercel.app/"; // Services → Buy logs
const CUSTOMER_CARE_URL = "https://wa.me/2349152308359"; // Support → Customer care
const COMMUNITY_URL = "https://chat.whatsapp.com/E9SIS7FjeGA8C2u2f2kbcE?s=cl&p=a&mlu=4"; // Support → Community

function ExtraItem({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  const inner = (
    <div className="left">
      {icon}
      {label}
    </div>
  );
  if (!href) {
    return (
      <div className="drawer-item" style={{ opacity: 0.5, cursor: "not-allowed" }} title="Link coming soon">
        {inner}
      </div>
    );
  }
  return (
    <a className="drawer-item" href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  );
}

export default function DrawerUser() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setEmail(user.email || "");
      setName(user.displayName || "");
      if (!user.displayName) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists() && snap.data().fullName) {
            setName(snap.data().fullName);
          }
        } catch {
          // Non-fatal — menu still works with just the email
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  async function handleLogout() {
    await signOut(auth);
    router.push("/auth");
  }

  const displayName = name || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <div className="drawer-label" style={{ marginTop: 18 }}>SERVICES</div>
      <ExtraItem href={BUY_LOGS_URL} icon={<MessageSquare size={18} />} label="Buy logs" />

      <div className="drawer-label" style={{ marginTop: 18 }}>SUPPORT</div>
      <ExtraItem href={CUSTOMER_CARE_URL} icon={<Headphones size={18} />} label="Customer care" />
      <ExtraItem href={COMMUNITY_URL} icon={<Users size={18} />} label="Community" />

    <div
      className="drawer-user-wrap"
      ref={wrapRef}
      style={{ marginTop: "auto", borderTop: "1px solid var(--ink-3)", paddingTop: 16 }}
    >
      {open && (
        <div className="drawer-user-menu">
          <div className="dum-header">
            <div className="avatar">{initial}</div>
            <div>
              <div className="name">{displayName}</div>
              <div className="email">{email}</div>
            </div>
          </div>
          <div
            className="dum-item"
            onClick={() => {
              setOpen(false);
              router.push("/dashboard/profile");
            }}
          >
            <Settings size={16} />
            Settings
          </div>
          <div className="dum-item danger" onClick={handleLogout}>
            <LogOut size={16} />
            Log out
          </div>
        </div>
      )}

      <div className="drawer-user" onClick={() => setOpen((v) => !v)}>
        <div className="left">
          <div className="avatar">{initial}</div>
          <div className="name">{displayName}</div>
        </div>
        <ChevronDown size={16} color="var(--paper-dim)" />
      </div>
    </div>
    </>
  );
}
