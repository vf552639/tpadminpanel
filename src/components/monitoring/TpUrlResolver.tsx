'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe2, Loader2 } from 'lucide-react';

export type TpResolvedData = {
  domain: string;
  domain_id: number | null;
  business_name: string | null;
  rating: number | null;
  reviews_count: number | null;
  category_slug: string | null;
  category_id: number | null;
  country_code: string | null;
  tp_url: string;
};

export function TpUrlResolver({
  onResolved,
}: {
  onResolved: (data: TpResolvedData) => void;
}) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'warning'>('success');
  const [error, setError] = useState<string | null>(null);

  const handleDetect = async () => {
    setError(null);
    setMessage(null);
    setMessageType('success');
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please paste a Trustpilot URL.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/monitoring/tp/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Failed to resolve URL');
        return;
      }

      onResolved(json.data);
      if (json.partial) {
        setMessageType('warning');
        setMessage('Detected partially. Please review fields and select category manually if needed.');
      } else {
        setMessageType('success');
        setMessage('Detected successfully. Review and save the card.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to resolve URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Trustpilot URL</label>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.trustpilot.com/review/example.com"
        />
        <Button type="button" onClick={handleDetect} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Detect
            </>
          ) : (
            <>
              <Globe2 className="w-4 h-4 mr-2" />
              Detect
            </>
          )}
        </Button>
      </div>
      {message && (
        <div
          className={`text-xs px-2 py-1 rounded border ${
            messageType === 'warning'
              ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-green-700 bg-green-50 border-green-100'
          }`}
        >
          {message}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

