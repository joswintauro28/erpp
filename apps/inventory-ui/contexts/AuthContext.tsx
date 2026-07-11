"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAccessToken } from "@datavex/auth-middleware";
import type { User } from "@datavex/auth-middleware";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const SHELL_APP_URL = process.env.NEXT_PUBLIC_SHELL_APP_URL || "http://localhost:3000";

const LOGIN_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${SHELL_APP_URL}/login?redirect=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL)}`
  : `${SHELL_APP_URL}/login`;

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

      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.access_token);
          const u = await api.get<User>("/auth/users/me");
          setUser(u);
        } else if (tokenParam) {
          const u = await api.get<User>("/auth/users/me");
          setUser(u);
        } else {
          window.location.href = LOGIN_URL;
          return;
        }
      } catch {
        if (!tokenParam) {
          window.location.href = LOGIN_URL;
          return;
        }
      }

      setLoading(false);
    };
    init();
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Proceed with local logout
    }
    setAccessToken(null);
    setUser(null);
    window.location.href = LOGIN_URL;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
