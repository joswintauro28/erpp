import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: { type: 'up' | 'down'; value: string };
}

export function MetricCard({ title, value, subtext, trend }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm">
      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{title}</span>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">{value}</h3>
      {(subtext || trend) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {trend && (
            <span className={`font-bold ${trend.type === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.type === 'up' ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtext && <span className="text-gray-400 dark:text-gray-500">{subtext}</span>}
        </div>
      )}
    </div>
  );
}

export function LoadingSpinner({ text = "Loading data parameters..." }: { text?: string }) {
  return (
    <div className="h-[50vh] w-full flex flex-col items-center justify-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
      <div className="w-6 h-6 border-2 border-gray-200 dark:border-slate-800 border-t-black dark:border-t-white rounded-full animate-spin" />
      <span>{text}</span>
    </div>
  );
}