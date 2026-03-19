'use client';

import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type Category = {
  id: number;
  display_category_slug: string;
  parent_id?: number | null;
};

function groupKey(cat: Category): string {
  if (cat.parent_id != null) {
    return String(cat.parent_id);
  }
  const slug = cat.display_category_slug || '';
  const first = slug.split('_')[0] || slug;
  return first || 'other';
}

export function CategorySelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null, slug: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Category[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set('q', search.trim());
        params.set('limit', '500');
        const res = await fetch(`/api/monitoring/categories?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          setItems(json.data);
        } else {
          setItems([]);
        }
      } catch {
        if (!controller.signal.aborted) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of items) {
      const key = groupKey(c);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries())
      .map(([key, cats]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        cats: cats.sort((a, b) => a.display_category_slug.localeCompare(b.display_category_slug)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const selectedSlug = useMemo(
    () => items.find((c) => c.id === value)?.display_category_slug || '',
    [items, value]
  );

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Category</label>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search category..."
        className="h-8 text-sm"
      />
      <Select
        value={value ? String(value) : ''}
        onValueChange={(val) => {
          if (!val) {
            onChange(null, null);
            return;
          }
          const id = Number(val);
          const cat = items.find((c) => c.id === id) || null;
          onChange(id, cat?.display_category_slug ?? null);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? 'Loading…' : selectedSlug || 'Select category'} />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {grouped.map((group) => (
            <div key={group.key}>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                {group.label}
              </div>
              {group.cats.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.display_category_slug}
                </SelectItem>
              ))}
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No categories found.</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

