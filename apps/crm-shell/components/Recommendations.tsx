import { Sparkles, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Recommendation {
  id: string;
  text: string;
  confidence: number;
}

export default function Recommendations({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-[--accent-secondary]" />
            AI recommendations
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="rounded-lg border bg-muted/30 p-3 text-sm"
            >
              <p className="text-foreground">{rec.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">{rec.confidence}% confidence</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <a href="#" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            All suggestions <ArrowUpRight size={16} />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
