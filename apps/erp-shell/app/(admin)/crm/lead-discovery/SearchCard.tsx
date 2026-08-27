"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, Globe, Building2, MapPin, Briefcase, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const defaultCityOptions = [
  { value: "mumbai", label: "Mumbai, India" },
  { value: "delhi", label: "Delhi, India" },
  { value: "bengaluru", label: "Bengaluru, India" },
  { value: "hyderabad", label: "Hyderabad, India" },
  { value: "chennai", label: "Chennai, India" },
  { value: "kolkata", label: "Kolkata, India" },
  { value: "pune", label: "Pune, India" },
  { value: "ahmedabad", label: "Ahmedabad, India" },
  { value: "mangalore", label: "Mangalore, India" },
  { value: "kochi", label: "Kochi, India" },
  { value: "new york", label: "New York, United States" },
  { value: "los angeles", label: "Los Angeles, United States" },
  { value: "san francisco", label: "San Francisco, United States" },
  { value: "chicago", label: "Chicago, United States" },
  { value: "toronto", label: "Toronto, Canada" },
  { value: "vancouver", label: "Vancouver, Canada" },
  { value: "london", label: "London, United Kingdom" },
  { value: "paris", label: "Paris, France" },
  { value: "berlin", label: "Berlin, Germany" },
  { value: "amsterdam", label: "Amsterdam, Netherlands" },
  { value: "madrid", label: "Madrid, Spain" },
  { value: "rome", label: "Rome, Italy" },
  { value: "tokyo", label: "Tokyo, Japan" },
  { value: "singapore", label: "Singapore" },
  { value: "dubai", label: "Dubai, UAE" },
  { value: "hong kong", label: "Hong Kong" },
  { value: "shanghai", label: "Shanghai, China" },
  { value: "seoul", label: "Seoul, South Korea" },
  { value: "sydney", label: "Sydney, Australia" },
  { value: "melbourne", label: "Melbourne, Australia" },
  { value: "auckland", label: "Auckland, New Zealand" },
  { value: "sao paulo", label: "São Paulo, Brazil" },
  { value: "cape town", label: "Cape Town, South Africa" },
];

const industryOptions = [
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Technology", label: "Technology" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Retail", label: "Retail" },
  { value: "Finance", label: "Finance" },
  { value: "Education", label: "Education" },
  { value: "Construction", label: "Construction" },
  { value: "Transportation", label: "Transportation" },
  { value: "Energy", label: "Energy" },
  { value: "Agriculture", label: "Agriculture" },
  { value: "Entertainment", label: "Entertainment" },
  { value: "Hospitality", label: "Hospitality" },
  { value: "Real Estate", label: "Real Estate" },
];

