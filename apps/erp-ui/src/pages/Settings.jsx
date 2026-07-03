import { useEffect, useState } from "react";
import settingsService from "../services/settingsService";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";
import "./Settings.css";

const tabs = ["Organization", "Email Delivery", "Payments", "Branding", "Notifications", "Security"];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("Organization");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Organization (includes SMTP + Razorpay)
  const [org, setOrg] = useState({ company_name: "", gst_number: "", industry: "", phone: "", email: "", address: "", state: "", website: "", smtp_host: "", smtp_port: "", smtp_username: "", smtp_password: "", smtp_from_email: "", razorpay_key_id: "", razorpay_key_secret: "", razorpay_webhook_secret: "" });
  // Branding
  const [brand, setBrand] = useState({ logo_url: "", primary_color: "#6366f1", accent_color: "#818cf8", invoice_footer: "", payment_terms: "", invoice_email_subject: "", invoice_email_body: "" });
  // Notifications
  const [notif, setNotif] = useState({ invoice_notifications: true, payment_reminders: true, low_stock_alerts: true, weekly_reports: false });
  // Security
  const [pwd, setPwd] = useState({ current_password: "", new_password: "", confirm_password: "" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [orgRes, brandRes, notifRes] = await Promise.allSettled([
          settingsService.getOrganization(),
          settingsService.getBranding(),
          settingsService.getNotifications(),
        ]);
        if (orgRes.status === "fulfilled" && orgRes.value.data && !orgRes.value.data.message) {
          setOrg(orgRes.value.data);
        }
        if (brandRes.status === "fulfilled" && brandRes.value.data && !brandRes.value.data.message) {
          setBrand(brandRes.value.data);
        }
        if (notifRes.status === "fulfilled" && notifRes.value.data && !notifRes.value.data.message) {
          setNotif(notifRes.value.data);
        }
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const showSuccess = (msg) => { setSuccess(msg); setError(""); setTimeout(() => setSuccess(""), 3000); };
  const showError = (msg) => { 
    if (Array.isArray(msg)) {
      msg = (msg || []).map(m => m.msg || JSON.stringify(m)).join(", ");
    } else if (typeof msg === "object" && msg !== null) {
      msg = JSON.stringify(msg);
    }
    setError(msg); 
    setSuccess(""); 
  };

  const saveOrg = async (e) => {
    e.preventDefault();
    try { 
      const payload = { ...org };
      if (payload.smtp_port === "") payload.smtp_port = null;
      if (payload.smtp_port !== null) payload.smtp_port = Number(payload.smtp_port);
      if (payload.email === "") payload.email = null;
      // Never send empty strings for secrets — send null so backend treats them as cleared
      if (payload.razorpay_key_secret === "") payload.razorpay_key_secret = null;
      if (payload.razorpay_webhook_secret === "") payload.razorpay_webhook_secret = null;
      if (payload.smtp_password === "") payload.smtp_password = null;

      await settingsService.saveOrganization(payload); 
      showSuccess("Settings saved!"); 
    }
    catch (err) { showError(err.response?.data?.detail || "Save failed"); }
  };

  const saveBrand = async (e) => {
    e.preventDefault();
    try { await settingsService.saveBranding(brand); showSuccess("Branding settings saved!"); }
    catch (err) { showError(err.response?.data?.detail || "Save failed"); }
  };

  const saveNotif = async (e) => {
    e.preventDefault();
    try { await settingsService.saveNotifications(notif); showSuccess("Notification settings saved!"); }
    catch (err) { showError(err.response?.data?.detail || "Save failed"); }
  };

  const savePwd = async (e) => {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm_password) { showError("Passwords do not match"); return; }
    try {
      await settingsService.changePassword(pwd);
      showSuccess("Password updated successfully!");
      setPwd({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) { showError(err.response?.data?.detail || "Password update failed"); }
  };

  const handleProviderPreset = (provider) => {
    if (provider === "gmail") {
      setOrg({ ...org, smtp_host: "smtp.gmail.com", smtp_port: 465 });
    } else if (provider === "outlook") {
      setOrg({ ...org, smtp_host: "smtp.office365.com", smtp_port: 587 });
    } else if (provider === "zoho") {
      setOrg({ ...org, smtp_host: "smtp.zoho.in", smtp_port: 465 });
    } else {
      setOrg({ ...org, smtp_host: "", smtp_port: "" });
    }
  };

  const [testingEmail, setTestingEmail] = useState(false);
  const sendTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await settingsService.testEmail();
      showSuccess(res.data.message || "Test email sent!");
    } catch (err) {
      showError(err.response?.data?.detail || "Test email failed");
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) return <Spinner size="lg" message="Loading settings..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Settings</h1>
          <p>Manage your account and preferences</p>
        </div>
      </div>

      <div className="settings__tabs">
        {(tabs || []).map((t) => (
          <button key={t} className={`settings__tab ${activeTab === t ? "active" : ""}`} onClick={() => { setActiveTab(t); setSuccess(""); setError(""); }}>
            {t}
          </button>
        ))}
      </div>

      {success && <div className="settings__success">{success}</div>}
      {error && <div style={{ color: "var(--destructive)", marginBottom: 16, fontSize: "0.875rem" }}>{error}</div>}

      {activeTab === "Organization" && (
        <Card>
          <CardHeader><CardTitle className="lg">Organization Details</CardTitle></CardHeader>
          <CardContent>
            <form className="settings__form" onSubmit={saveOrg}>
              <Input label="Company Name" value={org.company_name} onChange={(e) => setOrg({ ...org, company_name: e.target.value })} required />
              <div className="settings__form-row">
                <Input label="GST Number" value={org.gst_number || ""} onChange={(e) => setOrg({ ...org, gst_number: e.target.value.toUpperCase() })} />
                <Input label="Industry" value={org.industry || ""} onChange={(e) => setOrg({ ...org, industry: e.target.value })} />
              </div>
              <div className="settings__form-row">
                <Input label="Phone" value={org.phone || ""} onChange={(e) => setOrg({ ...org, phone: e.target.value })} />
                <Input label="Email" type="email" value={org.email || ""} onChange={(e) => setOrg({ ...org, email: e.target.value })} />
              </div>
              <div className="settings__form-row">
                <Input label="State" value={org.state || ""} onChange={(e) => setOrg({ ...org, state: e.target.value })} />
                <Input label="Website" value={org.website || ""} onChange={(e) => setOrg({ ...org, website: e.target.value })} />
              </div>
              <Input label="Address" value={org.address || ""} onChange={(e) => setOrg({ ...org, address: e.target.value })} />
              <div><Button type="submit" variant="primary">Save Changes</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "Payments" && (
        <Card>
          <CardHeader>
            <CardTitle className="lg">Razorpay Payment Configuration</CardTitle>
            <p className="text-muted text-sm" style={{marginTop: 4}}>Connect your Razorpay account to generate payment links for invoices. Each company uses its own credentials.</p>
          </CardHeader>
          <CardContent>
            <form className="settings__form" onSubmit={saveOrg}>
              <div style={{ background: "var(--accent-subtle, rgba(99,102,241,0.06))", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                <p className="text-sm" style={{ margin: 0 }}>
                  🔑 Get your API keys from the <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Razorpay Dashboard → Settings → API Keys</a>.
                </p>
              </div>
              <Input
                label="Razorpay Key ID"
                value={org.razorpay_key_id || ""}
                onChange={(e) => setOrg({ ...org, razorpay_key_id: e.target.value })}
                placeholder="rzp_live_XXXXXXXXXXXXXXXX"
              />
              <Input
                label="Razorpay Key Secret"
                type="password"
                value={org.razorpay_key_secret || ""}
                onChange={(e) => setOrg({ ...org, razorpay_key_secret: e.target.value })}
                placeholder="Enter Key Secret (encrypted before saving)"
              />
              <Input
                label="Razorpay Webhook Secret"
                type="password"
                value={org.razorpay_webhook_secret || ""}
                onChange={(e) => setOrg({ ...org, razorpay_webhook_secret: e.target.value })}
                placeholder="Enter Webhook Secret (encrypted before saving)"
              />
              <div style={{ background: "var(--muted-bg, rgba(0,0,0,0.03))", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", marginTop: 4, marginBottom: 8 }}>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  Set your webhook URL in the Razorpay Dashboard to:<br />
                  <code style={{ userSelect: "all", color: "var(--primary)" }}>{window.location.origin.replace("5173", "8000")}/payments/razorpay/webhook</code>
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <Button type="submit" variant="primary">Save Razorpay Configuration</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "Email Delivery" && (
        <Card>
          <CardHeader>
            <CardTitle className="lg">Email Delivery Configuration</CardTitle>
            <p className="text-muted text-sm" style={{marginTop: 4}}>Configure SMTP settings to send invoices from your own email address.</p>
          </CardHeader>
          <CardContent>
            <div style={{ marginBottom: 20 }}>
              <p className="text-sm font-medium" style={{ marginBottom: 8 }}>Quick Presets</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" type="button" onClick={() => handleProviderPreset("gmail")}>Gmail</Button>
                <Button variant="secondary" type="button" onClick={() => handleProviderPreset("outlook")}>Outlook</Button>
                <Button variant="secondary" type="button" onClick={() => handleProviderPreset("zoho")}>Zoho</Button>
                <Button variant="secondary" type="button" onClick={() => handleProviderPreset("custom")}>Custom</Button>
              </div>
            </div>
            <form className="settings__form" onSubmit={saveOrg}>
              <Input label="SMTP Host" value={org.smtp_host || ""} onChange={(e) => setOrg({ ...org, smtp_host: e.target.value })} placeholder="smtp.gmail.com" />
              <Input label="SMTP Port" type="number" value={org.smtp_port || ""} onChange={(e) => setOrg({ ...org, smtp_port: e.target.value })} placeholder="465" />
              <Input label="SMTP Username" value={org.smtp_username || ""} onChange={(e) => setOrg({ ...org, smtp_username: e.target.value })} placeholder="you@example.com" />
              <Input label="SMTP Password (Encrypted)" type="password" value={org.smtp_password || ""} onChange={(e) => setOrg({ ...org, smtp_password: e.target.value })} placeholder="App Password" />
              <Input label="From Email Address" value={org.smtp_from_email || ""} onChange={(e) => setOrg({ ...org, smtp_from_email: e.target.value })} placeholder="you@example.com" />
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <Button type="submit" variant="primary">Save Configuration</Button>
                <Button type="button" variant="secondary" onClick={sendTestEmail} disabled={testingEmail}>
                  {testingEmail ? <Spinner size="sm" /> : "Send Test Email"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "Branding" && (
        <Card>
          <CardHeader><CardTitle className="lg">Branding</CardTitle></CardHeader>
          <CardContent>
            <form className="settings__form" onSubmit={saveBrand}>
              <Input label="Logo URL" value={brand.logo_url || ""} onChange={(e) => setBrand({ ...brand, logo_url: e.target.value })} />
              <div className="settings__form-row">
                <Input label="Primary Color" type="color" value={brand.primary_color || "#6366f1"} onChange={(e) => setBrand({ ...brand, primary_color: e.target.value })} />
                <Input label="Accent Color" type="color" value={brand.accent_color || "#818cf8"} onChange={(e) => setBrand({ ...brand, accent_color: e.target.value })} />
              </div>
              <Input label="Invoice Footer" value={brand.invoice_footer || ""} onChange={(e) => setBrand({ ...brand, invoice_footer: e.target.value })} />
              <Input label="Payment Terms" value={brand.payment_terms || ""} onChange={(e) => setBrand({ ...brand, payment_terms: e.target.value })} />
              
              <div style={{ marginTop: 24 }}>
                <h3 className="text-md font-bold" style={{ marginBottom: 12 }}>Email Templates</h3>
                <div style={{ marginBottom: 16 }}>
                  <label className="input__label">Invoice Email Subject Template</label>
                  <input className="input__field" style={{width: '100%'}} value={brand.invoice_email_subject || ""} onChange={(e) => setBrand({ ...brand, invoice_email_subject: e.target.value })} placeholder="Invoice {invoice_number} from {company_name}" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="input__label">Invoice Email Body Template</label>
                  <textarea className="input__field" style={{width: '100%', minHeight: 120, resize: 'vertical'}} value={brand.invoice_email_body || ""} onChange={(e) => setBrand({ ...brand, invoice_email_body: e.target.value })} placeholder="Hi {client_name},&#10;&#10;Please find your invoice {invoice_number} for {total_amount} attached.&#10;&#10;Thanks,&#10;{company_name}" />
                </div>
                <p className="text-xs text-muted">Supported variables: {'{invoice_number}, {client_name}, {company_name}, {total_amount}, {invoice_date}, {due_date}'}</p>
              </div>
              <div><Button type="submit" variant="primary">Save Changes</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "Notifications" && (
        <Card>
          <CardHeader><CardTitle className="lg">Notification Preferences</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveNotif}>
              <div className="settings__toggle-row">
                <div>
                  <div className="settings__toggle-label">Invoice Notifications</div>
                  <div className="settings__toggle-desc">Get notified about invoice activity</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notif.invoice_notifications} onChange={(e) => setNotif({ ...notif, invoice_notifications: e.target.checked })} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="settings__toggle-row">
                <div>
                  <div className="settings__toggle-label">Payment Reminders</div>
                  <div className="settings__toggle-desc">Receive payment due date reminders</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notif.payment_reminders} onChange={(e) => setNotif({ ...notif, payment_reminders: e.target.checked })} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="settings__toggle-row">
                <div>
                  <div className="settings__toggle-label">Low Stock Alerts</div>
                  <div className="settings__toggle-desc">Alert when product stock is low</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notif.low_stock_alerts} onChange={(e) => setNotif({ ...notif, low_stock_alerts: e.target.checked })} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="settings__toggle-row">
                <div>
                  <div className="settings__toggle-label">Weekly Reports</div>
                  <div className="settings__toggle-desc">Receive weekly business summary</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notif.weekly_reports} onChange={(e) => setNotif({ ...notif, weekly_reports: e.target.checked })} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div style={{ marginTop: 20 }}><Button type="submit" variant="primary">Save Preferences</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "Security" && (
        <Card>
          <CardHeader><CardTitle className="lg">Change Password</CardTitle></CardHeader>
          <CardContent>
            <form className="settings__form" onSubmit={savePwd}>
              <Input label="Current Password" type="password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} required />
              <Input label="New Password" type="password" value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} required />
              <Input label="Confirm New Password" type="password" value={pwd.confirm_password} onChange={(e) => setPwd({ ...pwd, confirm_password: e.target.value })} required />
              <div><Button type="submit" variant="primary">Update Password</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

