"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Drawer from "../components/Drawer";

const API = process.env.NEXT_PUBLIC_API_URL || "";

interface Txn {
  id: string;
  type: string;
  amount: number; // kobo, negative for money going out
  status: string;
  createdAt: string;
}

const naira = (kobo: number) =>
  (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLOR: Record<string, string> = {
  completed: "#22c55e",
  pending: "#f59e0b",
  failed: "#f87171",
  abandoned: "#94a3b8",
};

// Square chevron button used for page navigation.
const pageBtnStyle = (primary: boolean, disabled: boolean): CSSProperties => ({
  width: 44,
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.35 : 1,
  color: primary ? "#fff" : "var(--text, #fff)",
  background: primary ? "var(--blue, #3D8FFF)" : "var(--surface-2, rgba(128,128,128,0.15))",
  border: primary ? "none" : "1px solid var(--border-strong, rgba(128,128,128,0.4))",
});

const typeLabel = (t: string) =>
  t === "deposit" ? "Deposit" : t === "purchase" ? "Purchase" : t.charAt(0).toUpperCase() + t.slice(1);

export default function WalletPage() {
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatar, setAvatar] = useState("U");
  const [balance, setBalance] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [funding, setFunding] = useState(false);
  const [payMsg, setPayMsg] = useState<{ type: "ok" | "error" | "info"; text: string } | null>(null);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  const loadWallet = useCallback(
    async (pageNum: number) => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      setLoadingPage(true);
      try {
        const res = await fetch(`${API}/api/wallet?page=${pageNum}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("wallet failed");
        const data = await res.json();
        setBalance(data.balance || 0);
        setTotalDeposits(data.totalDeposits || 0);
        setTotalSpent(data.totalSpent || 0);
        setTxns(Array.isArray(data.transactions) ? data.transactions : []);
        setPage(data.page || pageNum);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setLoaded(true);
        setLoadingPage(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function loadUser() {
      try {
        const response = await fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        const user = await response.json();
        setAvatar(user?.email?.[0]?.toUpperCase() || "U");
      } catch {
        setAvatar("U");
      }
    }
    loadUser();
    loadWallet(1);

    // Coming back from Paystack: the URL has ?reference=... so confirm that payment.
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (reference) {
      window.history.replaceState({}, "", window.location.pathname);
      confirmPayment(reference, token);
    }

    async function confirmPayment(ref: string, authToken: string) {
      setPayMsg({ type: "info", text: "Confirming your payment..." });
      try {
        const res = await fetch(`${API}/api/wallet/verify?reference=${encodeURIComponent(ref)}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.status === "completed") {
          setPayMsg({ type: "ok", text: "Payment successful. Your balance has been updated." });
        } else if (res.ok && data.status === "failed") {
          setPayMsg({ type: "error", text: "Payment failed. You were not charged." });
        } else if (res.ok) {
          setPayMsg({ type: "info", text: "Your payment is still being confirmed. Refresh in a moment." });
        } else {
          setPayMsg({ type: "error", text: data.error || "Couldn't confirm your payment right now." });
        }
      } catch {
        setPayMsg({ type: "error", text: "Network error while confirming your payment." });
      }
      loadWallet(1);
    }
  }, [router, loadWallet]);

  function openDepositModal() {
    setDepositAmount("");
    setDepositModalOpen(true);
  }

  function closeDepositModal() {
    if (funding) return;
    setDepositModalOpen(false);
  }

  async function confirmDeposit() {
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setFunding(true);
    try {
      const res = await fetch(`${API}/api/wallet/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(`${data.error || "Failed to start payment."}\n\n${data.detail || ""}`);
        setFunding(false);
        return;
      }

      window.location.href = data.checkout_url;
    } catch {
      alert("Something went wrong. Try again.");
      setFunding(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <>
      {/* Navigation */}
      <nav className="dash">
        <div className="nav-left">
          <button
            className="burger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <Link href="/dashboard" className="logo">
          <span className="mark">S</span>
          StacksLogs
        </Link>

        <div className="nav-right">
          <div className="avatar">{avatar}</div>
        </div>
      </nav>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} active="wallet" onLogout={logout} />

      {/* Main */}
      <main className="wallet-main">
        {payMsg && (
          <div
            style={{
              margin: "0 0 14px",
              padding: "12px 14px",
              borderRadius: 12,
              fontSize: 14,
              border: "1px solid var(--border-strong, rgba(128,128,128,0.4))",
              color: payMsg.type === "ok" ? "#22c55e" : payMsg.type === "error" ? "#f87171" : "var(--text, #fff)",
            }}
          >
            {payMsg.text}
          </div>
        )}
        <div className="wallet-head-card">
          <div className="wallet-head-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
              <path d="M2.5 10.5h19" />
              <path d="M6 15h4" />
            </svg>
          </div>

          <div className="wallet-head-text">
            <h1>Balance activity</h1>
            <p>Top-ups, spending, and balance activity</p>
          </div>

          <button className="btn btn-blue wallet-deposit-btn" onClick={openDepositModal} disabled={funding}>
            {funding ? "Redirecting..." : "+ Deposit money"}
          </button>
        </div>

        {/* Balance statistics */}
        <div className="balance-grid">
          <div className="balance-stat">
            <div className="balance-stat-icon wallet">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
                <path d="M2.5 10.5h19" />
                <path d="M6 15h4" />
              </svg>
            </div>
            <div className="balance-stat-amount"><span>₦</span>{naira(balance)}</div>
            <div className="balance-stat-label">Current balance</div>
          </div>

          <div className="balance-stat">
            <div className="balance-stat-icon deposit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10" />
                <path d="M8.5 10.5c0-1.7 1.6-3 3.5-3s3.5 1 3.5 2.3c0 3-7 1.4-7 4.3 0 1.4 1.6 2.4 3.5 2.4s3.5-1 3.5-2.4" />
              </svg>
            </div>
            <div className="balance-stat-amount"><span>₦</span>{naira(totalDeposits)}</div>
            <div className="balance-stat-label">Total deposit</div>
          </div>

          <div className="balance-stat">
            <div className="balance-stat-icon used">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="18" cy="20" r="1.4" />
                <path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6" />
              </svg>
            </div>
            <div className="balance-stat-amount"><span>₦</span>{naira(totalSpent)}</div>
            <div className="balance-stat-label">Used</div>
          </div>
        </div>

        {/* Transactions */}
        <div className="history-card">
          <div className="history-head">
            <div className="history-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h13l-3-3" />
                <path d="M17 17H4l3 3" />
              </svg>
            </div>
            <h2>Recent transactions</h2>
          </div>

          {!loaded && <p style={{ color: "var(--text-muted)", padding: 16 }}>Loading transactions...</p>}
          {loaded && loadError && (
            <p style={{ color: "var(--text-muted)", padding: 16 }}>
              Couldn't load your transactions right now. Please refresh in a moment.
            </p>
          )}

          {loaded && !loadError && txns.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
                  <path d="M16.5 12.5h.01" />
                  <path d="M2.5 10.5h19" />
                </svg>
              </div>
              <h3>No data available</h3>
              <p>No transactions yet.</p>
            </div>
          )}

          {loaded && !loadError && txns.length > 0 && (
            <div style={{ opacity: loadingPage ? 0.6 : 1 }}>
              {txns.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderTop: i === 0 ? "none" : "1px solid var(--border, rgba(128,128,128,0.2))",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{typeLabel(t.type)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      {new Date(t.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: t.amount < 0 ? "var(--text, #fff)" : "#22c55e" }}>
                      {t.amount < 0 ? "-" : "+"}₦{naira(Math.abs(t.amount))}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: STATUS_COLOR[t.status] || "var(--text-muted)" }}>
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </div>
                  </div>
                </div>
              ))}

            </div>
          )}

          {loaded && !loadError && txns.length > 0 && totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: "16px",
                borderTop: "1px solid var(--border-strong, rgba(128,128,128,0.3))",
              }}
            >
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1 || loadingPage}
                onClick={() => loadWallet(page - 1)}
                style={pageBtnStyle(false, page <= 1 || loadingPage)}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>

              <span style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", minWidth: 110 }}>
                Page {page} of {totalPages}
                <br />
                {totalCount} transactions
              </span>

              <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages || loadingPage}
                onClick={() => loadWallet(page + 1)}
                style={pageBtnStyle(true, page >= totalPages || loadingPage)}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="foot-inner">
          <span>©2026 StacksLogs</span>
        </div>
      </footer>

      {depositModalOpen && (
        <div className="modal-overlay" onClick={closeDepositModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Deposit money</h3>
              <button className="modal-close" onClick={closeDepositModal} aria-label="Close">✕</button>
            </div>

            <p className="modal-sub">Enter the amount you want to add to your wallet.</p>

            <div className="modal-input-shell">
              <span className="modal-input-prefix">₦</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                autoFocus
                disabled={funding}
              />
            </div>

            <div className="modal-quick-amounts">
              {[1000, 5000, 10000, 25000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="modal-quick-btn"
                  onClick={() => setDepositAmount(String(amt))}
                  disabled={funding}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={closeDepositModal} disabled={funding}>Cancel</button>
              <button className="btn btn-blue" onClick={confirmDeposit} disabled={funding}>
                {funding ? "Redirecting..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
