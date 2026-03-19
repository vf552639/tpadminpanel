export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DATAFORSEO_ENDPOINT = 'https://api.dataforseo.com/v3/serp/google/organic/live/regular';

async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('monitoring_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

function uniqStrings(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const v = it.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function extractHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function findTargetInItems(items: any[], targetDomain: string) {
  const target = targetDomain.replace(/^www\./, '').toLowerCase();
  for (const it of items || []) {
    const url = String(it?.url || '');
    const host = extractHost(url);
    if (!host) continue;
    if (host === target || host.endsWith(`.${target}`)) {
      return {
        rank_group: typeof it?.rank_group === 'number' ? it.rank_group : null,
        rank_absolute: typeof it?.rank_absolute === 'number' ? it.rank_absolute : null,
        url_found: url || null,
        title: it?.title ?? null,
        description: it?.description ?? null,
      };
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cardId = Number(body.cardId);
    if (!Number.isFinite(cardId)) return NextResponse.json({ error: 'cardId is required' }, { status: 400 });

    const { data: card, error: cardErr } = await supabase
      .from('monitored_cards')
      .select('*')
      .eq('id', cardId)
      .maybeSingle();

    if (cardErr) throw cardErr;
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    if (card.is_active === false) {
      return NextResponse.json({ error: 'Card is paused' }, { status: 400 });
    }

    const login = await getSetting('dataforseo_login');
    const password = await getSetting('dataforseo_password');
    const depthSetting = await getSetting('depth');
    const globalKeywords = (await getSetting('global_keywords')) || '';

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Missing DataForSEO credentials in /monitoring/settings' },
        { status: 400 }
      );
    }

    const depth = Number.isFinite(Number(depthSetting)) ? Number(depthSetting) : 100;
    const cardKeywords = Array.isArray(card.keywords) ? (card.keywords as string[]) : [];
    const globalList = globalKeywords
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .map((tpl: string) => tpl.replaceAll('{domain}', card.domain));

    const keywords = uniqStrings([...cardKeywords, ...globalList]);
    if (keywords.length === 0) {
      return NextResponse.json({ error: 'No keywords configured for this card' }, { status: 400 });
    }

    const location_code = card.location_code ? Number(card.location_code) : null;
    const language_code = (card.language_code || 'en') as string;
    const device = (card.device || 'desktop') as string;

    if (!location_code) {
      return NextResponse.json(
        { error: 'location_code is not set on the card. Set it when adding/editing the card.' },
        { status: 400 }
      );
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');
    const checked_at = new Date().toISOString();

    const tasks = keywords.slice(0, 100).map((keyword: string) => ({
      keyword,
      location_code,
      language_code,
      device,
      depth,
    }));

    const res = await fetch(DATAFORSEO_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tasks),
      cache: 'no-store',
    });

    const payloadText = await res.text();
    let payload: any;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      payload = null;
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: 'DataForSEO request failed', status: res.status, details: payload || payloadText },
        { status: 502 }
      );
    }

    const tasksOut: any[] = payload?.tasks || payload?.data?.tasks || [];
    const resultsToInsert: any[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const keyword = tasks[i].keyword;
      const taskOut = tasksOut[i] || null;

      // DataForSEO responses vary: try to locate the array of organic items.
      const items =
        taskOut?.result?.[0]?.items ||
        taskOut?.result?.[0]?.items?.organic ||
        taskOut?.result?.[0]?.items?.[0] ||
        taskOut?.result?.[0]?.items ||
        [];

      const found = Array.isArray(items) ? findTargetInItems(items, card.domain) : null;

      resultsToInsert.push({
        card_id: cardId,
        keyword,
        rank_group: found?.rank_group ?? null,
        rank_absolute: found?.rank_absolute ?? null,
        url_found: found?.url_found ?? null,
        search_location: String(location_code),
        search_device: device,
        checked_at,
      });
    }

    const { error: insErr } = await supabase.from('serp_position_history').insert(resultsToInsert);
    if (insErr) {
      console.error('Failed to insert serp history:', insErr);
      return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, checked_at, inserted: resultsToInsert.length });
  } catch (error) {
    console.error('SERP check failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

