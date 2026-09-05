"use client";

import { Button } from '@/components/ui/button';
import React, { useState, useMemo } from 'react';
import { api } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from "@/components/ui/badge";
import { Label } from '@/components/ui/label';
import { Target, DollarSign, Calendar, Users, FileText, TrendingUp } from 'lucide-react';

interface OpportunityDetailModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OpportunityDetailModal({ record, isOpen, onClose, onSuccess }: OpportunityDetailModalProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    if (!record) return;
    setLoading(true);
    try {
      await api.get<any>(`/crm/opportunities/${record.id_str}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const content = useMemo(() => {
    const rec = record || {};
    const stageColors: Record<string, string> = {
      "Discovery": "bg-indigo-500",
      "Needs Analysis": "bg-purple-500",
      "Proposal": "bg-amber-500",
      "Negotiation": "bg-emerald-500",
      "Closed Won": "bg-emerald-600",
      "Closed Lost": "bg-red-500",
    };

    return (
      <div className="space-y-6">
        {/* Header Card */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--shell-brand)]/10 border border-[var(--shell-brand)]/20">
              <Target className="h-7 w-7 text-[var(--shell-brand)]" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-[var(--shell-foreground)]">
                {rec.name}
              </h3>
              <p className="text-xs text-[var(--shell-muted)]">{rec.account}</p>
            </div>
            <div className="ml-auto">
              <Badge className={stageColors[rec.stage] || "bg-gray-500"}>
                {rec.stage}
              </Badge>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--shell-brand)]" />
              <span className="text-xs text-[var(--shell-muted)]">Value:</span>
              <span className="text-sm font-semibold text-[var(--shell-foreground)]">
                ₹{new Intl.NumberFormat("en-IN").format(rec.value || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs text-[var(--shell-muted)]">Prob.:</span>
              <span className="text-sm font-semibold text-[var(--shell-foreground)]">{rec.probability}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs text-[var(--shell-muted)]">Close:</span>
              <span className="text-sm text-[var(--shell-foreground)]">{rec.close_date}</span>
            </div>
          </div>
        </div>

        {/* Opportunity Details */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-[var(--shell-muted)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Details</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Stage</Label>
              <Badge>{rec.stage}</Badge>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner</Label>
              <div className="flex items-center gap-2 mt-1">
                <Users className="h-4 w-4 text-[var(--shell-muted)]" />
                <span className="text-sm text-[var(--shell-foreground)]">{rec.owner}</span>
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">ID</Label>
              <p className="text-sm font-mono text-[var(--shell-foreground)]">{rec.id_str}</p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Probability</Label>
              <p className="text-sm text-[var(--shell-foreground)]">{rec.probability}%</p>
            </div>
          </div>
        </div>

        {/* Expected Value */}
        {rec.value && rec.probability != null && (
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Expected Value</span>
            </div>
            <p className="text-2xl font-bold text-[var(--shell-brand)]">
              ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format((rec.value * rec.probability) / 100)}
            </p>
            <p className="text-xs text-[var(--shell-muted)] mt-1">
              {rec.value} × {rec.probability}% = expected deal value
            </p>
          </div>
        )}

        {/* Notes & Timeline */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-[var(--shell-muted)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Notes</span>
          </div>
          {rec.notes ? (
            <p className="text-sm text-[var(--shell-foreground)]">{rec.notes}</p>
          ) : (
            <p className="text-xs text-[var(--shell-muted)] italic">No notes added yet.</p>
          )}
        </div>
      </div>
    );
  }, [record]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Opportunity Details</DialogTitle>
          <DialogDescription>Viewing opportunity record</DialogDescription>
        </DialogHeader>
        {content}
        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
