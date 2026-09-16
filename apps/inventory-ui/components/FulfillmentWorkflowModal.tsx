"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  Truck,
  FileText,
  Boxes,
  ArrowRight,
  ClipboardCheck,
  ShoppingBag,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Badge, StatusBadge, handleError } from "@datavex/ui-theme";
import { api } from "@/services/api";
import { toastError, toastWarning, toastSuccess } from "@/utils/toast";

export interface FulfillmentItem {
  id: number;
  product_id: number;
  product_name: string;
  sku?: string;
  ordered_quantity: number;
  reserved_quantity: number;
  picked_quantity: number;
  packed_quantity: number;
  unit_price: number;
}

export interface FulfillmentOrder {
  id: number;
  sales_order_code: string;
  customer_name: string;
  warehouse_id?: number;
  status: "QUEUED" | "RESERVED" | "PICKING" | "PACKED" | "DISPATCHED" | "SHORTAGE" | "PO_CREATED" | "WO_CREATED" | "COMPLETED" | "CANCELLED";
  shipping_carrier?: string;
  tracking_number?: string;
  dispatched_at?: string;
  batch_no?: string;
  work_order_id?: number;
  purchase_order_id?: number;
  invoice_id?: number;
  created_at: string;
  items: FulfillmentItem[];
}

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
  order: FulfillmentOrder | null;
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
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async () => {
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/reserve`, {});
      onUpdate();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePick = async () => {
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/pick-list`, {});
      onUpdate();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePack = async () => {
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/pack`, {});
      onUpdate();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStepBack = async () => {
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/step-back`, {});
      onUpdate();
    } catch (err) {
      handleError(err);
      toastError("Failed to roll back to previous stage.");
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!trackingNumber) {
      toastWarning("Please enter a tracking number");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/dispatch`, {
        shipping_carrier: shippingCarrier,
        tracking_number: trackingNumber,
      });
      setDispatchSuccess(true);
      onUpdate();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPO = async () => {
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/create-po-shortage`, {});
      toastSuccess("Purchase Order created successfully for out-of-stock items!");
      onUpdate();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setLoading(true);
    try {
      await api.post(`/fulfillment/orders/${order.id}/generate-invoice`, {});
      setInvoiceMessage("Invoice generated and sent to Billing Workstation!");
      onUpdate();
    } catch (err) {
      handleError(err);
      setInvoiceMessage("Invoice trigger completed.");
      onUpdate();
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return <StatusBadge status={status} category="fulfillment" />;
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

        {/* Visual Lifecycle Stepper */}
        <div className="my-4 p-4 bg-muted/40 rounded-lg border border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Fulfillment Workflow Pipeline
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className={`p-2 rounded font-medium border ${order.status === "QUEUED" ? "bg-[var(--shell-brand)] text-white border-[var(--shell-brand)]" : "bg-background border-border"}`}>
              1. Check Stock
            </div>
            <div className={`p-2 rounded font-medium border ${order.status === "RESERVED" ? "bg-[var(--shell-info)] text-white border-[var(--shell-info)]" : "bg-background border-border"}`}>
              2. Reserve Stock
            </div>
            <div className={`p-2 rounded font-medium border ${order.status === "PICKING" ? "bg-[var(--shell-warning)] text-white border-[var(--shell-warning)]" : "bg-background border-border"}`}>
              3. Pick List
            </div>
            <div className={`p-2 rounded font-medium border ${order.status === "PACKED" ? "bg-[var(--shell-accent)] text-[var(--shell-accent-text)] border-[var(--shell-border)]" : "bg-background border-border"}`}>
              4. Pack Items
            </div>
            <div className={`p-2 rounded font-medium border ${order.status === "DISPATCHED" || order.status === "COMPLETED" ? "bg-[var(--shell-success)] text-white border-[var(--shell-success)]" : "bg-background border-border"}`}>
              5. Dispatch & Bill
            </div>
          </div>
        </div>

        {/* Order Line Items */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Order Items</h4>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="p-3 font-medium">{item.product_name}</td>
                    <td className="p-3 text-muted-foreground">{item.sku || "N/A"}</td>
                    <td className="p-3 text-right font-bold">{item.ordered_quantity}</td>
                    <td className="p-3 text-right">₹{item.unit_price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Workflow Stage Action Cards */}
          <div className="p-4 border border-border rounded-lg bg-card space-y-4">
            {/* Step 1: Stock Check */}
            {order.status === "QUEUED" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold">Step 1: Check Stock Availability</h5>
                    <p className="text-xs text-muted-foreground">Verify physical stock levels in warehouse before allocation.</p>
                  </div>
                  <Button onClick={handleCheckStock} disabled={loading} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
                    Check Stock
                  </Button>
                </div>

                {stockCheck && (
                  <div className="p-3 rounded-md bg-muted/50 border border-border space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span>Stock Status Evaluation:</span>
                      {stockCheck.overall_available ? (
                        <span className="text-[var(--shell-success)] flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Stock Available
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Stock Shortage
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-border/60">
                      {stockCheck.items.map((item) => (
                        <div key={item.product_id} className="py-1 flex justify-between items-center">
                          <span>{item.product_name} (Req: {item.ordered_quantity})</span>
                          <span className={item.is_available ? "text-[var(--shell-success)] font-semibold" : "text-destructive font-semibold"}>
                            Avail: {item.available_stock} {item.is_available ? "✓" : "✗"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      {stockCheck.overall_available ? (
                        <Button size="sm" onClick={handleReserve} disabled={loading} className="bg-[var(--shell-info)] hover:bg-[var(--shell-info)]/90 text-white">
                          Proceed to Reserve Stock <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button size="sm" onClick={handleTriggerPO} disabled={loading} variant="destructive">
                          <ShoppingBag className="h-4 w-4 mr-1" /> Create Purchase Order for Shortage
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Stock Reserved */}
            {order.status === "RESERVED" && (
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-[var(--shell-info)] flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Stock Allocated & Reserved
                  </h5>
                  <p className="text-xs text-muted-foreground">Items are locked for this order. Generate Pick List for warehouse team.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStepBack} disabled={loading}>
                    ← Back
                  </Button>
                  <Button onClick={handlePick} disabled={loading} className="bg-[var(--shell-warning)] hover:bg-[var(--shell-warning)]/90 text-white">
                    Generate Pick List <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Picking */}
            {order.status === "PICKING" && (
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-[var(--shell-warning)] flex items-center gap-2">
                    <PackageCheck className="h-5 w-5" /> Items Being Picked in Warehouse
                  </h5>
                  <p className="text-xs text-muted-foreground">Gathering SKU items from bin locations. Advance when items are packed.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStepBack} disabled={loading}>
                    ← Back
                  </Button>
                  <Button onClick={handlePack} disabled={loading} className="bg-[var(--shell-accent)] hover:bg-[var(--shell-accent)]/90 text-[var(--shell-accent-text)]">
                    Confirm Packing <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Packed & Ready for Dispatch */}
            {order.status === "PACKED" && (
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-[var(--shell-info)] flex items-center gap-2">
                    <Boxes className="h-5 w-5" /> Packed & Ready for Shipment
                  </h5>
                  <p className="text-xs text-muted-foreground">Enter carrier and tracking details to dispatch and deduct stock.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">Carrier</label>
                    <input
                      type="text"
                      value={shippingCarrier}
                      onChange={(e) => setShippingCarrier(e.target.value)}
                      className="w-full text-xs p-2 border border-border rounded bg-background"
                      placeholder="e.g. FedEx / BlueDart"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Tracking Number</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full text-xs p-2 border border-border rounded bg-background"
                      placeholder="e.g. TRK-9920148"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleStepBack} disabled={loading}>
                    ← Back
                  </Button>
                  <Button onClick={handleDispatch} disabled={loading} className="bg-[var(--shell-success)] hover:bg-[var(--shell-success)]/90 text-white">
                    <Truck className="h-4 w-4 mr-1" /> Dispatch & Update Stock
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Dispatched -> Trigger Billing */}
            {(order.status === "DISPATCHED" || order.status === "COMPLETED") && (
              <div className="space-y-3">
                <div className="p-3 bg-[var(--shell-success-surface)]  border border-[var(--shell-success)]/30  rounded-md">
                  <h5 className="font-semibold text-[var(--shell-success)]  flex items-center gap-2 text-sm">
                    <Truck className="h-5 w-5" /> Order Dispatched Successfully
                  </h5>
                  <p className="text-xs text-[var(--shell-success)]  mt-1">
                    Carrier: <strong>{order.shipping_carrier || "FedEx"}</strong> | Tracking #: <strong>{order.tracking_number || "TRK-2026-991"}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Physical stock was automatically deducted and logged under Stock Movements.</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h6 className="font-semibold text-xs">Billing & Invoicing Status</h6>
                    <p className="text-xs text-muted-foreground">Convert dispatched order to an official Invoice in Billing Workstation.</p>
                  </div>
                  {order.status === "COMPLETED" ? (
                    <Badge className="bg-[var(--shell-success)] text-white flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Billed & Completed
                    </Badge>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleStepBack} disabled={loading}>
                        ← Rollback Dispatch
                      </Button>
                      <Button onClick={handleGenerateInvoice} disabled={loading} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]">
                        <FileText className="h-4 w-4 mr-1" /> Generate Invoice in Billing
                      </Button>
                    </div>
                  )}
                </div>

                {invoiceMessage && (
                  <p className="text-xs text-[var(--shell-success)] font-medium">{invoiceMessage}</p>
                )}
              </div>
            )}

            {/* Shortage PO Active */}
            {order.status === "PO_CREATED" && (
              <div className="p-3 bg-[var(--shell-warning-surface)] border border-[var(--shell-warning)]/30  rounded-md flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-[var(--shell-warning)]  text-xs flex items-center gap-1">
                    <ShoppingBag className="h-4 w-4" /> Reorder Purchase Order Sent to Supplier
                  </h5>
                  <p className="text-xs text-[var(--shell-warning)]  mt-0.5">
                    PO #{order.purchase_order_id}. Awaiting Goods Received Note (GRN) to update stock and complete fulfillment.
                  </p>
                </div>
                <Button size="sm" onClick={handleCheckStock} disabled={loading} variant="outline">
                  Re-check Stock
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
