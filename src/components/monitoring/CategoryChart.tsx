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
  category_slug: string | null;
  category_name: string | null;
  checked_level: number | null;
  position: number | null;
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

  const depth = Math.max(50, ...rows.map((r) => (typeof r.position === 'number' ? r.position : 0)));

  const sortedRows = [...rows].sort((a, b) => +new Date(a.checked_at) - +new Date(b.checked_at));
  const slugMeta = new Map<string, { name: string; level: number }>();
  for (const row of sortedRows) {
    if (!row.category_slug) continue;
    slugMeta.set(row.category_slug, {
      name: row.category_name || row.category_slug,
      level: row.checked_level || 0,
    });
  }

  const slugs = [...slugMeta.entries()]
    .sort((a, b) => b[1].level - a[1].level)
    .map(([slug]) => slug);

  const dataMap = new Map<string, Record<string, string | number | null>>();
  for (const row of sortedRows) {
    const key = row.checked_at;
    if (!dataMap.has(key)) dataMap.set(key, { checked_at: key });
    if (row.category_slug) {
      dataMap.get(key)![row.category_slug] = row.position;
    }
  }

  const data = [...dataMap.values()].sort(
    (a, b) => +new Date(String(a.checked_at)) - +new Date(String(b.checked_at))
  );

  const paletteByLevel: Record<number, string> = {
    3: '#2563eb',
    2: '#16a34a',
    1: '#64748b',
  };

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="checked_at" tickFormatter={(v) => new Date(v).toLocaleDateString()} minTickGap={24} />
          <YAxis
            reversed
            domain={[1, depth]}
            tickFormatter={(v) => `#${v}`}
          />
          <Tooltip
            formatter={(value: any, name: any) => {
              const label = slugMeta.get(String(name))?.name || name;
              if (value === null || value === undefined) return ['not found', label];
              return [`#${value}`, label];
            }}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Legend />
          {slugs.map((slug) => {
            const meta = slugMeta.get(slug)!;
            return (
              <Line
                key={slug}
                type="monotone"
                dataKey={slug}
                name={meta.name}
                stroke={paletteByLevel[meta.level] || '#0f172a'}
                dot={false}
                connectNulls={false}
                strokeWidth={2}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

