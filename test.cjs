const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mnrdpkrpvlqbluhcgfcu.supabase.co';
const supabaseKey = 'sb_publishable_PYYE7mlt_DoEwky-lLj1tg_rpx_MmYG';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTableAndProfiles() {
    // First, try to create the profiles table using SQL via RPC
    // Since we're using the anon key, we need to create via SQL editor in Supabase dashboard
    // Let's check what tables exist
    
    console.log('Checking existing tables...');
    
    // Try various table names that might exist
    const tableNames = ['profiles', 'users', 'user_profiles', 'app_users'];
    
    for (const table of tableNames) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (!error) {
            console.log(`✓ Table '${table}' exists! Data:`, JSON.stringify(data));
        } else {
            console.log(`✗ Table '${table}': ${error.message}`);
        }
    }

    // Also check if we can run RPC
    console.log('\nTrying to create profiles table via rpc...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_profiles_table');
    if (rpcError) {
        console.log('RPC not available:', rpcError.message);
    }

    // Let's try the REST API to check schema
    console.log('\nChecking available tables via REST...');
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const result = await response.json();
        console.log('Available endpoints:', JSON.stringify(result, null, 2));
    } catch(e) {
        console.log('REST check failed:', e.message);
    }
}

createTableAndProfiles();
