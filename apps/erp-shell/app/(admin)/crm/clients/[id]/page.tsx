"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, DollarSign, Receipt, FileText, Building2, Globe, Phone, MapPin, BadgeInfo, ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { money } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiClient, PortalAccess } from "@/types/crm";
import type { ApiInvoice, ApiPayment } from "@/types/billing";
import ClientDetailLoading from "./loading";

const statusVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s === "paid" || s === "active" || s === "accepted") return "default" as const;
  if (s === "overdue" || s === "revoked" || s === "disabled" || s === "suspended") return "destructive" as const;
  if (s === "partially_paid" || s === "pending") return "secondary" as const;
  return "outline" as const;
};

function PortalSection({
  portalAccess, clientEmail, onInvite,
}: {
  portalAccess: PortalAccess | null; clientEmail: string; onInvite: () => void;
}) {
  if (!portalAccess) return null;
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[var(--chart-2)]" />
          Client Portal Access
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-[var(--shell-muted)]">Portal Status</p>
              <div className="mt-1">
                <Badge variant={statusVariant(portalAccess.status)} className="uppercase">{portalAccess.status}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--shell-muted)]">Invitation Status</p>
              <div className="mt-1">
                <Badge variant={statusVariant(portalAccess.invitation_status)} className="uppercase">{portalAccess.invitation_status}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--shell-muted)]">Portal Email</p>
              <p className="mt-1 text-sm font-medium">{portalAccess.portal_email || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--shell-muted)]">Last Login</p>
              <p className="mt-1 text-sm font-medium">
                {portalAccess.last_login ? new Date(portalAccess.last_login).toLocaleDateString() : "-"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {(portalAccess.status === "none" || portalAccess.status === "disabled") && (
              <Button size="sm" onClick={onInvite}>Invite to Portal</Button>
            )}
            {portalAccess.status === "active" && (
              <Button size="sm" variant="outline">Suspend Access</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientDetail() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ApiClient | null>(null);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clientData, invData] = await Promise.all([
          api.get<ApiClient>(`/clients/${id}`),
          api.get<ApiInvoice[]>("/invoices"),
        ]);
        if (cancelled) return;
        setClient(clientData);
        const clientInvoices = invData.filter((inv) => inv.client_id === id);
        setInvoices(clientInvoices);
        const allPayments = clientInvoices.flatMap((inv) => inv.payments ?? []);
        setPayments(allPayments);
      } catch {
        if (!cancelled) setClient(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const summary = useMemo(() => {
    const count = invoices.length;
    const lifetime_billed = invoices.reduce((s, inv) => s + inv.total, 0);
    const lifetime_paid = invoices.reduce((s, inv) => s + inv.paid_amount, 0);
    const outstanding = invoices.reduce((s, inv) => s + inv.balance_due, 0);
    return { invoice_count: count, lifetime_billed, lifetime_paid, outstanding };
  }, [invoices]);

  const portalAccess: PortalAccess | null = null;

  if (loading) {
    return <ClientDetailLoading />;
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
        <Building2 className="h-12 w-12" />
        <h2 className="font-heading text-lg font-semibold text-[var(--shell-foreground)]">Client not found</h2>
        <Button variant="outline" onClick={() => router.push("/crm/clients")}>Back to Clients</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/crm/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">{client.name}</h1>
            <p className="text-sm text-[var(--shell-muted)]">
              {client.email || "No email"}
              {client.gst_number ? <span className="ml-2 font-mono text-xs">| GST {client.gst_number}</span> : null}
            </p>
          </div>
        </div>
      </div>

      {/* Client Summary */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">
            Client Summary
          </h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Invoices", value: String(summary.invoice_count), icon: FileText, color: "var(--chart-1)" },
            { label: "Lifetime Billed", value: money(summary.lifetime_billed), icon: DollarSign, color: "var(--chart-2)" },
            { label: "Lifetime Paid", value: money(summary.lifetime_paid), icon: Receipt, color: "var(--chart-3)" },
            { label: "Outstanding", value: money(summary.outstanding), icon: Clock, color: "var(--chart-4)" },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
                  {kpi.label}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)]">
                  <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <span className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">
                {kpi.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Portal Access */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">
            Portal Access
          </h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <PortalSection portalAccess={portalAccess} clientEmail={client.email ?? ""} onInvite={() => { setInviteEmail(client.email ?? ""); setInviteDialogOpen(true); }} />
      </section>

      {/* Profile & Payments */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">
            Profile & Payments
          </h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--shell-muted)]" />
                Client Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {[
                  { icon: Phone, label: "Phone", value: client.phone || "-" },
                  { icon: MapPin, label: "Address", value: client.address || "-" },
                  { icon: Globe, label: "State", value: client.state || "-" },
                  { icon: BadgeInfo, label: "GST Number", value: client.gst_number || "-" },
                  { icon: FileText, label: "Notes", value: client.notes || "-" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--shell-muted)]" />
                    <div>
                      <p className="text-xs text-[var(--shell-muted)]">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[var(--shell-muted)]" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--shell-muted)]">No payments recorded</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Reference</TableHead>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Amount</TableHead>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Method</TableHead>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.reference_id ?? p.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs">{p.reference_id || `#${p.id}`}</TableCell>
                        <TableCell className="font-mono text-sm font-medium text-right">{money(p.amount)}</TableCell>
                        <TableCell className="text-[var(--shell-muted)]">{p.payment_method || "-"}</TableCell>
                        <TableCell className="text-[var(--shell-muted)]">{p.payment_date || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Invoice History */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">
            Invoice History
          </h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--shell-muted)]" />
              Invoice History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--shell-muted)]">No invoices</p>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Invoice</TableHead>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Total</TableHead>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Paid</TableHead>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Balance</TableHead>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Status</TableHead>
                      <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-medium">{inv.invoice_number || `#${inv.id}`}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(inv.total)}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(inv.paid_amount)}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(inv.balance_due)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(inv.status)} className="capitalize">{inv.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-[var(--shell-muted)]">{inv.due_date || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <MultiStepDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        title="Invite Client To Portal"
        steps={[{ title: "Email", description: "Send a portal invitation to your client" }]}
        currentStep={0}
        onStepChange={() => {}}
        onSubmit={(e) => { e.preventDefault(); setInviteDialogOpen(false); }}
      >
        <div className="space-y-2">
          <Label htmlFor="invite-email" className="text-[var(--shell-muted)]">Email Address</Label>
          <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="client@example.com" required />
        </div>
      </MultiStepDialog>
    </div>
  );
}
