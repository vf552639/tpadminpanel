export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import cache from '@/lib/cache';

const CACHE_KEY = 'dashboard_metrics';

export async function GET() {
    try {
        // 1. Check cache first
        const cachedData = cache.get(CACHE_KEY);
        if (cachedData) {
            return NextResponse.json({ ...cachedData, cached: true });
        }

        // 2. Fetch all required counts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString();

        const [
            { count: totalDomains },
            { count: newToday },
            { count: newYesterday },
            { count: totalAvailable },
            { count: totalNew },
            { count: totalErrors },
            { count: availableToday },
            { count: availableYesterday },
        ] = await Promise.all([
            supabase.from('domains').select('*', { count: 'exact', head: true }),
            supabase.from('domains').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
            supabase.from('domains').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayStr).lt('created_at', todayStr),
            supabase.from('domains').select('*', { count: 'exact', head: true }).eq('status', 'available'),
            supabase.from('domains').select('*', { count: 'exact', head: true }).eq('status', 'new'),
            supabase.from('domains').select('*', { count: 'exact', head: true }).eq('status', 'error'),
            supabase.from('domains').select('*', { count: 'exact', head: true }).eq('status', 'available').gte('update_at', todayStr),
            supabase.from('domains').select('*', { count: 'exact', head: true }).eq('status', 'available').gte('update_at', yesterdayStr).lt('update_at', todayStr),
        ]);

        const metrics = {
            totalDomains: totalDomains || 0,
            newToday: newToday || 0,
            newYesterday: newYesterday || 0,
            totalAvailable: totalAvailable || 0,
            totalNew: totalNew || 0,
            totalErrors: totalErrors || 0,
            availableToday: availableToday || 0,
            availableYesterday: availableYesterday || 0,
            timestamp: new Date().toISOString()
        };

        // 3. Set Cache 
        cache.set(CACHE_KEY, metrics);

        return NextResponse.json({ ...metrics, cached: false });
    } catch (error) {
        console.error('Failed to fetch metrics:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
