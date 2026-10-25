"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import {
  Menu,
  X,
  LayoutGrid,
  ArrowDownToLine,
  CheckCircle2,
  Package,
  MessageSquareCode,
} from "lucide-react";
import DrawerUser from "../../../components/DrawerUser";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Deposits", href: "/dashboard/deposits", icon: ArrowDownToLine },
  { label: "Verifications", href: "/dashboard/verifications", icon: CheckCircle2 },
  { label: "Rentals", href: "#", icon: Package, active: true },
];

// SMSPool's rental country list doesn't include an ISO code, so flags are
// derived from a small name lookup. Falls back to a globe icon otherwise.
const COUNTRY_CODE_MAP: Record<string, string> = {
  "United States": "US",
  "United Kingdom": "GB",
  Russia: "RU",
  Canada: "CA",
  Germany: "DE",
  France: "FR",
  Netherlands: "NL",
  Sweden: "SE",
  Kazakhstan: "KZ",
  Indonesia: "ID",
  Romania: "RO",
  Kyrgyzstan: "KG",
  Nigeria: "NG",
  India: "IN",
  China: "CN",
  Poland: "PL",
  Ukraine: "UA",
  Spain: "ES",
  Italy: "IT",
  Brazil: "BR",
};

function flagEmoji(countryName: string): string {
  const code = COUNTRY_CODE_MAP[countryName];
  if (!code) return "🌐";
  const points = [...code].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...points);
}

function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function durationLabel(days: number): string {
  if (days === 1) return "1 Day";
  return `${days} Days`;
}

type RentalOption = {
  id: number;
  name: string;
  tag: string;
  pool: number;
  pricingNaira: Record<string, number>; // days -> Naira, straight from SMSPool
};

export default function NewRentalPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [options, setOptions] = useState<RentalOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeOption, setActiveOption] = useState<RentalOption | null>(null);

  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [stockByDays, setStockByDays] = useState<Record<number, number>>({});

  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  // Single portal only — one source of truth for rental availability.
  useEffect(() => {
    fetch("/api/smspool/rental/countries?type=1")
      .then((r) => r.json())
      .then((data) => setOptions(data.options || []))
      .finally(() => setLoadingCountries(false));
  }, []);

  function openCountry(option: RentalOption) {
    setActiveOption(option);
    setSelectedDays(null);
    setStockByDays({});
    setPurchaseError("");
    setModalOpen(true);

    // Fetch live stock for every duration this country actually offers —
    // no service selection needed, so this can happen immediately.
    Object.keys(option.pricingNaira).forEach((days) => {
      fetch(`/api/smspool/rental/stock?id=${option.id}&days=${days}`)
        .then((r) => r.json())
        .then((data) =>
          setStockByDays((prev) => ({ ...prev, [Number(days)]: data.count || 0 }))
        );
    });
  }

  const availableDurations = activeOption
    ? Object.keys(activeOption.pricingNaira)
        .map(Number)
        .sort((a, b) => a - b)
    : [];

  const priceForSelected =
    activeOption && selectedDays
      ? activeOption.pricingNaira[String(selectedDays)]
      : null;

  const readyToPurchase = !!activeOption && !!selectedDays && !!priceForSelected;

  async function handlePurchase() {
    if (!auth.currentUser || !activeOption || !selectedDays) {
      router.push("/auth");
      return;
    }
    setPurchasing(true);
    setPurchaseError("");
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/smspool/rental/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rentalId: activeOption.id,
          days: selectedDays,
          countryName: activeOption.name,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setPurchaseError(data.error);
      } else {
        router.push("/dashboard/rentals");
      }
    } catch {
      setPurchaseError("Something went wrong. Please try again.");
    } finally {
      setPurchasing(false);
    }
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
          <p>
            It takes upto 24-48 hours to prepare the rentals, in order to
            check your rental status please press on Manage on the rental
            that as to be activated, but usually your rental will be
            activated instantly.
          </p>
        </div>

        <main className="dashboard-main">
          <div className="rental-notice">
            Rent your phone number here, please keep in mind financial
            services are not allowed, Keep in mind to adhere to our fair-use
            policy of a maximum of 25 SMS per day, any more SMS might not be
            shown.
          </div>

          {loadingCountries ? (
            <div style={{ color: "var(--paper-dim)", fontSize: "13.5px" }}>
              Loading countries…
            </div>
          ) : options.length === 0 ? (
            <div style={{ color: "var(--paper-dim)", fontSize: "13.5px" }}>
              No rental countries available right now.
            </div>
          ) : (
            <div className="country-grid">
              {options.map((opt) => (
                <div
                  key={opt.id}
                  className="country-card"
                  onClick={() => openCountry(opt)}
                >
                  <div className="flag">{flagEmoji(opt.name)}</div>
                  <div className="name">{opt.name}</div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <div
        className={`rental-modal-backdrop ${modalOpen ? "open" : ""}`}
        onClick={() => setModalOpen(false)}
      />
      <div className={`rental-modal ${modalOpen ? "open" : ""}`}>
        <div className="rental-modal-head">
          <div>
            <h3>Rentals</h3>
          </div>
          <button className="rental-modal-close" onClick={() => setModalOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="sub">
          {activeOption ? `${activeOption.name} — Long-term Numbers.` : "Long-term Numbers."}
        </div>

        <div className="field">
          <span className="field-label">Select duration</span>
          <div className="duration-grid">
            {availableDurations.map((days) => {
              const priceNaira = activeOption?.pricingNaira[String(days)];
              const stock = stockByDays[days];
              return (
                <button
                  key={days}
                  className={`duration-btn ${selectedDays === days ? "selected" : ""}`}
                  onClick={() => setSelectedDays(days)}
                >
                  <div className="d-label">{durationLabel(days)}</div>
                  <div className="d-price">
                    {priceNaira ? formatNaira(priceNaira) : "—"}
                  </div>
                  <div className="d-stock">
                    {stock !== undefined ? `${stock} in stock` : "Checking stock…"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {purchaseError && (
          <div
            style={{
              background: "rgba(255,92,92,0.1)",
              border: "1px solid rgba(255,92,92,0.35)",
              color: "#ff9b9b",
              fontSize: "13px",
              borderRadius: "9px",
              padding: "10px 14px",
              marginBottom: "4px",
            }}
          >
            {purchaseError}
          </div>
        )}

        <div className="rental-modal-actions">
          <button className="btn-close-outline" onClick={() => setModalOpen(false)}>
            Close
          </button>
          <button
            className={`btn-purchase ${readyToPurchase && !purchasing ? "enabled" : ""}`}
            disabled={!readyToPurchase || purchasing}
            onClick={handlePurchase}
          >
            {purchasing
              ? "Purchasing…"
              : `Purchase (${formatNaira(priceForSelected || 0)})`}
          </button>
        </div>
      </div>
    </>
  );
}
