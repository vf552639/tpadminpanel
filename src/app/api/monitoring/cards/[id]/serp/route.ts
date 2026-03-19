export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function parseId(params: { id?: string }) {
  const id = Number(params.id);
  return Number.isFinite(id) ? id : null;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = parseId(await ctx.params);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const keyword = (searchParams.get('keyword') || '').trim();
    const limit = Math.min(500, Math.max(50, Number(searchParams.get('limit') || 200)));

    let q = supabase
      .from('serp_position_history')
      .select('*')
      .eq('card_id', id)
      .order('checked_at', { ascending: true })
      .limit(limit);

    if (keyword) q = q.eq('keyword', keyword);

    const { data, error } = await q;
    if (error) {
      console.error('Failed to load SERP history:', error);
      return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Failed to load SERP history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

