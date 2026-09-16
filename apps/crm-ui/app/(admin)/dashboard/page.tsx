"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  TrendingUp, Users, Target, FileText, UserPlus, Layers, Plus,
  Lightbulb, BarChart3, Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, KpiCard, SectionHeading, AlertBanner } from "@datavex/ui-theme";
import DashboardLoading from "./loading";
import PipelineChart from "./PipelineChart";
import Recommendations from "./Recommendations";

const STAGE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const KPI_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-4)", "var(--chart-3)"];

const tooltipStyle = {
  background: "var(--shell-popover)",
  border: "1px solid var(--shell-border)",
  borderRadius: 8,
  fontSize: 13,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

function formatPipelineValue(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>({ metrics: [], pipeline_stages: [], recommendations: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get<any>("/dashboard")
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <DashboardLoading />;

  const metrics = data.metrics ?? [];
  const stages = data.pipeline_stages ?? [];
  const recommendations = data.recommendations ?? [];
  const pipelineValue = stages.length > 0 ? stages.reduce((s: number, st: any) => s + (Number(st.value) || 0), 0) : 0;
  const hasAlerts = recommendations.length > 0;

  const metricIcons = [TrendingUp, Target, Users, Layers] as const;
  const insights = [
    { icon: TrendingUp, label: "Pipeline Value", value: formatPipelineValue(pipelineValue), color: "var(--chart-1)" },
    { icon: Target, label: "Open Opportunities", value: String(metrics[1]?.value ?? 0), color: "var(--chart-2)" },
    { icon: Users, label: "Active Customers", value: String(metrics[2]?.value ?? 0), color: "var(--chart-4)" },
    { icon: Layers, label: "Pipeline Stages", value: String(stages.length), color: "var(--chart-3)" },
  ];

  const quickActions = [
    { label: "New Lead", icon: Plus, href: "/leads" },
    { label: "Add Customer", icon: UserPlus, href: "/customers" },
    { label: "New Opportunity", icon: Target, href: "/opportunities" },
    { label: "New Quotation", icon: FileText, href: "/quotations" },
  ];

  return (
    <div className="space-y-10 lg:space-y-12">
      {/* Welcome Header */}
      <PageHeader
        title={`${getGreeting()}, ${user?.full_name || user?.email || "Sales Executive"}`}
        subtitle="Here's what's moving across your pipeline and accounts today."
        badge="CRM Sales Hub"
      />

      {/* Alert Banner */}
      {hasAlerts && (
        <AlertBanner
          icon={Lightbulb}
          message="AI recommendations available"
          badges={
            <Badge variant="outline" className="border-[var(--shell-accent)]/40 text-[var(--shell-accent-text)] bg-[var(--shell-accent)]/10 text-xs">
              {recommendations.length} insight{recommendations.length !== 1 ? "s" : ""}
            </Badge>
          }
        />
      )}

      {/* Overview KPIs */}
      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map((m: any, i: number) => {
            const trendDir = m.is_positive ? ("up" as const) : ("down" as const);
            return (
              <KpiCard
                key={m.id}
                label={m.name}
                value={m.formatted_value}
                icon={metricIcons[i] ?? TrendingUp}
                trend={{ dir: trendDir, pct: m.trend }}
                color={KPI_COLORS[i]}
                index={i}
              />
            );
          })}
          <KpiCard
            label="Pipeline Value"
            value={formatPipelineValue(pipelineValue)}
            subtitle={`${stages.length} stage${stages.length !== 1 ? "s" : ""} active`}
            icon={Layers}
            color="var(--chart-3)"
            index={metrics.length}
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <SectionHeading label="Quick Actions" />
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button key={action.label} size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push(action.href)}>
              <action.icon className="h-3.5 w-3.5" /> {action.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Pipeline Analytics */}
      <section>
        <SectionHeading label="Pipeline Analytics" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PipelineChart stages={stages} pipelineValue={pipelineValue} />
          <Recommendations recommendations={recommendations} />
        </div>
      </section>

      {/* Activity & Insights */}
      <section>
        <SectionHeading label="Activity & Insights" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Stage Value Bar Chart */}
          <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-[var(--chart-1)]" />
                  Stage Value Comparison
                </CardTitle>
                <CardDescription className="text-xs text-[var(--shell-muted)]">Pipeline value across all stages</CardDescription>
              </div>
              {pipelineValue > 0 && (
                <div className="text-right">
                  <p className="font-heading text-lg font-semibold text-[var(--shell-foreground)]">{formatPipelineValue(pipelineValue)}</p>
                  <p className="text-[10px] text-[var(--shell-muted)]">Total pipeline</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                {stages.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...stages].sort((a: any, b: any) => b.value - a.value)} margin={{ top: 16, right: 8, bottom: 0, left: -16 }}>
                      <defs>
                        <linearGradient id="colorDiscoveryBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--shell-brand)" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="var(--shell-brand)" stopOpacity={0.4}/>
                        </linearGradient>
                        <linearGradient id="colorQuoteBar" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="var(--shell-accent)" stopOpacity={0.9}/>
                           <stop offset="95%" stopColor="var(--shell-accent)" stopOpacity={0.4}/>
                        </linearGradient>
                        <linearGradient id="colorNegotiationBar" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.9}/>
                           <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.4}/>
                        </linearGradient>
                        <linearGradient id="colorWonBar" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="var(--shell-success)" stopOpacity={0.9}/>
                           <stop offset="95%" stopColor="var(--shell-success)" stopOpacity={0.4}/>
                        </linearGradient>
                        <linearGradient id="colorLostBar" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="var(--shell-danger)" stopOpacity={0.9}/>
                           <stop offset="95%" stopColor="var(--shell-danger)" stopOpacity={0.4}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="var(--shell-border)" strokeOpacity={0.4} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} tickFormatter={(v) => formatPipelineValue(v)} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatPipelineValue(Number(value)), "Stage Value"]} labelStyle={{ fontWeight: 600, marginBottom: 4, color: "var(--shell-foreground)" }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
                        {stages.map((_: any, i: number) => {
                          const barGradients = [
                            "url(#colorDiscoveryBar)",
                            "url(#colorQuoteBar)",
                            "url(#colorNegotiationBar)",
                            "url(#colorWonBar)",
                            "url(#colorLostBar)"
                          ];
                          return <Cell key={i} fill={barGradients[i % barGradients.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--shell-muted)]">No stage data yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Insights */}
          <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-[var(--chart-4)]" />
                  Quick Insights
                </CardTitle>
                <CardDescription className="text-xs text-[var(--shell-muted)]">Pipeline summary at a glance</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {insights.map((insight) => (
                  <div key={insight.label} className="flex items-center gap-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3.5 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${insight.color}15` }}>
                      <insight.icon className="h-4 w-4" style={{ color: insight.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--shell-muted)] truncate">{insight.label}</p>
                      <p className="font-heading text-sm font-semibold text-[var(--shell-foreground)]">{insight.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {hasAlerts ? (
                <div className="mt-3 rounded-lg border border-[var(--shell-accent)]/20 bg-[var(--shell-accent)]/5 px-3.5 py-2.5">
                  <p className="text-xs font-medium text-[var(--shell-accent-text)]">{recommendations.length} AI recommendation{recommendations.length !== 1 ? "s" : ""} available</p>
                  <p className="mt-0.5 text-[11px] text-[var(--shell-muted)]">Review insights to optimize your sales pipeline.</p>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-[var(--shell-success)]/20 bg-[var(--shell-success)]/5 px-3.5 py-2.5">
                  <p className="text-xs font-medium text-[var(--shell-success)]">All pipeline metrics are healthy</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
