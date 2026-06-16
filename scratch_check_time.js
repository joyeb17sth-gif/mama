import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mnrdpkrpvlqbluhcgfcu.supabase.co";
const SUPABASE_KEY = "sb_publishable_PYYE7mlt_DoEwky-lLj1tg_rpx_MmYG";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('periodical_tasks').select('updated_at').eq('id', 'main_list').single();
  console.log("Updated at in cloud:", data, error);
}

test();
