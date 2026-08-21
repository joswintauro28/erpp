"use client";

import { useRouter } from "next/navigation";
import { Lightbulb, ArrowUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RecommendationsProps {
  recommendations: any[];
}

export default function Recommendations({ recommendations }: RecommendationsProps) {
  const router = useRouter();

  return (
    <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-[var(--shell-accent)]" />
            AI Recommendations
          </CardTitle>
          <CardDescription className="text-xs text-[var(--shell-muted)]">Actionable insights from your pipeline</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push("/ai-assistant")}>
          View all <ArrowUp className="h-3 w-3 rotate-90" />
        </Button>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-[var(--shell-muted)]">No recommendations yet</div>
        ) : (
          <div className="space-y-3">
            {recommendations.slice(0, 5).map((r: any) => (
              <div key={r.id} className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-3.5 hover:border-[var(--shell-accent)]/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--shell-foreground)]">{r.text}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-auto capitalize">{r.type ?? "general"}</Badge>
                      {r.confidence != null && <span className="text-[10px] text-[var(--shell-muted)] font-mono">{r.confidence}% confidence</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
