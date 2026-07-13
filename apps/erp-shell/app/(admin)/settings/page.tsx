"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Building2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { api } from "@/services/api";

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
        console.error("Failed to load settings", err);
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
      console.error("Failed to save settings", err);
      setMessage({ type: "error", text: "Failed to save settings. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="relative space-y-6">
        <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--sidebar-active-bg] shimmer-glow" />
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            General Settings
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage your organisation and business settings
          </p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${
          message.type === "success" 
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" 
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
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[--shell-accent]" />
            <CardTitle className="text-sm font-medium">Company Information</CardTitle>
          </div>
          <CardDescription className="text-xs">Basic details about your business entity</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Company Name</Label>
              <Input 
                value={company.company_name} 
                onChange={(e) => setCompany({ ...company, company_name: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Legal Name</Label>
              <Input 
                value={company.legal_name} 
                onChange={(e) => setCompany({ ...company, legal_name: e.target.value })} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">GSTIN</Label>
              <Input 
                value={company.gst_number} 
                onChange={(e) => setCompany({ ...company, gst_number: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">PAN</Label>
              <Input 
                value={company.pan} 
                onChange={(e) => setCompany({ ...company, pan: e.target.value })} 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[--shell-muted]">Registered Address</Label>
            <Input 
              value={company.address} 
              onChange={(e) => setCompany({ ...company, address: e.target.value })} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Email</Label>
              <Input 
                type="email" 
                value={company.email} 
                onChange={(e) => setCompany({ ...company, email: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Phone</Label>
              <Input 
                value={company.phone} 
                onChange={(e) => setCompany({ ...company, phone: e.target.value })} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Website</Label>
              <Input 
                value={company.website} 
                onChange={(e) => setCompany({ ...company, website: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Business Type</Label>
              <Input 
                value={company.business_type} 
                onChange={(e) => setCompany({ ...company, business_type: e.target.value })} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-medium">Financial Settings</CardTitle>
          <CardDescription className="text-xs">Fiscal year, currency, and accounting preferences</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Fiscal Year Start</Label>
              <Input 
                value={financial.fiscal_year_start} 
                onChange={(e) => setFinancial({ ...financial, fiscal_year_start: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Base Currency</Label>
              <Input 
                value={financial.base_currency} 
                onChange={(e) => setFinancial({ ...financial, base_currency: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Books Closure Date</Label>
              <Input 
                value={financial.books_closure_date} 
                onChange={(e) => setFinancial({ ...financial, books_closure_date: e.target.value })} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Invoice Prefix</Label>
              <Input 
                value={financial.invoice_prefix} 
                onChange={(e) => setFinancial({ ...financial, invoice_prefix: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Invoice Number Format</Label>
              <Input 
                value={financial.invoice_number_format} 
                onChange={(e) => setFinancial({ ...financial, invoice_number_format: e.target.value })} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-medium">Regional Settings</CardTitle>
          <CardDescription className="text-xs">Timezone, date format, and language preferences</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Timezone</Label>
              <Input 
                value={regional.timezone} 
                onChange={(e) => setRegional({ ...regional, timezone: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Date Format</Label>
              <Input 
                value={regional.date_format} 
                onChange={(e) => setRegional({ ...regional, date_format: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[--shell-muted]">Number Format</Label>
              <Input 
                value={regional.number_format} 
                onChange={(e) => setRegional({ ...regional, number_format: e.target.value })} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[--shell-border]">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Cancel</Button>
        <Button 
          size="sm" 
          className="bg-[--shell-brand] hover:bg-[--shell-brand]/90 text-white"
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
