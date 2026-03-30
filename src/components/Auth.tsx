"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AuthDialogProps {
  /** Called when auth succeeds — passes the Supabase user object */
  onSuccess: (user: any) => void;
  /** Called when the user dismisses the dialog */
  onClose: () => void;
  /** Which tab to open first */
  defaultMode?: "signin" | "signup";
}

type AuthMode = "signin" | "signup";

// ─────────────────────────────────────────────────────────────────────────────
// AuthDialog
//
// Renders a modal dialog — NOT a full page. Drop this anywhere and control
// visibility from the parent with a simple boolean state:
//
//   const [showAuth, setShowAuth] = useState(false);
//   {showAuth && <AuthDialog onSuccess={u => { setUser(u); setShowAuth(false); }} onClose={() => setShowAuth(false)} />}
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthDialog({
  onSuccess,
  onClose,
  defaultMode = "signin",
}: AuthDialogProps) {
  const [mode, setMode]         = useState<AuthMode>(defaultMode);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const clearMessages = () => { setError(null); setSuccess(null); };

  const switchMode = (next: AuthMode) => {
    clearMessages();
    setEmail("");
    setPassword("");
    setMode(next);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    clearMessages();

    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim()) { setError("Password is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user && !data.session) {
          setSuccess("Check your inbox — we sent a confirmation link.");
        } else if (data.user) {
          onSuccess(data.user);
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onSuccess(data.user);
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, onSuccess]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .auth-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: authOverlayIn 180ms ease both;
        }

        @keyframes authOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .auth-box {
          background: #ffffff;
          border-radius: 16px;
          padding: 36px 32px 32px;
          width: 100%;
          max-width: 400px;
          position: relative;
          box-shadow:
            0 24px 64px rgba(0,0,0,0.16),
            0 8px 24px rgba(0,0,0,0.08);
          animation: authBoxIn 260ms cubic-bezier(0.34,1.56,0.64,1) both;
        }

        @keyframes authBoxIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }

        .auth-close {
          position: absolute;
          top: 14px; right: 14px;
          width: 28px; height: 28px;
          border-radius: 50%;
          border: none;
          background: #f2f2f2;
          color: #888;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 120ms, color 120ms;
          padding: 0;
          line-height: 1;
        }

        .auth-close:hover {
          background: #e2e2e2;
          color: #0d0d0d;
          transform: none;
          box-shadow: none;
        }

        .auth-brand {
          margin-bottom: 24px;
        }

        .auth-title {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #0d0d0d;
          letter-spacing: -0.3px;
          margin-bottom: 4px;
        }

        .auth-subtitle {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: #888;
          line-height: 1.5;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          background: #f2f2f2;
          border-radius: 10px;
          padding: 3px;
          margin-bottom: 24px;
        }

        .auth-tab {
          padding: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #888;
          cursor: pointer;
          text-align: center;
          transition: background 160ms, color 160ms, box-shadow 160ms;
        }

        .auth-tab.active {
          background: #ffffff;
          color: #0d0d0d;
          box-shadow: 0 1px 4px rgba(0,0,0,0.10);
          font-weight: 600;
        }

        .auth-tab:not(.active):hover {
          color: #333;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .auth-label {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: #555;
          user-select: none;
        }

        .auth-input {
          width: 100%;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          color: #0d0d0d;
          background: #ffffff;
          border: 1px solid #e2e2e2;
          border-radius: 8px;
          padding: 10px 12px;
          outline: none;
          transition: border-color 160ms, box-shadow 160ms;
        }

        .auth-input::placeholder { color: #aaa; }

        .auth-input:hover:not(:focus) { border-color: #ccc; }

        .auth-input:focus {
          border-color: #0d0d0d;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.07);
        }

        .auth-input:disabled { opacity: 0.45; cursor: not-allowed; }

        .auth-submit {
          margin-top: 4px;
          width: 100%;
          padding: 12px 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          border: none;
          background: #0d0d0d;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 160ms, transform 100ms, box-shadow 160ms;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .auth-submit:hover:not(:disabled) {
          background: #1a1a1a;
          box-shadow: 0 4px 14px rgba(0,0,0,0.20);
          transform: translateY(-1px);
        }

        .auth-submit:active:not(:disabled) {
          transform: scale(0.98);
          box-shadow: none;
        }

        .auth-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .auth-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: authSpin 0.5s linear infinite;
          flex-shrink: 0;
        }

        @keyframes authSpin { to { transform: rotate(360deg); } }

        .auth-message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          line-height: 1.5;
          animation: authMsgIn 200ms ease both;
        }

        @keyframes authMsgIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .auth-message.error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        .auth-message.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
        }

        .auth-divider-line {
          flex: 1;
          height: 1px;
          background: #e2e2e2;
        }

        .auth-divider-text {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          color: #aaa;
          user-select: none;
        }

        .auth-footer {
          margin-top: 14px;
          text-align: center;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          color: #aaa;
          line-height: 1.6;
        }
      `}</style>

      {/* Backdrop — click outside to close */}
      <div
        className="auth-overlay"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "signin" ? "Sign in" : "Create account"}
      >
        <div className="auth-box">

          {/* Close button */}
          <button className="auth-close" onClick={onClose} aria-label="Close">
            ✕
          </button>

          {/* Header */}
          <div className="auth-brand">
            <div className="auth-title">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </div>
            <div className="auth-subtitle">
              {mode === "signin"
                ? "Sign in to save and sync your resume across devices."
                : "Save your work and access it anywhere, anytime."}
            </div>
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === "signin" ? "active" : ""}`}
              onClick={() => switchMode("signin")}
              disabled={loading}
            >
              Sign in
            </button>
            <button
              className={`auth-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => switchMode("signup")}
              disabled={loading}
            >
              Sign up
            </button>
          </div>

          {/* Form */}
          <div className="auth-form">

            {error && (
              <div className="auth-message error">
                <span>✕</span> {error}
              </div>
            )}

            {success && (
              <div className="auth-message success">
                <span>✓</span> {success}
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                autoComplete="email"
                spellCheck={false}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                className="auth-input"
                type="password"
                placeholder={mode === "signup" ? "Min. 6 characters" : "••••••••"}
                value={password}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                disabled={loading}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <button
              className="auth-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <><span className="auth-spinner" /> {mode === "signup" ? "Creating account…" : "Signing in…"}</>
              ) : (
                mode === "signup" ? "Create account" : "Sign in"
              )}
            </button>

          </div>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">optional — edit freely without signing in</span>
            <div className="auth-divider-line" />
          </div>

          <div className="auth-footer">
            Your data is encrypted and stored securely via Supabase.
          </div>

        </div>
      </div>
    </>
  );
}