"use client";

import { useState } from "react";
import { X, Target, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/services/api";

interface LeadDetailsModalProps {
  lead: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeadDetailsModal({
  lead, isOpen, onClose, onSuccess,
}: LeadDetailsModalProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [probability, setProbability] = useState("50%");
  const [closeDate, setCloseDate] = useState("");
  const [stage, setStage] = useState("RFQ / Inquiry");

  if (!isOpen || !lead) return null;

  const nameField = (lead.name || lead.company || lead.id_str || "Lead Details") as string;

  const htmlContent = `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; padding: 24px; margin: 0; background-color: #f8fafc; color: #1e293b; }
          .sheet { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
          .title { margin: 0; font-size: 22px; color: #0f172a; font-weight: 700; }
          .sub { margin: 4px 0 0 0; color: #991b1b; font-weight: 600; font-size: 14px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .item { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .label { color: #64748b; font-weight: 500; font-size: 11px; text-transform: uppercase; }
          .val { font-weight: 600; color: #1e293b; font-size: 14px; margin-top: 2px; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <h1 class="title">${nameField}</h1>
            <p class="sub">${(lead.source as string) || "Lead Preview"}</p>
          </div>
          <div class="grid">
            ${[["Company","company"],["Contact","name"],["Email","email"],["Phone","phone"],["Source","source"],["Est. Value","est_value"],["Status","status"],["Owner","owner"]]
              .filter(([, key]) => lead[key])
              .map(([label, key]) => `<div class="item"><div class="label">${label}</div><div class="val">${lead[key] as string}</div></div>`)
              .join("")}
          </div>
        </div>
      </body>
    </html>
  `;

  const handleConvert = async () => {
    try {
      await api.post("/opportunities", {
        id_str: `OPP-${Date.now().toString().slice(-6)}`,
        name: lead.name || lead.company || "Converted Lead",
        account: lead.company || lead.name || "",
        source: lead.source || "Lead Conversion",
        value: lead.est_value || "0",
        stage, probability, close_date: closeDate,
        owner: lead.owner || "",
        lead_source: lead.id_str || "",
      });
      await api.put(`/leads/${lead.id_str}`, { status: "Converted" });
      onSuccess();
      onClose();
    } catch {
      alert("Failed to convert lead to opportunity.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[650px] max-h-[90vh] overflow-y-auto rounded-xl border bg-popover p-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-foreground" />
            <h3 className="font-heading text-base font-semibold m-0">Lead Preview: {nameField}</h3>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div className="mb-6">
          <iframe
            srcDoc={htmlContent}
            className="w-full h-[360px] rounded-lg border border-border"
            title="Lead Preview Frame"
          />
        </div>

        {isConverting && (
          <div className="mb-6 rounded-lg border border-border bg-muted/30 p-5">
            <h4 className="flex items-center gap-2 m-0 mb-4 font-heading text-sm font-semibold">
              <TrendingUp size={18} className="text-foreground" />
              Convert to Opportunity
            </h4>
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <Label htmlFor="probability">Probability</Label>
                <Select value={probability} onValueChange={(v) => setProbability(v ?? "")}>
                  <SelectTrigger id="probability">
                    <SelectValue placeholder="Select probability" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10,20,30,40,50,60,70,80,90,100].map((p) => (
                      <SelectItem key={p} value={`${p}%`}>{p}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="closeDate">Close Date</Label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input id="closeDate" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="pl-8" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="stage">Stage</Label>
                <Select value={stage} onValueChange={(v) => setStage(v ?? "")}>
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {["RFQ / Inquiry","Proposal","Negotiation","Won","Lost"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <Button variant="outline" onClick={() => setIsConverting(false)}>Cancel</Button>
                <Button onClick={handleConvert}><ArrowRight size={14} /> Convert</Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          {!isConverting && (
            <Button onClick={() => setIsConverting(true)}>
              <TrendingUp size={14} /> Convert to Opportunity
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
