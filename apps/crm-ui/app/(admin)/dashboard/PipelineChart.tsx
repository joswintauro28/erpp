"use client";

import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const STAGE_COLORS = ["var(--shell-brand)", "#E5B83C", "#6366f1", "#10b981", "#f43f5e"];
const STAGE_GRADIENTS = [
  "url(#colorDiscovery)",
  "url(#colorQuote)",
  "url(#colorNegotiation)",
  "url(#colorWon)",
  "url(#colorLost)"
];

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

interface PipelineChartProps {
  stages: any[];
  pipelineValue: number;
}

export default function PipelineChart({ stages, pipelineValue }: PipelineChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[var(--shell-border)]/20">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--shell-foreground)]">
            <BarChart3 className="h-4 w-4 text-[var(--shell-brand)]" />
            Pipeline Distribution
          </CardTitle>
          <CardDescription className="text-xs text-[var(--shell-muted)]">Value breakdown by stage</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {stages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center min-h-[300px]">
            <div className="col-span-12 md:col-span-7 flex justify-center items-center relative h-[250px] md:h-[280px]">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                <div className="flex flex-col items-center justify-center bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-full h-32 w-32 shadow-engineered">
                  <span className="font-heading text-3xl font-bold tracking-tight text-[var(--shell-foreground)] leading-none">{stages.length}</span>
                  <span className="text-[10px] font-heading font-semibold uppercase tracking-[0.12em] text-[var(--shell-muted)] mt-1">Stages</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <PieChart>
                  <defs>
                    <linearGradient id="colorDiscovery" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--shell-brand)" stopOpacity={0.95}/>
                      <stop offset="95%" stopColor="#3D1013" stopOpacity={0.95}/>
                    </linearGradient>
                    <linearGradient id="colorQuote" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E5B83C" stopOpacity={0.95}/>
                      <stop offset="95%" stopColor="#B38F2E" stopOpacity={0.95}/>
                    </linearGradient>
                    <linearGradient id="colorNegotiation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.95}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.95}/>
                    </linearGradient>
                    <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.95}/>
                      <stop offset="95%" stopColor="#047857" stopOpacity={0.95}/>
                    </linearGradient>
                    <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.95}/>
                      <stop offset="95%" stopColor="#be123c" stopOpacity={0.95}/>
                    </linearGradient>
                  </defs>
                  <Pie data={stages.map((s: any) => ({ name: s.name, value: s.value }))} cx="50%" cy="50%" innerRadius={78} outerRadius={108} paddingAngle={3} dataKey="value" stroke="var(--shell-surface)" strokeWidth={2}>
                    {stages.map((_: any, i: number) => <Cell key={i} fill={STAGE_GRADIENTS[i % STAGE_GRADIENTS.length]} className="hover:opacity-90 transition-opacity" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(_value: unknown, _name: unknown, entry: any) => { const v = entry?.payload?.value ?? 0; return [formatPipelineValue(v), entry?.payload?.name]; }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="col-span-12 md:col-span-5 space-y-3">
              <div className="text-[11px] font-heading font-semibold uppercase tracking-[0.12em] text-[var(--shell-muted)] border-b border-[var(--shell-border)]/20 pb-1.5 mb-3">Stage Breakdown</div>
              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                {stages.map((s: any, i: number) => {
                  const pct = pipelineValue > 0 ? (s.value / pipelineValue) * 100 : 0;
                  return (
                    <div key={s.id} className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-[var(--shell-border)]/10 transition-all duration-150 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0 transition-transform group-hover:scale-110" style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                          <span className="text-xs font-heading font-semibold tracking-tight text-[var(--shell-foreground)]">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[var(--shell-foreground)]">{formatPipelineValue(s.value)}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--shell-border)]/30 text-[var(--shell-muted)] font-medium">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1 w-full bg-[var(--shell-border)]/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-[var(--shell-border)]/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--shell-muted)]">Total Pipeline</span>
                  <span className="font-heading font-semibold text-[var(--shell-foreground)]">{formatPipelineValue(pipelineValue)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center text-sm text-[var(--shell-muted)] border border-dashed border-[var(--shell-border)] rounded-lg">No pipeline data available</div>
        )}
      </CardContent>
    </Card>
  );
}
