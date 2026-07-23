"use client";

import { useState, useEffect } from "react";
import { X, Target, TrendingUp, Calendar, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";

const formatCurrency = (value: any) => {
  const n = Number(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

interface LeadDetailsModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onViewAIInsights?: (companyName: string) => void;
}

export default function LeadDetailsModal({ lead, isOpen, onClose, onSuccess, onViewAIInsights }: LeadDetailsModalProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [probability, setProbability] = useState("60%");
  const [closeDate, setCloseDate] = useState("");
  const [stage, setStage] = useState("RFQ / Inquiry");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [pinnedDetail, setPinnedDetail] = useState<any>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const loadAIInsights = async () => {
    setLoadingInsights(true);
    try {
      const data = await api.get<any>(`/lead-discovery/pinned/${encodeURIComponent(lead.company)}`);
      setPinnedDetail(data);
    } catch {
      /* silent */
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (lead) {
      setIsConverting(false);
      setProbability("60%");
      setStage("RFQ / Inquiry");
      setError("");
      setPinnedDetail(null);
      setShowAIInsights(false);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const yyyy = futureDate.getFullYear();
      const mm = String(futureDate.getMonth() + 1).padStart(2, "0");
      const dd = String(futureDate.getDate()).padStart(2, "0");
      setCloseDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/opportunities", {
        name: lead.name,
        account: lead.company,
        value: lead.est_value,
        probability,
        close_date: closeDate,
        stage,
        owner: lead.owner,
      });

      await api.put(`/leads/${lead.id_str}`, { status: "Converted" });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to convert lead to opportunity.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderLeadFrame = () => {
    const htmlContent = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              padding: 24px;
              margin: 0;
              background-color: #f8fafc;
              color: #1e293b;
            }
            .lead-sheet {
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 32px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }
            .header {
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 16px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .title { margin: 0; font-size: 22px; color: #0f172a; font-weight: 700; }
            .company { margin: 4px 0 0 0; color: #991b1b; font-weight: 600; font-size: 14px; }
            .metric-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 24px;
            }
            .metric-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 16px;
            }
            .metric-label { font-size: 11px; color: #64748b; font-weight: 500; text-transform: uppercase; margin-bottom: 4px; }
            .metric-val { font-size: 18px; font-weight: 700; color: #0f172a; }
            .details-list { font-size: 13px; margin-top: 16px; }
            .details-item {
              display: flex; justify-content: space-between;
              padding: 8px 0; border-bottom: 1px solid #f1f5f9;
            }
            .details-label { color: #64748b; }
            .details-val { font-weight: 500; color: #334155; }
          </style>
        </head>
        <body>
          <div class="lead-sheet">
            <div class="header">
              <div>
                <h1 class="title">${lead.name}</h1>
                <p class="company">${lead.company}</p>
              </div>
            </div>
            <div class="metric-grid">
              <div class="metric-box">
                <div class="metric-label">Estimated Value</div>
                <div class="metric-val">${formatCurrency(lead.est_value)}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">Lead Source</div>
                <div class="metric-val" style="font-size: 14px; margin-top: 4px;">${lead.source}</div>
              </div>
            </div>
            <div class="details-list">
              <div class="details-item">
                <span class="details-label">Lead Reference ID</span>
                <span class="details-val">${lead.id_str}</span>
              </div>
              <div class="details-item">
                <span class="details-label">Assigned Account Owner</span>
                <span class="details-val">${lead.owner}</span>
              </div>
              <div class="details-item">
                <span class="details-label">Last Contact / Update</span>
                <span class="details-val">${lead.updated_at}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    return (
      <iframe
        srcDoc={htmlContent}
        className="w-full h-[400px] rounded-lg border border-[--shell-border]"
        title={lead.name}
      />
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] w-full max-w-[800px] max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-[--shell-border]">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-[--shell-brand]" />
            <h3 className="text-base font-bold text-[--shell-foreground] m-0">
              {isConverting ? `Convert Lead: ${lead.name} to Opportunity` : `Lead Summary: ${lead.name}`}
            </h3>
          </div>
          <button className="p-1 rounded-md hover:bg-[--shell-border] text-[--shell-muted] cursor-pointer" onClick={onClose}><X size={18} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-red-100 text-red-700 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="grid grid-cols-[250px_1fr] gap-6 mb-6">
          <div className="flex flex-col gap-5 border-r border-[--shell-border] pr-6">
            {[
              { label: "Lead Name", value: lead.name },
              { label: "Company", value: lead.company },
              { label: "Est. Value", value: formatCurrency(lead.est_value), accent: true },
              { label: "Source", value: lead.source },
              { label: "Owner", value: lead.owner },
            ].map((f) => (
              <div key={f.label}>
                <div className="text-[11px] font-semibold uppercase text-[--shell-muted] mb-0.5">{f.label}</div>
                <div className={`text-sm font-medium ${f.accent ? "text-[--shell-accent]" : "text-[--shell-foreground]"}`}>{f.value}</div>
              </div>
            ))}
          </div>

          <div>
            {isConverting ? (
              <form onSubmit={handleConvert} className="flex flex-col gap-4 p-5 rounded-lg border border-dashed border-[--shell-border] bg-[--shell-bg]">
                <div className="text-xs text-[--shell-muted] flex items-center gap-2">
                  <TrendingUp size={16} className="text-[--shell-brand]" />
                  <span>Configure details to convert this lead into a Pipeline Opportunity.</span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">Probability</label>
                  <input type="text" placeholder="e.g. 80%" value={probability} onChange={(e) => setProbability(e.target.value)} className="h-8 w-full rounded-md border border-[--shell-border] bg-[--shell-surface] px-2.5 text-xs" required />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">Target Close Date</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--shell-muted] pointer-events-none" />
                    <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="h-8 w-full rounded-md border border-[--shell-border] bg-[--shell-surface] pl-8 pr-2.5 text-xs" required />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">Stage</label>
                  <input type="text" value={stage} onChange={(e) => setStage(e.target.value)} placeholder="e.g. RFQ / Inquiry, Negotiation..." className="h-8 w-full rounded-md border border-[--shell-border] bg-[--shell-surface] px-2.5 text-xs" required />
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsConverting(false)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? "Converting..." : "Confirm Conversion"}
                  </Button>
                </div>
              </form>
            ) : showAIInsights ? (
              <div className="p-5 rounded-lg border border-[--shell-border] bg-[--shell-bg]">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-[--shell-border]">
                  <h4 className="text-sm font-bold text-[--shell-foreground] flex items-center gap-1.5 m-0">
                    <Sparkles size={16} /> AI Discovery Insights
                  </h4>
                  <Button variant="outline" size="sm" onClick={() => setShowAIInsights(false)}>Back to Summary</Button>
                </div>

                {loadingInsights ? (
                  <div className="text-sm text-[--shell-muted]">Loading insights...</div>
                ) : !pinnedDetail ? (
                  <div className="text-xs italic text-[--shell-muted]">No stored insights found.</div>
                ) : (
                  <div className="flex flex-col gap-4 max-h-[55vh] overflow-y-auto pr-2">
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">AI Readiness Score</div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[--shell-accent]">{pinnedDetail.ai_readiness_score}/100</span>
                        <div className="flex-1 h-2 rounded-full bg-[#e2e8f0] overflow-hidden">
                          <div className="h-full rounded-full bg-[--shell-accent]" style={{ width: `${pinnedDetail.ai_readiness_score}%` }} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">Company Overview</div>
                      <p className="text-xs leading-relaxed text-[--shell-foreground] m-0">{pinnedDetail.company_overview}</p>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">Detected Technologies</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pinnedDetail.detected_technologies?.map((tech: string, idx: number) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{tech}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">Business Pain Points</div>
                      <ul className="m-0 pl-4 text-xs text-[--shell-foreground]">
                        {pinnedDetail.business_pain_points?.map((pt: string, idx: number) => (
                          <li key={idx} className="mb-0.5">{pt}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">Recommended AI Solutions</div>
                      <ul className="m-0 pl-4 text-xs text-[--shell-foreground]">
                        {pinnedDetail.recommended_ai_solutions?.map((sol: string, idx: number) => (
                          <li key={idx} className="mb-0.5">{sol}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">Key Decision Makers</div>
                      <div className="text-xs text-[--shell-foreground]">
                        {pinnedDetail.key_decision_makers?.map((dm: string, idx: number) => (
                          <div key={idx}>&bull; {dm}</div>
                        ))}
                      </div>
                    </div>

                    {pinnedDetail.public_contact && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase text-[--shell-muted] mb-1">Public Contact Details</div>
                        <div className="text-xs text-[--shell-foreground] flex flex-col gap-0.5">
                          {pinnedDetail.public_contact.email && <div><strong>Email:</strong> {pinnedDetail.public_contact.email}</div>}
                          {pinnedDetail.public_contact.phone && <div><strong>Phone:</strong> {pinnedDetail.public_contact.phone}</div>}
                          {pinnedDetail.public_contact.address && <div><strong>Address:</strong> {pinnedDetail.public_contact.address}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-[11px] font-semibold uppercase text-[--shell-muted] mb-2">Lead Preview Frame</div>
                {renderLeadFrame()}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[--shell-border]">
          {lead.source === "AI Discovery" && !showAIInsights && (
            <Button
              variant="outline"
              size="sm"
              className="mr-auto"
              onClick={() => { setShowAIInsights(true); loadAIInsights(); }}
            >
              <Sparkles size={14} className="mr-1" /> View AI Insights
            </Button>
          )}
          {!isConverting && lead.status !== "Converted" && (
            <Button size="sm" onClick={() => setIsConverting(true)}>Convert to Opportunity</Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
