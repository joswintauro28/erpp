"use client";

import { useState, useEffect } from "react";
import portalApi from "@/services/portalApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { User, Mail, Building, Key, MapPin, CheckCircle, AlertTriangle } from "lucide-react";

export default function ClientPortalProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [passForm, setPassForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await portalApi.get("/profile");
        setProfile(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePasswordSubmit = async (e: any) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");
    
    if (passForm.new_password !== passForm.confirm_password) {
      setPassError("New passwords do not match.");
      return;
    }
    
    if (passForm.new_password.length < 8) {
      setPassError("Password must be at least 8 characters.");
      return;
    }

    setPassLoading(true);
    try {
      await portalApi.put("/profile/password", {
        current_password: passForm.current_password,
        new_password: passForm.new_password
      });
      setPassSuccess("Password updated successfully.");
      setPassForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setPassError(axiosErr.response?.data?.detail || "Failed to update password.");
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  if (!profile) return <div style={{ padding: 48, textAlign: 'center' }}>Failed to load profile</div>;

  return (
    <div>
      <div className="page__header" style={{ marginBottom: 32 }}>
        <div className="page__header-info">
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Profile</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>Manage your account settings</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
            </CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <User size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Name</div>
                  <div style={{ fontWeight: 500 }}>{profile.user.full_name || "N/A"}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Mail size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Email</div>
                  <div style={{ fontWeight: 500 }}>{profile.user.email}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Building size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Company Name</div>
                  <div style={{ fontWeight: 500 }}>{profile.client.name}</div>
                </div>
              </div>
              {profile.client.gst_number && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Key size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>GST Number</div>
                    <div style={{ fontWeight: 500 }}>{profile.client.gst_number}</div>
                  </div>
                </div>
              )}
              {profile.client.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MapPin size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Address</div>
                    <div style={{ fontWeight: 500 }}>{profile.client.address}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            {passError && (
              <div style={{ backgroundColor: 'var(--destructive)', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <AlertTriangle size={16} /> {passError}
              </div>
            )}
            {passSuccess && (
              <div style={{ backgroundColor: 'var(--success)', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <CheckCircle size={16} /> {passSuccess}
              </div>
            )}
            
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input 
                label="Current Password" 
                type="password" 
                value={passForm.current_password} 
                onChange={(e: any) => setPassForm({...passForm, current_password: e.target.value})} 
                required 
              />
              <Input 
                label="New Password" 
                type="password" 
                value={passForm.new_password} 
                onChange={(e: any) => setPassForm({...passForm, new_password: e.target.value})} 
                required 
              />
              <Input 
                label="Confirm New Password" 
                type="password" 
                value={passForm.confirm_password} 
                onChange={(e: any) => setPassForm({...passForm, confirm_password: e.target.value})} 
                required 
              />
              <Button variant="primary" type="submit" disabled={passLoading} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                {passLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
