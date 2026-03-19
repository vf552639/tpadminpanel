export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 3) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await supabase
      .from('domains')
      .select('id,domain,category_id,country_code,rating,reviews_count')
      .ilike('domain', `%${q}%`)
      .order('reviews_count', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Domain search failed:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Domain search error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

