"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Download, Receipt, DollarSign, BadgePercent,
  Building2, Globe, Mail, Calendar, Clock, MapPin,
  Plus, Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { money } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiInvoice, InvoiceDetailView, InvoiceItemView, ApiPayment } from "@/types/billing";

const statusVariant = (s: string) => {
  if (s === "paid") return "default" as const;
  if (s === "pending") return "secondary" as const;
  if (s === "overdue" || s === "cancelled") return "destructive" as const;
  if (s === "partially_paid") return "outline" as const;
  return "outline" as const;
};

export default function InvoiceDetail() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [invoice, setInvoice] = useState<InvoiceDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recStep, setRecStep] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<ApiInvoice>(`/invoices/${id}`),
      api.get<{ id: number; name: string }[]>("/clients"),
    ])
      .then(([data, clients]) => {
        const clientMap = new Map(clients.map((c) => [c.id, c.name]));
        const halfGst = (rate: number, amount: number) => {
          if (rate === 0) return { cgst: 0, sgst: 0, igst: 0 };
          const gstAmount = amount - amount / (1 + rate / 100);
          if (data.gst_treatment === "interstate") {
            return { cgst: 0, sgst: 0, igst: gstAmount };
          }
          return { cgst: gstAmount / 2, sgst: gstAmount / 2, igst: 0 };
        };
        setInvoice({
          id: data.id,
          invoice_number: data.invoice_number ?? `INV-${data.id}`,
          client_id: data.client_id,
          client_name: clientMap.get(data.client_id) ?? `Client #${data.client_id}`,
          total: data.total, paid_amount: data.paid_amount,
          balance_due: data.balance_due, status: data.status,
          issue_date: data.issue_date ?? "", due_date: data.due_date ?? "",
          gst_treatment: data.gst_treatment,
          place_of_supply: data.place_of_supply ?? "",
          cgst: data.cgst, sgst: data.sgst, igst: data.igst,
          taxable_value: data.subtotal, notes: data.notes ?? "",
          items: data.items.map((item) => {
            const gst = halfGst(item.gst_rate, item.amount);
            return {
              product: item.description,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              gst_percent: item.gst_rate,
              ...gst,
              total: item.amount,
            };
          }),
          payments: data.payments,
        });
      })
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[--shell-muted]" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
        <FileText className="h-12 w-12" />
        <h2 className="font-heading text-lg font-semibold text-[--shell-foreground]">Invoice not found</h2>
        <Button variant="outline" onClick={() => router.push("/billing/invoices")}>Back to Invoices</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/billing/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">{invoice.invoice_number}</h1>
              <Badge variant={statusVariant(invoice.status)} className="capitalize">{invoice.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-[--shell-muted]">{invoice.client_name} &middot; Due {invoice.due_date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRecurringOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Make Recurring
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-1]/10">
              <DollarSign className="h-4 w-4 text-[--chart-1]" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">{money(invoice.total)}</p>
              <p className="text-xs text-[--shell-muted]">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-2]/10">
              <Receipt className="h-4 w-4 text-[--chart-2]" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">{money(invoice.paid_amount)}</p>
              <p className="text-xs text-[--shell-muted]">Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-3]/10">
              <Clock className="h-4 w-4 text-[--chart-3]" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">{money(invoice.balance_due)}</p>
              <p className="text-xs text-[--shell-muted]">Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-4]/10">
              <Calendar className="h-4 w-4 text-[--chart-4]" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">{invoice.due_date}</p>
              <p className="text-xs text-[--shell-muted]">Due Date</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[--shell-muted]" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              {[
                { icon: Building2, label: "Client", value: invoice.client_name },
                { icon: Mail, label: "GST Treatment", value: invoice.gst_treatment === "intrastate" ? "Intra-State (CGST+SGST)" : "Inter-State (IGST)" },
                { icon: MapPin, label: "Place of Supply", value: invoice.place_of_supply },
                { icon: Globe, label: "GST Type", value: invoice.igst > 0 ? "Inter-State" : "Intra-State" },
                { icon: Calendar, label: "Issue Date", value: invoice.issue_date },
                { icon: Calendar, label: "Due Date", value: invoice.due_date },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[--shell-muted]" />
                  <div>
                    <p className="text-xs text-[--shell-muted]">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </dl>
            {invoice.notes && (
              <p className="mt-4 text-sm text-[--shell-muted]">
                <span className="text-xs font-medium">Notes: </span>{invoice.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-[--chart-2]" />
              GST Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[--shell-muted]">Taxable Value</span>
                <span className="font-mono text-sm font-medium">{money(invoice.taxable_value)}</span>
              </div>
              {invoice.cgst > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-[--shell-muted]">CGST @ 9%</span>
                    <span className="font-mono text-sm">{money(invoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[--shell-muted]">SGST @ 9%</span>
                    <span className="font-mono text-sm">{money(invoice.sgst)}</span>
                  </div>
                </>
              )}
              {invoice.igst > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-[--shell-muted]">IGST @ 18%</span>
                  <span className="font-mono text-sm">{money(invoice.igst)}</span>
                </div>
              )}
              <hr className="border-[--shell-border]" />
              <div className="flex justify-between font-medium">
                <span className="text-sm">Total GST</span>
                <span className="font-mono text-sm">{money(invoice.cgst + invoice.sgst + invoice.igst)}</span>
              </div>
              <div className="flex justify-between font-heading text-base font-semibold">
                <span>Grand Total</span>
                <span className="font-mono">{money(invoice.total)}</span>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[--shell-muted]" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">GST%</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[200px] truncate font-medium">{item.product}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{item.quantity}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{money(item.unit_price)}</TableCell>
                  <TableCell className="text-right">{item.gst_percent}%</TableCell>
                  <TableCell className="font-mono text-sm text-right">{item.cgst > 0 ? money(item.cgst) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{item.sgst > 0 ? money(item.sgst) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{item.igst > 0 ? money(item.igst) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-medium text-right">{money(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[--shell-muted]" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.reference_id || `#${p.id}`}</TableCell>
                    <TableCell className="font-mono text-sm font-medium text-right">{money(p.amount)}</TableCell>
                    <TableCell>{p.payment_method || "-"}</TableCell>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">{p.reference_id || "-"}</TableCell>
                    <TableCell className="text-[--shell-muted]">{p.payment_date || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <MultiStepDialog
        open={recurringOpen}
        onOpenChange={(v) => { if (!v) setRecStep(0); setRecurringOpen(v); }}
        title="Make Recurring"
        steps={[
          { title: "Schedule", description: `Set up ${invoice?.invoice_number ?? "this invoice"} as a recurring template` },
          { title: "Options", description: "Email and delivery preferences" },
        ]}
        currentStep={recStep}
        onStepChange={setRecStep}
        onSubmit={(e) => { e.preventDefault(); setRecurringOpen(false); }}
        submitLabel="Set Recurring"
      >
        {recStep === 0 && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <div className="space-y-2">
              <Label htmlFor="recurring-frequency" className="text-[--shell-muted]">Frequency</Label>
              <Select defaultValue="Monthly">
                <SelectTrigger id="recurring-frequency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-start" className="text-[--shell-muted]">Start Date</Label>
              <Input id="recurring-start" type="date" defaultValue={invoice?.issue_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-end" className="text-[--shell-muted]">End Date</Label>
              <Input id="recurring-end" type="date" />
            </div>
          </div>
        )}
        {recStep === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-sm border border-[--shell-border] bg-[--shell-surface] px-4 py-3">
              <input
                type="checkbox"
                id="recurring-email"
                defaultChecked
                className="h-4 w-4 rounded border-input accent-[--shell-brand]"
              />
              <Label htmlFor="recurring-email" className="text-[--shell-foreground] cursor-pointer leading-normal">
                Auto-email invoice to client
              </Label>
            </div>
            <p className="text-xs text-[--shell-muted]">
              When enabled, the invoice will be automatically sent to the client on each cycle date.
            </p>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
