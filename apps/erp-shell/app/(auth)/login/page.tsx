"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, LogIn, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessToken, setAccessToken } from "@datavex/auth-middleware";

const BILLING_APP_URL = process.env.NEXT_PUBLIC_BILLING_APP_URL || "http://localhost:3002";
const CRM_APP_URL = process.env.NEXT_PUBLIC_CRM_APP_URL || "http://localhost:3001";
const INVENTORY_APP_URL = process.env.NEXT_PUBLIC_INVENTORY_APP_URL || "http://localhost:3004";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }
    if (!password) {
      errors.password = "Password is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError("");
    setAccessToken(null);

    try {
      const user = await login(email, password);
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const redirectUrl = searchParams ? searchParams.get("redirect") : null;
      const token = getAccessToken();
      const role = user.role;

      if (redirectUrl) {
        const redirectLower = redirectUrl.toLowerCase();
        // Organization Owner can access any workstation
        let roleMatch = role === "Organization Owner";

        if (!roleMatch) {
          if (redirectLower.includes(BILLING_APP_URL.toLowerCase())) {
            roleMatch = role === "Accountant" || role === "Auditor";
          } else if (redirectLower.includes(CRM_APP_URL.toLowerCase())) {
            roleMatch = role === "Sales Executive";
          } else if (redirectLower.includes(INVENTORY_APP_URL.toLowerCase())) {
            roleMatch = role === "Inventory Manager";
          }
        }

        if (roleMatch) {
          window.location.href = redirectUrl + (token ? `?token=${token}` : "");
          return;
        }
      }

      // Role-based redirect to workstations
      if (role === "Accountant" || role === "Auditor") {
        window.location.href = `${BILLING_APP_URL}/dashboard${token ? `?token=${token}` : ""}`;
      } else if (role === "Sales Executive") {
        window.location.href = `${CRM_APP_URL}/dashboard${token ? `?token=${token}` : ""}`;
      } else if (role === "Inventory Manager") {
        window.location.href = `${INVENTORY_APP_URL}/dashboard${token ? `?token=${token}` : ""}`;
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      if (msg.includes("locked") || msg.includes("429")) {
        setError("Account temporarily locked due to multiple failed attempts. Try again later.");
      } else if (msg.includes("deactivated")) {
        setError("This account has been deactivated. Contact your administrator.");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden justify-center items-center">
      <style>{`
        input::-ms-reveal,
        input::-ms-clear {
          display: none !important;
        }
      `}</style>
      {/* Premium background sweeps */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in srgb, var(--shell-brand) 15%, transparent)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,color-mix(in srgb, var(--shell-accent) 6%, transparent)_0%,transparent_50%)]" />

      <div className="relative z-10 w-full max-w-[400px] px-6 py-12 flex flex-col items-center">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--shell-border)]/60 bg-[var(--shell-brand)]/10">
            <span className="font-heading text-lg font-bold text-[var(--shell-accent)] tracking-[0.05em]">
              D
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <h1 className="font-heading text-lg font-bold text-[var(--shell-foreground)] tracking-[0.05em] uppercase">
              DATAVEX
            </h1>
            <p className="text-xs text-[var(--shell-muted)] uppercase tracking-[0.1em]">Command Center</p>
          </div>
        </div>

        {/* Login Container */}
        <div className="relative w-full rounded-xl border border-[var(--shell-border)] bg-card/65 backdrop-blur-md p-6 shadow-xl">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-[2px] w-4 rounded-full bg-[var(--shell-accent)]" />
            <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--shell-muted)]">
              Secure Authentication
            </span>
          </div>

          <h2 className="font-heading mb-6 text-lg font-semibold text-[var(--shell-foreground)]">
            Sign in to your account
          </h2>

          {error && (
            <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5">
              <p className="text-xs text-destructive font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                className={`h-10 rounded-lg border bg-muted/20 px-3 text-sm text-[var(--shell-foreground)] outline-none transition-all placeholder:text-[var(--shell-muted)]/40 focus:border-[var(--shell-brand)]/60 focus:bg-muted/40 ${
                  fieldErrors.email ? "border-destructive/50" : "border-[var(--shell-border)]"
                }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive font-medium mt-0.5">{fieldErrors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={`h-10 w-full rounded-lg border bg-muted/20 px-3 pr-10 text-sm text-[var(--shell-foreground)] outline-none transition-all placeholder:text-[var(--shell-muted)]/40 focus:border-[var(--shell-brand)]/60 focus:bg-muted/40 ${
                    fieldErrors.password ? "border-destructive/50" : "border-[var(--shell-border)]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-destructive font-medium mt-0.5">{fieldErrors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="relative mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white font-medium transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Secure Footer */}
          <div className="mt-6 border-t border-[var(--shell-border)]/40 pt-4 flex flex-col items-center gap-2">
            <p className="flex items-center gap-1.5 text-[10px] text-[var(--shell-muted)]/70">
              <Lock className="h-3 w-3 text-[var(--shell-accent)]" />
              Secure 256-bit SSL encrypted connection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
