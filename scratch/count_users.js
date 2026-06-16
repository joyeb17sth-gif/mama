import { createServer } from 'vite';

async function main() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    const { supabase } = await vite.ssrLoadModule('./src/utils/supabaseClient.js');
    const { data, error } = await supabase.from('profiles').select('role');
    if (error) {
      console.error('Error fetching profiles:', error);
      process.exit(1);
    }

    const counts = {};
    (data || []).forEach(row => {
      const role = row.role || 'user';
      counts[role] = (counts[role] || 0) + 1;
    });

    console.log('USER_ROLE_COUNTS:' + JSON.stringify(counts));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await vite.close();
  }
}

main();
