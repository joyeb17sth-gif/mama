import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

const SUPABASE_URL = "https://mnrdpkrpvlqbluhcgfcu.supabase.co";
const SUPABASE_KEY = "sb_publishable_PYYE7mlt_DoEwky-lLj1tg_rpx_MmYG";
const SECRET_KEY = "sitalpayslip-dev-key-not-for-production";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const decryptData = (ciphertext) => {
    if (!ciphertext) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        return decryptedData;
    } catch (e) {
        try {
            return JSON.parse(ciphertext);
        } catch (e2) {
            return null;
        }
    }
};

async function test() {
  const { data, error } = await supabase
    .from('periodical_tasks')
    .select('data, updated_at')
    .eq('id', 'main_list')
    .single();

  if (data && data.data) {
    const tasks = decryptData(data.data);
    console.log("Cloud tasks:", tasks.map(t => t.taskName));
  } else {
    console.log("No data", error);
  }
}

test();
