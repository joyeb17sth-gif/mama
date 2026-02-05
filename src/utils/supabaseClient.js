import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mnrdpkrpvlqbluhcgfcu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_PYYE7mlt_DoEwky-lLj1tg_rpx_MmYG';

// Warn in production if using fallback values
if (import.meta.env.PROD && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
    console.warn('Supabase credentials not found in environment variables. Using fallback values.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
