"use client";

import { useState } from "react";
import {
  CheckCircle2, AlertTriangle, PackageCheck, Truck, FileText,
  Boxes, ArrowRight, ClipboardCheck, ShoppingBag, Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { toastError, toastWarning, toastSuccess } from "@/utils/toast";
import type { ApiFulfillment, ApiFulfillmentItem } from "@/types/inventory";

interface StockCheckItem {
  product_id: number;
  product_name: string;
  ordered_quantity: number;
  available_stock: number;
  is_available: boolean;
}

interface StockCheckResult {
  fulfillment_id: number;
  overall_available: boolean;
  warehouse_id?: number;
  items: StockCheckItem[];
}

export default function FulfillmentWorkflowModal({
  order,
  isOpen,
  onClose,
  onUpdate,
}: {
  order: ApiFulfillment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [stockCheck, setStockCheck] = useState<StockCheckResult | null>(null);
  const [shippingCarrier, setShippingCarrier] = useState("FedEx Express");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [invoiceMessage, setInvoiceMessage] = useState("");

  if (!order) return null;

  const handleCheckStock = async () => {
    setLoading(true);
    try {
      const res = await api.post<StockCheckResult>(`/fulfillment/orders/${order.id}/check-stock`, {});
      setStockCheck(res);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleReserve = async () => {
    setLoading(true);
    try { await api.post(`/fulfillment/orders/${order.id}/reserve`, {}); onUpdate(); }
    catch { /* ignore */ } finally { setLoading(false); }
  };

  const handlePick = async () => {
    setLoading(true);
    try { await api.post(`/fulfillment/orders/${order.id}/pick-list`, {}); onUpdate(); }
    catch { /* ignore */ } finally { setLoading(false); }
  };

  const handlePack = async () => {
    setLoading(true);
    try { await api.post(`/fulfillment/orders/${order.id}/pack`, {}); onUpdate(); }
    catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleStepBack = async () => {
    setLoading(true);
    try { await api.post(`/fulfillment/orders/${order.id}/step-back`, {}); onUpdate(); }
    catch { toastError("Failed to roll back."); } finally { setLoading(false); }
  };

  const handleDispatch = async () => {
    if (!trackingNumber) { toastWarning("Please enter a tracking number"); return; }
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/dispatch`, {
        shipping_carrier: shippingCarrier,
        tracking_number: trackingNumber,
      });
      setDispatchSuccess(true);
      onUpdate();
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleTriggerPO = async () => {
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/create-po-shortage`, {});
      toastSuccess("Purchase Order created for out-of-stock items!");
      onUpdate();
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleGenerateInvoice = async () => {
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/generate-invoice`, {});
      setInvoiceMessage("Invoice generated and sent to Billing!");
      onUpdate();
    } catch {
      setInvoiceMessage("Invoice trigger completed.");
      onUpdate();
    } finally { setLoading(false); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "QUEUED": return <Badge variant="secondary">Order Queue</Badge>;
      case "RESERVED": return <Badge className="bg-blue-600 text-white">Stock Reserved</Badge>;
      case "PICKING": return <Badge className="bg-amber-600 text-white">Picking Items</Badge>;
      case "PACKED": return <Badge className="bg-purple-600 text-white">Packed & Ready</Badge>;
      case "DISPATCHED": return <Badge className="bg-emerald-600 text-white">Dispatched</Badge>;
      case "SHORTAGE": return <Badge variant="destructive">Stock Shortage</Badge>;
      case "PO_CREATED": return <Badge className="bg-orange-600 text-white">Reorder PO Active</Badge>;
      case "COMPLETED": return <Badge className="bg-green-700 text-white">Completed & Billed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-5xl sm:max-w-5xl max-h-[95vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Boxes className="h-6 w-6 text-[var(--shell-brand)]" />
              <div>
                <DialogTitle className="text-xl font-bold">{order.sales_order_code}</DialogTitle>
                <DialogDescription>Customer: {order.customer_name}</DialogDescription>
              </div>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </DialogHeader>

        {/* Workflow Stepper */}
        <div className="my-4 p-4 bg-[var(--shell-surface-alt)]/50 rounded-lg border border-[var(--shell-border)]">
          <div className="text-xs font-semibold text-[var(--shell-muted)] uppercase tracking-wider mb-3">
            Fulfillment Workflow Pipeline
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {["Check Stock", "Reserve Stock", "Pick List", "Pack Items", "Dispatch & Bill"].map((step, i) => {
              const active = 
                i === 0 ? order.status === "QUEUED" :
                i === 1 ? order.status === "RESERVED" :
                i === 2 ? order.status === "PICKING" :
                i === 3 ? order.status === "PACKED" :
                order.status === "DISPATCHED" || order.status === "COMPLETED";
              const colors = [
                "bg-[var(--shell-brand)] text-white border-[var(--shell-brand)]",
                "bg-blue-600 text-white border-blue-600",
                "bg-amber-600 text-white border-amber-600",
                "bg-purple-600 text-white border-purple-600",
                "bg-emerald-600 text-white border-emerald-600",
              ];
              return (
                <div key={step} className={`p-2 rounded font-medium border ${active ? colors[i] : "bg-[var(--shell-surface)] border-[var(--shell-border)] text-[var(--shell-muted)]"}`}>
                  {i + 1}. {step}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Items */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-[var(--shell-foreground)]">Order Items</h4>
          <div className="border border-[var(--shell-border)] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--shell-surface-alt)] text-[var(--shell-muted)] text-left text-xs uppercase">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--shell-border)]">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--shell-surface-alt)]/20">
                    <td className="p-3 font-medium text-[var(--shell-foreground)]">{item.product_name}</td>
                    <td className="p-3 text-[var(--shell-muted)]">{item.sku || "N/A"}</td>
                    <td className="p-3 text-right font-bold">{item.ordered_quantity}</td>
                    <td className="p-3 text-right">₹{item.unit_price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Workflow Action Cards */}
          <div className="p-4 border border-[var(--shell-border)] rounded-lg bg-[var(--shell-surface)] space-y-4">
            {/* Step 1: Stock Check */}
            {order.status === "QUEUED" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-[var(--shell-foreground)]">Step 1: Check Stock Availability</h5>
                    <p className="text-xs text-[var(--shell-muted)]">Verify physical stock levels before allocation.</p>
                  </div>
                  <Button onClick={handleCheckStock} disabled={loading} className="bg-[var(--shell-brand)] text-white">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
                    Check Stock
                  </Button>
                </div>
                {stockCheck && (
                  <div className="p-3 rounded-md bg-[var(--shell-surface-alt)]/50 border border-[var(--shell-border)] space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span>Stock Status:</span>
                      {stockCheck.overall_available ? (
                        <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Available</span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Shortage</span>
                      )}
                    </div>
                    <div className="divide-y divide-[var(--shell-border)]/60">
                      {stockCheck.items.map((item) => (
                        <div key={item.product_id} className="py-1 flex justify-between">
                          <span>{item.product_name} (Req: {item.ordered_quantity})</span>
                          <span className={item.is_available ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>
                            Avail: {item.available_stock} {item.is_available ? "✓" : "✗"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                      {stockCheck.overall_available ? (
                        <Button size="sm" onClick={handleReserve} disabled={loading} className="bg-blue-600 text-white">
                          Reserve Stock <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button size="sm" onClick={handleTriggerPO} disabled={loading} variant="destructive">
                          <ShoppingBag className="h-4 w-4 mr-1" /> Create PO for Shortage
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Reserved */}
            {order.status === "RESERVED" && (
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-blue-600 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Stock Reserved</h5>
                  <p className="text-xs text-[var(--shell-muted)]">Items locked. Generate Pick List for warehouse.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStepBack} disabled={loading}>← Back</Button>
                  <Button onClick={handlePick} disabled={loading} className="bg-amber-600 text-white">Generate Pick List <ArrowRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* Step 3: Picking */}
            {order.status === "PICKING" && (
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-amber-600 flex items-center gap-2"><PackageCheck className="h-5 w-5" /> Items Being Picked</h5>
                  <p className="text-xs text-[var(--shell-muted)]">Gathering SKUs from bin locations.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStepBack} disabled={loading}>← Back</Button>
                  <Button onClick={handlePack} disabled={loading} className="bg-purple-600 text-white">Confirm Packing <ArrowRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* Step 4: Packed */}
            {order.status === "PACKED" && (
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-purple-600 flex items-center gap-2"><Boxes className="h-5 w-5" /> Packed & Ready</h5>
                  <p className="text-xs text-[var(--shell-muted)]">Enter carrier and tracking details to dispatch.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">Carrier</label>
                    <input type="text" value={shippingCarrier} onChange={(e) => setShippingCarrier(e.target.value)}
                      className="w-full text-xs p-2 border border-[var(--shell-border)] rounded bg-[var(--shell-surface)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Tracking Number</label>
                    <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full text-xs p-2 border border-[var(--shell-border)] rounded bg-[var(--shell-surface)]" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleStepBack} disabled={loading}>← Back</Button>
                  <Button onClick={handleDispatch} disabled={loading} className="bg-emerald-600 text-white">
                    <Truck className="h-4 w-4 mr-1" /> Dispatch & Update Stock
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Dispatched */}
            {(order.status === "DISPATCHED" || order.status === "COMPLETED") && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-950/30 border border-emerald-800 rounded-md">
                  <h5 className="font-semibold text-emerald-300 flex items-center gap-2 text-sm">
                    <Truck className="h-5 w-5" /> Order Dispatched
                  </h5>
                  <p className="text-xs text-emerald-400 mt-1">
                    Carrier: <strong>{order.shipping_carrier || "N/A"}</strong> | Tracking: <strong>{order.tracking_number || "N/A"}</strong>
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h6 className="font-semibold text-xs">Billing Status</h6>
                    <p className="text-xs text-[var(--shell-muted)]">Generate invoice in Billing Workstation.</p>
                  </div>
                  {order.status === "COMPLETED" ? (
                    <Badge className="bg-green-700 text-white flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Billed</Badge>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleStepBack} disabled={loading}>← Rollback</Button>
                      <Button onClick={handleGenerateInvoice} disabled={loading} className="bg-[var(--shell-brand)] text-white">
                        <FileText className="h-4 w-4 mr-1" /> Generate Invoice
                      </Button>
                    </div>
                  )}
                </div>
                {invoiceMessage && <p className="text-xs text-emerald-600 font-medium">{invoiceMessage}</p>}
              </div>
            )}

            {/* Shortage */}
            {order.status === "PO_CREATED" && (
              <div className="p-3 bg-orange-950/30 border border-orange-800 rounded-md flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-orange-300 text-xs flex items-center gap-1">
                    <ShoppingBag className="h-4 w-4" /> Reorder PO Sent to Supplier
                  </h5>
                  <p className="text-xs text-orange-400 mt-0.5">
                    PO #{order.purchase_order_id}. Awaiting GRN to update stock.
                  </p>
                </div>
                <Button size="sm" onClick={handleCheckStock} disabled={loading} variant="outline">Re-check Stock</Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}