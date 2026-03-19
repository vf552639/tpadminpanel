export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type ResolveResult = {
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

function extractDomainFromUrl(url: URL): string | null {
  const path = url.pathname || '';
  const idx = path.indexOf('/review/');
  if (idx === -1) return null;
  const after = path.slice(idx + '/review/'.length);
  const clean = after.replace(/\/+$/, '').trim();
  if (!clean) return null;
  return clean.toLowerCase();
}

function guessCountryFromUrl(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  // de.trustpilot.com -> DE, fr.trustpilot.com -> FR
  const parts = host.split('.');
  if (parts.length >= 3 && parts[1] === 'trustpilot' && parts[2] === 'com') {
    const cc = parts[0];
    if (cc.length === 2) return cc.toUpperCase();
  }

  const countryParam = url.searchParams.get('country');
  if (countryParam && countryParam.length === 2) return countryParam.toUpperCase();

  return null;
}

function extractJsonLd(html: string): any[] {
  const scripts: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const json = JSON.parse(raw);
      if (Array.isArray(json)) {
        scripts.push(...json);
      } else {
        scripts.push(json);
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return scripts;
}

function pickBusinessNode(nodes: any[]): any | null {
  for (const node of nodes) {
    const type = node['@type'];
    if (!type) continue;
    const t = Array.isArray(type) ? type : [type];
    if (t.some((x) => typeof x === 'string' && /Organization|LocalBusiness|Product/i.test(x))) {
      return node;
    }
  }
  return null;
}

function extractCategorySlug(html: string): string | null {
  // Try to find "/categories/<slug>" links
  const catRe = /href=["']\/categories\/([a-z0-9_]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = catRe.exec(html))) {
    if (m[1]) return m[1];
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawUrl = String(body.url || '').trim();

    if (!rawUrl) {
      return NextResponse.json({ ok: false, error: 'url is required' }, { status: 400 });
    }

    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid URL' }, { status: 400 });
    }

    if (!url.hostname.includes('trustpilot.com') || !url.pathname.includes('/review/')) {
      return NextResponse.json(
        { ok: false, error: 'URL must be a Trustpilot business review page (trustpilot.com/review/...)' },
        { status: 400 }
      );
    }

    const domainFromUrl = extractDomainFromUrl(url);
    if (!domainFromUrl) {
      return NextResponse.json({ ok: false, error: 'Could not extract domain from URL' }, { status: 400 });
    }

    const countryFromUrl = guessCountryFromUrl(url);

    const tpRes = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (tpRes.status === 404) {
      return NextResponse.json({ ok: false, error: 'Trustpilot page not found' }, { status: 404 });
    }

    if (!tpRes.ok) {
      return NextResponse.json(
        { ok: false, error: `Trustpilot request failed with status ${tpRes.status}` },
        { status: 502 }
      );
    }

    const html = await tpRes.text();
    const jsonLdNodes = extractJsonLd(html);
    const business = pickBusinessNode(jsonLdNodes);

    let rating: number | null = null;
    let reviews: number | null = null;
    let businessName: string | null = null;
    let countryFromJson: string | null = null;

    if (business) {
      const agg = business.aggregateRating || {};
      if (agg.ratingValue != null) rating = Number(agg.ratingValue);
      if (agg.reviewCount != null) reviews = Number(agg.reviewCount);
      if (typeof business.name === 'string') businessName = business.name;

      const addr = business.address || {};
      if (typeof addr.addressCountry === 'string' && addr.addressCountry.length <= 3) {
        countryFromJson = addr.addressCountry.toUpperCase();
      }
    }

    const categorySlug = extractCategorySlug(html);

    const [domainRow, categoryRow] = await Promise.all([
      supabase
        .from('domains')
        .select('id,category_id,domain')
        .eq('domain', domainFromUrl)
        .maybeSingle(),
      categorySlug
        ? supabase
            .from('categories')
            .select('*')
            .or(`display_category_slug.eq.${categorySlug},category_slug.eq.${categorySlug}`)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const domainData = domainRow.data;
    const categoryData = categoryRow && 'data' in categoryRow ? (categoryRow as any).data : null;

    const result: ResolveResult = {
      domain: domainFromUrl,
      domain_id: domainData?.id ?? null,
      business_name: businessName,
      rating,
      reviews_count: reviews,
      category_slug: categorySlug || null,
      category_id: categoryData?.id ?? domainData?.category_id ?? null,
      country_code: (countryFromJson || countryFromUrl || null)?.toUpperCase() || null,
      tp_url: url.toString(),
    };

    const isPartial =
      !result.category_slug || !result.country_code || result.rating == null || result.reviews_count == null;

    return NextResponse.json(
      {
        ok: true,
        partial: isPartial,
        data: result,
      },
      { status: isPartial ? 206 : 200 }
    );
  } catch (error) {
    console.error('TP resolve error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

