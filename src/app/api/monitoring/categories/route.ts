export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type CategoryRow = {
  id: number;
  country: string;
  level: number | null;
  category_name: string;
  category_slug: string;
  parent_id: number | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = (searchParams.get('country') || '').trim().toLowerCase();
    const levelParam = (searchParams.get('level') || '').trim();
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 500)));
    const level = levelParam ? Number(levelParam) : null;

    if (!country) {
      return NextResponse.json({ error: 'country query param is required' }, { status: 400 });
    }

    let query = supabase
      .from('categories')
      .select('id,country,level,category_name,category_slug,parent_id')
      .eq('country', country)
      .order('level', { ascending: true })
      .order('category_name', { ascending: true })
      .limit(limit);

    if (Number.isFinite(level) && level !== null) {
      query = query.eq('level', level);
    }

    if (q) {
      query = query.or(`category_name.ilike.%${q}%,category_slug.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to load categories:', error);
      return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
    }

    const categories = (data || []) as CategoryRow[];

    const { data: allCountryRows, error: allRowsError } = await supabase
      .from('categories')
      .select('id,country,level,category_name,category_slug,parent_id')
      .eq('country', country);

    if (allRowsError) {
      console.error('Failed to load country category map:', allRowsError);
      return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
    }

    const byId = new Map<number, CategoryRow>();
    for (const row of ((allCountryRows || []) as CategoryRow[])) {
      byId.set(row.id, row);
    }

    const withParents = categories.map((row) => {
      const parent = row.parent_id ? byId.get(row.parent_id) || null : null;
      const grandParent = parent?.parent_id ? byId.get(parent.parent_id) || null : null;
      return {
        ...row,
        parent_name: parent?.category_name ?? null,
        grandparent_name: grandParent?.category_name ?? null,
      };
    });

    return NextResponse.json({ data: withParents });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

