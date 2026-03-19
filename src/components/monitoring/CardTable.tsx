'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pause, Play, RefreshCw, Trash2, Settings, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export type MonitoredCardListItem = {
  id: number;
  domain: string;
  category_slug: string | null;
  country_code: string | null;
  is_active: boolean | null;
  keywords: string[] | null;
  last_serp: { rank_group: number | null; checked_at: string } | null;
  last_category: { position: number | null; checked_at: string } | null;
};

function fmtPos(v: number | null | undefined) {
  if (v === null || v === undefined) return '-';
  return `#${v}`;
}

export function CardTable({
  data,
  loading,
  onToggleActive,
  onRunSerp,
  onRunCategory,
  onDelete,
}: {
  data: MonitoredCardListItem[];
  loading: boolean;
  onToggleActive: (id: number, isActive: boolean) => void;
  onRunSerp: (id: number) => void;
  onRunCategory: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const allSelected = useMemo(() => data.length > 0 && data.every((d) => selected[d.id]), [data, selected]);

  const toggleAll = (checked: boolean) => {
    const next: Record<number, boolean> = {};
    if (checked) for (const d of data) next[d.id] = true;
    setSelected(next);
  };

  return (
    <div className="border rounded-md bg-white overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `Cards: ${data.length}`}
          </div>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[44px]">
              <Checkbox checked={allSelected} onCheckedChange={(c) => toggleAll(Boolean(c))} />
            </TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Last Google</TableHead>
            <TableHead>Last Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                Loading monitoring cards…
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No cards yet. Click “Add Card” to start monitoring.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const isActive = row.is_active !== false;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      checked={Boolean(selected[row.id])}
                      onCheckedChange={(c) => setSelected((s) => ({ ...s, [row.id]: Boolean(c) }))}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link className="hover:underline" href={`/monitoring/${row.id}`}>
                      {row.domain}
                    </Link>
                  </TableCell>
                  <TableCell>{row.category_slug || '-'}</TableCell>
                  <TableCell>{row.country_code || '-'}</TableCell>
                  <TableCell>{fmtPos(row.last_serp?.rank_group ?? null)}</TableCell>
                  <TableCell>{fmtPos(row.last_category?.position ?? null)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                        isActive
                          ? 'text-green-700 bg-green-50 border-green-200'
                          : 'text-slate-600 bg-slate-50 border-slate-200'
                      }`}
                    >
                      {isActive ? 'active' : 'paused'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleActive(row.id, !isActive)}
                        title={isActive ? 'Pause' : 'Resume'}
                      >
                        {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onRunSerp(row.id)} title="Run SERP check">
                        <RefreshCw className="w-4 h-4" />
                        <ArrowUpRight className="w-3 h-3 -ml-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRunCategory(row.id)}
                        title="Run category check"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <ArrowDownRight className="w-3 h-3 -ml-1" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDelete(row.id)} title="Delete">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

