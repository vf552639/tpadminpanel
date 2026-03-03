export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Limits
        const MAX_EXPORT = 50000;

        // Extract filters
        const minReviews = parseInt(searchParams.get('minReviews') || '0');
        const minRating = parseFloat(searchParams.get('minRating') || '0');
        const status = searchParams.get('status') || null;
        const country = searchParams.get('country') || null;
        const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : null;

        // Use RPC to fetch up to MAX_EXPORT
        const { data, error } = await supabase.rpc('filter_domains', {
            p_min_reviews: minReviews,
            p_min_rating: minRating,
            p_status: status,
            p_country: country,
            p_category_id: categoryId,
            p_page: 1,
            p_per_page: MAX_EXPORT
        });

        if (error) throw error;

        let results = data || [];

        // Format as CSV
        const headers = ['domain', 'rating', 'reviews_count', 'status', 'country_code', 'expiry_date', 'created_at'];
        const csvRows = [headers.join(',')];

        for (const row of results) {
            const values = headers.map(header => {
                const val = row[header];
                if (val === null || val === undefined) return '';
                // Escape quotes to prevent CSV injection / breaking
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvContent = csvRows.join('\n');

        // Create a streaming response
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="domains_export_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error('Failed to export domains:', error);
        return NextResponse.json(
            { error: 'Export failed' },
            { status: 500 }
        );
    }
}
