export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Extract pagination
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('perPage') || '50');

        // Extract filters
        const minReviews = parseInt(searchParams.get('minReviews') || '0');
        const minRating = parseFloat(searchParams.get('minRating') || '0');
        const status = searchParams.get('status') || null;
        const country = searchParams.get('country') || null;
        const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : null;
        const onlyRoot = searchParams.get('onlyRoot') !== 'false'; // true by default

        // Call the RPC function defined in Supabase
        const { data, error } = await supabase.rpc('filter_domains', {
            p_min_reviews: minReviews,
            p_min_rating: minRating,
            p_status: status,
            p_country: country,
            p_category_id: categoryId,
            p_page: page,
            p_per_page: perPage
        });

        if (error) {
            // If the RPC function isn't created yet or fails, fallback to simple query setup
            console.error("RPC Error:", error.message);
            throw error;
        }

        // Process output for onlyRoot if we need to do it post-query (though SQL handles it better)
        // Assuming SQL RPC doesn't have the LIKE filter built-in as per TS ("Optional: SQL filtering for subdomains")
        let results = data || [];
        let totalCount = results.length > 0 ? results[0].total_count : 0;

        // A brute force fallback filter on server side if RPC doesn't have `NOT LIKE '%.%.%'`
        if (onlyRoot && results.length > 0) {
            // Very basic regex to keep only root domains (domain.com, domain.co.uk)
            // If a dot appears more than once, roughly a subdomain, except some known TLDs.
            // Easiest is to rely on SQL for exactness, but we apply a simple JS filter for display correctness if SQL skipped it
            results = results.filter((row: any) => {
                const parts = row.domain.split('.');
                // Check for common ccTLDs like .co.uk, .com.br
                const isLongTld = parts.length >= 3 && parts[parts.length - 2].length <= 3 && parts[parts.length - 1].length <= 3;

                if (isLongTld) {
                    return parts.length === 3; // e.g. brand.co.uk
                }
                return parts.length === 2; // e.g. brand.com
            });
            // We don't change totalCount here to remain fast, just filter display page
        }

        return NextResponse.json({
            data: results.map((row: any) => {
                // Remove the meta total_count field from each row for cleanliness
                const { total_count, ...rest } = row;
                return rest;
            }),
            pagination: {
                page,
                perPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / perPage)
            }
        });

    } catch (error) {
        console.error('Failed to fetch domains:', error);
        return NextResponse.json(
            { error: 'Failed to fetch domains. Make sure the filter_domains RPC is created in Supabase.' },
            { status: 500 }
        );
    }
}
