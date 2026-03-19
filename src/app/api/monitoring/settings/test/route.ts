export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('monitoring_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

export async function POST() {
  try {
    const login = await getSetting('dataforseo_login');
    const password = await getSetting('dataforseo_password');

    if (!login || !password) {
      return NextResponse.json(
        { ok: false, error: 'Missing DataForSEO credentials in settings' },
        { status: 400 }
      );
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    // Best-effort: DataForSEO provides user/balance data via appendix endpoints.
    const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // ignore
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          error: 'DataForSEO request failed',
          details: json || text,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, data: json || { raw: text } });
  } catch (error) {
    console.error('DataForSEO test failed:', error);
    return NextResponse.json({ ok: false, error: 'Test failed' }, { status: 500 });
  }
}

