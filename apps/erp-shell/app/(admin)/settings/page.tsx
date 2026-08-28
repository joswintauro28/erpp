"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, Building2, AlertTriangle, CheckCircle, Loader2, DollarSign, Globe } from "lucide-react";
import { api } from "@/services/api";
import { handleError } from "@datavex/ui-theme";

export default function GeneralSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [company, setCompany] = useState({
    company_name: "",
    legal_name: "",
    gst_number: "",
    pan: "",
    address: "",
    email: "",
    phone: "",
    website: "",
    business_type: "",
  });

  const [financial, setFinancial] = useState({
    fiscal_year_start: "",
    base_currency: "",
    books_closure_date: "",
    invoice_prefix: "",
    invoice_number_format: "",
  });

  const [regional, setRegional] = useState({
    timezone: "",
    date_format: "",
    number_format: "",
  });

  useEffect(() => {
    let cancelled = false;
    api.get<any>("/settings")
      .then((data) => {
        if (!cancelled && data) {
          if (data.company) setCompany(data.company);
          if (data.financial) setFinancial(data.financial);
          if (data.regional) setRegional(data.regional);
        }
      })
      .catch((err) => {
        handleError(err, "Failed to load settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = { company, financial, regional };
      await api.put("/settings", payload);
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (err) {
      handleError(err, "Failed to save settings");
      setMessage({ type: "error", text: "Failed to save settings. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="relative space-y-6">
        <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--sidebar-active-bg)] shimmer-glow" />
        <div className="space-y-2 animate-pulse">
          <div className="h-6 w-44 rounded bg-muted" />
          <div className="h-4 w-72 rounded bg-muted" />
        </div>
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 space-y-4">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-9 rounded bg-muted" />
                <div className="h-9 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Brand Sweep Line */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            General Settings
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Manage your organisation and business settings
          </p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${
          message.type === "success" 
            ? "border-[var(--shell-success)]/30 bg-[var(--shell-success)]/10 text-[var(--shell-success)]" 
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Company Info */}
      <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--shell-brand)]" />
            <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">Company Information</CardTitle>
          </div>
          <CardDescription className="text-xs text-[var(--shell-muted)]">Basic details about your business entity</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Company Name</Label>
              <Input 
                value={company.company_name} 
                onChange={(e) => setCompany({ ...company, company_name: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Legal Name</Label>
              <Input 
                value={company.legal_name} 
                onChange={(e) => setCompany({ ...company, legal_name: e.target.value })} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">GSTIN</Label>
              <Input 
                value={company.gst_number} 
                onChange={(e) => setCompany({ ...company, gst_number: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">PAN</Label>
              <Input 
                value={company.pan} 
                onChange={(e) => setCompany({ ...company, pan: e.target.value })} 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[var(--shell-muted)] font-medium">Registered Address</Label>
            <Input 
              value={company.address} 
              onChange={(e) => setCompany({ ...company, address: e.target.value })} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Email</Label>
              <Input 
                type="email" 
                value={company.email} 
                onChange={(e) => setCompany({ ...company, email: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Phone</Label>
              <Input 
                value={company.phone} 
                onChange={(e) => setCompany({ ...company, phone: e.target.value })} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Website</Label>
              <Input 
                value={company.website} 
                onChange={(e) => setCompany({ ...company, website: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Business Type</Label>
              <Select 
                value={company.business_type ?? ""} 
                onValueChange={(val) => setCompany({ ...company, business_type: val ?? "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Business Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                  <SelectItem value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</SelectItem>
                  <SelectItem value="Private Limited (Pvt Ltd)">Private Limited (Pvt Ltd)</SelectItem>
                  <SelectItem value="Public Limited">Public Limited</SelectItem>
                  <SelectItem value="One Person Company (OPC)">One Person Company (OPC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[var(--shell-brand)]" />
            <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">Financial Settings</CardTitle>
          </div>
          <CardDescription className="text-xs text-[var(--shell-muted)]">Fiscal year, currency, and accounting preferences</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Fiscal Year Start</Label>
              <Input 
                value={financial.fiscal_year_start ?? ""} 
                onChange={(e) => setFinancial({ ...financial, fiscal_year_start: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Base Currency</Label>
              <Select 
                value={financial.base_currency ?? ""} 
                onValueChange={(val) => setFinancial({ ...financial, base_currency: val ?? "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR (₹)">INR (₹)</SelectItem>
                  <SelectItem value="USD ($)">USD ($)</SelectItem>
                  <SelectItem value="EUR (€)">EUR (€)</SelectItem>
                  <SelectItem value="GBP (£)">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Books Closure Date</Label>
              <Input 
                value={financial.books_closure_date ?? ""} 
                onChange={(e) => setFinancial({ ...financial, books_closure_date: e.target.value })} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Invoice Prefix</Label>
              <Input 
                value={financial.invoice_prefix ?? ""} 
                onChange={(e) => setFinancial({ ...financial, invoice_prefix: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Invoice Number Format</Label>
              <Input 
                value={financial.invoice_number_format ?? ""} 
                onChange={(e) => setFinancial({ ...financial, invoice_number_format: e.target.value })} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--shell-brand)]" />
            <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">Regional Settings</CardTitle>
          </div>
          <CardDescription className="text-xs text-[var(--shell-muted)]">Timezone, date format, and language preferences</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Timezone</Label>
              <Select 
                value={regional.timezone ?? ""} 
                onValueChange={(val) => setRegional({ ...regional, timezone: val ?? "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata (IST, UTC+5:30)">Asia/Kolkata (IST, UTC+5:30)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York (EST, UTC-5)">America/New_York (EST, UTC-5)</SelectItem>
                  <SelectItem value="Europe/London (GMT, UTC+0)">Europe/London (GMT, UTC+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Date Format</Label>
              <Select 
                value={regional.date_format ?? ""} 
                onValueChange={(val) => setRegional({ ...regional, date_format: val ?? "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Date Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Number Format</Label>
              <Select 
                value={regional.number_format ?? ""} 
                onValueChange={(val) => setRegional({ ...regional, number_format: val ?? "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Number Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1,23,456.78 (Indian)">1,23,456.78 (Indian)</SelectItem>
                  <SelectItem value="1,234,567.89 (Western)">1,234,567.89 (Western)</SelectItem>
                  <SelectItem value="1 234 567,89 (European)">1 234 567,89 (European)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--shell-border)]">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="hover:bg-[var(--shell-surface-alt)]">Cancel</Button>
        <Button 
          size="sm" 
          className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white shadow"
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
