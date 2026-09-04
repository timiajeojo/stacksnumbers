"use client";

// This page is a pure client-side auth form — skip static prerendering at
// build time so Firebase never initializes on the server without env vars.
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, MessageSquareCode } from "lucide-react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import Ticker from "../components/Ticker";

type Mode = "signin" | "signup";

function friendlyError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sign in fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign up fields
  const [fullName, setFullName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("mode") === "signup") setMode("signup");
  }, [searchParams]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, signInEmail, signInPassword);
      router.push("/dashboard");
    } catch (err: any) {
      setError(friendlyError(err?.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!agreed) {
      setError("Please agree to the terms and acceptable use policy.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        signUpEmail,
        signUpPassword
      );
      await updateProfile(cred.user, { displayName: fullName });

      // Navigate immediately — the account already exists and the user is
      // signed in. Don't make them wait on the Firestore write, and don't
      // let a slow/failed write strand them on this screen.
      router.push("/dashboard");

      setDoc(doc(db, "users", cred.user.uid), {
        fullName,
        email: signUpEmail,
        walletBalance: 0,
        createdAt: serverTimestamp(),
      }).catch((err) => {
        console.error("Failed to create user profile doc:", err);
      });
    } catch (err: any) {
      setError(friendlyError(err?.code));
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="brand">
        <div className="logo">
          <span className="logo-mark">
            <MessageSquareCode size={15} strokeWidth={2.5} />
          </span>
          stacksnumber
        </div>

        <div className="brand-copy">
          <h1>
            One line.
            <br />
            One code.
            <br />
            Verified.
          </h1>
          <p>
            Real, working phone numbers for the minute it takes to receive an
            SMS. 61 countries, 220+ services, no contract.
          </p>
        </div>

        <Ticker />

        <div className="brand-foot">
          <div>
            <div className="num mono">61</div>
            <div className="label">countries</div>
          </div>
          <div>
            <div className="num mono">9s</div>
            <div className="label">avg. delivery</div>
          </div>
          <div>
            <div className="num mono">99.2%</div>
            <div className="label">success rate</div>
          </div>
        </div>
      </div>

      <div className="form-panel">
        <div className="form-box">
          <div className="tabs">
            <div
              className={`tab ${mode === "signin" ? "active" : ""}`}
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              Sign in
            </div>
            <div
              className={`tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create account
            </div>
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
              }}
            >
              {error}
            </div>
          )}

          {mode === "signin" ? (
            <form onSubmit={handleSignIn}>
              <h2>Welcome back</h2>
              <div className="sub">
                Sign in to buy numbers and check incoming codes.
              </div>

              <div className="field">
                <label>EMAIL</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>PASSWORD</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showSignInPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    style={{ paddingRight: "42px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword((v) => !v)}
                    aria-label={
                      showSignInPassword ? "Hide password" : "Show password"
                    }
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      color: "var(--paper-dim)",
                      cursor: "pointer",
                    }}
                  >
                    {showSignInPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div className="row-between">
                <label className="remember">
                  <input
                    type="checkbox"
                    style={{ accentColor: "var(--blue)" }}
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Keep me signed in
                </label>
                <a href="/auth/forgot-password" className="forgot">
                  Forgot password?
                </a>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg"
                style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Signing in…" : "Sign in →"}
              </button>

              <div className="switch-line" style={{ marginTop: "24px" }}>
                New to stacksnumber?{" "}
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    setMode("signup");
                    setError("");
                  }}
                >
                  Create an account
                </a>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <h2>Create your account</h2>
              <div className="sub">
                Get a free verification credit — no card required.
              </div>

              <div className="field">
                <label>FULL NAME</label>
                <input
                  type="text"
                  placeholder="Oluwatimilehin Adebayo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>EMAIL</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>PASSWORD</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showSignUpPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    minLength={8}
                    required
                    style={{ paddingRight: "42px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword((v) => !v)}
                    aria-label={
                      showSignUpPassword ? "Hide password" : "Show password"
                    }
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      color: "var(--paper-dim)",
                      cursor: "pointer",
                    }}
                  >
                    {showSignUpPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div className="row-between" style={{ marginBottom: "20px" }}>
                <label className="remember">
                  <input
                    type="checkbox"
                    style={{ accentColor: "var(--blue)" }}
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  I agree to the terms and acceptable use policy
                </label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg"
                style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Creating account…" : "Create account →"}
              </button>

              <div className="switch-line" style={{ marginTop: "24px" }}>
                Already have an account?{" "}
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    setMode("signin");
                    setError("");
                  }}
                >
                  Sign in
                </a>
              </div>
            </form>
          )}

          <div className="terms">
            By continuing you agree to stacksnumber&apos;s{" "}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
