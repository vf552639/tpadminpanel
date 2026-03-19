'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

type Settings = {
  dataforseo_login: string;
  dataforseo_password: string; // masked on load
  check_frequency: string;
  depth: number;
  global_keywords: string;
  notifications: boolean;
};

export function SettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    dataforseo_login: '',
    dataforseo_password: '',
    check_frequency: 'daily',
    depth: 100,
    global_keywords: '',
    notifications: false,
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/monitoring/settings');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
        setSettings(json.data);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setMsg(null);
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch('/api/monitoring/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save settings');
      setMsg('Saved');
    } catch (e: any) {
      setErr(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setMsg(null);
    setErr(null);
    setTesting(true);
    try {
      const res = await fetch('/api/monitoring/settings/test', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Test failed');
      setMsg('Connection OK');
    } catch (e: any) {
      setErr(e?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading settings…</div>;

  return (
    <div className="border rounded-lg bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-lg font-semibold">Monitoring Settings</div>
          <div className="text-sm text-muted-foreground">Credentials are stored server-side and never returned to UI.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={test} disabled={testing || saving}>
            {testing ? 'Testing…' : 'Test Connection'}
          </Button>
          <Button onClick={save} disabled={saving || testing}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {msg && <div className="text-sm text-green-700 bg-green-50 border border-green-100 p-3 rounded">{msg}</div>}
      {err && <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded">{err}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">DataForSEO Login</label>
          <Input
            value={settings.dataforseo_login}
            onChange={(e) => setSettings((s) => ({ ...s, dataforseo_login: e.target.value }))}
            placeholder="email@login"
          />
        </div>
        <div>
          <label className="text-sm font-medium">DataForSEO Password</label>
          <Input
            type="password"
            value={settings.dataforseo_password}
            onChange={(e) => setSettings((s) => ({ ...s, dataforseo_password: e.target.value }))}
            placeholder="********"
          />
          <div className="mt-1 text-xs text-muted-foreground">Will only be updated if you type a new value.</div>
        </div>

        <div>
          <label className="text-sm font-medium">Check frequency</label>
          <Select
            value={settings.check_frequency}
            onValueChange={(val) => setSettings((s) => ({ ...s, check_frequency: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">daily</SelectItem>
              <SelectItem value="3d">once per 3 days</SelectItem>
              <SelectItem value="weekly">weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Depth (Top-N)</label>
          <Input
            type="number"
            value={String(settings.depth)}
            onChange={(e) => setSettings((s) => ({ ...s, depth: Number(e.target.value || 100) }))}
            min={10}
            max={200}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium">Global keywords (templates)</label>
          <textarea
            value={settings.global_keywords}
            onChange={(e) => setSettings((s) => ({ ...s, global_keywords: e.target.value }))}
            className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder={'{domain} reviews\n{domain} trustpilot'}
          />
          <div className="mt-1 text-xs text-muted-foreground">Use {`{domain}`} placeholder.</div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            checked={settings.notifications}
            onCheckedChange={(c) => setSettings((s) => ({ ...s, notifications: Boolean(c) }))}
          />
          <div className="text-sm">Notifications (UI only in v1)</div>
        </div>
      </div>
    </div>
  );
}

