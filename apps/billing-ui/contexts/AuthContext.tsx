"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getAccessToken, setAccessToken } from "@datavex/auth-middleware";
import type { User } from "@datavex/auth-middleware";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function getLoginUrl(): string {
  const currentUrl = encodeURIComponent(window.location.href);
  if (typeof window === "undefined") {
    return `${process.env.NEXT_PUBLIC_SHELL_APP_URL || "http://app.erp.local"}/login`;
  }
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `http://${host}:3000/login?redirect=${currentUrl}`;
  }
  if (process.env.NEXT_PUBLIC_DEPLOY_MODE === "single-domain") {
    return `/admin/login?redirect=${currentUrl}`;
  }
  const shellUrl = process.env.NEXT_PUBLIC_SHELL_APP_URL || "http://app.erp.local";
  return `${shellUrl}/login?redirect=${currentUrl}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get("token");

      if (tokenParam) {
        setAccessToken(tokenParam);
        window.history.replaceState({}, "", window.location.pathname);
      }

      const activeToken = getAccessToken();

      if (activeToken) {
        try {
          const u = await api.get<User>("/auth/users/me");
          setUser(u);
          setLoading(false);
          return;
        } catch {
          // Token expired or invalid; fallback to refresh token attempt below
        }
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_BASE_PATH
          ? `${process.env.NEXT_PUBLIC_BASE_PATH}/api`
          : (process.env.NEXT_PUBLIC_API_URL || "/api");
        const res = await fetch(`${apiBase}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.access_token);
          const u = await api.get<User>("/auth/users/me");
          setUser(u);
          setLoading(false);
          return;
        }
      } catch {
        // Refresh failed
      }

      setAccessToken(null);
      setUser(null);
      window.location.href = getLoginUrl();
    };

    init();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.get<User>("/auth/users/me");
      setUser(u);
      return u;
    } catch {
      return null;
    }
  }, []);

  // Sync org switches / token updates across same-origin tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "datavex_access_token" || !e.newValue) return;
      setAccessToken(e.newValue);
      api.get<User>("/auth/users/me").then(setUser).catch(() => {});
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Proceed with local logout
    }
    setAccessToken(null);
    setUser(null);
    window.location.href = getLoginUrl();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
