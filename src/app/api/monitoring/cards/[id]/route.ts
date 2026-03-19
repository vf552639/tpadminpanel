export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function parseId(params: { id?: string }) {
  const id = Number(params.id);
  return Number.isFinite(id) ? id : null;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId(await ctx.params);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { data, error } = await supabase
    .from('monitored_cards')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load monitored card:', error);
    return NextResponse.json({ error: 'Failed to load card' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = parseId(await ctx.params);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const body = await request.json();

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.domain !== undefined) updates.domain = String(body.domain || '').trim().toLowerCase();
    if (body.domain_id !== undefined) updates.domain_id = body.domain_id ?? null;
    if (body.category_id !== undefined) updates.category_id = body.category_id ?? null;
    if (body.category_slug !== undefined)
      updates.category_slug = body.category_slug ? String(body.category_slug).trim() : null;
    if (body.country_code !== undefined)
      updates.country_code = body.country_code ? String(body.country_code).trim().toLowerCase() : null;
    if (body.keywords !== undefined) {
      const keywords = Array.isArray(body.keywords)
        ? body.keywords.map((k: any) => String(k || '').trim()).filter((k: string) => k.length > 0)
        : [];
      updates.keywords = keywords;
    }
    if (body.language_code !== undefined) updates.language_code = String(body.language_code || 'en').trim();
    if (body.location_code !== undefined) updates.location_code = body.location_code ? Number(body.location_code) : null;
    if (body.device !== undefined) updates.device = String(body.device || 'desktop').trim();
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

    const { data, error } = await supabase
      .from('monitored_cards')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update monitored card:', error);
      return NextResponse.json({ error: error.message || 'Failed to update card' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to update monitored card:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId(await ctx.params);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { error } = await supabase.from('monitored_cards').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete monitored card:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

