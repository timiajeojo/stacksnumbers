"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  ShoppingCart,
  Phone,
  Wallet,
  User,
  LayoutGrid,
  ArrowDownToLine,
  CheckCircle2,
  Package,
  Send,
  MessageSquareCode,
} from "lucide-react";
import DrawerUser from "../components/DrawerUser";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid, active: true },
  { label: "Deposits", href: "/dashboard/deposits", icon: ArrowDownToLine },
  { label: "Verifications", href: "/dashboard/verifications", icon: CheckCircle2 },
  { label: "Rentals", href: "#", icon: Package },
];

function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function DashboardPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [communityDismissed, setCommunityDismissed] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/auth");
        return;
      }
      setName(u.displayName || "");
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setBalance(typeof data.walletBalance === "number" ? data.walletBalance : 0);
          if (!u.displayName && data.fullName) setName(data.fullName);
        } else {
          setBalance(0);
        }
      } catch {
        setBalance(0);
      }
    });
    return () => unsub();
  }, [router]);

  return (
    <>
      <div
        className={`dashboard-backdrop ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      <nav className={`drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-brand">
          <div className="logo-mark">
            <MessageSquareCode size={16} strokeWidth={2.5} />
          </div>
          <span>stacksnumbers</span>
        </div>

        <div className="drawer-label">NAVIGATION</div>
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`drawer-item ${item.active ? "active" : ""}`}
          >
            <div className="left">
              <item.icon size={18} />
              {item.label}
            </div>
            {item.active && <span className="dot" />}
          </a>
        ))}

        <div className="drawer-bottom">
          <DrawerUser />
        </div>
      </nav>

      <div className="dashboard-app">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setDrawerOpen(true)}>
            <Menu size={17} />
          </button>
          <div className="logo">
            <span className="logo-mark">
              <MessageSquareCode size={12} strokeWidth={2.5} />
            </span>
            stacksnumbers
          </div>
          <div className="icon-btn">{(name || "T").charAt(0).toUpperCase()}</div>
        </div>

        <div className="page-head">
          <h1>Dashboard</h1>
          <p>Welcome back! Here&apos;s your overview.</p>
        </div>

        <main className="dashboard-main">
          <div className="wallet-card">
            <div className="wallet-top">
              <span className="lbl">Wallet Balance</span>
              <div className="wallet-icon">
                <Wallet size={15} />
              </div>
            </div>
            <div className="wallet-amount mono">
              {balance === null ? "—" : formatNaira(balance)}
            </div>
            <a href="/dashboard/deposits" className="topup-btn">
              Top Up
            </a>
          </div>

          <div className="section-label">
            <h2>Quick Actions</h2>
            <p>Get started with these common tasks</p>
          </div>
          <div className="qa-grid">
            <a href="/dashboard/buy-number" className="qa-card qa-buy">
              <div className="qa-icon">
                <ShoppingCart size={17} />
              </div>
              <span className="label">Buy Number</span>
            </a>
            <a href="/dashboard/verifications" className="qa-card qa-numbers">
              <div className="qa-icon">
                <Phone size={16} />
              </div>
              <span className="label">My Numbers</span>
            </a>
            <a href="/dashboard/deposits" className="qa-card qa-wallet">
              <div className="qa-icon">
                <Wallet size={16} />
              </div>
              <span className="label">Wallet</span>
            </a>
            <a href="/dashboard/profile" className="qa-card qa-profile">
              <div className="qa-icon">
                <User size={16} />
              </div>
              <span className="label">Profile</span>
            </a>
          </div>

          {!communityDismissed && (
            <div className="community-card">
              <button
                className="close"
                onClick={() => setCommunityDismissed(true)}
              >
                <X size={14} />
              </button>
              <p>
                Join our Whatsapp Group for customer support and quick
                updates on available numbers.
              </p>
                <a
                  href="https://chat.whatsapp.com/E9SIS7FjeGA8C2u2f2kbcE?s=cl&p=a&mlu=4"
                   target="_blank"
                   rel="noopener noreferrer"
                    className="telegram-btn"
                    >
                     <Send size={14} />
                      Join Whatsapp Group →
                    </a>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
