"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ChevronDown, Settings, LogOut } from "lucide-react";
import { auth, db } from "../lib/firebase";

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
    <div className="drawer-user-wrap" ref={wrapRef}>
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
  );
}
