'use client';

import { useMemo } from 'react';
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type SerpHistoryRow = {
  keyword: string;
  rank_group: number | null;
  checked_at: string;
  url_found: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0f766e', '#4f46e5'];

export function SerpChart({ rows, depth }: { rows: SerpHistoryRow[]; depth: number }) {
  const keywords = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.keyword);
    return Array.from(set).sort();
  }, [rows]);

  const data = useMemo(() => {
    const byTs: Record<string, any> = {};
    for (const r of rows) {
      const ts = r.checked_at;
      if (!byTs[ts]) byTs[ts] = { checked_at: ts };
      // Use depth+1 for "not found" so the line drops to bottom
      byTs[ts][r.keyword] = r.rank_group ?? depth + 1;
      byTs[ts][`${r.keyword}__url`] = r.url_found || null;
    }
    return Object.values(byTs).sort((a: any, b: any) => +new Date(a.checked_at) - +new Date(b.checked_at));
  }, [rows, depth]);

  if (keywords.length === 0) {
    return <div className="text-sm text-muted-foreground">No SERP history yet.</div>;
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="checked_at"
            tickFormatter={(v) => new Date(v).toLocaleDateString()}
            minTickGap={24}
          />
          <YAxis
            reversed
            domain={[1, depth + 1]}
            tickFormatter={(v) => (v === depth + 1 ? '—' : `#${v}`)}
          />
          <Tooltip
            formatter={(value: any, name: any, props: any) => {
              const v = Number(value);
              const isMissing = v === depth + 1;
              const url = props?.payload?.[`${name}__url`] || null;
              const label = isMissing ? `not in Top-${depth}` : `#${v}`;
              return [label + (url ? ` • ${url}` : ''), name];
            }}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Legend />
          {keywords.map((k, idx) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={COLORS[idx % COLORS.length]}
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

