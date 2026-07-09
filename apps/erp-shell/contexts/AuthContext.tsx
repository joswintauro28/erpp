"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAccessToken } from "@datavex/auth-middleware";
import type { User } from "@datavex/auth-middleware";
import type { AuthState } from "@/types/auth";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshAndRestore = async () => {
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
