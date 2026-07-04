"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/services/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AcceptInvitation() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    token: token || "",
    email: "",
    full_name: "",
    password: ""
  });

  useEffect(() => {
    if (!token) {
      setError("No invitation token found in the URL.");
      setLoading(false);
      return;
    }
    const validateToken = async () => {
      try {
        const res = await api.get(`/team/invitation/validate/${token}`);
        setForm((prev: any) => ({ ...prev, email: res.data.email }));
        setLoading(false);
      } catch (e) {
        const axiosErr = e as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Invalid or expired invitation link.");
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/team/invitation/accept", form);
      setSuccess(true);
      // Do not auto-login. After 3 seconds navigate to login.
      setTimeout(() => router.push("/login"), 3000);
    } catch (e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to accept invitation");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p>Validating invitation...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--background)" }}>
        <div style={{ background: "var(--card)", padding: 40, borderRadius: 16, border: "1px solid var(--border)", textAlign: "center", maxWidth: 400 }}>
          <h2 style={{ color: "var(--primary)" }}>Success</h2>
          <p>Invitation accepted successfully. Please log in.</p>
          <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 8 }}>Redirecting to login in 3 seconds...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--background)" }}>
      <div style={{ background: "var(--card)", padding: 40, borderRadius: 16, border: "1px solid var(--border)", width: "100%", maxWidth: 400, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Join Organization</h1>
        <p style={{ color: "var(--muted-foreground)", marginBottom: 24, textAlign: "center" }}>Please complete your profile to accept the invitation.</p>

        {error && <div style={{ background: "var(--destructive)", color: "white", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="Invited Email"
            type="email"
            value={form.email}
            onChange={(e: any) => setForm({ ...form, email: e.target.value })}
            required
            disabled
          />
          <Input
            label="Full Name"
            type="text"
            value={form.full_name}
            onChange={(e: any) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <Input
            label="Secure Password"
            type="password"
            value={form.password}
            onChange={(e: any) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Button variant="primary" type="submit" style={{ marginTop: 8 }}>Join Organization</Button>
        </form>
      </div>
    </div>
  );
}
