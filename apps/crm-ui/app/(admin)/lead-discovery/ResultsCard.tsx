"use client";
import { ExternalLink, ChevronUp, Pin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

interface ResultsCardProps {
  company: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
}

export default function ResultsCard({ company, isExpanded, onToggleExpand, isSelected, onToggleSelect, isPinned, onTogglePin }: ResultsCardProps) {
  const contact = company.public_contact || {};
  const dm = parseDecisionMaker(company.decision_maker);

  if (!isExpanded) {
    return (
      <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--shell-brand)]/10 text-[var(--shell-brand)] flex items-center justify-center text-sm font-bold shrink-0">{getInitials(company.company_name)}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--shell-foreground)] truncate">{company.company_name}</p>
              <p className="text-xs text-[var(--shell-muted)] flex items-center gap-2 mt-0.5">
                <span>{company.industry}</span>
                {company.location && <><span>·</span><span>{company.location}</span></>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer" className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]">
                <ExternalLink size={14} />
              </a>
            )}
            <div className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="accent-[var(--shell-brand)]" />
              <button onClick={onToggleSelect} className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] cursor-pointer">Select</button>
            </div>
            <Button variant={isPinned ? "default" : "outline"} size="sm" onClick={onTogglePin}>
              <Pin size={12} className={cn("mr-1", isPinned && "fill-current")} /> {isPinned ? "Pinned" : "Pin"}
            </Button>
            <Button size="sm" onClick={onToggleExpand}>View Details</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onToggleExpand}>
            <ChevronUp size={14} className="mr-1" /> Minimize Details
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="accent-[var(--shell-brand)]" />
              <span className="text-[var(--shell-muted)]">Select for Import</span>
            </div>
            <Button variant={isPinned ? "default" : "outline"} size="sm" onClick={onTogglePin}>
              <Pin size={12} className={cn("mr-1", isPinned && "fill-current")} /> {isPinned ? "Pinned" : "Pin Report"}
            </Button>
          </div>
        </div>

        {company.quota_warning && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--shell-warning)]/20 bg-[var(--shell-warning)]/5 text-[var(--shell-warning)] text-xs">
            <span className="text-[var(--shell-warning)] font-bold shrink-0">⚠</span>
            <span><strong>AI analysis unavailable:</strong> {company.quota_warning}</span>
          </div>
        )}

        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 rounded-xl bg-[var(--shell-brand)]/10 text-[var(--shell-brand)] flex items-center justify-center text-xl font-bold shrink-0">{getInitials(company.company_name)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[var(--shell-foreground)]">{company.company_name}</h3>
            <div className="flex flex-wrap gap-3 items-center text-xs text-[var(--shell-muted)] mt-1">
              <span>{company.industry}</span>
              <span>·</span>
              <span>{company.location}</span>
              {company.website && (
                <>
                  <span>·</span>
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-[var(--shell-brand)] hover:underline inline-flex items-center gap-0.5">
                    {company.website.replace(/^https?:\/\/(www\.)?/, "")} <ExternalLink size={10} />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[var(--shell-border)]">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--shell-muted)] mb-2">Company Overview</h4>
              <p className="text-sm text-[var(--shell-foreground)] leading-relaxed">{company.company_overview || "No company overview details available."}</p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--shell-border)]">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--shell-muted)] mb-2">Industry & Business Niche</h4>
              <p className="text-sm text-[var(--shell-foreground)] leading-relaxed">{company.industry_details || "Industry details have not been analyzed for this company."}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-[var(--shell-border)]">
            <h3 className="text-sm font-bold text-[var(--shell-foreground)] mb-4 pb-2 border-b border-[var(--shell-border)]/50">Contact Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-[var(--shell-muted)]">Corporate Email</p>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-sm text-[var(--shell-brand)] font-medium hover:underline">{contact.email}</a>
                ) : <p className="text-sm text-[var(--shell-muted)] italic">Unavailable</p>}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-[var(--shell-muted)]">Corporate Phone</p>
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="text-sm text-[var(--shell-brand)] font-medium hover:underline">{contact.phone}</a>
                ) : <p className="text-sm text-[var(--shell-muted)] italic">Unavailable</p>}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-[var(--shell-muted)]">Google Profile</p>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(company.company_name)}`} target="_blank" rel="noreferrer" className="text-sm text-[var(--shell-brand)] font-medium hover:underline inline-flex items-center gap-1">
                  Search on Google <ExternalLink size={10} />
                </a>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-[var(--shell-muted)]">Physical Address</p>
                {contact.address ? (
                  <>
                    <p className="text-sm text-[var(--shell-foreground)]">{contact.address}</p>
                    <div
                      onClick={() => {
                        const query = company.latitude && company.longitude
                          ? `${company.latitude},${company.longitude}`
                          : encodeURIComponent(contact.address);
                        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
                      }}
                      className="mt-2 rounded-lg overflow-hidden border border-[var(--shell-border)] cursor-pointer hover:shadow-engineered transition-shadow relative h-[130px]"
                    >
                      <iframe
                        title="map"
                        width="100%"
                        height="100%"
                        className="border-0 pointer-events-none"
                        loading="lazy"
                        allowFullScreen
                        src={company.latitude && company.longitude
                          ? `https://maps.google.com/maps?q=${company.latitude},${company.longitude}&z=14&output=embed`
                          : `https://maps.google.com/maps?q=${encodeURIComponent(contact.address)}&z=14&output=embed`}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-1 font-semibold">Click to open in Google Maps</div>
                    </div>
                  </>
                ) : <p className="text-sm text-[var(--shell-muted)] italic">Unavailable</p>}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
