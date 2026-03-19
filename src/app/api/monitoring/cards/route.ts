export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type MonitoredCardRow = {
  id: number;
  domain: string;
  domain_id: number | null;
  category_id: number | null;
  category_slug: string | null;
  country_code: string | null;
  monitoring_depth: 'own' | 'parent' | 'all' | null;
  initial_rating: number | null;
  initial_reviews: number | null;
  keywords: string[] | null;
  language_code: string | null;
  location_code: number | null;
  device: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function GET() {
  try {
    const { data: cards, error } = await supabase
      .from('monitored_cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Failed to load monitored cards:', error);
      return NextResponse.json({ error: 'Failed to load cards' }, { status: 500 });
    }

    const cardIds = (cards || []).map((c: any) => c.id).filter(Boolean);

    // Fetch some recent history to compute "last position" indicators for the list view.
    const [serpRes, catRes] = await Promise.all([
      cardIds.length
        ? supabase
            .from('serp_position_history')
            .select('card_id,keyword,rank_group,rank_absolute,url_found,checked_at')
            .in('card_id', cardIds)
            .order('checked_at', { ascending: false })
            .limit(1000)
        : Promise.resolve({ data: [], error: null } as any),
      cardIds.length
        ? supabase
            .from('category_position_history')
            .select('card_id,checked_level,position,category_name,checked_at')
            .in('card_id', cardIds)
            .order('checked_at', { ascending: false })
            .limit(3000)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (serpRes?.error) console.warn('SERP history load warning:', serpRes.error);
    if (catRes?.error) console.warn('Category history load warning:', catRes.error);

    const lastSerpByCard: Record<number, any> = {};
    for (const row of serpRes?.data || []) {
      if (!lastSerpByCard[row.card_id]) lastSerpByCard[row.card_id] = row;
    }

    const lastCatByCard: Record<number, any> = {};
    const lastCatByCardLevel: Record<number, any[]> = {};
    for (const row of catRes?.data || []) {
      if (!lastCatByCardLevel[row.card_id]) {
        lastCatByCardLevel[row.card_id] = [];
      }
      const hasLevel = lastCatByCardLevel[row.card_id].some((item) => item.checked_level === row.checked_level);
      if (!hasLevel) {
        lastCatByCardLevel[row.card_id].push(row);
      }

      if (!lastCatByCard[row.card_id]) {
        lastCatByCard[row.card_id] = row;
      } else {
        const current = lastCatByCard[row.card_id];
        const currentLevel = Number(current.checked_level || 0);
        const nextLevel = Number(row.checked_level || 0);
        if (nextLevel > currentLevel) {
          lastCatByCard[row.card_id] = row;
        }
      }
    }

    return NextResponse.json({
      data: (cards || []).map((c: MonitoredCardRow) => ({
        ...c,
        last_serp: lastSerpByCard[c.id] || null,
        last_category: lastCatByCard[c.id] || null,
        last_category_by_level: lastCatByCardLevel[c.id] || [],
      })),
    });
  } catch (error) {
    console.error('Failed to load monitored cards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const domain = String(body.domain || '').trim().toLowerCase();
    if (!domain) return NextResponse.json({ error: 'Domain is required' }, { status: 400 });

    const keywordsRaw = Array.isArray(body.keywords) ? body.keywords : [];
    const keywords = keywordsRaw
      .map((k: any) => String(k || '').trim())
      .filter((k: string) => k.length > 0);

    const payload = {
      domain,
      domain_id: body.domain_id ?? null,
      category_id: body.category_id ?? null,
      category_slug: body.category_slug ? String(body.category_slug).trim() : null,
      country_code: body.country_code ? String(body.country_code).trim().toLowerCase() : null,
      monitoring_depth:
        body.monitoring_depth === 'parent' || body.monitoring_depth === 'all' ? body.monitoring_depth : 'own',
      initial_rating:
        body.initial_rating !== undefined && body.initial_rating !== null ? Number(body.initial_rating) : null,
      initial_reviews:
        body.initial_reviews !== undefined && body.initial_reviews !== null ? Number(body.initial_reviews) : null,
      keywords,
      language_code: body.language_code ? String(body.language_code).trim() : 'en',
      location_code: body.location_code ? Number(body.location_code) : null,
      device: body.device ? String(body.device).trim() : 'desktop',
      is_active: body.is_active !== false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('monitored_cards')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create monitored card:', error);
      return NextResponse.json({ error: error.message || 'Failed to create card' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to create monitored card:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

