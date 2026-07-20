"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Globe, Building2, Users, Briefcase, MapPin, Loader2, Upload, ExternalLink, ArrowLeft, X, ChevronDown, ChevronUp, Pin, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { api, getAccessToken } from "@/services/api";
import LeadDiscoveryLoading from "./loading";

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function parseDecisionMaker(dm: string) {
  if (!dm) return { name: "Unknown", title: "" };
  const paren = dm.match(/(.*?)\((.*?)\)/);
  if (paren) return { name: paren[1].trim(), title: paren[2].trim() };
  const parts = dm.split(/-|:/);
  if (parts.length > 1) return { name: parts[0].trim(), title: parts.slice(1).join("-").trim() };
  return { name: dm.trim(), title: "" };
}

export default function LeadDiscoveryPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<any[]>([]);
  const [pinnedLeads, setPinnedLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "pinned">("search");
  const [filterText, setFilterText] = useState("");
  const [importing, setImporting] = useState(false);
  const [searchMode, setSearchMode] = useState<"parameters" | "url">("parameters");
  const [companyName, setCompanyName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [minEmployees, setMinEmployees] = useState("200");
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPinnedLeads = useCallback(async () => {
    try { const data = await api.get<any[]>("/crm/lead-discovery/pinned"); setPinnedLeads(data); } catch {}
  }, []);
  useEffect(() => { fetchPinnedLeads(); }, [fetchPinnedLeads]);

  const handleSearch = async () => {
    setIsStopped(false); setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const isUrl = searchMode === "url" && targetUrl.trim().length > 0;
      const endpoint = isUrl ? "/crm/lead-discovery/scrape-url" : "/crm/lead-discovery/search";
      const body = isUrl
        ? { url: targetUrl }
        : { city: city || null, industry: industry || null, company_name: companyName || null, searchBy: "Employees", minEmployees, refresh: false };
      const res = await fetch(`/api${endpoint}`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(body), signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      let data = await res.json();
      if (isUrl) {
        data = { search: { company_name: data.company_name, city: data.public_contact?.address || "", industry: data.industry, mode: "url", url: targetUrl }, companies: [data] };
      }
      setResults(data);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      alert("Failed to fetch leads: " + err.message);
    } finally { setLoading(false); }
  };

  const handleStop = () => { abortRef.current?.abort(); setIsStopped(true); setLoading(false); };
  const handleReset = () => { setResults(null); setLoading(false); setIsStopped(false); setSelectedLeads([]); };

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
      try { await api.delete(`/crm/lead-discovery/pinned/${encodeURIComponent(company.company_name)}`); } catch {}
    } else {
      setPinnedLeads(prev => [...prev, company]);
      try { await api.post("/crm/lead-discovery/pinned", company); } catch {}
    }
  };

  const handleImport = async () => {
    if (selectedLeads.length === 0) return;
    setImporting(true);
    try {
      await api.post("/crm/lead-discovery/import", { companies: selectedLeads });
      alert(`Successfully imported ${selectedLeads.length} leads!`);
      setSelectedLeads([]);
    } catch { alert("Error importing leads. Ensure backend is running."); }
    finally { setImporting(false); }
  };

  const filteredCompanies = (companies: any[]) =>
    companies.filter(c => {
      if (!filterText.trim()) return true;
      const t = filterText.toLowerCase();
      return (c.company_name?.toLowerCase().includes(t) || c.industry?.toLowerCase().includes(t));
    });

  return (
    <div className="space-y-10 lg:space-y-12">
      <div className="mb-5 flex items-center gap-2">
        <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Lead Discovery</h2>
        <div className="h-px flex-1 bg-[--shell-border]" />
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
        <CardContent className="p-5 space-y-5">
          <div className="flex gap-6 border-b border-[--shell-border] pb-3">
            <button onClick={() => setSearchMode("parameters")} className={cn("pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer", searchMode === "parameters" ? "border-[--shell-brand] text-[--shell-brand]" : "border-transparent text-[--shell-muted]")}>
              Discover by Location & Industry
            </button>
            <button onClick={() => setSearchMode("url")} className={cn("pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer", searchMode === "url" ? "border-[--shell-brand] text-[--shell-brand]" : "border-transparent text-[--shell-muted]")}>
              Scrape & Analyze
            </button>
          </div>

          {searchMode === "url" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-[--shell-muted] flex items-center gap-1.5 mb-1.5"><Building2 size={13} /> Company Name</label>
                <Input placeholder="Enter company name (e.g. Gurucharan Industries)" value={companyName} onChange={e => setCompanyName(e.target.value)} />
              </div>
              <div className="text-center text-xs text-[--shell-muted]">— OR —</div>
              <div>
                <label className="text-xs font-semibold uppercase text-[--shell-muted] flex items-center gap-1.5 mb-1.5"><Globe size={13} /> Website URL</label>
                <Input placeholder="Enter website URL (e.g. https://example.com)" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-[--shell-muted] flex items-center gap-1.5 mb-1.5"><MapPin size={13} /> City</label>
                <Input placeholder="e.g. Mumbai, New York" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-[--shell-muted] flex items-center gap-1.5 mb-1.5"><Briefcase size={13} /> Industry</label>
                <Input placeholder="e.g. Technology, Healthcare" value={industry} onChange={e => setIndustry(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-[--shell-muted] flex-1 min-w-[200px]">
              {searchMode === "url" ? "Enter a company name or URL to trigger targeted intelligence collection and AI capability analysis." : "Search by city and industry to discover B2B leads."}
            </p>
            <div className="flex gap-3">
              {loading ? (
                <Button variant="destructive" onClick={handleStop}><Loader2 size={14} className="mr-1.5 animate-spin" /> Stop Generation</Button>
              ) : isStopped ? (
                <Button variant="secondary" onClick={handleReset}><ArrowLeft size={14} className="mr-1.5" /> Reset Search</Button>
              ) : (
                <Button variant="default" onClick={handleSearch} disabled={searchMode === "url" ? (!companyName.trim() && !targetUrl.trim()) : (!city && !industry)}>
                  <Search size={14} className="mr-1.5" /> Generate Report
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-5 flex items-center gap-2">
        <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Results</h2>
        <div className="h-px flex-1 bg-[--shell-border]" />
      </div>

      <div className="flex gap-6 border-b border-[--shell-border]">
        <button onClick={() => setActiveTab("search")} className={cn("pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer", activeTab === "search" ? "border-[--shell-brand] text-[--shell-brand]" : "border-transparent text-[--shell-muted]")}>
          Search Results {results?.companies ? <Badge variant="secondary" className="ml-1.5">{results.companies.length}</Badge> : null}
        </button>
        <button onClick={() => setActiveTab("pinned")} className={cn("pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer", activeTab === "pinned" ? "border-[--shell-brand] text-[--shell-brand]" : "border-transparent text-[--shell-muted]")}>
          Pinned Pages {pinnedLeads.length > 0 ? <Badge variant="secondary" className="ml-1.5">{pinnedLeads.length}</Badge> : null}
        </button>
      </div>

      {activeTab === "search" && !results && !loading && (
        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <CardContent className="p-10 text-center">
            <p className="text-sm text-[--shell-muted]">Enter search criteria and click Generate to discover leads.</p>
          </CardContent>
        </Card>
      )}

      {(activeTab === "search" ? (results?.companies?.length > 0) : (pinnedLeads.length > 0)) && (
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--shell-muted]" />
          <Input placeholder="Search by company name or industry..." value={filterText} onChange={e => setFilterText(e.target.value)} className="pl-9" />
        </div>
      )}

      {(activeTab === "search" ? filteredCompanies(results?.companies || []) : filteredCompanies(pinnedLeads)).map((company: any, idx: number) => {
        const contact = company.public_contact || {};
        const isExpanded = expandedCompany === company.company_name;
        const dm = parseDecisionMaker(company.decision_maker);

        return (
          <Card key={`${activeTab}-${idx}`} className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
            {!isExpanded ? (
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[--shell-brand]/10 text-[--shell-brand] flex items-center justify-center text-sm font-bold shrink-0">{getInitials(company.company_name)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[--shell-foreground] truncate">{company.company_name}</p>
                    <p className="text-xs text-[--shell-muted] flex items-center gap-2 mt-0.5">
                      <span>{company.industry}</span>
                      {company.location && <><span>·</span><span>{company.location}</span></>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noreferrer" className="text-[--shell-muted] hover:text-[--shell-foreground]"><ExternalLink size={14} /></a>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={selectedLeads.some(c => c.company_name === company.company_name)} onChange={() => toggleSelect(company)} className="accent-[--shell-brand]" />
                    <button onClick={() => toggleSelect(company)} className="text-[--shell-muted] hover:text-[--shell-foreground] cursor-pointer">Select</button>
                  </div>
                  <Button variant={isPinned(company) ? "default" : "outline"} size="sm" onClick={() => togglePin(company)}>
                    <Pin size={12} className={cn("mr-1", isPinned(company) && "fill-current")} /> {isPinned(company) ? "Pinned" : "Pin"}
                  </Button>
                  <Button size="sm" onClick={() => setExpandedCompany(isExpanded ? null : company.company_name)}>View Details</Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setExpandedCompany(null)}><ChevronUp size={14} className="mr-1" /> Minimize Details</Button>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={selectedLeads.some(c => c.company_name === company.company_name)} onChange={() => toggleSelect(company)} className="accent-[--shell-brand]" />
                      <span className="text-[--shell-muted]">Select for Import</span>
                    </div>
                    <Button variant={isPinned(company) ? "default" : "outline"} size="sm" onClick={() => togglePin(company)}>
                      <Pin size={12} className={cn("mr-1", isPinned(company) && "fill-current")} /> {isPinned(company) ? "Pinned" : "Pin Report"}
                    </Button>
                  </div>
                </div>
                {company.quota_warning && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[--shell-warning]/20 bg-[--shell-warning]/5 text-[--shell-warning] text-xs">
                    <span className="text-amber-500 font-bold shrink-0">⚠</span>
                    <span><strong>AI analysis unavailable:</strong> {company.quota_warning}</span>
                  </div>
                )}
                <div className="flex gap-4 items-start">
                  <div className="w-14 h-14 rounded-xl bg-[--shell-brand]/10 text-[--shell-brand] flex items-center justify-center text-xl font-bold shrink-0">{getInitials(company.company_name)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[--shell-foreground]">{company.company_name}</h3>
                    <div className="flex flex-wrap gap-3 items-center text-xs text-[--shell-muted] mt-1">
                      <span>{company.industry}</span><span>·</span><span>{company.location}</span>
                      {company.website && <><span>·</span><a href={company.website} target="_blank" rel="noreferrer" className="text-[--shell-brand] hover:underline inline-flex items-center gap-0.5">{company.website.replace(/^https?:\/\/(www\.)?/, "")} <ExternalLink size={10} /></a></>}
                    </div>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-[--shell-border]">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[--shell-muted] mb-2">Company Overview</h4>
                      <p className="text-sm text-[--shell-foreground] leading-relaxed">{company.company_overview || "No company overview details available."}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[--shell-border]">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[--shell-muted] mb-2">Industry & Business Niche</h4>
                      <p className="text-sm text-[--shell-foreground] leading-relaxed">{company.industry_details || "Industry details have not been analyzed for this company."}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-[--shell-border]">
                    <h3 className="text-sm font-bold text-[--shell-foreground] mb-4 pb-2 border-b border-[--shell-border]/50">Contact Information</h3>
                    <div className="space-y-3">
                      <div><p className="text-[10px] font-semibold uppercase text-[--shell-muted]">Corporate Email</p>
                        {contact.email ? <a href={`mailto:${contact.email}`} className="text-sm text-[--shell-brand] font-medium hover:underline">{contact.email}</a> : <p className="text-sm text-[--shell-muted] italic">Unavailable</p>}
                      </div>
                      <div><p className="text-[10px] font-semibold uppercase text-[--shell-muted]">Corporate Phone</p>
                        {contact.phone ? <a href={`tel:${contact.phone}`} className="text-sm text-[--shell-brand] font-medium hover:underline">{contact.phone}</a> : <p className="text-sm text-[--shell-muted] italic">Unavailable</p>}
                      </div>
                      <div><p className="text-[10px] font-semibold uppercase text-[--shell-muted]">Google Profile</p>
                        <a href={`https://www.google.com/search?q=${encodeURIComponent(company.company_name)}`} target="_blank" rel="noreferrer" className="text-sm text-[--shell-brand] font-medium hover:underline inline-flex items-center gap-1">Search on Google <ExternalLink size={10} /></a>
                      </div>
                      <div><p className="text-[10px] font-semibold uppercase text-[--shell-muted]">Physical Address</p>
                        {contact.address ? (
                          <>
                            <p className="text-sm text-[--shell-foreground]">{contact.address}</p>
                            <div onClick={() => { const query = company.latitude && company.longitude ? `${company.latitude},${company.longitude}` : encodeURIComponent(contact.address); window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank"); }}
                              className="mt-2 rounded-lg overflow-hidden border border-[--shell-border] cursor-pointer hover:shadow-md transition-shadow relative h-[130px]">
                              <iframe title="map" width="100%" height="100%" className="border-0 pointer-events-none" loading="lazy" allowFullScreen
                                src={company.latitude && company.longitude ? `https://maps.google.com/maps?q=${company.latitude},${company.longitude}&z=14&output=embed` : `https://maps.google.com/maps?q=${encodeURIComponent(contact.address)}&z=14&output=embed`} />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-1 font-semibold">Click to open in Google Maps</div>
                            </div>
                          </>
                        ) : <p className="text-sm text-[--shell-muted] italic">Unavailable</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {activeTab === "pinned" && pinnedLeads.length === 0 && (
        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <CardContent className="p-10 text-center">
            <p className="text-sm text-[--shell-muted]">No pinned pages yet. Pin a result from the search tab to save it here.</p>
          </CardContent>
        </Card>
      )}

      {selectedLeads.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg rounded-xl border border-[--shell-border] p-4 flex items-center gap-5">
          <span className="text-sm font-medium text-[--shell-foreground]">{selectedLeads.length} leads selected</span>
          <Button onClick={handleImport} disabled={importing}>{importing ? "Importing..." : "Import Selected to Leads"}</Button>
        </div>
      )}

      {loading && <div className="flex justify-center py-10"><Spinner /></div>}
    </div>
  );
}
