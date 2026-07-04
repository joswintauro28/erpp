import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/services/api";

interface User {
  logged_in_user_id?: number;
  full_name?: string;
  email?: string;
  role?: string;
  status?: string;
  last_login?: string;
  organization_name?: string;
  organization_id?: string | number;
  joined_at?: string;
  is_owner?: boolean;
  permissions?: string[];
  [key: string]: unknown;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("vexbill_token") : null
  );
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token;

  useEffect(() => {
    if (token) {
      // Verify token by fetching current user
      api.get("/users/me")
        .then((res: any) => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem("vexbill_token");
          setToken(null);
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    // Backend uses OAuth2PasswordRequestForm (form-data, "username" field = email)
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await api.post("/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = response.data.access_token;
    localStorage.setItem("vexbill_token", accessToken);

    // Fetch user info FIRST before setting token to avoid race conditions and blank screens
    const userRes = await api.get("/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    setUser(userRes.data);
    setToken(accessToken);

    return response.data;
  };

  const logout = () => {
    api.post("/logout").catch(() => {});
    localStorage.clear();
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    // Hard refresh to completely obliterate any stale React memory/state between user sessions
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
