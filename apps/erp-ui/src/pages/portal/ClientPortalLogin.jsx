import { useState } from "react";
import { useNavigate } from "react-router-dom";
import portalApi from "../../services/portalApi";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { AlertTriangle, LogIn } from "lucide-react";

export default function ClientPortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await portalApi.post("/login", { email, password });
      localStorage.setItem("portal_token", res.data.access_token);
      localStorage.setItem("client_id", res.data.client_id);
      navigate("/portal/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      <div style={{ backgroundColor: 'var(--card)', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px', border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px', fontWeight: 'bold' }}>
            V
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' }}>Client Portal</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>Sign in to access your invoices and quotes</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--destructive)', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            {error.includes("Employee login") && (
              <Button 
                variant="outline" 
                size="sm" 
                type="button" 
                onClick={() => navigate("/login")}
                style={{ marginTop: 4, width: "100%", color: "black", borderColor: "white" }}
              >
                Go to Employee Login
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Input 
            label="Email Address"
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="name@company.com"
            required 
          />
          <Input 
            label="Password"
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
            required 
          />
          <Button variant="primary" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? "Signing in..." : (
              <>
                <LogIn size={18} style={{ marginRight: '8px' }} /> Sign In
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
