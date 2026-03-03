import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder';

if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase URL or Service Key. Database will not be accessible.');
}

// Important: Use Service Role Key because admin panel is a trusted environment
export const supabase = createClient(supabaseUrl, supabaseKey);
