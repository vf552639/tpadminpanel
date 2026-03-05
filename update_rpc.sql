CREATE OR REPLACE FUNCTION filter_domains(
    p_min_reviews INT DEFAULT 0,
    p_min_rating NUMERIC DEFAULT 0,
    p_max_rating NUMERIC DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_category_id INT DEFAULT NULL,
    p_page INT DEFAULT 1,
    p_per_page INT DEFAULT 50,
    p_tld TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT NULL,
    p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
    domain TEXT,
    rating NUMERIC,
    reviews_count INT,
    status TEXT,
    country_code TEXT,
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY 
    WITH filtered AS (
        SELECT 
            d.domain,
            d.rating,
            d.reviews_count,
            d.status,
            d.country_code,
            d.expiry_date,
            d.created_at,
            COUNT(*) OVER() AS total_count
        FROM domains d
        WHERE 
            (p_min_reviews = 0 OR d.reviews_count >= p_min_reviews)
            AND (p_min_rating = 0 OR d.rating >= p_min_rating)
            AND (
                p_max_rating IS NULL 
                OR (
                    CASE 
                        WHEN p_max_rating >= 5.0 THEN d.rating <= p_max_rating
                        ELSE d.rating < p_max_rating
                    END
                )
            )
            AND (p_status IS NULL OR p_status = 'all' OR d.status = p_status)
            AND (p_country IS NULL OR p_country = '' OR d.country_code = p_country)
            AND (p_category_id IS NULL OR d.category_id = p_category_id)
            AND (p_tld IS NULL OR p_tld = '' OR d.domain LIKE '%' || p_tld)
        ORDER BY
            CASE
                WHEN p_sort_by = 'reviews_count' AND p_sort_order = 'desc' THEN d.reviews_count END DESC NULLS LAST,
            CASE
                WHEN p_sort_by = 'reviews_count' AND p_sort_order = 'asc' THEN d.reviews_count END ASC NULLS LAST,
            CASE
                WHEN p_sort_by = 'rating' AND p_sort_order = 'desc' THEN d.rating END DESC NULLS LAST,
            CASE
                WHEN p_sort_by = 'rating' AND p_sort_order = 'asc' THEN d.rating END ASC NULLS LAST,
            d.created_at DESC
        LIMIT p_per_page
        OFFSET (p_page - 1) * p_per_page
    )
    SELECT * FROM filtered;
END;
$$ LANGUAGE plpgsql;
