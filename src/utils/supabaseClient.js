import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('CRITICAL: Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) must be set in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
