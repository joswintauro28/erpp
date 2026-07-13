"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SearchInput } from "@/components/shared/search-input";
import type { EntityDef } from "@/lib/entityConfig";
import EntityTable from "./EntityTable";
import GenericCreateModal from "./GenericCreateModal";
import GenericDetailsModal from "@/components/modals/GenericDetailsModal";
import LeadDetailsModal from "@/components/modals/LeadDetailsModal";
import DocumentDetailsModal from "@/components/modals/DocumentDetailsModal";
import { exportToCSV } from "@/utils/exportCsv";
import { api } from "@/services/api";

interface EntityManagementProps {
  config: EntityDef;
  loadingFallback?: React.ReactNode;
}

export default function EntityManagement({ config, loadingFallback }: EntityManagementProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<Record<string, unknown>>(config.apiEndpoint);
      setData(result);
    } catch {
      console.log(`Failed to fetch ${config.entityName} data`);
    } finally {
      setLoading(false);
    }
  }, [config.apiEndpoint, config.entityName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (record: Record<string, unknown>) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`${config.apiEndpoint}/${record.id_str}`);
      fetchData();
    } catch {
      alert("Failed to delete record.");
    }
  };

  const items: Record<string, unknown>[] = (data?.[config.dataKey] as Record<string, unknown>[]) ?? [];
  const processedItems = config.hideConverted
    ? items.filter((item: Record<string, unknown>) => item.status !== "Converted")
    : items;

  const fallbackSummary: Record<string, number> = {};
  for (const m of config.metrics) {
    fallbackSummary[m.key] = 0;
  }
  const summary = (data?.summary as Record<string, number>) ?? fallbackSummary;

  if (loading && loadingFallback) {
    return <>{loadingFallback}</>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          {config.section && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {config.section}
            </p>
          )}
          <h2 className="font-heading text-lg font-semibold tracking-tight">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => exportToCSV(processedItems, config.dataKey)}>
            <Download size={16} /> Export
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> New {config.entityName}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {config.metrics.map((metric) => {
          const val = summary[metric.key] ?? 0;
          const isNegative = metric.trendNegative && val > 0;
          return (
            <Card key={metric.key} size="sm">
              <CardHeader>
                <CardTitle>{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tracking-tight">{val}</p>
                <p className={`flex items-center gap-1 text-xs ${isNegative ? "text-destructive" : "text-emerald-600"}`}>
                  {metric.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center gap-4 border-b px-6 py-3">
          <SearchInput
            value=""
            onChange={() => {}}
            placeholder={config.searchPlaceholder}
            className="flex-1"
          />
          <Filter size={16} className="shrink-0 text-muted-foreground" />
          {config.filters.map((f, i) => (
            <Select key={i}>
              <SelectTrigger size="sm" className="w-auto min-w-[120px]">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{f.label}</SelectItem>
              </SelectContent>
            </Select>
          ))}
        </div>

        <EntityTable
          config={config}
          items={processedItems}
          onView={(rec) => {
            setSelectedRecord(rec);
            setIsDetailsOpen(true);
          }}
          onEdit={(rec) => {
            setEditRecord(rec);
            setIsModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      </Card>

      <GenericCreateModal
        entityType={config.dataKey}
        entityName={config.entityName}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditRecord(null);
        }}
        editRecord={editRecord}
        onSuccess={fetchData}
      />

      {config.detailsModal === "lead" ? (
        <LeadDetailsModal
          lead={selectedRecord}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedRecord(null);
          }}
          onSuccess={fetchData}
        />
      ) : config.detailsModal === "document" ? (
        <DocumentDetailsModal
          doc={selectedRecord}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedRecord(null);
          }}
        />
      ) : (
        <GenericDetailsModal
          record={selectedRecord}
          entityName={config.entityName}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedRecord(null);
          }}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
