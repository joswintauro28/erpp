"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface Stage {
  id: string;
  name: string;
  value: number;
  color: string;
}

export default function PipelineChart({ stages }: { stages: Stage[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${value / 1000}K`;
    return `$${value}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle>Pipeline by stage</CardTitle>
            <CardDescription>Value in thousands (USD)</CardDescription>
          </div>
          <a href="#" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View opportunities <ArrowUpRight size={16} />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stage.name}</span>
              <span className="text-muted-foreground">{formatCurrency(stage.value)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[--shell-border]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: mounted ? `${(stage.value / maxValue) * 100}%` : "0%",
                  backgroundColor: stage.color,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
