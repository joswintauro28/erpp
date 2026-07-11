"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessToken } from "@datavex/auth-middleware";

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
    if (!email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email format";
    if (!password) errors.password = "Password is required";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError("");

    try {
      const user = await login(email, password);
      
      // 1. Read optional redirect parameter from query string
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const redirectUrl = searchParams ? searchParams.get("redirect") : null;

      const token = getAccessToken();

      if (redirectUrl) {
        window.location.href = redirectUrl + (token ? `?token=${token}` : "");
        return;
      }

      // 2. Role-based intelligent routing to workstations
      const role = user.role;
      if (role === "Accountant" || role === "Auditor") {
        window.location.href = `${BILLING_APP_URL}/dashboard${token ? `?token=${token}` : ""}`;
      } else if (role === "Sales Executive") {
        window.location.href = `${CRM_APP_URL}/dashboard${token ? `?token=${token}` : ""}`;
      } else if (role === "Inventory Manager") {
        window.location.href = `${INVENTORY_APP_URL}/dashboard${token ? `?token=${token}` : ""}`;
      } else {
        // Keep Admins and others on the main Executive Shell (port 3000)
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
    <div className="relative flex min-h-screen w-full bg-[#1A1C21] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(150,40,46,0.12)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(203,160,82,0.06)_0%,transparent_50%)]" />

      <div className="relative z-10 m-auto flex w-full max-w-[420px] flex-col items-center px-6">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[#CBA052]/40 bg-[#CBA052]/10">
            <span className="font-[family-name:var(--font-montserrat)] text-xl font-bold text-[#CBA052] tracking-[0.05em]">
              D
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-[family-name:var(--font-montserrat)] text-xl font-semibold text-white tracking-[0.05em]">
              DATAVEX
            </h1>
            <p className="text-sm text-white/50">Command Center</p>
          </div>
        </div>

        <div className="relative w-full rounded-lg border border-white/10 bg-[#272A30] p-8">
          <div className="pointer-events-none absolute -inset-px rounded-lg bg-[radial-gradient(ellipse_at_top_left,rgba(203,160,82,0.06)_0%,transparent_50%)]" />

          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-[3px] w-6 rounded-full bg-[#CBA052]" />
              <span className="font-[family-name:var(--font-montserrat)] text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
                Authentication
              </span>
            </div>

            <h2 className="font-[family-name:var(--font-montserrat)] mb-8 text-xl font-semibold text-white">
              Sign in to your account
            </h2>

            {error && (
              <div className="mb-6 rounded border border-[#96282E]/40 bg-[#96282E]/10 px-4 py-3">
                <p className="text-sm text-[#C81D25]">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium uppercase tracking-[0.1em] text-white/50"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  className={`h-10 rounded border bg-white/5 px-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#CBA052]/60 ${
                    fieldErrors.email ? "border-[#C81D25]/60" : "border-white/10"
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-[#C81D25]">{fieldErrors.email}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-[0.1em] text-white/50"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                    }}
                    className={`h-10 w-full rounded border bg-white/5 px-3 pr-10 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#CBA052]/60 ${
                      fieldErrors.password ? "border-[#C81D25]/60" : "border-white/10"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-[#C81D25]">{fieldErrors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="relative mt-2 flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded bg-[#C81D25] text-sm font-medium text-white transition-all hover:bg-[#A0171E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-8 border-t border-white/5 pt-5">
              <p className="text-center text-xs text-white/30">
                Secure login with 256-bit encryption
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="h-[1px] w-8 bg-white/10" />
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#CBA052]/40" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#CBA052]/20" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#CBA052]/40" />
                </div>
                <div className="h-[1px] w-8 bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
