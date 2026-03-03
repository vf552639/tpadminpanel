import { NextResponse } from 'next/server';
import cache from '@/lib/cache';

export async function POST() {
    cache.flushAll();
    return NextResponse.json({ success: true, message: 'Cache cleared' });
}
