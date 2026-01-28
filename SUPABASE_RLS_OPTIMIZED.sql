-- RLS Fix: Optimized Policies for Performance
-- This script updates the RLS policies to use "(select auth.role())" instead of "auth.role()".
-- REASON: Wrapping the function in a SELECT statement allows Postgres to cache the result once per query 
-- instead of re-evaluating it for every single row. This significantly improves performance on large tables.

DO $$
DECLARE
    tables text[] := ARRAY[
        'contractors', 
        'sites', 
        'timesheets', 
        'pay_rates', 
        'training_releases', 
        'audit_logs', 
        'payment_summaries', 
        'app_credentials',
        'public_holidays'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        -- Only proceed if table exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            
            -- 1. Ensure RLS is enabled
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            -- 2. Clean up previous policies
            -- We drop all variants we might have created to ensure a clean slate
            EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert for all users" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable update for all users" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable delete for all users" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert for anon users" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable update for anon users" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable delete for anon users" ON public.%I', t);

            -- 3. Create OPTIMIZED policies
            -- The magic here is wrapping "auth.role()" in "(select auth.role())"
            
            -- READ: Allow public read access (Standard for this app structure)
            EXECUTE format('CREATE POLICY "Enable read access for all users" ON public.%I FOR SELECT USING (true)', t);
            
            -- WRITE (Insert): Optimized check
            EXECUTE format('CREATE POLICY "Enable insert for anon users" ON public.%I FOR INSERT TO anon WITH CHECK ((select auth.role()) = ''anon'')', t);
            
            -- UPDATE: Optimized check
            EXECUTE format('CREATE POLICY "Enable update for anon users" ON public.%I FOR UPDATE TO anon USING ((select auth.role()) = ''anon'') WITH CHECK ((select auth.role()) = ''anon'')', t);
            
            -- DELETE: Optimized check
            EXECUTE format('CREATE POLICY "Enable delete for anon users" ON public.%I FOR DELETE TO anon USING ((select auth.role()) = ''anon'')', t);

        END IF;
    END LOOP;
END $$;
