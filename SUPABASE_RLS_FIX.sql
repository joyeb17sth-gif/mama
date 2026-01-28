-- Enable Row Level Security (RLS) and allow public access for existing tables (Robust Version)
-- This script checks if each table exists before attempting to modify it.
-- This prevents "relation does not exist" errors if your database schema is not fully synced.

-- 1. contractors
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contractors') THEN
        ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.contractors;
        CREATE POLICY "Allow public access" ON public.contractors FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. sites
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sites') THEN
        ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.sites;
        CREATE POLICY "Allow public access" ON public.sites FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. timesheets
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'timesheets') THEN
        ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.timesheets;
        CREATE POLICY "Allow public access" ON public.timesheets FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. pay_rates
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pay_rates') THEN
        ALTER TABLE public.pay_rates ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.pay_rates;
        CREATE POLICY "Allow public access" ON public.pay_rates FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. training_releases
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'training_releases') THEN
        ALTER TABLE public.training_releases ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.training_releases;
        CREATE POLICY "Allow public access" ON public.training_releases FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. audit_logs
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.audit_logs;
        CREATE POLICY "Allow public access" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. payment_summaries
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_summaries') THEN
        ALTER TABLE public.payment_summaries ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.payment_summaries;
        CREATE POLICY "Allow public access" ON public.payment_summaries FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 8. app_credentials
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_credentials') THEN
        ALTER TABLE public.app_credentials ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.app_credentials;
        CREATE POLICY "Allow public access" ON public.app_credentials FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 9. public_holidays
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'public_holidays') THEN
        ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.public_holidays;
        CREATE POLICY "Allow public access" ON public.public_holidays FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
