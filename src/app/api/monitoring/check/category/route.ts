export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const MAX_PAGES = 20;

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, '');
}

function extractReviewDomains(html: string): string[] {
  // Best-effort parsing without extra deps: Trustpilot category pages contain /review/<domain> links.
  const re = /\/review\/([a-z0-9.-]+)/gi;
  const out: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const d = normalizeDomain(match[1] || '');
    if (!d) continue;
    if (seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}

async function fetchPage(url: string, attempt = 1): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    cache: 'no-store',
  });

  if (res.status === 429 && attempt <= 3) {
    const backoffMs = 500 * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, backoffMs));
    return fetchPage(url, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`Trustpilot request failed: ${res.status}`);
  }

  return await res.text();
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
    if (card.is_active === false) return NextResponse.json({ error: 'Card is paused' }, { status: 400 });

    const category_slug = String(card.category_slug || '').trim();
    const country_code = String(card.country_code || '').trim().toUpperCase();
    if (!category_slug || !country_code) {
      return NextResponse.json(
        { error: 'category_slug and country_code are required to check Trustpilot category position' },
        { status: 400 }
      );
    }

    const target = normalizeDomain(String(card.domain || ''));
    const checked_at = new Date().toISOString();

    let position: number | null = null;
    let total_scanned = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `https://www.trustpilot.com/categories/${encodeURIComponent(
        category_slug
      )}?country=${encodeURIComponent(country_code)}&page=${page}`;
      const html = await fetchPage(url);
      const domains = extractReviewDomains(html);

      // Fallback: if Trustpilot changes markup and we don't see links, stop early.
      if (domains.length === 0) break;

      const idx = domains.findIndex((d) => d === target);
      if (idx >= 0) {
        position = total_scanned + idx + 1;
        total_scanned += domains.length;
        break;
      }

      total_scanned += domains.length;
    }

    let rating_at_check: number | null = null;
    let reviews_at_check: number | null = null;
    if (card.domain_id) {
      const { data: dom } = await supabase
        .from('domains')
        .select('rating,reviews_count')
        .eq('id', card.domain_id)
        .maybeSingle();
      rating_at_check = typeof dom?.rating === 'number' ? dom.rating : dom?.rating ? Number(dom.rating) : null;
      reviews_at_check = typeof dom?.reviews_count === 'number' ? dom.reviews_count : dom?.reviews_count ? Number(dom.reviews_count) : null;
    }

    const { error: insErr } = await supabase.from('category_position_history').insert({
      card_id: cardId,
      category_slug,
      country_code,
      position,
      total_scanned,
      rating_at_check,
      reviews_at_check,
      checked_at,
    });

    if (insErr) {
      console.error('Failed to insert category history:', insErr);
      return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, checked_at, position, total_scanned });
  } catch (error) {
    console.error('Category check failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

