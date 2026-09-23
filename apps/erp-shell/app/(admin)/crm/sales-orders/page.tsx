"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, RotateCw, ShoppingCart, Eye, AlertTriangle, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/utils/exportCsv";
import { toastSuccess, toastError, toastWarning, errorMessage } from "@/utils/toast";
import { useConfirm, handleError, KpiCard, PageHeader, SectionHeading } from "@datavex/ui-theme";
import SalesOrderTable from "./SalesOrderTable";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import SalesOrderCreateModal from "./SalesOrderCreateModal";
import SalesOrderDetailsModal from "./SalesOrderDetailsModal";

export default function SalesOrdersPage() {
  const [data, setData] = useState<{
    summary?: { total_sales_orders?: number; total_orders?: number; open?: number; overdue_at_risk?: number; owners?: number };
    sales_orders?: any[];
  }>({ summary: { total_sales_orders: 0, total_orders: 0, open: 0, overdue_at_risk: 0, owners: 0 }, sales_orders: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/crm/sales-orders");
      setData(result);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const confirm = useConfirm();

  const handleDelete = async (record: any) => {
    if (await confirm({ title: "Delete sales order", message: "Are you sure you want to delete this sales order?", destructive: true })) {
      try { await api.delete("/crm/sales-orders/" + record.id_str); fetchData(); }
      catch { toastError("Delete failed"); }
    }
  };

  const handleApprove = async (record: any) => {
    try {
      const res = await api.post<any>(`/crm/sales-orders/${record.id_str}/approve`);

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
      <PageHeader
        title="Sales Order Desk"
        subtitle="Manage confirmed sales orders from quotation through fulfillment."
        badge="CRM Sales Hub"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
              <RotateCw className={"h-3.5 w-3.5" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(items, "sales_orders")} className="gap-1.5 text-xs">
              <Download size={14} /> Export
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-primary text-white hover:bg-primary/90 gap-1.5 text-xs shadow-sm">
              <Plus size={14} /> New Sales Order
            </Button>
          </>
        }
      />

      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Orders" value={data.summary?.total_sales_orders ?? data.summary?.total_orders ?? items.length} subtitle="orders in system" icon={ShoppingCart} color="var(--chart-1)" index={0} />
          <KpiCard label="Open" value={data.summary?.open ?? 0} subtitle="pending fulfillment" icon={Eye} color="var(--chart-2)" index={1} />
          <KpiCard label="Overdue / At Risk" value={data.summary?.overdue_at_risk ?? 0} subtitle={(data.summary?.overdue_at_risk ?? 0) > 0 ? "requires attention" : "all clear"} icon={AlertTriangle} color="var(--shell-danger)" index={2} />
          <KpiCard label="Representatives" value={data.summary?.owners ?? 0} subtitle="active reps" icon={Users} color="var(--chart-4)" index={3} />
        </div>
      </section>

      <section>
        <SectionHeading label="Order Records" />
        <Card className="hover:shadow-engineered transition-shadow duration-200">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Filter className="h-4 w-4 text-muted-foreground" />
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
      </section>

      <SalesOrderCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <SalesOrderDetailsModal record={selectedRecordForDetails} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecordForDetails(null); }} onSuccess={fetchData} onEdit={(rec) => { setIsDetailsOpen(false); setSelectedRecordForDetails(null); setEditRecord(rec); setIsModalOpen(true); }} onApprove={handleApprove} />
    </div>
  );
}
