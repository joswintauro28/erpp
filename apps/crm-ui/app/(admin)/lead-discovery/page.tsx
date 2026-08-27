"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Download, RotateCw, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { api, getAccessToken } from "@/services/api";
import { handleError } from "@datavex/ui-theme";
import { exportToCSV } from "@/utils/exportCsv";
import { toastError, toastSuccess, toastInfo } from "@/utils/toast";
import SearchCard from "./SearchCard";
import ResultsCard from "./ResultsCard";

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export default function LeadDiscoveryPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<any[]>([]);
  const [pinnedLeads, setPinnedLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "pinned">("search");
  const [filterText, setFilterText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchMode, setSearchMode] = useState<"parameters" | "url">("parameters");
  const [companyName, setCompanyName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPinnedLeads = useCallback(async () => {
    try {
      const data = await api.get<any[]>("/lead-discovery/pinned");
      setPinnedLeads(data);
    } catch {}
  }, []);

  useEffect(() => { fetchPinnedLeads(); }, [fetchPinnedLeads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPinnedLeads();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    setIsStopped(false);
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const isUrl = searchMode === "url" && targetUrl.trim().length > 0;
      const endpoint = isUrl ? "/lead-discovery/scrape-url" : "/lead-discovery/search";
      const body = isUrl
        ? { url: targetUrl }
        : { city: city || null, industry: industry || null, company_name: companyName || null, searchBy: "Employees", minEmployees: "200", refresh: false };

      // Route through crm-ui's own Next proxy (same-origin /api → crm-service)
      // instead of a hardcoded 127.0.0.1:8001 (which breaks in Docker).
      const res = await fetch(`/api${endpoint}`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(body), signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      let data = await res.json();
      if (isUrl) {
        data = {
          search: { company_name: data.company_name, city: data.public_contact?.address || "", industry: data.industry, mode: "url", url: targetUrl },
          companies: [data],
        };
      }
      setResults(data);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      toastError("Failed to fetch leads", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStopped(true);
    setLoading(false);
  };

  const handleReset = () => {
    setResults(null);
    setLoading(false);
    setIsStopped(false);
    setSelectedLeads([]);
  };

  const toggleSelect = (company: any) => {
    setSelectedLeads(prev =>
      prev.some(c => c.company_name === company.company_name)
        ? prev.filter(c => c.company_name !== company.company_name)
        : [...prev, company]
    );
  };

  const isPinned = (company: any) => pinnedLeads.some(c => c.company_name === company.company_name);

  const togglePin = async (company: any) => {
    if (isPinned(company)) {
      setPinnedLeads(prev => prev.filter(c => c.company_name !== company.company_name));
      try { await api.delete(`/lead-discovery/pinned/${encodeURIComponent(company.company_name)}`); } catch {}
    } else {
      setPinnedLeads(prev => [...prev, company]);
      try { await api.post("/lead-discovery/pinned", company); } catch {}
    }
  };

  const handleImport = async () => {
    if (selectedLeads.length === 0) return;
    setImporting(true);
    try {
      await api.post("/lead-discovery/import", { companies: selectedLeads });
      toastSuccess(`Successfully imported ${selectedLeads.length} leads!`);
      setSelectedLeads([]);
    } catch {
      toastError("Error importing leads", "Ensure backend is running.");
    } finally {
      setImporting(false);
    }
  };

  const filteredCompanies = (companies: any[]) =>
    companies.filter(c => {
      if (!filterText.trim()) return true;
      const t = filterText.toLowerCase();
      return (c.company_name?.toLowerCase().includes(t) || c.industry?.toLowerCase().includes(t));
    });

  const displayCompanies = activeTab === "search" ? filteredCompanies(results?.companies || []) : filteredCompanies(pinnedLeads);

  return (
    <div className="space-y-10 lg:space-y-12">
      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">Lead Discovery</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>

        <SearchCard
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          companyName={companyName}
          onCompanyNameChange={setCompanyName}
          targetUrl={targetUrl}
          onTargetUrlChange={setTargetUrl}
          city={city}
          onCityChange={setCity}
          industry={industry}
          onIndustryChange={setIndustry}
          loading={loading}
          isStopped={isStopped}
          onSearch={handleSearch}
          onStop={handleStop}
          onReset={handleReset}
        />
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">Results</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RotateCw className={"h-4 w-4 mr-1.5" + (refreshing ? " animate-spin" : "")} /> Refresh
            </Button>
            {results?.companies?.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => exportToCSV(results.companies, "lead-discovery-results")}>
                <Download size={14} className="mr-1.5" /> Export
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-6 border-b border-[var(--shell-border)] mb-4">
          <button onClick={() => setActiveTab("search")} className={cn("pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer", activeTab === "search" ? "border-[var(--shell-brand)] text-[var(--shell-brand)]" : "border-transparent text-[var(--shell-muted)]")}>
            Search Results {results?.companies ? <Badge variant="neutral" className="ml-1.5">{results.companies.length}</Badge> : null}
          </button>
          <button onClick={() => setActiveTab("pinned")} className={cn("pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer", activeTab === "pinned" ? "border-[var(--shell-brand)] text-[var(--shell-brand)]" : "border-transparent text-[var(--shell-muted)]")}>
            Pinned Pages {pinnedLeads.length > 0 ? <Badge variant="neutral" className="ml-1.5">{pinnedLeads.length}</Badge> : null}
          </button>
        </div>

        {activeTab === "search" && !results && !loading && (
          <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
            <CardContent className="p-10 text-center">
              <p className="text-sm text-[var(--shell-muted)]">Enter search criteria and click Generate to discover leads.</p>
            </CardContent>
          </Card>
        )}

        {displayCompanies.length > 0 && (
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--shell-muted)]" />
            <Input placeholder="Search by company name or industry..." value={filterText} onChange={e => setFilterText(e.target.value)} className="pl-9" />
          </div>
        )}

        {displayCompanies.map((company: any, idx: number) => (
          <div key={`${activeTab}-${idx}`} className="mb-3 last:mb-0">
            <ResultsCard
              company={company}
              isExpanded={expandedCompany === company.company_name}
              onToggleExpand={() => setExpandedCompany(expandedCompany === company.company_name ? null : company.company_name)}
              isSelected={selectedLeads.some(c => c.company_name === company.company_name)}
              onToggleSelect={() => toggleSelect(company)}
              isPinned={isPinned(company)}
              onTogglePin={() => togglePin(company)}
            />
          </div>
        ))}

        {activeTab === "pinned" && pinnedLeads.length === 0 && (
          <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
            <CardContent className="p-10 text-center">
              <p className="text-sm text-[var(--shell-muted)]">No pinned pages yet. Pin a result from the search tab to save it here.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedLeads.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[var(--shell-surface)] shadow-engineered rounded-xl border border-[var(--shell-border)] p-4 flex items-center gap-5">
          <span className="text-sm font-medium text-[var(--shell-foreground)]">{selectedLeads.length} leads selected</span>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Importing..." : "Import Selected to Leads"}
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
    </div>
  );
}
