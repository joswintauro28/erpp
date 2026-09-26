"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getAccessToken, setAccessToken } from "@datavex/auth-middleware";
import type { User } from "@datavex/auth-middleware";
import type { AuthState } from "@/types/auth";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshAndRestore = async () => {
      const activeToken = getAccessToken();

      if (activeToken) {
        try {
          const u = await api.get<User>("/auth/users/me");
          setUser(u);
          setLoading(false);
          return;
        } catch {
          // Token expired or invalid; attempt refresh below
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
        }
      } catch {
        // Not authenticated
      }
      setLoading(false);
    };
    refreshAndRestore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{
      access_token: string;
      expires_in: number;
    }>("/auth/login", { email, password }, { skipAuth: true });

    setAccessToken(data.access_token);

    const u = await api.get<User>("/auth/users/me");
    setUser(u);
    return u;
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
      // Proceed with local logout even if API fails
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
