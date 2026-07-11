"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";

interface SchemaField {
  name: string;
  type?: string;
  options?: string[];
  [key: string]: unknown;
}

interface GenericCreateModalProps {
  entityType: string;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: Record<string, unknown> | null;
}

export default function GenericFormModal({
  entityType,
  entityName,
  isOpen,
  onClose,
  onSuccess,
  editRecord = null,
}: GenericCreateModalProps) {
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [customSource, setCustomSource] = useState("");
  const [isCustomSourceActive, setIsCustomSourceActive] = useState(false);
  const [opportunityCurrency, setOpportunityCurrency] = useState("INR");

  useEffect(() => {
    if (!isOpen) return;

    const fetchFields = async () => {
      setLoading(true);
      setError("");
      try {
        const schemaFields = await api.get<SchemaField[]>(`/${entityType}/fields`);
        setFields(schemaFields);

        const now = new Date();
        const dateStr =
          now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) +
          " " +
          now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const simpleDateStr = now.toLocaleDateString("en-US", { month: "short", day: "2-digit" });

        const standardSources = [
          "Trade Show / Expo",
          "Tender / RFQ Portal",
          "Direct Outreach",
          "Referral / Agent",
          "Website Inquiry",
        ];

        if (editRecord) {
          const initialData: Record<string, unknown> = { ...editRecord };
          if (schemaFields.some((f) => f.name === "updated_at")) {
            initialData["updated_at"] = dateStr;
          }
          if (entityType === "leads" && (editRecord as Record<string, string>).source) {
            const source = (editRecord as Record<string, string>).source;
            if (!standardSources.includes(source)) {
              setIsCustomSourceActive(true);
              setCustomSource(source);
            } else {
              setIsCustomSourceActive(false);
              setCustomSource("");
            }
          }
          const curVal = entityType === "sales"
            ? (editRecord as Record<string, unknown>).amount
            : (editRecord as Record<string, unknown>).value;
          if (
            (entityType === "opportunities" ||
              entityType === "quotations" ||
              entityType === "sales-orders" ||
              entityType === "sales") &&
            curVal
          ) {
            const raw = String(curVal);
            if (raw.startsWith("INR")) {
              setOpportunityCurrency("INR");
            } else if (raw.startsWith("$") || raw.startsWith("USD")) {
              setOpportunityCurrency("USD");
            }
          }
          setFormData(initialData);
        } else {
          const initialData: Record<string, unknown> = {};
          setIsCustomSourceActive(false);
          setCustomSource("");
          schemaFields.forEach((field) => {
            if (field.name === "updated_at") {
              initialData[field.name] = dateStr;
            } else if (field.name === "last_contact" || field.name === "last_login") {
              initialData[field.name] = dateStr;
            } else if (field.name === "date" || field.name === "date_raised") {
              initialData[field.name] = simpleDateStr;
            } else if (field.name === "source") {
              initialData[field.name] = "Website Inquiry";
            } else {
              initialData[field.name] = field.options ? field.options[0] : "";
            }
          });
          setFormData(initialData);
        }
      } catch {
        setError("Network error loading schema.");
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [isOpen, entityType, editRecord]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "name" && ["contacts", "admins"].includes(entityType) && !/^[a-zA-Z\s]*$/.test(value)) {
      return;
    }
    if (name === "phone" && !/^\+?[0-9\s()+-]*$/.test(value)) {
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const submissionData: Record<string, unknown> = { ...formData };
    const now = new Date();
    const dateStr =
      now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) +
      " " +
      now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    if (fields.some((f) => f.name === "updated_at")) {
      submissionData["updated_at"] = dateStr;
    }

    if (
      submissionData.name &&
      ["contacts", "admins"].includes(entityType) &&
      !/^[a-zA-Z\s]+$/.test(submissionData.name as string)
    ) {
      setError("Name can only contain letters.");
      setSubmitting(false);
      return;
    }

    if (
      submissionData.phone &&
      typeof submissionData.phone === "string" &&
      !submissionData.phone.startsWith("+")
    ) {
      setError("Phone must start with + (e.g. +1-555-0199).");
      setSubmitting(false);
      return;
    }

    if (submissionData.email && typeof submissionData.email === "string") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(submissionData.email)) {
        setError("Please enter a valid email address.");
        setSubmitting(false);
        return;
      }
    }

    if (entityType === "documents" && submissionData.file_data) {
      submissionData.files = JSON.stringify([submissionData.file_data]);
    }

    if (["quotations", "sales-orders", "sales"].includes(entityType) && submissionData.amount) {
      const prefix = opportunityCurrency === "INR" ? "INR " : "$ ";
      submissionData.amount = prefix + String(submissionData.amount);
    }
    if (entityType === "opportunities" && submissionData.value) {
      const prefix = opportunityCurrency === "INR" ? "INR " : "$ ";
      submissionData.value = prefix + String(submissionData.value);
    }

    if (submissionData.source === "Custom" && customSource) {
      submissionData.source = customSource;
    }

    try {
      if (editRecord) {
        await api.put(`/${entityType}/${editRecord.id_str}`, submissionData);
      } else {
        await api.post(`/${entityType}`, submissionData);
      }
      onSuccess();
      onClose();
    } catch {
      setError("Failed to save record.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderField = (field: SchemaField) => {
    const readOnlyFields = ["id_str", "created_at", "updated_at"];
    const isReadOnly = readOnlyFields.includes(field.name);
    const value = (formData[field.name] ?? "") as string;

    const label = (
      <Label htmlFor={field.name} className="uppercase text-xs tracking-wider mb-1">
        {field.name.replace(/_/g, " ")}
      </Label>
    );

    if (isReadOnly) {
      return (
        <div key={field.name} className="space-y-1">
          {label}
          <Input id={field.name} name={field.name} value={value} disabled />
        </div>
      );
    }

    if (field.name === "source" && entityType === "leads") {
      return (
        <div key={field.name} className="space-y-1">
          {label}
          <Select
            value={value}
            onValueChange={(v) => {
              handleSelectChange(field.name, v ?? "");
              if (v === "Custom") {
                setIsCustomSourceActive(true);
              } else {
                setIsCustomSourceActive(false);
                setCustomSource("");
              }
            }}
          >
            <SelectTrigger id={field.name}>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Website Inquiry">Website Inquiry</SelectItem>
              <SelectItem value="Trade Show / Expo">Trade Show / Expo</SelectItem>
              <SelectItem value="Tender / RFQ Portal">Tender / RFQ Portal</SelectItem>
              <SelectItem value="Referral / Agent">Referral / Agent</SelectItem>
              <SelectItem value="Direct Outreach">Direct Outreach</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {isCustomSourceActive && (
            <Input
              placeholder="Enter custom source..."
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              className="mt-2"
            />
          )}
        </div>
      );
    }

    if (field.name === "opportunity_currency" || field.name === "currency") {
      return (
        <div key={field.name} className="space-y-1">
          {label}
            <Select value={opportunityCurrency} onValueChange={(v) => setOpportunityCurrency(v ?? "INR")}>
            <SelectTrigger id={field.name}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.name === "probability") {
      return (
        <div key={field.name} className="space-y-1">
          {label}
          <Select value={value} onValueChange={(v) => handleSelectChange(field.name, v ?? "")}>
            <SelectTrigger id={field.name}>
              <SelectValue placeholder="Select probability" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
                <SelectItem key={p} value={`${p}%`}>{p}%</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.name === "stage" && entityType === "opportunities") {
      return (
        <div key={field.name} className="space-y-1">
          {label}
          <Select value={value} onValueChange={(v) => handleSelectChange(field.name, v ?? "")}>
            <SelectTrigger id={field.name}>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Discovery">Discovery</SelectItem>
              <SelectItem value="Proposal">Proposal</SelectItem>
              <SelectItem value="Negotiation">Negotiation</SelectItem>
              <SelectItem value="Won">Won</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === "select" || field.options) {
      return (
        <div key={field.name} className="space-y-1">
          {label}
          <Select value={value} onValueChange={(v) => handleSelectChange(field.name, v ?? "")}>
            <SelectTrigger id={field.name}>
              <SelectValue placeholder={`Select ${field.name.replace(/_/g, " ")}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.name === "description" || field.name === "summary" || field.name === "address") {
      return (
        <div key={field.name} className="space-y-1">
          {label}
          <Textarea
            id={field.name}
            name={field.name}
            value={value}
            onChange={handleChange}
            rows={3}
          />
        </div>
      );
    }

    return (
      <div key={field.name} className="space-y-1">
        {label}
        <Input id={field.name} name={field.name} value={value} onChange={handleChange} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl border bg-popover p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-base font-semibold m-0">
            {editRecord ? `Edit ${entityName}` : `New ${entityName}`}
          </h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(renderField)}

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editRecord ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
