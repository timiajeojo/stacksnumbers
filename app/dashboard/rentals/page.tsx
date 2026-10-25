"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, limit, Timestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Plus,
  Check,
  Timer,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LayoutGrid,
  ArrowDownToLine,
  Package,
  MessageSquareCode,
} from "lucide-react";
import DrawerUser from "../../components/DrawerUser";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Deposits", href: "/dashboard/deposits", icon: ArrowDownToLine },
  { label: "Verifications", href: "/dashboard/verifications", icon: CheckCircle2 },
  { label: "Rentals", href: "#", icon: Package, active: true },
];

type RentalStatus = "pending" | "active" | "expired" | "cancelled";

type Rental = {
  id: string;
  number: string;
  country: string;
  status: RentalStatus;
  expiresAt: number | null;
  purchasedAt: Timestamp | null;
};

const statusOptions: { value: RentalStatus; label: string; icon: any }[] = [
  { value: "pending", label: "Pending", icon: Timer },
  { value: "active", label: "Active", icon: CheckCircle2 },
  { value: "expired", label: "Expired", icon: AlertCircle },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

function formatExpiration(ms: number | null): string {
  if (!ms) return "—";
  const date = new Date(ms);
  const isPast = ms < Date.now();
  const formatted = date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return isPast ? `${formatted} (expired)` : formatted;
}

const PAGE_SIZE = 10;

export default function RentalsPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState("");
  const [checkedStatuses, setCheckedStatuses] = useState<RentalStatus[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      const q = query(
        collection(db, "users", user.uid, "longTermRentals"),
        orderBy("purchasedAt", "desc"),
        limit(200)
      );
      const unsubRentals = onSnapshot(q, (snap) => {
        setRentals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rental)));
        setLoading(false);
      });
      return () => unsubRentals();
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setStatusFilterOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  function toggleStatus(value: RentalStatus) {
    setCheckedStatuses((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    setPage(1);
  }

  const filteredStatusOptions = statusOptions.filter((s) =>
    s.label.toLowerCase().includes(statusSearch.toLowerCase())
  );

  const filtered = rentals.filter((r) => {
    if (checkedStatuses.length > 0 && !checkedStatuses.includes(r.status))
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!`${r.number} ${r.country}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Small window of page numbers around the current page
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
          <h1>Rentals</h1>
          <p>View and manage your currently rented phone numbers.</p>
        </div>

        <main className="dashboard-main">
          <a
            href="/dashboard/rentals/new"
            className="btn-purchase enabled"
            style={{ textDecoration: "none" }}
          >
            + Purchase New Rental
          </a>

          <div className="filter-chip-row" ref={filterRef}>
            <button
              className="filter-chip"
              onClick={() => setStatusFilterOpen((v) => !v)}
            >
              <Plus size={14} />
              Status
              {checkedStatuses.length > 0 && ` (${checkedStatuses.length})`}
            </button>

            {statusFilterOpen && (
              <div className="status-filter-panel">
                <div className="status-filter-search">
                  <Search size={14} />
                  <input
                    placeholder="Status"
                    value={statusSearch}
                    onChange={(e) => setStatusSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="status-filter-list">
                  {filteredStatusOptions.map((opt) => {
                    const checked = checkedStatuses.includes(opt.value);
                    return (
                      <div
                        key={opt.value}
                        className="status-filter-item"
                        onClick={() => toggleStatus(opt.value)}
                      >
                        <div className={`chk ${checked ? "checked" : ""}`}>
                          {checked && <Check size={11} />}
                        </div>
                        <opt.icon size={15} />
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
                <div className="status-filter-footer">
                  <button onClick={() => setStatusFilterOpen(false)}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="search-box">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by number or country…"
              style={{
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--paper)",
                fontSize: "13.5px",
                width: "100%",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div className="table-wrap">
            <div className="tbl-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>State</th>
                    <th>Country</th>
                    <th>Expiration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center" }}>
                        Loading…
                      </td>
                    </tr>
                  ) : pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center" }}>
                        {rentals.length === 0
                          ? "No rentals yet."
                          : "No rentals match your filters."}
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((r) => (
                      <tr key={r.id}>
                        <td className="mono" style={{ textAlign: "left" }}>
                          {r.number}
                        </td>
                        <td style={{ textAlign: "left" }}>
                          <span className={`status-tag ${r.status}`}>
                            {statusOptions.find((s) => s.value === r.status)
                              ?.label || r.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "left" }}>{r.country}</td>
                        <td style={{ textAlign: "left" }}>
                          {formatExpiration(r.expiresAt)}
                        </td>
                        <td style={{ textAlign: "left" }}>
                          <button className="manage-btn">Manage</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="scrollbar">
            <i />
          </div>

          <div className="pagination" style={{ justifyContent: "center" }}>
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
        </main>
      </div>
    </>
  );
}
