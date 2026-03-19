'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CategorySelect } from '@/components/monitoring/CategorySelect';
import { TpUrlResolver, TpResolvedData } from '@/components/monitoring/TpUrlResolver';
import { Info } from 'lucide-react';

type DomainSearchRow = {
  id: number;
  domain: string;
  category_id: number | null;
  country_code: string | null;
  rating: number | null;
  reviews_count: number | null;
};

export type CardFormValue = {
  domain: string;
  domain_id: number | null;
  category_id: number | null;
  category_slug: string;
  country_code: string;
  monitoring_depth: 'own' | 'parent' | 'all';
  initial_rating: number | null;
  initial_reviews: number | null;
  is_active: boolean;
};

type ParentChainItem = {
  id: number;
  name: string;
  slug: string;
  level: number;
};

type CountryOption = {
  cn_code: string;
  cn_name: string;
  base_url?: string | null;
};

export function CardForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<CardFormValue>({
    domain: '',
    domain_id: null,
    category_id: null,
    category_slug: '',
    country_code: '',
    monitoring_depth: 'own',
    initial_rating: null,
    initial_reviews: null,
    is_active: true,
  });

  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DomainSearchRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [autoSelectSlug, setAutoSelectSlug] = useState<string | null>(null);
  const [selectedCategoryLevel, setSelectedCategoryLevel] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedParentChain, setSelectedParentChain] = useState<ParentChainItem[]>([]);
  const [detectedInfo, setDetectedInfo] = useState<{
    business_name: string | null;
    rating: number | null;
    reviews: number | null;
    category_slug: string | null;
    domain_found: boolean;
  } | null>(null);
  const [detectWarning, setDetectWarning] = useState<string | null>(null);

  const countrySelectValue = value.country_code || 'none';

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setCountriesLoading(true);
        const res = await fetch('/api/monitoring/countries?limit=250', { signal: controller.signal });
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          const mapped = json.data
            .map((row: any) => ({
              cn_code: String(row?.cn_code || '').trim().toLowerCase(),
              cn_name: String(row?.cn_name || '').trim(),
              base_url: row?.base_url ? String(row.base_url) : null,
            }))
            .filter((row: CountryOption) => row.cn_code && row.cn_name);
          setCountries(mapped);
        } else {
          setCountries([]);
        }
      } catch {
        if (!controller.signal.aborted) setCountries([]);
      } finally {
        if (!controller.signal.aborted) setCountriesLoading(false);
      }
    }, 0);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, []);

  const applyResolved = (data: TpResolvedData) => {
    const normalizedCountry = (data.country_code || '').toLowerCase();
    const resolvedReviews = data.reviews ?? data.reviews_count ?? null;
    setValue((v) => ({
      ...v,
      domain: data.domain || v.domain,
      domain_id: data.domain_id ?? v.domain_id,
      category_id: null,
      category_slug: data.category_slug || '',
      country_code: normalizedCountry || v.country_code,
      monitoring_depth: 'own',
      initial_rating: data.rating ?? v.initial_rating,
      initial_reviews: resolvedReviews ?? v.initial_reviews,
    }));
    setAutoSelectSlug(data.category_slug || null);
    setSelectedCategoryLevel(null);
    setSelectedCategoryName(null);
    setSelectedParentChain([]);
    setDetectedInfo({
      business_name: data.business_name ?? null,
      rating: data.rating ?? null,
      reviews: resolvedReviews,
      category_slug: data.category_slug ?? null,
      domain_found: Boolean(data.domain_id),
    });
    if (!data.category_slug || !data.category_id) {
      setDetectWarning('Category not detected automatically. Please select manually.');
    } else {
      setDetectWarning(null);
    }
  };

  useEffect(() => {
    const q = value.domain.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(`/api/monitoring/domains/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json();
        setSuggestions(Array.isArray(json.data) ? json.data : []);
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value.domain]);

  const selectSuggestion = (row: DomainSearchRow) => {
    setWarning(null);
    setValue((v) => ({
      ...v,
      domain: row.domain,
      domain_id: row.id,
      category_id: row.category_id ?? null,
      country_code: row.country_code ?? '',
      monitoring_depth: 'own',
    }));
    setAutoSelectSlug(null);
    setSelectedCategoryLevel(null);
    setSelectedCategoryName(null);
    setSelectedParentChain([]);
    setShowSuggestions(false);
  };

  const submit = async () => {
    setWarning(null);
    const domain = value.domain.trim().toLowerCase();
    if (!domain) {
      setWarning('Domain is required');
      return;
    }
    if (!value.category_id || !value.category_slug) {
      setWarning('Category is required for Trustpilot position checks');
      return;
    }
    if (!value.country_code) {
      setWarning('Country / GEO is required for Trustpilot position checks');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/monitoring/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          domain_id: value.domain_id,
          category_id: value.category_id,
          category_slug: value.category_slug || null,
          country_code: value.country_code || null,
          monitoring_depth: value.monitoring_depth,
          initial_rating: value.initial_rating,
          initial_reviews: value.initial_reviews,
          keywords: [],
          language_code: 'en',
          location_code: null,
          device: 'desktop',
          is_active: value.is_active,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setWarning(json?.error || 'Failed to create card');
        return;
      }

      onCreated();
      setValue({
        domain: '',
        domain_id: null,
        category_id: null,
        category_slug: '',
        country_code: '',
        monitoring_depth: 'own',
        initial_rating: null,
        initial_reviews: null,
        is_active: true,
      });
      setDetectedInfo(null);
      setDetectWarning(null);
      setAutoSelectSlug(null);
      setSelectedCategoryLevel(null);
      setSelectedCategoryName(null);
      setSelectedParentChain([]);
      setSuggestions([]);
    } catch (e: any) {
      setWarning(e?.message || 'Failed to create card');
    } finally {
      setSaving(false);
    }
  };

  const hint = useMemo(() => {
    if (searchLoading) return 'Searching domains…';
    if (value.domain.trim().length >= 3 && suggestions.length === 0) return 'Not found in DB — you can fill category/country manually.';
    return '';
  }, [searchLoading, suggestions.length, value.domain]);

  const depthOptions = useMemo(() => {
    const ownLabel = selectedCategoryName ? `\ud83c\udfaf Nur ${selectedCategoryName}` : '\ud83c\udfaf Only selected category';
    const parentLabel =
      selectedCategoryName && selectedParentChain[0]
        ? `\ud83c\udfb2 ${selectedCategoryName} + ${selectedParentChain[0].name}`
        : '\ud83c\udfb2 Selected + parent';

    const hasParent = selectedParentChain.length > 0;
    const hasGrandParent = selectedParentChain.length > 1;
    const options: Array<{ value: 'own' | 'parent' | 'all'; label: string }> = [{ value: 'own', label: ownLabel }];

    if (hasParent) {
      options.push({ value: 'parent', label: parentLabel });
    }

    if (hasParent || hasGrandParent) {
      options.push({ value: 'all', label: '\ud83c\udf1f Alle Ebenen' });
    }

    return options;
  }, [selectedCategoryName, selectedParentChain]);

  useEffect(() => {
    if (!depthOptions.some((option) => option.value === value.monitoring_depth)) {
      setValue((prev) => ({ ...prev, monitoring_depth: 'own' }));
    }
  }, [depthOptions, value.monitoring_depth]);

  useEffect(() => {
    if (!value.country_code || !value.category_id) {
      setSelectedCategoryName(null);
      return;
    }

    const controller = new AbortController();
    const loadCategoryName = async () => {
      try {
        const params = new URLSearchParams({
          country: value.country_code,
          limit: '500',
        });
        const res = await fetch(`/api/monitoring/categories?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || !Array.isArray(json.data)) return;
        const selected = json.data.find((row: any) => Number(row.id) === value.category_id);
        if (selected?.category_name) {
          setSelectedCategoryName(String(selected.category_name));
        }
      } catch {
        // Ignore category label loading errors.
      }
    };

    loadCategoryName();
    return () => controller.abort();
  }, [value.category_id, value.country_code]);

  return (
    <div className="border rounded-lg bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-lg font-semibold">Add Card</div>
          <div className="text-sm text-muted-foreground">
            Track Trustpilot category position. Google SERP will be available later as a separate tab.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {warning && <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded">{warning}</div>}
      {detectWarning && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded">{detectWarning}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <TpUrlResolver onResolved={applyResolved} />
        </div>

        {detectedInfo && (
          <div className="md:col-span-2 border rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium mb-1">Detected info</div>
            <div className="text-muted-foreground">
              Business: {detectedInfo.business_name || '-'} | Rating: {detectedInfo.rating ?? '-'} | Reviews:{' '}
              {detectedInfo.reviews ?? '-'} | Domain in DB: {detectedInfo.domain_found ? 'Found' : 'Not found'}
            </div>
          </div>
        )}

        <div className="relative">
          <label className="text-sm font-medium">Domain</label>
          <Input
            value={value.domain}
            onChange={(e) => {
              setValue((v) => ({ ...v, domain: e.target.value, domain_id: null }));
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="example.com"
          />
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 mt-2 w-full rounded-md border bg-white shadow">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => selectSuggestion(s)}
                >
                  <div className="font-medium">{s.domain}</div>
                  <div className="text-xs text-muted-foreground">
                    rating: {s.rating ?? '-'} • reviews: {s.reviews_count ?? '-'} • country: {s.country_code ?? '-'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Country / GEO</label>
          <Select
            value={countrySelectValue}
            onValueChange={(v) =>
              {
                setAutoSelectSlug(null);
                setSelectedCategoryLevel(null);
                setSelectedCategoryName(null);
                setSelectedParentChain([]);
                setValue((prev) => ({
                  ...prev,
                  country_code: v === 'none' ? '' : v,
                  category_id: null,
                  category_slug: '',
                  monitoring_depth: 'own',
                }));
              }
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={countriesLoading ? 'Loading countries…' : 'Select country'} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="none">Select country</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.cn_code} value={c.cn_code}>
                  {c.cn_name} ({c.cn_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 text-xs text-muted-foreground">Stored as lowercase `cn_code` (example: `de`).</div>
        </div>

        <div>
          <CategorySelect
            country={value.country_code || null}
            value={value.category_id}
            autoSelectSlug={autoSelectSlug}
            onChange={(id, slug, level, parentChain) => {
              setAutoSelectSlug(null);
              setSelectedCategoryLevel(level);
              setSelectedParentChain(parentChain);
              if (!slug) {
                setSelectedCategoryName(null);
              } else {
                const own = slug.replaceAll('_', ' ');
                setSelectedCategoryName(own.charAt(0).toUpperCase() + own.slice(1));
              }
              setValue((v) => ({
                ...v,
                category_id: id,
                category_slug: slug || '',
                monitoring_depth: 'own',
              }));
              if (autoSelectSlug && !id) {
                setDetectWarning('Category not detected automatically. Please select manually.');
              } else if (id) {
                setDetectWarning(null);
              }
            }}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Rating (optional)</label>
          <Input
            type="number"
            step="0.1"
            min="1"
            max="5"
            value={value.initial_rating ?? ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setValue((v) => ({ ...v, initial_rating: raw ? Number(raw) : null }));
            }}
            placeholder="4.5"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Reviews Count (optional)</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={value.initial_reviews ?? ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setValue((v) => ({ ...v, initial_reviews: raw ? Number(raw) : null }));
            }}
            placeholder="120"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Monitoring Depth</label>
            <Info
              className="h-4 w-4 text-muted-foreground"
              title="Checks position in selected Trustpilot category. More levels mean more requests per run, but you will see position on each hierarchy level."
            />
          </div>
          <Select
            value={value.monitoring_depth}
            onValueChange={(val) => {
              const next =
                val === 'parent' || val === 'all'
                  ? val
                  : 'own';
              setValue((prev) => ({ ...prev, monitoring_depth: next }));
            }}
            disabled={!value.category_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category first" />
            </SelectTrigger>
            <SelectContent>
              {depthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 text-xs text-muted-foreground">
            {selectedCategoryLevel ? `Selected level: L${selectedCategoryLevel}` : 'Select category to configure depth.'}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            checked={value.is_active}
            onCheckedChange={(checked) => setValue((v) => ({ ...v, is_active: Boolean(checked) }))}
          />
          <div className="text-sm">Active</div>
        </div>
      </div>
    </div>
  );
}

