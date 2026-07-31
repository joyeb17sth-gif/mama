import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/MY DESIGNS/payscleep/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching profiles...');
  const { data: profiles, error: fetchErr } = await supabase.from('profiles').select('*');
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }
  console.log('Profiles:', profiles);

  if (profiles.length > 0) {
    const targetId = profiles.find(p => p.email === 'joyeb17sth@gmail.com')?.id || profiles[0].id;
    console.log('Trying to update profile', targetId, 'to manager');
    
    // We try 'manager' because it's guaranteed to be in the original check constraint
    const { data, error } = await supabase.from('profiles').update({ role: 'manager' }).eq('id', targetId).select();
    if (error) {
      console.error('Update error:', error);
    } else {
      console.log('Update success:', data);
    }
    
    // Reset back
    await supabase.from('profiles').update({ role: 'user' }).eq('id', targetId);
  }
}

test();
