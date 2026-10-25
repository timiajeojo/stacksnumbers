"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import {
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowDown,
  ArrowUp,
  Check,
  X,
  CheckCircle2,
  Timer,
  Landmark,
  Phone,
  LayoutGrid,
  ArrowDownToLine,
  Package,
  Diamond,
  MessageSquareCode,
} from "lucide-react";
import DrawerUser from "../../components/DrawerUser";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, any>) => { openIframe: () => void };
    };
  }
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Deposits", href: "/dashboard/deposits", icon: ArrowDownToLine, active: true },
  { label: "Verifications", href: "/dashboard/verifications", icon: CheckCircle2 },
  { label: "Rentals", href: "#", icon: Package },
];

type Tx = {
  id: string;
  kind: "credit" | "debit";
  status: "ok" | "pending";
  method: string;
  amount: number;
  createdAt: Date | null;
  completed: boolean;
};

const statusOptions = [
  { value: "all", label: "All Status", icon: null },
  { value: "ok", label: "Success", icon: CheckCircle2 },
  { value: "pending", label: "Pending", icon: Timer },
];

const paymentOptions = [
  { value: "all", label: "All Payment Methods" },
  { value: "Paystack", label: "Paystack" },
];

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(d: Date | null) {
  if (!d) return "Just now";
  return d.toLocaleString("en-NG", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DepositsPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const filterRowRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [paystackReady, setPaystackReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (filterRowRef.current && !filterRowRef.current.contains(target)) {
        setStatusOpen(false);
        setPaymentOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/auth");
        return;
      }
      setUser(u);
    });
    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const unsubBalance = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setBalance(snap.exists() ? snap.data().walletBalance || 0 : 0);
    });

    const txQuery = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsubTx = onSnapshot(txQuery, (snap) => {
      setTransactions(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            kind: data.kind,
            status: data.status,
            method: data.method,
            amount: data.amount,
            completed: data.completed,
            createdAt: data.createdAt?.toDate?.() || null,
          };
        })
      );
    });

    return () => {
      unsubBalance();
      unsubTx();
    };
  }, [user]);

  function openTopUp() {
    setAmount("");
    setPayError("");
    setModalOpen(true);
  }

  async function handlePay() {
    if (!user || !user.email) return;
    const naira = Number(amount);
    if (!naira || naira < 100) {
      setPayError("Enter an amount of at least ₦100.");
      return;
    }
    if (!paystackReady || !window.PaystackPop) {
      setPayError("Payment is still loading — try again in a moment.");
      return;
    }

    setPayError("");
    setPayLoading(true);

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: Math.round(naira * 100), // Paystack expects kobo
      currency: "NGN",
      callback: (response: { reference: string }) => {
        (async () => {
          try {
            const res = await fetch("/api/paystack/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reference: response.reference,
                uid: user.uid,
              }),
            });
            if (!res.ok) throw new Error("Verification failed");
            setModalOpen(false);
            // Balance and transaction list update automatically via the
            // onSnapshot listeners once Firestore is credited.
          } catch {
            setPayError(
              "Payment received but verification failed — contact support with your reference: " +
                response.reference
            );
          } finally {
            setPayLoading(false);
          }
        })();
      },
      onClose: () => {
        setPayLoading(false);
      },
    });
    handler.openIframe();
  }

  return (
    <>
      <Script
        src="https://js.paystack.co/v1/inline.js"
        strategy="afterInteractive"
        onLoad={() => setPaystackReady(true)}
      />

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
          <div className="icon-btn">T</div>
        </div>

        <div className="page-head">
          <h1>My Wallet</h1>
          <p>Manage your wallet balance and transactions</p>
        </div>

        <main className="dashboard-main">
          <div className="balance-hero">
            <div className="bh-top">
              <span className="lbl">Current Balance</span>
              <div className="bh-icon">
                <Diamond size={15} />
              </div>
            </div>
            <div className="bh-amount mono">{formatNaira(balance)}</div>
            <div className="bh-caption">Available for renting numbers</div>
            <div className="bh-actions">
              <button className="btn-topup" onClick={openTopUp}>
                + Top Up
              </button>
            </div>
          </div>

          <div className="section-label">
            <h2>Recent Transactions</h2>
            <p>View all your deposit transactions</p>
          </div>

          <div className="search-box">
            <Search size={14} />
            Search transactions…
          </div>

          <div className="filter-row" ref={filterRowRef}>
            <div className="filter-wrap">
              <div
                className="filter-select"
                onClick={() => {
                  setPaymentOpen(false);
                  setStatusOpen((v) => !v);
                }}
              >
                {statusOptions.find((s) => s.value === statusFilter)?.label}
                <ChevronDown className="chev" size={14} />
              </div>
              {statusOpen && (
                <div className="filter-menu">
                  {statusOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`filter-menu-item ${
                        statusFilter === opt.value ? "selected" : ""
                      }`}
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setPage(1);
                        setStatusOpen(false);
                      }}
                    >
                      <div className="left">
                        {opt.icon && <opt.icon size={15} />}
                        {opt.label}
                      </div>
                      {statusFilter === opt.value && (
                        <Check size={14} className="check" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-wrap">
              <div
                className="filter-select"
                onClick={() => {
                  setStatusOpen(false);
                  setPaymentOpen((v) => !v);
                }}
              >
                {paymentOptions.find((p) => p.value === paymentFilter)?.label}
                <ChevronDown className="chev" size={14} />
              </div>
              {paymentOpen && (
                <div className="filter-menu">
                  {paymentOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`filter-menu-item ${
                        paymentFilter === opt.value ? "selected" : ""
                      }`}
                      onClick={() => {
                        setPaymentFilter(opt.value);
                        setPage(1);
                        setPaymentOpen(false);
                      }}
                    >
                      <div className="left">{opt.label}</div>
                      {paymentFilter === opt.value && (
                        <Check size={14} className="check" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="tx-list">
            {(() => {
              const filtered = transactions.filter((tx) => {
                if (statusFilter !== "all" && tx.status !== statusFilter)
                  return false;
                if (paymentFilter !== "all" && tx.method !== paymentFilter)
                  return false;
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--paper-dim)",
                      fontSize: "13.5px",
                      padding: "24px 0",
                    }}
                  >
                    {transactions.length === 0
                      ? "No transactions yet."
                      : "No transactions match your filters."}
                  </div>
                );
              }

              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const currentPage = Math.min(page, totalPages);
              const pageItems = filtered.slice(
                (currentPage - 1) * PAGE_SIZE,
                currentPage * PAGE_SIZE
              );
              const pageNumbers: number[] = [];
              for (
                let p = Math.max(1, currentPage - 1);
                p <= Math.min(totalPages, currentPage + 1);
                p++
              ) {
                pageNumbers.push(p);
              }

              return (
                <>
                  {pageItems.map((tx) => (
                    <div className="tx-card" key={tx.id}>
                      <div className="tx-top">
                        <div className="tx-top-left">
                          <div className={`tx-icon ${tx.kind}`}>
                            {tx.kind === "credit" ? (
                              <ArrowDown size={15} />
                            ) : (
                              <ArrowUp size={15} />
                            )}
                          </div>
                          <span className="tx-type">
                            {tx.kind === "credit" ? "Credit" : "Debit"}
                          </span>
                          <span className={`status-pill ${tx.status}`}>
                            <span className="d" />
                            {tx.status === "ok" ? "Success" : "Pending"}
                          </span>
                        </div>
                        <div className="tx-top-right">
                          {tx.completed && (
                            <span className="comp-pill">
                              <Check size={11} /> Completed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="tx-meta-row">
                        {tx.method.startsWith("Number rental") ? (
                          <Phone size={13} />
                        ) : (
                          <Landmark size={13} />
                        )}
                        {tx.method}
                      </div>
                      <div className="tx-grid">
                        <div>
                          <div className="lbl">Amount</div>
                          <div
                            className={`val mono ${
                              tx.kind === "credit" ? "pos" : "neg"
                            }`}
                          >
                            {tx.kind === "credit" ? "+" : "-"}
                            {formatNaira(tx.amount)}
                          </div>
                        </div>
                        <div>
                          <div className="lbl">Date</div>
                          <div className="val date">{formatDate(tx.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {totalPages > 1 && (
                    <div className="pagination" style={{ justifyContent: "center", marginTop: "8px" }}>
                      <div className="pg-nav">
                        <button
                          className="pg-btn"
                          disabled={currentPage === 1}
                          onClick={() => setPage(1)}
                        >
                          <ChevronsLeft size={15} />
                        </button>
                        <button
                          className="pg-btn"
                          disabled={currentPage === 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={15} />
                        </button>
                        {pageNumbers.map((p) => (
                          <button
                            key={p}
                            className={`pg-btn ${p === currentPage ? "active" : ""}`}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          className="pg-btn"
                          disabled={currentPage === totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          <ChevronRight size={15} />
                        </button>
                        <button
                          className="pg-btn"
                          disabled={currentPage === totalPages}
                          onClick={() => setPage(totalPages)}
                        >
                          <ChevronsRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </main>
      </div>

      <div
        className={`topup-modal-backdrop ${modalOpen ? "open" : ""}`}
        onClick={() => !payLoading && setModalOpen(false)}
      />
      <div className={`topup-modal ${modalOpen ? "open" : ""}`}>
        <button
          className="topup-modal-close"
          onClick={() => !payLoading && setModalOpen(false)}
        >
          <X size={15} />
        </button>
        <h3>Top Up Wallet</h3>
        <div className="sub">Fund your wallet securely via Paystack.</div>

        {payError && (
          <div
            style={{
              background: "rgba(255,92,92,0.1)",
              border: "1px solid rgba(255,92,92,0.35)",
              color: "#ff9b9b",
              fontSize: "12.5px",
              borderRadius: "9px",
              padding: "10px 14px",
              marginBottom: "16px",
            }}
          >
            {payError}
          </div>
        )}

        <div className="field">
          <label>Amount</label>
          <div className="amount-input">
            <span>₦</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="topup-quick">
          {[1000, 5000, 10000, 20000].map((v) => (
            <button key={v} onClick={() => setAmount(String(v))}>
              ₦{v.toLocaleString()}
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: "100%" }}
          onClick={handlePay}
          disabled={payLoading}
        >
          {payLoading ? "Processing…" : "Proceed to Pay"}
        </button>
      </div>
    </>
  );
}
