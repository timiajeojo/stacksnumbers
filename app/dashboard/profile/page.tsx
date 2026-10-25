"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  LayoutGrid,
  ArrowDownToLine,
  CheckCircle2,
  Package,
  MessageSquareCode,
} from "lucide-react";
import DrawerUser from "../../components/DrawerUser";
import {
  EmailAuthProvider,
  User as FirebaseUser,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { applyTheme, getStoredTheme, Theme } from "../../lib/theme";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Deposits", href: "/dashboard/deposits", icon: ArrowDownToLine },
  { label: "Verifications", href: "/dashboard/verifications", icon: CheckCircle2 },
  { label: "Rentals", href: "#", icon: Package },
];

type Tab = "profile" | "password" | "appearance";

function friendlyError(code?: string): string {
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Your current password is incorrect.";
    case "auth/requires-recent-login":
      return "For security, please re-enter your password to confirm.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/email-already-in-use":
      return "That email is already in use by another account.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Appearance
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/auth");
        return;
      }
      setUser(u);
      setName(u.displayName || "");
      setEmail(u.email || "");
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setPhone(data.phone || "");
          if (!u.displayName && data.fullName) setName(data.fullName);
        }
      } catch {
        // Non-fatal — profile still usable with just Auth data
      }
    });
    return () => unsub();
  }, [router]);

  function selectTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);
    try {
      if (name !== user.displayName) {
        await updateProfile(user, { displayName: name });
      }
      await setDoc(
        doc(db, "users", user.uid),
        { fullName: name, phone },
        { merge: true }
      );
      setProfileSuccess("Profile updated successfully.");
    } catch (err: any) {
      setProfileError(friendlyError(err?.code));
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    setPwError("");
    setPwSuccess("");

    if (newPassword !== confirmPassword) {
      setPwError("New password and confirmation don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password should be at least 8 characters.");
      return;
    }

    setPwLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setPwSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwError(friendlyError(err?.code));
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, cred);

      // Clean up Firestore data first (wallet, rentals, transactions) —
      // needs a fresh token since we just reauthenticated.
      const token = await user.getIdToken(true);
      const res = await fetch("/api/account/delete-data", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        setDeleteError(data.error);
        setDeleteLoading(false);
        return;
      }

      await deleteUser(user);
      router.push("/");
    } catch (err: any) {
      setDeleteError(friendlyError(err?.code));
    } finally {
      setDeleteLoading(false);
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
            stacksnumbers
          </div>
          <div className="icon-btn">
            {(name || "T").charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="page-head">
          <h1>Settings</h1>
          <p>Manage your profile and account settings</p>
        </div>

        <main className="dashboard-main">
          <div className="settings-nav">
            <div
              className={`settings-nav-item ${tab === "profile" ? "active" : ""}`}
              onClick={() => setTab("profile")}
            >
              Profile
            </div>
            <div
              className={`settings-nav-item ${tab === "password" ? "active" : ""}`}
              onClick={() => setTab("password")}
            >
              Password
            </div>
            <div
              className={`settings-nav-item ${tab === "appearance" ? "active" : ""}`}
              onClick={() => setTab("appearance")}
            >
              Appearance
            </div>
          </div>

          <div className="divider" />

          {/* PROFILE TAB */}
          {tab === "profile" && (
            <>
              <div className="settings-section-head">
                <h2>Profile information</h2>
                <p>Update your name and email address</p>
              </div>

              {profileError && (
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
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div
                  style={{
                    background: "rgba(69,217,184,0.1)",
                    border: "1px solid rgba(69,217,184,0.35)",
                    color: "var(--teal)",
                    fontSize: "13px",
                    borderRadius: "9px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                  }}
                >
                  {profileSuccess}
                </div>
              )}

              <form className="settings-card" onSubmit={handleSaveProfile}>
                <div className="field">
                  <label>Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Email address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                  />
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--paper-dim)",
                      marginTop: "6px",
                    }}
                  >
                    Your email address can't be changed.
                  </div>
                </div>
                <div className="field">
                  <label>Phone Number</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 07048054133"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={profileLoading}
                  style={{ opacity: profileLoading ? 0.7 : 1 }}
                >
                  {profileLoading ? "Saving…" : "Save"}
                </button>
              </form>

              <div className="settings-section-head">
                <h2>Delete account</h2>
                <p>Delete your account and all of its resources</p>
              </div>

              <div className="danger-box">
                <h4>Warning</h4>
                <p>Please proceed with caution, this cannot be undone.</p>

                {!deleteOpen ? (
                  <button
                    className="btn-danger"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete account
                  </button>
                ) : (
                  <form onSubmit={handleDeleteAccount}>
                    {deleteError && (
                      <div
                        style={{
                          color: "#ff9b9b",
                          fontSize: "12.5px",
                          marginBottom: "10px",
                        }}
                      >
                        {deleteError}
                      </div>
                    )}
                    <input
                      type="password"
                      placeholder="Enter your password to confirm"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        background: "var(--ink)",
                        border: "1px solid var(--ink-4)",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        color: "var(--paper)",
                        fontSize: "14px",
                        marginBottom: "10px",
                      }}
                    />
                    <button
                      type="submit"
                      className="btn-danger"
                      disabled={deleteLoading}
                      style={{ opacity: deleteLoading ? 0.7 : 1 }}
                    >
                      {deleteLoading
                        ? "Deleting…"
                        : "Confirm — permanently delete my account"}
                    </button>
                    <button
                      type="button"
                      className="btn-danger-outline"
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeleteError("");
                        setDeletePassword("");
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          {/* PASSWORD TAB */}
          {tab === "password" && (
            <>
              <div className="settings-section-head">
                <h2>Update password</h2>
                <p>
                  Ensure your account is using a long, random password to
                  stay secure
                </p>
              </div>

              {pwError && (
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
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div
                  style={{
                    background: "rgba(69,217,184,0.1)",
                    border: "1px solid rgba(69,217,184,0.35)",
                    color: "var(--teal)",
                    fontSize: "13px",
                    borderRadius: "9px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                  }}
                >
                  {pwSuccess}
                </div>
              )}

              <form className="settings-card" onSubmit={handleChangePassword}>
                <div className="field">
                  <label>Current password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      style={{ paddingRight: "42px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw((v) => !v)}
                      aria-label={showCurrentPw ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        color: "var(--paper-dim)",
                        cursor: "pointer",
                      }}
                    >
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>New password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPw ? "text" : "password"}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={8}
                      required
                      style={{ paddingRight: "42px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw((v) => !v)}
                      aria-label={showNewPw ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        color: "var(--paper-dim)",
                        cursor: "pointer",
                      }}
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>Confirm password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ paddingRight: "42px" }}
                    />
<button
                      type="button"
                      onClick={() => setShowConfirmPw((v) => !v)}
                      aria-label={showConfirmPw ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        color: "var(--paper-dim)",
                        cursor: "pointer",
                      }}
                    >
                      {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={pwLoading}
                  style={{ opacity: pwLoading ? 0.7 : 1 }}
                >
                  {pwLoading ? "Saving…" : "Save password"}
                </button>
              </form>
            </>
          )}

          {/* APPEARANCE TAB */}
          {tab === "appearance" && (
            <>
              <div className="settings-section-head">
                <h2>Appearance settings</h2>
                <p>Update your account's appearance settings</p>
              </div>

              <div className="appearance-row">
                <button
                  className={`appearance-btn ${theme === "light" ? "active" : ""}`}
                  onClick={() => selectTheme("light")}
                >
                  <Sun size={15} /> Light
                </button>
                <button
                  className={`appearance-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => selectTheme("dark")}
                >
                  <Moon size={15} /> Dark
                </button>
                <button
                  className={`appearance-btn ${theme === "system" ? "active" : ""}`}
                  onClick={() => selectTheme("system")}
                >
                  <Monitor size={15} /> System
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}