export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = (searchParams.get('country') || '').trim().toLowerCase();
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 500)));

    if (!country) {
      return NextResponse.json({ data: [] });
    }

    let query = supabase
      .from('categories')
      .select('id,country,top_category_name,top_category_slug,display_category_name,display_category_slug')
      .eq('country', country)
      .order('top_category_name', { ascending: true })
      .order('display_category_name', { ascending: true })
      .limit(limit);

    if (q) {
      query = query.or(
        `display_category_name.ilike.%${q}%,top_category_name.ilike.%${q}%,display_category_slug.ilike.%${q}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to load categories:', error);
      return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