const loadCityOptions = async (inputValue: string) => {
  if (!inputValue) return [];
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        inputValue
      )}&count=10&language=en&format=json`
    );
    const data = await response.json();
    if (!data.results) return [];

    const uniqueCities: { value: string; label: string }[] = [];
    const seen = new Set();
    data.results.forEach((item: any) => {
      const displayName = `${item.name}${item.admin1 ? `, ${item.admin1}` : ""}, ${
        item.country
      }`;
      if (!seen.has(displayName)) {
        seen.add(displayName);
        uniqueCities.push({
          value: item.name.toLowerCase(),
          label: displayName,
        });
      }
    });
    return uniqueCities;
  } catch (error) {
    handleError("Error fetching cities:", error);
    return [];
  }
};

function CitySearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<{ value: string; label: string }[]>(defaultCityOptions);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value) {
      setInputValue("");
    } else {
      const match = defaultCityOptions.find((o) => o.value === value);
      if (match) {
        setInputValue(match.label);
      } else {
        setInputValue(
          value
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        );
      }
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    if (!inputValue) {
      setOptions(defaultCityOptions);
      return;
    }

    const selectedMatch = defaultCityOptions.find((o) => o.value === value);
    if (selectedMatch && inputValue === selectedMatch.label) {
      return;
    }
    if (
      value &&
      inputValue ===
        value
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
    ) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      const results = await loadCityOptions(inputValue);
      setOptions(results.length ? results : defaultCityOptions);
      setLoading(false);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue, isOpen, value]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        placeholder="Search city..."
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (!e.target.value) {
            onChange("");
          }
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && (
        <div className="absolute left-0 right-0 z-[9999] mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-1 shadow-lg">
          {loading ? (
            <div className="p-2 text-xs text-[var(--shell-muted)]">Searching cities...</div>
          ) : options.length === 0 ? (
            <div className="p-2 text-xs text-[var(--shell-muted)]">No cities found.</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setInputValue(opt.label);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--shell-border)] text-[var(--shell-foreground)] transition-colors cursor-pointer"
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function IndustrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value) {
      setInputValue("");
    } else {
      const match = industryOptions.find((o) => o.value === value);
      setInputValue(match ? match.label : value);
    }
  }, [value]);

  const filteredOptions = industryOptions.filter((opt) =>
    opt.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        placeholder="Search or type industry..."
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && (
        <div className="absolute left-0 right-0 z-[9999] mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-1 shadow-lg">
          {filteredOptions.length === 0 ? (
            inputValue.trim() ? (
              <button
                type="button"
                onClick={() => {
                  onChange(inputValue);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--shell-border)] text-[var(--shell-success)] font-medium transition-colors cursor-pointer"
              >
                Create "{inputValue}"
              </button>
            ) : (
              <div className="p-2 text-xs text-[var(--shell-muted)]">Type to search/create...</div>
            )
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setInputValue(opt.label);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--shell-border)] text-[var(--shell-foreground)] transition-colors cursor-pointer"
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
  searchMode,
  onSearchModeChange,
  companyName,
  onCompanyNameChange,
  targetUrl,
  onTargetUrlChange,
  city,
  onCityChange,
  industry,
  onIndustryChange,
  loading,
  isStopped,
  onSearch,
  onStop,
  onReset,
}: SearchCardProps) {
  return (
    <Card className="!overflow-visible hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
      <CardContent className="p-5 space-y-5">
        <div className="flex gap-6 border-b border-[var(--shell-border)] pb-3">
          <button
            onClick={() => onSearchModeChange("parameters")}
            className={cn(
              "pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer",
              searchMode === "parameters"
                ? "border-[var(--shell-brand)] text-[var(--shell-brand)]"
                : "border-transparent text-[var(--shell-muted)]"
            )}
          >
            Discover by Location & Industry
          </button>
          <button
            onClick={() => onSearchModeChange("url")}
            className={cn(
              "pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer",
              searchMode === "url"
                ? "border-[var(--shell-brand)] text-[var(--shell-brand)]"
                : "border-transparent text-[var(--shell-muted)]"
            )}
          >
            Scrape & Analyze
          </button>
        </div>

        {searchMode === "url" ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--shell-muted)] flex items-center gap-1.5 mb-1.5">
                <Building2 size={13} /> Company Name
              </label>
              <Input
                placeholder="Enter company name (e.g. Gurucharan Industries)"
                value={companyName}
                onChange={(e) => onCompanyNameChange(e.target.value)}
              />
            </div>
            <div className="text-center text-xs text-[var(--shell-muted)]">— OR —</div>
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--shell-muted)] flex items-center gap-1.5 mb-1.5">
                <Globe size={13} /> Website URL
              </label>
              <Input
                placeholder="Enter website URL (e.g. https://example.com)"
                value={targetUrl}
                onChange={(e) => onTargetUrlChange(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 relative !overflow-visible">
            <div className="relative !overflow-visible">
              <label className="text-xs font-semibold uppercase text-[var(--shell-muted)] flex items-center gap-1.5 mb-1.5">
                <MapPin size={13} /> City
              </label>
              <CitySearch value={city} onChange={onCityChange} />
            </div>
            <div className="relative !overflow-visible">
              <label className="text-xs font-semibold uppercase text-[var(--shell-muted)] flex items-center gap-1.5 mb-1.5">
                <Briefcase size={13} /> Industry
              </label>
              <IndustrySelect value={industry} onChange={onIndustryChange} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-[var(--shell-muted)] flex-1 min-w-[200px]">
            {searchMode === "url"
              ? "Enter a company name or URL to trigger targeted intelligence collection and AI capability analysis."
              : "Search by city and industry to discover B2B leads."}
          </p>
          <div className="flex gap-3">
            {loading ? (
              <Button variant="destructive" onClick={onStop}>
                <Loader2 size={14} className="mr-1.5 animate-spin" /> Stop Generation
              </Button>
            ) : isStopped ? (
              <Button variant="outline" onClick={onReset}>
                <ArrowLeft size={14} className="mr-1.5" /> Reset Search
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={onSearch}
                disabled={
                  searchMode === "url"
                    ? !companyName.trim() && !targetUrl.trim()
                    : !city && !industry
                }
              >
                <Search size={14} className="mr-1.5" /> Generate Report
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
