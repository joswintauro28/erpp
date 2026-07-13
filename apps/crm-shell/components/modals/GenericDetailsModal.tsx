"use client";

import { useState } from "react";
import {
  X, FileText, ShoppingCart, ArrowRight, ClipboardList,
  FileSpreadsheet, PackageOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import RecordIframe from "./RecordIframe";
import FileAttachment from "./FileAttachment";
import SaleForm from "./conversion/SaleForm";
import RequirementForm from "./conversion/RequirementForm";
import QuotationForm from "./conversion/QuotationForm";
import SalesOrderForm from "./conversion/SalesOrderForm";

interface GenericDetailsModalProps {
  record: Record<string, unknown> | null;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GenericDetailsModal({
  record, entityName, isOpen, onClose, onSuccess,
}: GenericDetailsModalProps) {
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [saleData, setSaleData] = useState({ invoice_no: "", issued_date: "", due_date: "", status: "Pending", rep: "" });

  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [requirementSubmitting, setRequirementSubmitting] = useState(false);
  const [requirementError, setRequirementError] = useState("");
  const [requirementData, setRequirementData] = useState({ name: "", category: "Technical", priority: "Medium", status: "Draft", owner: "" });

  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationError, setQuotationError] = useState("");
  const [quotationCurrency, setQuotationCurrency] = useState("INR");
  const [quotationData, setQuotationData] = useState({ quote_no: "", value: "", valid_until: "", status: "Draft", owner: "" });

  const [showSalesOrderForm, setShowSalesOrderForm] = useState(false);
  const [salesOrderSubmitting, setSalesOrderSubmitting] = useState(false);
  const [salesOrderError, setSalesOrderError] = useState("");
  const [salesOrderData, setSalesOrderData] = useState({ so_no: "", eta: "", status: "Pending", owner: "", file_data: "", file_name: "" });

  if (!isOpen || !record) return null;

  const nameField = (record.name || record.title || record.account || record.id_str || "Record") as string;
  const isOpportunity = entityName === "Opportunity";
  const isSale = entityName === "Sale";
  const isRequirement = entityName === "Requirement";
  const isQuotation = entityName === "Quotation";

  const isShowingForm = showSaleForm || showRequirementForm || showQuotationForm || showSalesOrderForm;

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleSubmitting(true);
    setSaleError("");
    try {
      const salePayload = {
        id_str: `SALE-${Date.now().toString().slice(-6)}`,
        invoice_no: saleData.invoice_no || `INV-${Date.now().toString().slice(-6)}`,
        account: (record.account as string) || "",
        amount: (record.value as string) || "0",
        issued_date: saleData.issued_date,
        due_date: saleData.due_date,
        status: saleData.status,
        rep: saleData.rep,
      };
      await api.post("/sales", salePayload);
      try { await api.delete(`/opportunities/${record.id_str}`); } catch {}
      onSuccess?.();
      onClose();
    } catch {
      setSaleError("Network error. Please try again.");
    } finally {
      setSaleSubmitting(false);
    }
  };

  const handleRequirementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequirementSubmitting(true);
    setRequirementError("");
    try {
      const requirementPayload = {
        id_str: `RE-${Date.now().toString().slice(-6)}`,
        name: requirementData.name || `Requirement for ${record.account}`,
        account: (record.account as string) || "",
        category: requirementData.category,
        priority: requirementData.priority,
        status: requirementData.status,
        owner: requirementData.owner,
      };
      await api.post("/requirements", requirementPayload);
      if (entityName === "Sale") {
        try { await api.delete(`/sales/${record.id_str}`); } catch {}
      }
      onSuccess?.();
      onClose();
    } catch {
      setRequirementError("Network error. Please try again.");
    } finally {
      setRequirementSubmitting(false);
    }
  };

  const handleQuotationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuotationSubmitting(true);
    setQuotationError("");
    try {
      const symbol = quotationCurrency === "INR" ? "" : "$ ";
      const quoteValue = symbol + quotationData.value;
      const quotationPayload = {
        id_str: `QT-${Date.now().toString().slice(-6)}`,
        quote_no: quotationData.quote_no || `QT-${Date.now().toString().slice(-6)}`,
        account: (record.account as string) || "",
        value: quoteValue,
        valid_until: quotationData.valid_until,
        status: quotationData.status,
        owner: quotationData.owner,
      };
      await api.post("/quotations", quotationPayload);
      if (entityName === "Requirement") {
        try { await api.delete(`/requirements/${record.id_str}`); } catch {}
      }
      onSuccess?.();
      onClose();
    } catch {
      setQuotationError("Network error. Please try again.");
    } finally {
      setQuotationSubmitting(false);
    }
  };

  const handleSalesOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalesOrderSubmitting(true);
    setSalesOrderError("");
    try {
      const salesOrderPayload = {
        id_str: `SO-${Date.now().toString().slice(-6)}`,
        so_no: salesOrderData.so_no || `SO-${Date.now().toString().slice(-6)}`,
        account: (record.account as string) || "",
        from_quote: (record.quote_no as string) || "",
        value: (record.value as string) || "0",
        eta: salesOrderData.eta,
        status: salesOrderData.status,
        owner: salesOrderData.owner,
        file_data: salesOrderData.file_data || "",
        file_name: salesOrderData.file_name || "",
      };
      await api.post("/sales-orders", salesOrderPayload);
      if (entityName === "Quotation") {
        try { await api.delete(`/quotations/${record.id_str}`); } catch {}
      }
      onSuccess?.();
      onClose();
    } catch {
      setSalesOrderError("Network error. Please try again.");
    } finally {
      setSalesOrderSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-xl border bg-card p-6 shadow-engineered">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-foreground" />
            <h3 className="m-0 text-lg font-semibold text-foreground">
              {entityName} Summary: {nameField}
            </h3>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!isShowingForm && (
          <div className="mb-6">
            <RecordIframe record={record} entityName={entityName} />
            {Boolean(record.file_data) && (
              <FileAttachment
                fileData={record.file_data as string}
                fileName={(record.file_name as string) || "attachment"}
              />
            )}
          </div>
        )}

        {showSaleForm && isOpportunity && (
          <SaleForm
            record={record}
            nameField={nameField}
            data={saleData}
            onChange={(d) => setSaleData((p) => ({ ...p, ...d }))}
            onSubmit={handleSaleSubmit}
            onBack={() => setShowSaleForm(false)}
            error={saleError}
            submitting={saleSubmitting}
          />
        )}
        {showRequirementForm && isSale && (
          <RequirementForm
            record={record}
            nameField={nameField}
            data={requirementData}
            onChange={(d) => setRequirementData((p) => ({ ...p, ...d }))}
            onSubmit={handleRequirementSubmit}
            onBack={() => setShowRequirementForm(false)}
            error={requirementError}
            submitting={requirementSubmitting}
          />
        )}
        {showQuotationForm && isRequirement && (
          <QuotationForm
            record={record}
            nameField={nameField}
            data={quotationData}
            currency={quotationCurrency}
            onCurrencyChange={setQuotationCurrency}
            onChange={(d) => setQuotationData((p) => ({ ...p, ...d }))}
            onSubmit={handleQuotationSubmit}
            onBack={() => setShowQuotationForm(false)}
            error={quotationError}
            submitting={quotationSubmitting}
          />
        )}
        {showSalesOrderForm && isQuotation && (
          <SalesOrderForm
            record={record}
            nameField={nameField}
            data={salesOrderData}
            onChange={(d) => setSalesOrderData((p) => ({ ...p, ...d }))}
            onSubmit={handleSalesOrderSubmit}
            onBack={() => setShowSalesOrderForm(false)}
            error={salesOrderError}
            submitting={salesOrderSubmitting}
          />
        )}

        {!isShowingForm && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex gap-2">
              {isOpportunity && (
                <Button onClick={() => setShowSaleForm(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Add to Sale <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {isSale && (
                <Button onClick={() => setShowRequirementForm(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Add to Requirements <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {isRequirement && (
                <Button onClick={() => setShowQuotationForm(true)} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Add to Quotation <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {isQuotation && (
                <Button onClick={() => setShowSalesOrderForm(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <PackageOpen className="h-3.5 w-3.5" />
                  Add to Sales Orders <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
