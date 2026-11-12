"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// Where the two support buttons point. Put the links here, or set these in the frontend environment:
//   NEXT_PUBLIC_SUPPORT_URL    -> Customer care
//   NEXT_PUBLIC_COMMUNITY_URL  -> Community
// While a link is empty, its button shows greyed out and does nothing.
const CUSTOMER_CARE_URL = "https://wa.me/2349152308359";
const COMMUNITY_URL = "https://chat.whatsapp.com/E9SIS7FjeGA8C2u2f2kbcE?s=cl&p=a&mlu=4";

// Buy logs opens the numbers site.
const BUY_LOGS_URL = "https://stacksnumbers.vercel.app";

type Active = "dashboard" | "orders" | "wallet" | "settings";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

const icons = {
  dashboard: (
    <Icon>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </Icon>
  ),
  orders: (
    <Icon>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6" />
    </Icon>
  ),
  wallet: (
    <Icon>
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10.5h19" />
      <path d="M6 15h4" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.65 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.65a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.35 9c.13.47.5.86 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
    </Icon>
  ),
  care: (
    <Icon>
      <path d="M3 13a9 9 0 0 1 18 0" />
      <path d="M21 13v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
      <path d="M3 13v4a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2Z" />
    </Icon>
  ),
  sms: (
    <Icon>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  ),
  community: (
    <Icon>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  ),
  logout: (
    <Icon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  ),
};

/** The slide-out navigation, shared by every signed-in page. */
export default function Drawer({
  open,
  onClose,
  active,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  active?: Active;
  onLogout: () => void;
}) {
  const cls = (a: Active) => `drawer-item${active === a ? " active" : ""}`;

  const external = (href: string, icon: ReactNode, label: string) =>
    href ? (
      <a className="drawer-item" href={href} target="_blank" rel="noopener noreferrer" onClick={onClose}>
        {icon}
        {label}
      </a>
    ) : (
      <div className="drawer-item" style={{ opacity: 0.5, cursor: "not-allowed" }} title="Link coming soon">
        {icon}
        {label}
      </div>
    );

  return (
    <>
      <div className={`drawer-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "open" : ""}`}>
        <div className="drawer-head">
          <Link href="/dashboard" className="logo" onClick={onClose}>
            <span className="mark">S</span>StacksLogs
          </Link>
          <button className="drawer-close" onClick={onClose} aria-label="Close navigation">
            ✕
          </button>
        </div>

        <div className="drawer-section-label">Home</div>
        <Link href="/dashboard" className={cls("dashboard")} onClick={onClose}>
          {icons.dashboard}Dashboard
        </Link>

        <div className="drawer-section-label">Account</div>
        <Link href="/orders" className={cls("orders")} onClick={onClose}>
          {icons.orders}My orders
        </Link>
        <Link href="/wallet" className={cls("wallet")} onClick={onClose}>
          {icons.wallet}Add funds
        </Link>
        <Link href="/settings" className={cls("settings")} onClick={onClose}>
          {icons.settings}Settings
        </Link>

        <div className="drawer-section-label">Services</div>
        {external(BUY_LOGS_URL, icons.sms, "Buy logs")}

        <div className="drawer-section-label">Support</div>
        {external(CUSTOMER_CARE_URL, icons.care, "Customer care")}
        {external(COMMUNITY_URL, icons.community, "Community")}

        <div className="drawer-spacer" />
        <div className="drawer-logout">
          <button
            className="drawer-item logout"
            onClick={onLogout}
            style={{ width: "100%", background: "transparent", border: 0, textAlign: "left" }}
          >
            {icons.logout}Logout
          </button>
        </div>
      </aside>
    </>
  );
}
