"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import workflowSettingsService from "@/services/workflowSettingsService";
import { Save, Bell, RefreshCw, FileText, Package } from "lucide-react";
import "@/app/(dashboard)/_styles/Settings.css";

export default function WorkflowSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState({
    send_upcoming_invoice_reminders: true,
    upcoming_reminder_days: 3,
    send_due_today_reminders: true,
    send_overdue_reminders: true,
    overdue_reminder_frequency_days: 7,
    auto_email_recurring_invoices: true,
    notify_low_stock: true,
    send_low_stock_email: false,
    send_quotation_expiry_reminders: true,
    send_quotation_expiry_email: true,
    quotation_expiry_days: 3
  });

  const fetchSettings = async () => {
    try {
      const res = await workflowSettingsService.getWorkflowSettings();
      setSettings(res.data);
      setError("");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load workflow settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await workflowSettingsService.saveWorkflowSettings(settings);
      setSuccess("Workflow automation settings updated successfully.");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save workflow settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings__page">
        <div style={{ padding: 60, textAlign: "center" }}><Spinner size="lg" /></div>
      </div>
    );
  }

  return (
    <div className="settings__page">
      <div className="page__header">
        <div className="page__header-info">
          <h1>Workflow Automation</h1>
          <p>Configure automated emails and system notifications</p>
        </div>
      </div>

      {error && <div className="settings__error">{error}</div>}
      {success && <div className="settings__success">{success}</div>}

      <form onSubmit={handleSave}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          <Card>
            <CardHeader>
              <CardTitle><Bell size={18} /> 1. Invoice Reminders</CardTitle>
              <CardDescription>Automatically remind clients about pending or overdue invoices.</CardDescription>
            </CardHeader>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" id="send_upcoming_invoice_reminders" name="send_upcoming_invoice_reminders" checked={settings.send_upcoming_invoice_reminders} onChange={handleChange} />
                <label htmlFor="send_upcoming_invoice_reminders" style={{ fontWeight: 500 }}>Send upcoming reminders</label>
              </div>
              {settings.send_upcoming_invoice_reminders && (
                <div style={{ paddingLeft: 28, width: 200 }}>
                  <Input label="Days before due date" type="number" min="1" name="upcoming_reminder_days" value={settings.upcoming_reminder_days} onChange={handleChange} />
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" id="send_due_today_reminders" name="send_due_today_reminders" checked={settings.send_due_today_reminders} onChange={handleChange} />
                <label htmlFor="send_due_today_reminders" style={{ fontWeight: 500 }}>Send due date reminders</label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" id="send_overdue_reminders" name="send_overdue_reminders" checked={settings.send_overdue_reminders} onChange={handleChange} />
                <label htmlFor="send_overdue_reminders" style={{ fontWeight: 500 }}>Send overdue reminders</label>
              </div>
              {settings.send_overdue_reminders && (
                <div style={{ paddingLeft: 28, width: 200 }}>
                  <Input label="Frequency: every X days" type="number" min="1" name="overdue_reminder_frequency_days" value={settings.overdue_reminder_frequency_days} onChange={handleChange} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><RefreshCw size={18} /> 2. Recurring Invoices</CardTitle>
              <CardDescription>Default behavior for newly generated recurring invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" id="auto_email_recurring_invoices" name="auto_email_recurring_invoices" checked={settings.auto_email_recurring_invoices} onChange={handleChange} />
                <label htmlFor="auto_email_recurring_invoices" style={{ fontWeight: 500 }}>Automatically email recurring invoices when generated</label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><Package size={18} /> 3. Inventory</CardTitle>
              <CardDescription>Manage how you are notified when products hit their low stock threshold.</CardDescription>
            </CardHeader>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" id="notify_low_stock" name="notify_low_stock" checked={settings.notify_low_stock} onChange={handleChange} />
                <label htmlFor="notify_low_stock" style={{ fontWeight: 500 }}>Notify low stock products (in-app)</label>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 28 }}>
                <input type="checkbox" id="send_low_stock_email" name="send_low_stock_email" checked={settings.send_low_stock_email} onChange={handleChange} disabled={!settings.notify_low_stock} />
                <label htmlFor="send_low_stock_email" style={{ fontWeight: settings.notify_low_stock ? 500 : 400, color: settings.notify_low_stock ? 'inherit' : 'var(--muted)' }}>Email low stock alerts to my business email</label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><FileText size={18} /> 4. Quotations</CardTitle>
              <CardDescription>Automate follow-ups for pending quotations before they expire.</CardDescription>
            </CardHeader>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" id="send_quotation_expiry_reminders" name="send_quotation_expiry_reminders" checked={settings.send_quotation_expiry_reminders} onChange={handleChange} />
                <label htmlFor="send_quotation_expiry_reminders" style={{ fontWeight: 500 }}>Send quotation expiry reminders (in-app)</label>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 28 }}>
                <input type="checkbox" id="send_quotation_expiry_email" name="send_quotation_expiry_email" checked={settings.send_quotation_expiry_email} onChange={handleChange} disabled={!settings.send_quotation_expiry_reminders} />
                <label htmlFor="send_quotation_expiry_email" style={{ fontWeight: settings.send_quotation_expiry_reminders ? 500 : 400, color: settings.send_quotation_expiry_reminders ? 'inherit' : 'var(--muted)' }}>Email quotation reminders to client</label>
              </div>
              {settings.send_quotation_expiry_reminders && (
                <div style={{ paddingLeft: 28, width: 200 }}>
                  <Input label="Days before expiry" type="number" min="1" name="quotation_expiry_days" value={settings.quotation_expiry_days} onChange={handleChange} />
                </div>
              )}
            </CardContent>
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : <><Save size={16} /> Save Settings</>}
            </Button>
          </div>

        </div>
      </form>
    </div>
  );
}
