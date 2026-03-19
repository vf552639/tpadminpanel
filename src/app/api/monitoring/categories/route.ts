export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 500)));

    let query = supabase.from('categories').select('*').limit(limit);

    if (q) {
      query = query.or(`display_category_slug.ilike.%${q}%,category_slug.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to load categories:', error);
      return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
    }

    const mapped = (data || [])
      .map((row: any) => ({
        id: Number(row.id),
        display_category_slug: String(row.display_category_slug || row.category_slug || '').trim(),
        parent_id: row.parent_id ?? null,
      }))
      .filter((row: any) => Number.isFinite(row.id) && row.display_category_slug);

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

