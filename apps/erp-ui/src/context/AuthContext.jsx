import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("vexbill_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token;

  useEffect(() => {
    if (token) {
      // Verify token by fetching current user
      api.get("/users/me")
        .then((res) => {
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

  const login = async (email, password) => {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
