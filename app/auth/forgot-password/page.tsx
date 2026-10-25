"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { MessageSquareCode } from "lucide-react";
import { auth } from "../../lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/auth/reset-password`,
        handleCodeInApp: true,
      });
      setSent(true);
    } catch (err: any) {
      // Deliberately don't reveal whether the email exists — showing a
      // different message for "not found" vs "sent" lets someone probe
      // which emails are registered. Only surface genuine input/rate
      // errors; treat "user not found" the same as success.
      if (err?.code === "auth/user-not-found") {
        setSent(true);
      } else if (err?.code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (err?.code === "auth/unauthorized-continue-uri") {
        setError(
          "This site isn't authorized in Firebase yet. Add this domain under Authentication → Settings → Authorized domains."
        );
      } else {
        setError(
          err?.code
            ? `Something went wrong (${err.code}). Please try again.`
            : "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fp-screen">
      <div className="fp-brand">
        <span className="logo-mark">
          <MessageSquareCode size={15} strokeWidth={2.5} />
        </span>
        <span>stacksnumbers</span>
      </div>

      <div className="fp-card">
        {sent ? (
          <>
            <h1>Check your email</h1>
            <div className="sub">
              If an account exists for <b>{email}</b>, we've sent a link to
              reset your password. It may take a few minutes to arrive —
              don't forget to check spam.
            </div>
            <div className="fp-return">
              Or, return to <a href="/auth?mode=signin">log in</a>
            </div>
          </>
        ) : (
          <>
            <h1>Forgot password</h1>
            <div className="sub">
              Enter your email to receive a password reset link
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(255,92,92,0.1)",
                  border: "1px solid rgba(255,92,92,0.35)",
                  color: "#ff9b9b",
                  fontSize: "13px",
                  borderRadius: "9px",
                  padding: "10px 14px",
                  marginBottom: "18px",
                  textAlign: "left",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Sending…" : "Email password reset link"}
              </button>
            </form>

            <div className="fp-return">
              Or, return to <a href="/auth?mode=signin">log in</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
