'use client';

import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type Category = {
  id: number;
  country: string;
  top_category_name: string;
  top_category_slug: string;
  display_category_name: string;
  display_category_slug: string;
};

export function CategorySelect({
  country,
  value,
  onChange,
}: {
  country: string | null;
  value: number | null;
  onChange: (id: number | null, displayCategorySlug: string | null, topCategorySlug: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Category[]>([]);
  const disabled = !country;

  useEffect(() => {
    if (!country) {
      setItems([]);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('country', country);
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
  }, [country, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of items) {
      const key = c.top_category_name || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries())
      .map(([key, cats]) => ({
        key,
        label: key,
        cats: cats.sort((a, b) => a.display_category_name.localeCompare(b.display_category_name)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const selectedName = useMemo(
    () => items.find((c) => c.id === value)?.display_category_name || '',
    [items, value]
  );

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Category</label>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={disabled ? 'Select country first' : 'Search category...'}
        className="h-8 text-sm"
        disabled={disabled}
      />
      <Select
        disabled={disabled}
        value={value ? String(value) : ''}
        onValueChange={(val) => {
          if (!val) {
            onChange(null, null, null);
            return;
          }
          const id = Number(val);
          const cat = items.find((c) => c.id === id) || null;
          onChange(id, cat?.display_category_slug ?? null, cat?.top_category_slug ?? null);
        }}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              disabled ? 'Select country first' : loading ? 'Loading…' : selectedName || 'Select category'
            }
          />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {grouped.map((group) => (
            <div key={group.key}>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                {group.label}
              </div>
              {group.cats.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.display_category_name}
                </SelectItem>
              ))}
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {disabled ? 'Select country first.' : 'No categories found.'}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

