"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import portalApi from "@/services/portalApi";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { AlertTriangle, CheckCircle, UserCheck } from "lucide-react";

export default function AcceptClientInvitation() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [inviteData, setInviteData] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", password: "", confirm_password: "" });

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setValidating(false);
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await portalApi.get(`/invitation/validate?token=${token}`);
        setInviteData(res.data);
      } catch (err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Invalid or expired invitation token.");
      } finally {
        setValidating(false);
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await portalApi.post("/invitation/accept", {
        token,
        full_name: form.full_name,
        password: form.password
      });
      setSuccess(true);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to accept invitation.");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
        <Spinner size="lg" message="Validating invitation..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      <div style={{ backgroundColor: 'var(--card)', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '480px', border: '1px solid var(--border)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>
            <UserCheck size={24} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' }}>Client Portal Invitation</h1>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--destructive)', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Account Activated</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '32px' }}>
              Your portal account has been created successfully. You can now log in to view your invoices and quotes.
            </p>
            <Button variant="primary" style={{ width: '100%' }} onClick={() => router.push("/portal/login")}>
              Go to Login
            </Button>
          </div>
        ) : !error && inviteData ? (
          <div>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '24px', textAlign: 'center' }}>
              You have been invited to access the client portal for <strong>{inviteData.client_name}</strong>.
              <br/>Create a password to activate your account.
            </p>
            
            <div style={{ padding: '16px', backgroundColor: 'var(--muted)', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
              <strong>Email:</strong> {inviteData.email}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input 
                label="Full Name"
                type="text" 
                value={form.full_name} 
                onChange={(e: any) => setForm({ ...form, full_name: e.target.value })} 
                placeholder="John Doe"
                required 
              />
              <Input 
                label="Create Password"
                type="password" 
                value={form.password} 
                onChange={(e: any) => setForm({ ...form, password: e.target.value })} 
                placeholder="••••••••"
                required 
              />
              <Input 
                label="Confirm Password"
                type="password" 
                value={form.confirm_password} 
                onChange={(e: any) => setForm({ ...form, confirm_password: e.target.value })} 
                placeholder="••••••••"
                required 
              />
              <Button variant="primary" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? "Activating..." : "Activate Account"}
              </Button>
            </form>
          </div>
        ) : (
           <Button variant="outline" style={{ width: '100%' }} onClick={() => router.push("/portal/login")}>
             Go to Login
           </Button>
        )}
      </div>
    </div>
  );
}
