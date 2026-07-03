import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { User, Mail, Calendar, Key, Settings, Building, Users, Shield, Clock, ShieldAlert } from "lucide-react";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css"; // Reuse dashboard styling for simplicity

const roleColors = {
  "Organization Owner": { bg: "var(--purple-50, #f3e8ff)", text: "var(--purple-700, #7e22ce)", border: "var(--purple-200, #e9d5ff)" },
  "Accountant": { bg: "var(--blue-50, #eff6ff)", text: "var(--blue-700, #1d4ed8)", border: "var(--blue-200, #bfdbfe)" },
  "Sales Executive": { bg: "var(--green-50, #f0fdf4)", text: "var(--green-700, #15803d)", border: "var(--green-200, #bbf7d0)" },
  "Inventory Manager": { bg: "var(--orange-50, #fff7ed)", text: "var(--orange-700, #c2410c)", border: "var(--orange-200, #fed7aa)" },
  "Auditor": { bg: "var(--gray-50, #f9fafb)", text: "var(--gray-700, #374151)", border: "var(--gray-200, #e5e7eb)" },
  "Employee": { bg: "var(--cyan-50, #ecfeff)", text: "var(--cyan-700, #0e7490)", border: "var(--cyan-200, #a5f3fc)" },
  "Client Portal User": { bg: "var(--teal-50, #f0fdfa)", text: "var(--teal-700, #0f766e)", border: "var(--teal-200, #99f6e4)" },
};

const getRoleStyle = (role) => {
  return roleColors[role] || { bg: "var(--muted)", text: "var(--muted-foreground)", border: "var(--border)" };
};

export default function MyProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const roleStyle = getRoleStyle(user?.role);
  const statusVariant = user?.status === "active" ? "success" : user?.status === "pending" ? "warning" : "destructive";

  const renderRoleSummary = () => {
    switch (user?.role) {
      case "Organization Owner":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Organization Owner</CardTitle>
              <CardDescription>Full administrative access</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="primary" onClick={() => navigate("/team")}>
                  <Users size={16} /> Invite Members
                </Button>
                <Button variant="outline" onClick={() => navigate("/settings")}>
                  <Settings size={16} /> Account Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      case "Accountant": return <Card><CardContent style={{ padding: '24px' }}>Financial Operations Access</CardContent></Card>;
      case "Sales Executive": return <Card><CardContent style={{ padding: '24px' }}>CRM & Sales Access</CardContent></Card>;
      case "Inventory Manager": return <Card><CardContent style={{ padding: '24px' }}>Inventory Operations Access</CardContent></Card>;
      case "Auditor": return <Card><CardContent style={{ padding: '24px' }}>Read-only Audit Access</CardContent></Card>;
      case "Employee": return <Card><CardContent style={{ padding: '24px' }}>Limited Employee Access</CardContent></Card>;
      case "Client Portal User": return <Card><CardContent style={{ padding: '24px' }}>Client Portal Access</CardContent></Card>;
      default: return null;
    }
  };

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>My Profile</h1>
          <p>View your account and organization details</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginTop: '24px' }}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your current active session</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Full Name</div>
                  <div style={{ fontWeight: 500 }}>{user?.full_name || "Unknown"}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Email</div>
                  <div style={{ fontWeight: 500 }}>{user?.email || "N/A"}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Role</div>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ 
                      backgroundColor: roleStyle.bg, color: roleStyle.text, border: `1px solid ${roleStyle.border}`,
                      padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 
                    }}>
                      {user?.role || "No Role"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldAlert size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Account Status</div>
                  <div style={{ marginTop: '4px' }}>
                    <Badge variant={statusVariant}>{user?.status || "Unknown"}</Badge>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Last Login</div>
                  <div style={{ fontWeight: 500 }}>{user?.last_login ? new Date(user.last_login).toLocaleString() : "First login"}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Session Started</div>
                  <div style={{ fontWeight: 500 }}>{new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Building size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Organization Name</div>
                    <div style={{ fontWeight: 500 }}>{user?.organization_name || "Unknown"}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Key size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Organization ID</div>
                    <div style={{ fontWeight: 500 }}>{user?.organization_id || "N/A"}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Joined Organization On</div>
                    <div style={{ fontWeight: 500 }}>{user?.joined_at ? new Date(user.joined_at).toLocaleDateString() : "N/A"}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {renderRoleSummary()}

          <Card>
            <CardHeader>
              <CardTitle>Permission Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {user?.is_owner ? (
                <div style={{ padding: '12px', backgroundColor: 'var(--muted)', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Full Administrative Access
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(user?.permissions || []).map((perm, index) => (
                    <Badge key={index} variant="secondary">{perm}</Badge>
                  ))}
                  {(!user?.permissions || user.permissions.length === 0) && (
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>No permissions assigned</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
