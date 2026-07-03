import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "var(--background)", padding: 24, textAlign: "center" }}>
      <div style={{ background: "var(--card)", padding: 48, borderRadius: 16, border: "1px solid var(--border)", maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <ShieldAlert size={64} color="var(--destructive)" style={{ marginBottom: 24 }} />
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Access Denied</h1>
        <p style={{ color: "var(--muted-foreground)", marginBottom: 32, fontSize: 16, lineHeight: 1.5 }}>
          You do not have permission to access this page. Please contact your Organization Owner if you believe this is an error.
        </p>
        <Button variant="primary" size="lg" onClick={() => navigate("/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
