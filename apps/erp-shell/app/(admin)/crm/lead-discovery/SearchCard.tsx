"use client";
import { Search, Globe, Building2, MapPin, Briefcase, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchCardProps {
  searchMode: "parameters" | "url";
  onSearchModeChange: (mode: "parameters" | "url") => void;
  companyName: string;
  onCompanyNameChange: (val: string) => void;
  targetUrl: string;
  onTargetUrlChange: (val: string) => void;
  city: string;
  onCityChange: (val: string) => void;
  industry: string;
  onIndustryChange: (val: string) => void;
  loading: boolean;
  isStopped: boolean;
  onSearch: () => void;
  onStop: () => void;
  onReset: () => void;
}

export default function SearchCard({
  searchMode, onSearchModeChange,
  companyName, onCompanyNameChange,
  targetUrl, onTargetUrlChange,
  city, onCityChange,
  industry, onIndustryChange,
  loading, isStopped, onSearch, onStop, onReset,
}: SearchCardProps) {
  return (
    <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
      <CardContent className="p-5 space-y-5">
        <div className="flex gap-6 border-b border-[var(--shell-border)] pb-3">
          <button onClick={() => onSearchModeChange("parameters")} className={cn("pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer", searchMode === "parameters" ? "border-[var(--shell-brand)] text-[var(--shell-brand)]" : "border-transparent text-[var(--shell-muted)]")}>
            Discover by Location & Industry
          </button>
          <button onClick={() => onSearchModeChange("url")} className={cn("pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer", searchMode === "url" ? "border-[var(--shell-brand)] text-[var(--shell-brand)]" : "border-transparent text-[var(--shell-muted)]")}>
            Scrape & Analyze
          </button>
        </div>

        {searchMode === "url" ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--shell-muted)] flex items-center gap-1.5 mb-1.5"><Building2 size={13} /> Company Name</label>
              <Input placeholder="Enter company name (e.g. Gurucharan Industries)" value={companyName} onChange={e => onCompanyNameChange(e.target.value)} />
            </div>
            <div className="text-center text-xs text-[var(--shell-muted)]">— OR —</div>
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--shell-muted)] flex items-center gap-1.5 mb-1.5"><Globe size={13} /> Website URL</label>
              <Input placeholder="Enter website URL (e.g. https://example.com)" value={targetUrl} onChange={e => onTargetUrlChange(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--shell-muted)] flex items-center gap-1.5 mb-1.5"><MapPin size={13} /> City</label>
              <Input placeholder="e.g. Mumbai, New York" value={city} onChange={e => onCityChange(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--shell-muted)] flex items-center gap-1.5 mb-1.5"><Briefcase size={13} /> Industry</label>
              <Input placeholder="e.g. Technology, Healthcare" value={industry} onChange={e => onIndustryChange(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-[var(--shell-muted)] flex-1 min-w-[200px]">
            {searchMode === "url" ? "Enter a company name or URL to trigger targeted intelligence collection and AI capability analysis." : "Search by city and industry to discover B2B leads."}
          </p>
          <div className="flex gap-3">
            {loading ? (
              <Button variant="destructive" onClick={onStop}><Loader2 size={14} className="mr-1.5 animate-spin" /> Stop Generation</Button>
            ) : isStopped ? (
              <Button variant="secondary" onClick={onReset}><ArrowLeft size={14} className="mr-1.5" /> Reset Search</Button>
            ) : (
              <Button variant="default" onClick={onSearch} disabled={searchMode === "url" ? (!companyName.trim() && !targetUrl.trim()) : (!city && !industry)}>
                <Search size={14} className="mr-1.5" /> Generate Report
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
