-- 1. Create the periodical_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.periodical_tasks (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create the global_rates table if it doesn't exist (just in case)
CREATE TABLE IF NOT EXISTS public.global_rates (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS on both tables
ALTER TABLE public.periodical_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_rates ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies
DROP POLICY IF EXISTS "Allow public access" ON public.periodical_tasks;
DROP POLICY IF EXISTS "Allow authenticated access" ON public.periodical_tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.periodical_tasks;
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.periodical_tasks;
DROP POLICY IF EXISTS "Enable update for anon users" ON public.periodical_tasks;
DROP POLICY IF EXISTS "Enable delete for anon users" ON public.periodical_tasks;

DROP POLICY IF EXISTS "Allow public access" ON public.global_rates;
DROP POLICY IF EXISTS "Allow authenticated access" ON public.global_rates;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.global_rates;
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.global_rates;
DROP POLICY IF EXISTS "Enable update for anon users" ON public.global_rates;
DROP POLICY IF EXISTS "Enable delete for anon users" ON public.global_rates;

-- 5. Create secure policies for Authenticated Users Only (matching SUPABASE_RLS_SECURE.sql)
CREATE POLICY "Allow authenticated access" ON public.periodical_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON public.global_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Note: If you are not using authentication and still want public access, run these instead of the above:
-- CREATE POLICY "Enable read access for all users" ON public.periodical_tasks FOR SELECT USING (true);
-- CREATE POLICY "Enable insert for anon users" ON public.periodical_tasks FOR INSERT TO anon WITH CHECK ((select auth.role()) = 'anon');
-- CREATE POLICY "Enable update for anon users" ON public.periodical_tasks FOR UPDATE TO anon USING ((select auth.role()) = 'anon') WITH CHECK ((select auth.role()) = 'anon');
-- CREATE POLICY "Enable delete for anon users" ON public.periodical_tasks FOR DELETE TO anon USING ((select auth.role()) = 'anon');
