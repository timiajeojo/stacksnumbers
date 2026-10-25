"use client";

import { AlertCircle } from "lucide-react";
import { WHATSAPP_BLOCKED } from "../lib/blockedServices";

// Warning shown on the pages where users pick a service or add funds.
// Hidden automatically when WHATSAPP_BLOCKED is turned off.
export default function WhatsAppNotice() {
  if (!WHATSAPP_BLOCKED) return null;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        border: "1px solid rgba(255,176,32,0.4)",
        background: "rgba(255,176,32,0.08)",
        borderRadius: "12px",
        padding: "14px 16px",
        marginBottom: "18px",
        fontSize: "13px",
        lineHeight: 1.55,
        color: "var(--paper)",
      }}
    >
      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px", color: "#ffb020" }} />
      <div>
        <strong>WhatsApp numbers are temporarily unavailable.</strong>
        <div style={{ color: "var(--paper-dim)", marginTop: "4px" }}>
          Our number provider now requires approval for WhatsApp, so purchases
          can&apos;t go through right now. Please don&apos;t fund your wallet
          for WhatsApp numbers yet. All other services work as normal.
        </div>
      </div>
    </div>
  );
}
