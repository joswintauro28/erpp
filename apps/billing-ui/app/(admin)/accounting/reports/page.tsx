"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financial Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate and view financial statements</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss</CardTitle>
            <CardDescription>Revenue, expenses, and net income</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm">No data available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance Sheet</CardTitle>
            <CardDescription>Assets, liabilities, and equity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm">No data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
