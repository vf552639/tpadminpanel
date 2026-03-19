'use client';

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

type CategoryHistoryRow = {
  position: number | null;
  rating_at_check: number | null;
  checked_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function CategoryChart({ rows }: { rows: CategoryHistoryRow[] }) {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-muted-foreground">No category history yet.</div>;
  }

  const depth = Math.max(
    50,
    ...rows.map((r) => (typeof r.position === 'number' ? r.position : 0))
  );

  const data = rows
    .map((r) => ({
      checked_at: r.checked_at,
      position: r.position ?? depth + 1,
      rating: r.rating_at_check ?? null,
    }))
    .sort((a, b) => +new Date(a.checked_at) - +new Date(b.checked_at));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="checked_at" tickFormatter={(v) => new Date(v).toLocaleDateString()} minTickGap={24} />
          <YAxis
            yAxisId="pos"
            reversed
            domain={[1, depth + 1]}
            tickFormatter={(v) => (v === depth + 1 ? '—' : `#${v}`)}
          />
          <YAxis yAxisId="rating" orientation="right" domain={[0, 5]} tickFormatter={(v) => `${v}`} />
          <Tooltip
            formatter={(value: any, name: any) => {
              if (name === 'position') {
                const v = Number(value);
                return [v === depth + 1 ? 'not found' : `#${v}`, 'position'];
              }
              if (name === 'rating') return [value, 'rating'];
              return [value, name];
            }}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Legend />
          <Line yAxisId="pos" type="monotone" dataKey="position" stroke="#2563eb" dot={false} strokeWidth={2} />
          <Line yAxisId="rating" type="monotone" dataKey="rating" stroke="#16a34a" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

