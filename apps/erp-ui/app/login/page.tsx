"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Mail, Lock } from "lucide-react";
import "./Login.css";

export default function LoginPage() {
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router]);

  if (authLoading) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <h1>VexBill</h1>
          <p>Sign in to your account</p>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          {error && (
            <div className="login__error" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span>{error}</span>
              {error.includes("Client Portal") && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  type="button" 
                  onClick={() => router.push("/portal/login")}
                  style={{ marginTop: 4, width: "100%" }}
                >
                  Go to Client Portal Login
                </Button>
              )}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            icon={Lock}
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            required
          />

          <div className="login__submit">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
