"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/utils";

export interface UsageSeriesPoint {
  period: string; // e.g. "Mar 2026"
  amount: number;
}

interface UsageAreaChartProps {
  data: UsageSeriesPoint[];
  label?: string;
}

export function UsageAreaChart({ data, label = "Usage" }: UsageAreaChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} width={48} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--popover-foreground)",
            }}
            formatter={(value: number | string) => [formatNumber(Number(value)), label]}
          />
          <Area type="monotone" dataKey="amount" stroke="var(--chart-1)" strokeWidth={2} fill="url(#usageFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
