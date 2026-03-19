'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardForm } from '@/components/monitoring/CardForm';
import { CardTable, MonitoredCardListItem } from '@/components/monitoring/CardTable';
import { Plus, Settings } from 'lucide-react';
import Link from 'next/link';

export default function MonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<MonitoredCardListItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/monitoring/cards');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load cards');
      setCards(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (id: number, isActive: boolean) => {
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/monitoring/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update card');
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: json.data.is_active } : c)));
    } catch (e: any) {
      setErr(e?.message || 'Failed to update card');
    }
  };

  const runSerp = async (id: number) => {
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch('/api/monitoring/check/serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'SERP check failed');
      setMsg('SERP check completed');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'SERP check failed');
    }
  };

  const runCategory = async (id: number) => {
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch('/api/monitoring/check/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Category check failed');
      setMsg('Category check completed');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Category check failed');
    }
  };

  const del = async (id: number) => {
    // eslint-disable-next-line no-alert
    if (!confirm('Delete this card?')) return;
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/monitoring/cards/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete card');
      setCards((prev) => prev.filter((c) => c.id !== id));
      setMsg('Deleted');
    } catch (e: any) {
      setErr(e?.message || 'Failed to delete card');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoring</h1>
          <p className="text-muted-foreground">Track card positions in Google SERP and Trustpilot categories.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/monitoring/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? 'Close' : 'Add Card'}
          </Button>
        </div>
      </div>

      {msg && <div className="text-sm text-green-700 bg-green-50 border border-green-100 p-3 rounded">{msg}</div>}
      {err && <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded">{err}</div>}

      {showForm && (
        <CardForm
          onCreated={async () => {
            setShowForm(false);
            setMsg('Created');
            await load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <CardTable
        data={cards}
        loading={loading}
        onToggleActive={toggleActive}
        onRunSerp={runSerp}
        onRunCategory={runCategory}
        onDelete={del}
      />
    </div>
  );
}

