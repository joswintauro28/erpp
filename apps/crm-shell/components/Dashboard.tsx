"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import MetricCard from "./MetricCard";
import PipelineChart from "./PipelineChart";
import Recommendations from "./Recommendations";
import { api } from "@/services/api";

interface Metric {
  id: string;
  name: string;
  formatted_value: string;
  trend: string;
  is_positive: boolean;
}

interface Stage {
  id: string;
  name: string;
  value: number;
  color: string;
}

interface Recommendation {
  id: string;
  text: string;
  confidence: number;
}

interface DashboardData {
  metrics: Metric[];
  pipeline_stages: Stage[];
  recommendations: Recommendation[];
}

const fallbackData: DashboardData = {
  metrics: [],
  pipeline_stages: [],
  recommendations: [],
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(fallbackData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.get<DashboardData>("/dashboard");
        setData(result);
      } catch {
        console.log("API not running, using fallback data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">Good morning, Alex</h2>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s moving across your pipeline and accounts today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PipelineChart stages={data.pipeline_stages} />
        <Recommendations recommendations={data.recommendations} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Hot leads</CardTitle>
              <a href="#" className="text-xs text-primary hover:underline">View all</a>
            </div>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-muted-foreground">No hot leads currently.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Tasks due soon</CardTitle>
              <a href="#" className="text-xs text-primary hover:underline">View all</a>
            </div>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-muted-foreground">You&apos;re all caught up!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
