"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Building2 } from "lucide-react";

export default function GeneralSettings() {
  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[--shell-action]" />
            <CardTitle className="text-sm font-medium">Company Information</CardTitle>
          </div>
          <CardDescription className="text-xs">Basic details about your business entity</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name</Label>
              <Input defaultValue="DATAVEX Technologies Pvt Ltd" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Legal Name</Label>
              <Input defaultValue="DATAVEX Solutions India Private Limited" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">GSTIN</Label>
              <Input defaultValue="27AABCU1234D1Z1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PAN</Label>
              <Input defaultValue="AABCU1234D" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Registered Address</Label>
            <Input defaultValue="Bandra Kurla Complex, Mumbai - 400051, Maharashtra" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" defaultValue="hello@datavex.in" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input defaultValue="+91 1800 123 4567" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Website</Label>
              <Input defaultValue="https://datavex.in" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Business Type</Label>
              <Input defaultValue="Private Limited (Pvt Ltd)" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-medium">Financial Settings</CardTitle>
          <CardDescription className="text-xs">Fiscal year, currency, and accounting preferences</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Fiscal Year Start</Label>
              <Input defaultValue="April 1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Base Currency</Label>
              <Input defaultValue="INR (₹)" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Books Closure Date</Label>
              <Input defaultValue="March 31" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Invoice Prefix</Label>
              <Input defaultValue="INV" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Invoice Number Format</Label>
              <Input defaultValue="INV-{YYYY}-{000}" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-medium">Regional Settings</CardTitle>
          <CardDescription className="text-xs">Timezone, date format, and language preferences</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Timezone</Label>
              <Input defaultValue="Asia/Kolkata (IST, UTC+5:30)" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date Format</Label>
              <Input defaultValue="DD-MM-YYYY" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Number Format</Label>
              <Input defaultValue="1,23,456.78 (Indian)" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[--shell-border]">
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm"><Save className="mr-1.5 h-3.5 w-3.5" />Save Changes</Button>
      </div>
    </div>
  );
}
