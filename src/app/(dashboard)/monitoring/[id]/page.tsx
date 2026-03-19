'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SerpChart } from '@/components/monitoring/SerpChart';
import { CategoryChart } from '@/components/monitoring/CategoryChart';
import { RefreshCw, Save } from 'lucide-react';

type Card = {
  id: number;
  domain: string;
  category_slug: string | null;
  country_code: string | null;
  keywords: string[] | null;
  language_code: string | null;
  location_code: number | null;
  device: string | null;
  is_active: boolean | null;
};

type SerpRow = {
  keyword: string;
  rank_group: number | null;
  checked_at: string;
  url_found: string | null;
};

type CatRow = {
  position: number | null;
  rating_at_check: number | null;
  checked_at: string;
};

function keywordsToText(list: string[] | null) {
  return (list || []).join('\n');
}

function textToKeywords(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function MonitoringCardDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningSerp, setRunningSerp] = useState(false);
  const [runningCat, setRunningCat] = useState(false);
  const [tab, setTab] = useState<'serp' | 'category'>('serp');

  const [card, setCard] = useState<Card | null>(null);
  const [keywordsText, setKeywordsText] = useState('');
  const [serp, setSerp] = useState<SerpRow[]>([]);
  const [cat, setCat] = useState<CatRow[]>([]);
  const [depth, setDepth] = useState(100);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const [cardRes, serpRes, catRes, setRes] = await Promise.all([
        fetch(`/api/monitoring/cards/${id}`),
        fetch(`/api/monitoring/cards/${id}/serp?limit=500`),
        fetch(`/api/monitoring/cards/${id}/category?limit=500`),
        fetch(`/api/monitoring/settings`),
      ]);

      const cardJson = await cardRes.json();
      if (!cardRes.ok) throw new Error(cardJson?.error || 'Failed to load card');
      setCard(cardJson.data);
      setKeywordsText(keywordsToText(cardJson.data.keywords));

      const serpJson = await serpRes.json();
      setSerp(Array.isArray(serpJson.data) ? serpJson.data : []);

      const catJson = await catRes.json();
      setCat(Array.isArray(catJson.data) ? catJson.data : []);

      const setJson = await setRes.json();
      if (setRes.ok) setDepth(Number(setJson?.data?.depth || 100));
    } catch (e: any) {
      setErr(e?.message || 'Failed to load card');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveKeywords = async () => {
    if (!card) return;
    setErr(null);
    setMsg(null);
    setSaving(true);
    try {
      const keywords = textToKeywords(keywordsText);
      const res = await fetch(`/api/monitoring/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      setCard(json.data);
      setMsg('Saved');
    } catch (e: any) {
      setErr(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const runSerp = async () => {
    if (!card) return;
    setErr(null);
    setMsg(null);
    setRunningSerp(true);
    try {
      const res = await fetch('/api/monitoring/check/serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'SERP check failed');
      setMsg('SERP check completed');
      const serpRes = await fetch(`/api/monitoring/cards/${card.id}/serp?limit=500`);
      const serpJson = await serpRes.json();
      setSerp(Array.isArray(serpJson.data) ? serpJson.data : []);
    } catch (e: any) {
      setErr(e?.message || 'SERP check failed');
    } finally {
      setRunningSerp(false);
    }
  };

  const runCategory = async () => {
    if (!card) return;
    setErr(null);
    setMsg(null);
    setRunningCat(true);
    try {
      const res = await fetch('/api/monitoring/check/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Category check failed');
      setMsg('Category check completed');
      const catRes = await fetch(`/api/monitoring/cards/${card.id}/category?limit=500`);
      const catJson = await catRes.json();
      setCat(Array.isArray(catJson.data) ? catJson.data : []);
    } catch (e: any) {
      setErr(e?.message || 'Category check failed');
    } finally {
      setRunningCat(false);
    }
  };

  const keywords = useMemo(() => textToKeywords(keywordsText), [keywordsText]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (err && !card) return <div className="text-sm text-red-600">{err}</div>;
  if (!card) return <div className="text-sm text-muted-foreground">Not found</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{card.domain}</h1>
          <p className="text-muted-foreground">
            category: {card.category_slug || '-'} • country: {card.country_code || '-'} • device: {card.device || 'desktop'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={runSerp} disabled={runningSerp}>
            <RefreshCw className={`w-4 h-4 mr-2 ${runningSerp ? 'animate-spin' : ''}`} />
            Run SERP
          </Button>
          <Button variant="outline" onClick={runCategory} disabled={runningCat}>
            <RefreshCw className={`w-4 h-4 mr-2 ${runningCat ? 'animate-spin' : ''}`} />
            Run Category
          </Button>
        </div>
      </div>

      {msg && <div className="text-sm text-green-700 bg-green-50 border border-green-100 p-3 rounded">{msg}</div>}
      {err && <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded">{err}</div>}

      <div className="border rounded-lg bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-lg font-semibold">Keywords</div>
            <div className="text-sm text-muted-foreground">{keywords.length} keyword(s)</div>
          </div>
          <Button onClick={saveKeywords} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <textarea
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant={tab === 'serp' ? 'default' : 'outline'} onClick={() => setTab('serp')}>
          Google SERP
        </Button>
        <Button variant={tab === 'category' ? 'default' : 'outline'} onClick={() => setTab('category')}>
          Category Position
        </Button>
      </div>

      {tab === 'serp' ? (
        <div className="border rounded-lg bg-white p-4 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-lg font-semibold">Google SERP positions</div>
              <div className="text-sm text-muted-foreground">Y-axis is inverted: #1 is on top.</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">depth</div>
              <Input value={String(depth)} readOnly className="w-24" />
            </div>
          </div>
          <SerpChart rows={serp} depth={depth} />
        </div>
      ) : (
        <div className="border rounded-lg bg-white p-4 space-y-4">
          <div>
            <div className="text-lg font-semibold">Trustpilot category position</div>
            <div className="text-sm text-muted-foreground">Position line + rating line for correlation.</div>
          </div>
          <CategoryChart rows={cat} />
        </div>
      )}
    </div>
  );
}

