"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  Menu,
  ChevronDown,
  ChevronLeft,
  ShoppingCart,
  Search,
  LayoutGrid,
  ArrowDownToLine,
  CheckCircle2,
  Package,
  MessageSquareCode,
} from "lucide-react";
import DrawerUser from "../../components/DrawerUser";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Deposits", href: "/dashboard/deposits", icon: ArrowDownToLine },
  { label: "Verifications", href: "/dashboard/verifications", icon: CheckCircle2 },
  { label: "Rentals", href: "#", icon: Package },
];

type Country = { id: number; name: string; code: string; region: string };
type Service = { id: number; name: string };

function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Converts a 2-letter country code into its flag emoji via Unicode regional
// indicator symbols — no image assets or extra libraries needed.
function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🌐";
  const points = [...code.toUpperCase()].map(
    (c) => 127397 + c.charCodeAt(0)
  );
  return String.fromCodePoint(...points);
}

export default function BuyNumberPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState("");

  const [country, setCountry] = useState("");
  const [service, setService] = useState("");

  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const countryRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  const [priceNaira, setPriceNaira] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");

  const ready = country !== "" && service !== "" && priceNaira !== null;

  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  async function handlePurchase() {
    if (!auth.currentUser) {
      router.push("/auth");
      return;
    }
    setPurchasing(true);
    setPurchaseError("");
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/smspool/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ country, service }),
      });
      const data = await res.json();
      if (data.error) {
        setPurchaseError(data.error);
      } else {
        router.push("/dashboard/verifications");
      }
    } catch {
      setPurchaseError("Something went wrong. Please try again.");
    } finally {
      setPurchasing(false);
    }
  }

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (countryRef.current && !countryRef.current.contains(target)) {
        setCountryOpen(false);
      }
      if (serviceRef.current && !serviceRef.current.contains(target)) {
        setServiceOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const selectedCountry = countries.find((c) => String(c.id) === country);
  const selectedService = services.find((s) => String(s.id) === service);

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // Load countries once on mount
  useEffect(() => {
    let cancelled = false;
    setCountriesLoading(true);
    setCountriesError("");

    fetch("/api/smspool/countries")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setCountriesError(data.error);
        } else {
          setCountries(data.countries || []);
        }
      })
      .catch(() => {
        if (!cancelled) setCountriesError("Couldn't load countries. Try again.");
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load services whenever the selected country changes
  useEffect(() => {
    setService("");
    setServices([]);
    setPriceNaira(null);

    if (!country) return;

    let cancelled = false;
    setServicesLoading(true);
    setServicesError("");

    fetch(`/api/smspool/services?country=${country}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setServicesError(data.error);
        } else {
          setServices(data.services || []);
        }
      })
      .catch(() => {
        if (!cancelled) setServicesError("Couldn't load services. Try again.");
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [country]);

  // Load price whenever country + service are both selected
  useEffect(() => {
    setPriceNaira(null);

    if (!country || !service) return;

    let cancelled = false;
    setPriceLoading(true);
    setPriceError("");

    fetch(`/api/smspool/pricing?country=${country}&service=${service}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setPriceError(data.error);
        } else {
          setPriceNaira(data.priceNaira);
        }
      })
      .catch(() => {
        if (!cancelled) setPriceError("Couldn't load pricing. Try again.");
      })
      .finally(() => {
        if (!cancelled) setPriceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [country, service]);

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
          <span>stacksnumber</span>
        </div>

        <div className="drawer-label">NAVIGATION</div>
        {navItems.map((item) => (
          <a key={item.label} href={item.href} className="drawer-item">
            <div className="left">
              <item.icon size={18} />
              {item.label}
            </div>
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
            stacksnumber
          </div>
          <div className="icon-btn">T</div>
        </div>

        <div className="page-head">
          <h1>Rent a Phone Number</h1>
          <p>Choose a country and service to get started</p>
        </div>

        <main className="dashboard-main">
          <div className="flow-box">
            <div className="flow-head">
              <a href="/dashboard" className="back-btn">
                <ChevronLeft size={18} />
              </a>
              <div>
                <div className="flow-title">Rent a Phone Number</div>
              </div>
            </div>

            <div className="field select-wrap" ref={countryRef}>
              <label>Select Country</label>
              <button
                type="button"
                className={`select-trigger ${!selectedCountry ? "placeholder" : ""} ${
                  countriesLoading || countriesError ? "disabled" : ""
                }`}
                disabled={countriesLoading || !!countriesError}
                onClick={() => {
                  setServiceOpen(false);
                  setCountryOpen((v) => !v);
                }}
              >
                <span className="label-text">
                  {selectedCountry && (
                    <span className="flag">{flagEmoji(selectedCountry.code)}</span>
                  )}
                  {countriesLoading
                    ? "Loading countries…"
                    : countriesError
                    ? "Couldn't load countries"
                    : selectedCountry
                    ? selectedCountry.name
                    : "Select a country..."}
                </span>
                <ChevronDown className="chev" size={14} />
              </button>

              {countryOpen && (
                <div className="select-dropdown">
                  <div className="select-dropdown-search">
                    <Search size={14} />
                    <input
                      placeholder="Search countries…"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="select-dropdown-list">
                    {filteredCountries.length === 0 ? (
                      <div className="select-dropdown-empty">No countries found</div>
                    ) : (
                      filteredCountries.map((c) => (
                        <div
                          key={c.id}
                          className={`select-dropdown-item ${
                            country === String(c.id) ? "selected" : ""
                          }`}
                          onClick={() => {
                            setCountry(String(c.id));
                            setCountryOpen(false);
                            setCountrySearch("");
                          }}
                        >
                          <span className="flag">{flagEmoji(c.code)}</span>
                          {c.name}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {countriesError && (
                <div style={{ color: "#ff9b9b", fontSize: "12.5px", marginTop: "8px" }}>
                  {countriesError}
                </div>
              )}
            </div>

            <div className="field select-wrap" ref={serviceRef}>
              <label>Select Service</label>
              <button
                type="button"
                className={`select-trigger ${!selectedService ? "placeholder" : ""} ${
                  !country || servicesLoading || servicesError ? "disabled" : ""
                }`}
                disabled={!country || servicesLoading || !!servicesError}
                onClick={() => {
                  setCountryOpen(false);
                  setServiceOpen((v) => !v);
                }}
              >
                <span className="label-text">
                  {!country
                    ? "Select a country first"
                    : servicesLoading
                    ? "Loading services…"
                    : servicesError
                    ? "Couldn't load services"
                    : selectedService
                    ? selectedService.name
                    : "Select a service..."}
                </span>
                <ChevronDown className="chev" size={14} />
              </button>

              {serviceOpen && (
                <div className="select-dropdown">
                  <div className="select-dropdown-search">
                    <Search size={14} />
                    <input
                      placeholder="Search services…"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="select-dropdown-list">
                    {filteredServices.length === 0 ? (
                      <div className="select-dropdown-empty">No services found</div>
                    ) : (
                      filteredServices.map((s) => (
                        <div
                          key={s.id}
                          className={`select-dropdown-item ${
                            service === String(s.id) ? "selected" : ""
                          }`}
                          onClick={() => {
                            setService(String(s.id));
                            setServiceOpen(false);
                            setServiceSearch("");
                          }}
                        >
                          {s.name}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {servicesError && (
                <div style={{ color: "#ff9b9b", fontSize: "12.5px", marginTop: "8px" }}>
                  {servicesError}
                </div>
              )}
            </div>

            {(priceLoading || priceNaira !== null || priceError) && (
              <div className={`price-box ${priceNaira !== null ? "show" : ""}`} style={{ display: "flex" }}>
                {priceLoading ? (
                  <div className="lbl">Checking price…</div>
                ) : priceError ? (
                  <div style={{ color: "#ff9b9b", fontSize: "13px" }}>{priceError}</div>
                ) : (
                  <>
                    <div>
                      <div className="lbl">COST</div>
                      <div className="cost mono">{formatNaira(priceNaira!)}</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {purchaseError && (
              <div
                style={{
                  background: "rgba(255,92,92,0.1)",
                  border: "1px solid rgba(255,92,92,0.35)",
                  color: "#ff9b9b",
                  fontSize: "13px",
                  borderRadius: "9px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                }}
              >
                {purchaseError}
              </div>
            )}

            <button
              className={`btn-purchase ${ready && !purchasing ? "enabled" : ""}`}
              disabled={!ready || purchasing}
              onClick={handlePurchase}
            >
              <ShoppingCart size={16} />
              {purchasing ? "Purchasing…" : "Purchase Number"}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
