'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type Category = {
  id: number;
  country: string;
  level: number;
  category_name: string;
  category_slug: string;
  parent_id: number | null;
  parent_name: string | null;
  grandparent_name: string | null;
};

type ParentChainItem = {
  id: number;
  name: string;
  slug: string;
  level: number;
};

export function CategorySelect({
  country,
  value,
  autoSelectSlug,
  onChange,
}: {
  country: string | null;
  value: number | null;
  autoSelectSlug: string | null;
  onChange: (id: number | null, slug: string | null, level: number | null, parentChain: ParentChainItem[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Category[]>([]);
  const autoSelectAppliedRef = useRef<string | null>(null);
  const disabled = !country;

  useEffect(() => {
    if (!country) {
      setItems([]);
      setSearch('');
      autoSelectAppliedRef.current = null;
      return;
    }

    const controller = new AbortController();
    setItems([]);
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('country', country);
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
    }, 150);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [country]);

  const byId = useMemo(() => {
    const map = new Map<number, Category>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const childrenByParentId = useMemo(() => {
    const map = new Map<number | null, Category[]>();
    for (const item of items) {
      const key = item.parent_id ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.category_name.localeCompare(b.category_name));
    }
    return map;
  }, [items]);

  const roots = useMemo(() => {
    return (childrenByParentId.get(null) || []).filter((item) => item.level === 1);
  }, [childrenByParentId]);

  const selectedCategory = useMemo(
    () => (value ? items.find((item) => item.id === value) || null : null),
    [items, value]
  );

  const buildParentChain = (item: Category | null): ParentChainItem[] => {
    const chain: ParentChainItem[] = [];
    if (!item?.parent_id) return chain;

    let parentId: number | null = item.parent_id;
    const visited = new Set<number>();
    for (let i = 0; i < 5 && parentId; i++) {
      if (visited.has(parentId)) break;
      visited.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      chain.push({
        id: parent.id,
        name: parent.category_name,
        slug: parent.category_slug,
        level: parent.level,
      });
      parentId = parent.parent_id;
    }
    return chain;
  };

  useEffect(() => {
    if (!country || !autoSelectSlug || items.length === 0) return;
    const signature = `${country}:${autoSelectSlug.toLowerCase()}`;
    if (autoSelectAppliedRef.current === signature) return;

    const match = [...items]
      .filter((item) => item.category_slug.toLowerCase() === autoSelectSlug.toLowerCase())
      .sort((a, b) => b.level - a.level)[0];

    autoSelectAppliedRef.current = signature;
    if (!match) {
      onChange(null, null, null, []);
      return;
    }
    onChange(match.id, match.category_slug, match.level, buildParentChain(match));
  }, [autoSelectSlug, country, items, onChange]);

  const visibleIds = useMemo(() => {
    if (!search.trim()) return new Set(items.map((item) => item.id));

    const q = search.trim().toLowerCase();
    const ids = new Set<number>();

    const addSubtree = (categoryId: number) => {
      ids.add(categoryId);
      const children = childrenByParentId.get(categoryId) || [];
      for (const child of children) addSubtree(child.id);
    };

    const addAncestors = (node: Category) => {
      let parentId = node.parent_id;
      const seen = new Set<number>();
      while (parentId && !seen.has(parentId)) {
        seen.add(parentId);
        ids.add(parentId);
        const parent = byId.get(parentId);
        parentId = parent?.parent_id ?? null;
      }
    };

    const matches = items.filter((item) => {
      return item.category_name.toLowerCase().includes(q) || item.category_slug.toLowerCase().includes(q);
    });

    for (const match of matches) {
      if (match.level === 1) {
        addSubtree(match.id);
      } else if (match.level === 2) {
        ids.add(match.id);
        addAncestors(match);
        addSubtree(match.id);
      } else {
        ids.add(match.id);
        addAncestors(match);
      }
    }

    return ids;
  }, [byId, childrenByParentId, items, search]);

  const breadcrumbText = useMemo(() => {
    if (!selectedCategory) return '';
    const chain = buildParentChain(selectedCategory);
    const ordered = [...chain].reverse().map((item) => item.name);
    ordered.push(selectedCategory.category_name);
    return ordered.join(' \u203a ');
  }, [selectedCategory]);

  const hasVisibleRows = useMemo(() => {
    return roots.some((root) => {
      const l2Children = (childrenByParentId.get(root.id) || []).filter((item) => item.level === 2);
      if (visibleIds.has(root.id)) return true;
      return l2Children.some((l2) => {
        const l3Children = (childrenByParentId.get(l2.id) || []).filter((item) => item.level === 3);
        return visibleIds.has(l2.id) || l3Children.some((l3) => visibleIds.has(l3.id));
      });
    });
  }, [childrenByParentId, roots, visibleIds]);

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
            onChange(null, null, null, []);
            return;
          }
          const id = Number(val);
          const cat = items.find((item) => item.id === id) || null;
          onChange(id, cat?.category_slug ?? null, cat?.level ?? null, buildParentChain(cat));
        }}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              disabled
                ? 'Select country first'
                : loading
                  ? 'Loading...'
                  : selectedCategory?.category_name || 'Select category'
            }
          />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {roots.map((root) => {
            const l2Children = (childrenByParentId.get(root.id) || []).filter((item) => item.level === 2);
            const showRoot =
              visibleIds.has(root.id) ||
              l2Children.some((l2) => {
                const l3Children = (childrenByParentId.get(l2.id) || []).filter((item) => item.level === 3);
                return visibleIds.has(l2.id) || l3Children.some((l3) => visibleIds.has(l3.id));
              });

            if (!showRoot) return null;

            return (
              <div key={root.id}>
                <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {root.category_name}
                </div>
                {l2Children.map((l2) => {
                  const l3Children = (childrenByParentId.get(l2.id) || []).filter((item) => item.level === 3);
                  const showL2 = visibleIds.has(l2.id) || l3Children.some((l3) => visibleIds.has(l3.id));
                  if (!showL2) return null;

                  return (
                    <div key={l2.id}>
                      <SelectItem value={String(l2.id)} className="pl-4">
                        {l2.category_name}
                      </SelectItem>
                      {l3Children
                        .filter((l3) => visibleIds.has(l3.id))
                        .map((l3) => (
                          <SelectItem key={l3.id} value={String(l3.id)} className="pl-8">
                            {'\u25b8'} {l3.category_name}
                          </SelectItem>
                        ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {!hasVisibleRows && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {disabled ? 'Select country first.' : 'No categories found.'}
            </div>
          )}
        </SelectContent>
      </Select>
      {breadcrumbText && <div className="text-xs text-muted-foreground">{breadcrumbText}</div>}
    </div>
  );
}

