export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(300, Math.max(1, Number(searchParams.get('limit') || 200)));

    let query = supabase
      .from('countries')
      .select('cn_code,cn_name,base_url')
      .order('cn_name', { ascending: true })
      .limit(limit);

    if (q) {
      query = query.or(`cn_code.ilike.%${q}%,cn_name.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to load countries:', error);
      return NextResponse.json({ error: 'Failed to load countries' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Countries API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

