"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { formatCurrency } from './LeadTable';
import { cn, statusVariant } from '@/lib/utils';
import { BadgeCheck, Mail, Phone, Building2, GitBranch, Clock, Target } from 'lucide-react';

interface LeadDetailsModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LeadDetailsModal({ lead, isOpen, onClose, onSuccess }: LeadDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    if (!lead) return;
    setLoading(true);
    try {
      const refreshed = await api.get<any>(`/crm/leads/${lead.id_str}`);
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const content = useMemo(() => {
    const record = lead || {};
const tierVariant = (tier: string) => tier === "High" ? "destructive" : tier === "Medium" ? "default" : "secondary";
    return (
      <div className="space-y-6">
        {/* Identity Card */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--shell-brand)]/10 border border-[var(--shell-brand)]/20">
              <span className="font-heading text-lg font-bold text-[var(--shell-brand)]">
                {record.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-[var(--shell-foreground)]">
                {record.name}
              </h3>
              <p className="text-xs text-[var(--shell-muted)]">{record.company}</p>
            </div>
          </div>

          {/* Quick Status Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                record.is_mql ? "bg-yellow-500" : record.score >= 40 ? "bg-blue-500" : "bg-slate-400"
              )} />
              <span className="text-xs text-[var(--shell-muted)]">Score: {record.score}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--shell-muted)]">Tier:</span>
              <Badge variant={tierVariant(record.tier) as any}>{record.tier}</Badge>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-[var(--shell-muted)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Contact Information</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs text-[var(--shell-muted)]">Email:</span>
              <span className="text-sm text-[var(--shell-foreground)]">{record.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs text-[var(--shell-muted)]">Phone:</span>
              <span className="text-sm text-[var(--shell-foreground)]">{record.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs text-[var(--shell-muted)]">Company:</span>
              <span className="text-sm text-[var(--shell-foreground)]">{record.company}</span>
            </div>
          </div>
        </div>

        {/* Qualification & Source */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-4 w-4 text-[var(--shell-muted)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Qualification Details</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Lead Source</Label>
              <p className="text-sm text-[var(--shell-foreground)]">{record.source}</p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status</Label>
              <Badge variant={statusVariant("lead", record.status) as any}>{record.status}</Badge>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Nurture Status</Label>
              <p className="text-sm text-[var(--shell-foreground)]">{record.nurture_status}</p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Probability</Label>
              <p className="text-sm text-[var(--shell-foreground)]">{record.probability}</p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Estimated Value (INR)</Label>
              <p className="text-sm text-[var(--shell-foreground)]">
                {formatCurrency(record.est_value ?? 0)}
              </p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner</Label>
              <p className="text-sm text-[var(--shell-foreground)]">{record.owner}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-[var(--shell-muted)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Timeline</span>
          </div>
          <div className="space-y-2 text-xs text-[var(--shell-muted)]">
            <div className="flex justify-between py-1">
              <span>Created</span>
              <span>{record.created_at}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Updated</span>
              <span>{record.updated_at}</span>
            </div>
          </div>
        </div>

        {/* MQL Badge */}
        {record.is_mql && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-3">
            <BadgeCheck className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">Marketing Qualified Lead (MQL)</span>
            <span className="text-xs text-yellow-600/70">Ready for sales handoff</span>
          </div>
        )}
      </div>
    );
  }, [lead, refreshKey]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
          <DialogDescription>Viewing lead record</DialogDescription>
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
