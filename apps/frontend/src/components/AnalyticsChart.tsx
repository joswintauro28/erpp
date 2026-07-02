"use client";

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';

interface ChartProps {
  data: any[];
  xKey: string;
  dataKey: string;
  type?: 'area' | 'bar';
  color?: string;
}

export default function AnalyticsChart({ data, xKey, dataKey, type = 'area', color = '#09090B' }: ChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50/50 dark:bg-slate-900/50 text-xs text-gray-400 dark:text-gray-500">
        No analytical pipeline records mapped inside timeframe.
      </div>
    );
  }

  const activeColor = isDark && color === '#09090B' ? '#FFFFFF' : color;
  const gridColor = isDark ? '#1E293B' : '#F3F4F6';
  const tickColor = isDark ? '#94A3B8' : '#9CA3AF';
  const tooltipBg = isDark ? '#0F172A' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#E5E7EB';
  const areaFill = isDark ? '#1E293B' : '#F3F4F6';

  return (
    <ResponsiveContainer width="100%" height="100%">
      {type === 'area' ? (
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: tickColor, fontSize: 10, fontWeight: '500' }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: tickColor, fontSize: 10, fontWeight: '500' }} />
          <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: '11px', color: isDark ? '#F8FAFC' : '#111827' }} />
          <Area type="monotone" dataKey={dataKey} stroke={activeColor} fill={areaFill} strokeWidth={2} />
        </AreaChart>
      ) : (
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: tickColor, fontSize: 10, fontWeight: '500' }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: tickColor, fontSize: 10, fontWeight: '500' }} />
          <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: '11px', color: isDark ? '#F8FAFC' : '#111827' }} />
          <Bar dataKey={dataKey} fill={activeColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}