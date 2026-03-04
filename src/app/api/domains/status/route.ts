export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ALLOWED_STATUSES = ['new', 'available', 'unavailable', 'error', 'blacklisted'];

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { domain, status } = body;

        if (!domain || !status) {
            return NextResponse.json(
                { error: 'Missing domain or status' },
                { status: 400 }
            );
        }

        if (!ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('domains')
            .update({
                status: status,
                update_at: new Date().toISOString()
            })
            .eq('domain', domain);

        if (error) throw error;

        return NextResponse.json({ success: true, domain, status });
    } catch (error) {
        console.error('Failed to update domain status:', error);
        return NextResponse.json(
            { error: 'Failed to update status' },
            { status: 500 }
        );
    }
}
