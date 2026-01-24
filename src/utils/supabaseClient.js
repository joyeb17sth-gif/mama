import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and Anon Key
// I have derived the URL from your project ID
const supabaseUrl = 'https://mnrdpkrpvlqbluhcgfcu.supabase.co';
const supabaseAnonKey = 'sb_publishable_PYYE7mlt_DoEwky-lLj1tg_rpx_MmYG';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
