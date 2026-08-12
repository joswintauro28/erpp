"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/utils/exportCsv";
import { toastSuccess, toastError, toastWarning, errorMessage } from "@/utils/toast";
import SalesOrderTable from "./SalesOrderTable";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import SalesOrderCreateModal from "./SalesOrderCreateModal";
import SalesOrderDetailsModal from "./SalesOrderDetailsModal";


export default function SalesOrdersPage() {
  const [data, setData] = useState({ summary: { total_sales_orders: 0, open: 0, overdue_at_risk: 0, owners: 0 }, sales_orders: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/sales-orders");
      setData(result);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (record: any) => {
    if (window.confirm("Are you sure?")) {
      try { await api.delete("/sales-orders/" + record.id_str); fetchData(); }
      catch { alert("Delete failed"); }
    }
  };

  // O2/O3/O4: the dedicated /approve endpoint runs the synchronous Billing
  // credit check first (O2), places the SO on Hold when it fails (O3), then
  // runs the stock check and publishes crm.order.approved to inventory (O4).
  const handleApprove = async (record: any) => {
    try {
      const res = await api.post<any>(`/sales-orders/${record.id_str}/approve`);

      if (res.approved) {
        if (res.status === "Stock Hold") {
          toastWarning("Sales order on hold", `${res.so_no || record.so_no} placed on Stock Hold: stock unavailable — shortage auto-procurement started.`);
        } else {
          const cd = res.credit || {};
          const limitNote =
            cd.unlimited
              ? " (no credit limit configured)"
              : cd.credit_limit != null
              ? ` (limit ₹${Number(cd.credit_limit).toLocaleString("en-IN")}, available ₹${Number(cd.available_credit ?? 0).toLocaleString("en-IN")})`
              : "";
          toastSuccess("Sales order approved", `${res.so_no || record.so_no} approved — fulfillment started${limitNote}.`);
        }
      } else if (res.reason === "credit") {
        const cd = res.credit || {};
        const over = cd.over_limit_amount != null
          ? ` over by ₹${Number(cd.over_limit_amount).toLocaleString("en-IN")}`
          : "";
        const limitText = cd.credit_limit != null
          ? `₹${Number(cd.credit_limit).toLocaleString("en-IN")}`
          : "no limit";
        const exposure = cd.outstanding != null ? Number(cd.outstanding) : 0;
        toastError(
          "Financial hold",
          `${res.so_no || record.so_no} placed on Hold: credit limit ${limitText} exceeded (outstanding ₹${exposure.toLocaleString("en-IN")} + order value)${over}.`
        );
      } else {
        toastWarning("Sales order on hold", `${res.so_no || record.so_no} placed on ${res.status || "Hold"}.`);
      }
      fetchData();
    } catch (err) {
      toastError("Approval failed", errorMessage(err));
    }
  };

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  const items = data?.sales_orders || [];
  const filtered = search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-10 lg:space-y-12">
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={fetchData}>
            <RotateCw className={"h-4 w-4" + (loading ? " animate-spin" : "")} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCSV(items, "sales_orders")}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> New Sales Order</Button>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">OVERVIEW</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "TOTAL ORDERS", value: data.summary?.total_sales_orders, trend: "orders in system" },
            { label: "OPEN", value: data.summary?.open, trend: "pending fulfillment" },
            { label: "OVERDUE / AT RISK", value: data.summary?.overdue_at_risk, trend: data.summary?.overdue_at_risk > 0 ? "requires attention" : "all clear" },
            { label: "REPRESENTATIVES", value: data.summary?.owners, trend: "active reps" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">{m.label}</p>
              <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{m.value ?? 0}</p>
              <p className="text-xs text-[var(--shell-muted)]">{m.trend}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">RECORDS</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--shell-border)] p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-muted)]" />
              <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Filter className="h-4 w-4 text-[var(--shell-muted)]" />
          </div>
          <div className="overflow-x-auto">
            <SalesOrderTable 
              salesOrders={filtered} 
              onView={(rec) => { setSelectedRecordForDetails(rec); setIsDetailsOpen(true); }} 
              onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }} 
              onDelete={handleDelete} 
              onApprove={handleApprove} 
            />
          </div>
        </Card>
      </div>

      <SalesOrderCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <SalesOrderDetailsModal record={selectedRecordForDetails} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecordForDetails(null); }} onSuccess={fetchData} onEdit={(rec) => { setIsDetailsOpen(false); setSelectedRecordForDetails(null); setEditRecord(rec); setIsModalOpen(true); }} onApprove={handleApprove} />
    </div>
  );
}
