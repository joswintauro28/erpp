import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Mail, Phone, User, Building2, Clock, Briefcase } from "lucide-react";

interface ContactDetailsModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactDetailsModal({ record, isOpen, onClose }: ContactDetailsModalProps) {
  if (!record) return null;

  const fields = [
    { label: "Email", value: record.email, icon: Mail },
    { label: "Phone", value: record.phone, icon: Phone },
    { label: "Role", value: record.role, icon: Briefcase },
    { label: "Title", value: record.title, icon: User },
    { label: "Owner", value: record.owner, icon: User },
  ].filter((f) => f.value);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            {record.first_name} {record.last_name}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={record.status === "Active" ? "default" : "secondary"} className="capitalize text-xs">
                {record.status || "Active"}
              </Badge>
              {record.company_name && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {record.company_name}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {fields.map((field) => (
            <div key={field.label} className="flex items-center gap-3 text-sm">
              <field.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-16 shrink-0">{field.label}</span>
              <span className="font-medium">{field.value}</span>
            </div>
          ))}
        </div>

        {record.notes && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            {record.notes}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
