import { DollarSign, TrendingUp, Users, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Metric {
  id: string;
  name: string;
  formatted_value: string;
  trend: string;
  is_positive: boolean;
}

const iconMap: Record<string, typeof DollarSign> = {
  Value: DollarSign,
  Opportunities: TrendingUp,
  Customers: Users,
  Complaints: AlertCircle,
};

export default function MetricCard({ metric }: { metric: Metric }) {
  const Icon = Object.entries(iconMap).find(([key]) => metric.name.includes(key))?.[1] ?? TrendingUp;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle>{metric.name}</CardTitle>
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon size={18} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{metric.formatted_value}</p>
        <p className={`flex items-center gap-1 text-xs ${metric.is_positive ? "text-emerald-600" : "text-destructive"}`}>
          {metric.is_positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {metric.trend}
        </p>
      </CardContent>
    </Card>
  );
}
