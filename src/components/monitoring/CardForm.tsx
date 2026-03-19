'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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
  keywordsText: string;
  language_code: string;
  location_code: string;
  device: 'desktop' | 'mobile';
  is_active: boolean;
};

function parseKeywords(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
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
    keywordsText: '',
    language_code: 'en',
    location_code: '',
    device: 'desktop',
    is_active: true,
  });

  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DomainSearchRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const keywords = useMemo(() => parseKeywords(value.keywordsText), [value.keywordsText]);

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
          keywords,
          language_code: value.language_code,
          location_code: value.location_code ? Number(value.location_code) : null,
          device: value.device,
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
        keywordsText: '',
        language_code: 'en',
        location_code: '',
        device: 'desktop',
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
          <div className="text-sm text-muted-foreground">Track Google SERP + Trustpilot category positions.</div>
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
          <label className="text-sm font-medium">Keywords (Google)</label>
          <textarea
            value={value.keywordsText}
            onChange={(e) => setValue((v) => ({ ...v, keywordsText: e.target.value }))}
            className="mt-1 w-full min-h-[104px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder={'trustpilot {brand} reviews\n{brand} отзывы'}
          />
          <div className="mt-1 text-xs text-muted-foreground">{keywords.length} keyword(s)</div>
        </div>

        <div>
          <label className="text-sm font-medium">Language</label>
          <Select value={value.language_code} onValueChange={(val) => setValue((v) => ({ ...v, language_code: val }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">en</SelectItem>
              <SelectItem value="de">de</SelectItem>
              <SelectItem value="fr">fr</SelectItem>
              <SelectItem value="es">es</SelectItem>
              <SelectItem value="it">it</SelectItem>
              <SelectItem value="nl">nl</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Device</label>
          <Select value={value.device} onValueChange={(val) => setValue((v) => ({ ...v, device: val as any }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desktop">desktop</SelectItem>
              <SelectItem value="mobile">mobile</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Location code (DataForSEO)</label>
          <Input
            value={value.location_code}
            onChange={(e) => setValue((v) => ({ ...v, location_code: e.target.value }))}
            placeholder="2840"
          />
          <div className="mt-1 text-xs text-muted-foreground">Hint: 2840 = US</div>
        </div>

        <div className="grid gap-4 grid-cols-2">
          <div>
            <label className="text-sm font-medium">Trustpilot category slug</label>
            <Input
              value={value.category_slug}
              onChange={(e) => setValue((v) => ({ ...v, category_slug: e.target.value }))}
              placeholder="electronics_technology"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Country code</label>
            <Input
              value={value.country_code}
              onChange={(e) => setValue((v) => ({ ...v, country_code: e.target.value }))}
              placeholder="DE"
            />
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

