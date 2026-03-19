'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CategorySelect } from '@/components/monitoring/CategorySelect';
import { TpUrlResolver, TpResolvedData } from '@/components/monitoring/TpUrlResolver';

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
  is_active: boolean;
};

type CountryOption = {
  code: string;
  name: string;
};

function mapCountry(row: any): CountryOption | null {
  const code = String(row?.country_code || row?.code || row?.iso2 || '').trim().toUpperCase();
  if (!code) return null;
  const name = String(row?.name || row?.country_name || row?.title || code).trim();
  return { code, name };
}

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
    is_active: true,
  });

  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DomainSearchRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  const countrySelectValue = value.country_code || 'none';

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setCountriesLoading(true);
        const res = await fetch('/api/monitoring/countries?limit=250', { signal: controller.signal });
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          const mapped = json.data.map(mapCountry).filter(Boolean) as CountryOption[];
          const uniq = new Map<string, CountryOption>();
          for (const c of mapped) uniq.set(c.code, c);
          setCountries(Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name)));
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
    setValue((v) => ({
      ...v,
      domain: data.domain || v.domain,
      domain_id: data.domain_id ?? v.domain_id,
      category_id: data.category_id ?? v.category_id,
      category_slug: data.category_slug || v.category_slug,
      country_code: data.country_code || v.country_code,
    }));
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
    }));
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
        is_active: true,
      });
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <TpUrlResolver onResolved={applyResolved} />
        </div>

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
          <CategorySelect
            value={value.category_id}
            onChange={(id, slug) =>
              setValue((v) => ({
                ...v,
                category_id: id,
                category_slug: slug || v.category_slug,
              }))
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium">Country / GEO</label>
          <Select
            value={countrySelectValue}
            onValueChange={(v) => setValue((prev) => ({ ...prev, country_code: v === 'none' ? '' : v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={countriesLoading ? 'Loading countries…' : 'Select country'} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="none">Select country</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 text-xs text-muted-foreground">Used in Trustpilot category URL as `?country=XX`.</div>
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

