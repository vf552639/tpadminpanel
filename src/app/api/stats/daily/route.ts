export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import cache from '@/lib/cache';

const CACHE_KEY = 'daily_stats';

export async function GET() {
    try {
        const cachedData = cache.get(CACHE_KEY);
        if (cachedData) {
            return NextResponse.json({ data: cachedData, cached: true });
        }

        // Materialized view "daily_stats" is expected to exist in the database
        const { data, error } = await supabase
            .from('daily_stats')
            .select('*')
            .order('day', { ascending: false })
            .limit(30); // Get last 30 days

        if (error) {
            console.error("MView Error:", error.message);
            throw error;
        }

        cache.set(CACHE_KEY, data);

        return NextResponse.json({ data, cached: false });
    } catch (error: any) {
        console.error('Failed to fetch daily stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics. Ensure daily_stats Materialized View exists.' },
            { status: 500 }
        );
    }
}
