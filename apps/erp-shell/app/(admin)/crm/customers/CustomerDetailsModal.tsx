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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Building2, Mail, Phone, Wallet, ShieldCheck, Clock, Users } from 'lucide-react';
import { formatCurrency } from './CustomerTable';

interface CustomerDetailsModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerDetailsModal({ record, isOpen, onClose }: CustomerDetailsModalProps) {
  const content = useMemo(() => {
    const rec = record || {};
    return (
      <div className="space-y-6">
        {/* Header Card */}
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-[var(--shell-brand)]/20">
              <span className="font-heading text-xl font-bold text-primary">
                {rec.account?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-foreground">
                {rec.account}
              </h3>
              <p className="text-xs text-muted-foreground">{rec.industry}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">ARR:</span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(rec.arr ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tier:</span>
              <Badge className="text-xs">{rec.tier}</Badge>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Contact Information</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Email:</span>
              <span className="text-sm text-foreground">{rec.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Phone:</span>
              <span className="text-sm text-foreground">{rec.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Industry:</span>
              <span className="text-sm text-foreground">{rec.industry}</span>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Account Details</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Status</Label>
              <Badge>{rec.status}</Badge>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Owner</Label>
              <p className="text-sm text-foreground">{rec.owner}</p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Credit Limit (INR)</Label>
              <p className="text-sm text-foreground">
                {rec.credit_limit != null ? `₹${Number(rec.credit_limit).toLocaleString("en-IN")}` : "No limit configured"}
              </p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Customer ID</Label>
              <p className="text-sm font-mono text-foreground">{rec.id_str}</p>
            </div>
          </div>
        </div>

        {/* Notes & Timeline */}
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Timeline</span>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between py-1">
              <span>Created</span>
              <span>{record?.created_at}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Updated</span>
              <span>{record?.updated_at}</span>
            </div>
          </div>
          {rec.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{rec.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [record]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
          <DialogDescription>Viewing customer account record</DialogDescription>
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
