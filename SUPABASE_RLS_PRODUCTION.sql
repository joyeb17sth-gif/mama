-- ============================================================================
-- PRODUCTION RLS POLICIES — Unified RBAC for Seetal Management
-- ============================================================================
-- Run this ONCE in Supabase SQL Editor to replace all previous RLS scripts.
-- This script is idempotent — safe to re-run.
--
-- Role hierarchy:
--   admin          → Full access to everything
--   manager        → Read/write sites, tasks, timesheets, leads, contractors
--   supervisor     → Same as manager
--   payslip_management → Read/write contractors, timesheets, payment summaries
--   user           → Read-only on most tables, own assigned tasks only
-- ============================================================================

-- ─── 1. Helper function: get current user's role (cached per query) ─────────
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())),
    'user'
  );
$$ LANGUAGE sql STABLE;

-- ─── 2. Helper function: get current user's email ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_email() RETURNS text AS $$
  SELECT COALESCE(
    (SELECT email FROM public.profiles WHERE id = (select auth.uid())),
    ''
  );
$$ LANGUAGE sql STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: authenticated read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: self update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin update any" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin insert" ON public.profiles;

-- All authenticated users can view all profiles (needed for user management list)
CREATE POLICY "Profiles: authenticated read"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Users can update their own profile (email, etc.)
CREATE POLICY "Profiles: self update"
ON public.profiles FOR UPDATE TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Admins can update any profile (change roles)
CREATE POLICY "Profiles: admin update any"
ON public.profiles FOR UPDATE TO authenticated
USING ((select public.get_user_role()) = 'admin');

-- Only the trigger creates profiles, but allow admin insert for manual operations
CREATE POLICY "Profiles: admin insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK ((select public.get_user_role()) = 'admin');


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. SHARED DATA TABLES (contractors, sites, pay_rates, training_releases)
--    Admin/Manager/Supervisor: full access
--    Payslip_management: full access
--    User: read-only
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN
        SELECT unnest(ARRAY['contractors', 'sites', 'pay_rates', 'training_releases'])
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);

            -- Drop all old policies
            EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated access" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert for all users" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable update for all users" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable delete for all users" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert for anon users" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable update for anon users" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable delete for anon users" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Admins and Supervisors can manage sites" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Users can view sites" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Shared: read" ON public.%I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Shared: write" ON public.%I', t_name);

            -- READ: All authenticated users
            EXECUTE format(
                'CREATE POLICY "Shared: read" ON public.%I FOR SELECT TO authenticated USING (true)',
                t_name
            );

            -- WRITE: Admin, Manager, Supervisor, Payslip Management
            EXECUTE format(
                'CREATE POLICY "Shared: write" ON public.%I FOR ALL TO authenticated USING ((select public.get_user_role()) IN (''admin'', ''manager'', ''supervisor'', ''payslip_management'')) WITH CHECK ((select public.get_user_role()) IN (''admin'', ''manager'', ''supervisor'', ''payslip_management''))',
                t_name
            );
        END IF;
    END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TIMESHEETS
--    Admin/Manager/Supervisor/Payslip_management: full access
--    User: read-only
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'timesheets') THEN
        ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow public access" ON public.timesheets;
        DROP POLICY IF EXISTS "Allow authenticated access" ON public.timesheets;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.timesheets;
        DROP POLICY IF EXISTS "Enable insert for all users" ON public.timesheets;
        DROP POLICY IF EXISTS "Enable update for all users" ON public.timesheets;
        DROP POLICY IF EXISTS "Enable delete for all users" ON public.timesheets;
        DROP POLICY IF EXISTS "Timesheets: read" ON public.timesheets;
        DROP POLICY IF EXISTS "Timesheets: write" ON public.timesheets;

        CREATE POLICY "Timesheets: read"
        ON public.timesheets FOR SELECT TO authenticated
        USING (true);

        CREATE POLICY "Timesheets: write"
        ON public.timesheets FOR ALL TO authenticated
        USING ((select public.get_user_role()) IN ('admin', 'manager', 'supervisor', 'payslip_management'))
        WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager', 'supervisor', 'payslip_management'));
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. PAYMENT SUMMARIES
--    Admin/Manager/Supervisor/Payslip_management: full access
--    User: read-only
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_summaries') THEN
        ALTER TABLE public.payment_summaries ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow public access" ON public.payment_summaries;
        DROP POLICY IF EXISTS "Allow authenticated access" ON public.payment_summaries;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.payment_summaries;
        DROP POLICY IF EXISTS "Enable insert for all users" ON public.payment_summaries;
        DROP POLICY IF EXISTS "Enable update for all users" ON public.payment_summaries;
        DROP POLICY IF EXISTS "Enable delete for all users" ON public.payment_summaries;
        DROP POLICY IF EXISTS "PaymentSummaries: read" ON public.payment_summaries;
        DROP POLICY IF EXISTS "PaymentSummaries: write" ON public.payment_summaries;

        CREATE POLICY "PaymentSummaries: read"
        ON public.payment_summaries FOR SELECT TO authenticated
        USING (true);

        CREATE POLICY "PaymentSummaries: write"
        ON public.payment_summaries FOR ALL TO authenticated
        USING ((select public.get_user_role()) IN ('admin', 'manager', 'supervisor', 'payslip_management'))
        WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager', 'supervisor', 'payslip_management'));
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. PERIODICAL TASKS
--    Admin/Manager/Supervisor: full access
--    User: read/update only tasks assigned to them
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'periodical_tasks') THEN
        ALTER TABLE public.periodical_tasks ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow public access" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Allow authenticated access" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Enable insert for all users" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Enable update for all users" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Enable delete for all users" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Admins and Supervisors have full access to tasks" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Users can access assigned tasks" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Tasks: admin write" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Tasks: user read assigned" ON public.periodical_tasks;
        DROP POLICY IF EXISTS "Tasks: user update assigned" ON public.periodical_tasks;

        -- Admin/Manager/Supervisor: full access
        CREATE POLICY "Tasks: admin write"
        ON public.periodical_tasks FOR ALL TO authenticated
        USING ((select public.get_user_role()) IN ('admin', 'manager', 'supervisor'))
        WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager', 'supervisor'));

        -- Users: read tasks assigned to their email
        CREATE POLICY "Tasks: user read assigned"
        ON public.periodical_tasks FOR SELECT TO authenticated
        USING (
            (select public.get_user_role()) NOT IN ('admin', 'manager', 'supervisor')
            AND assigned_to = (select public.get_user_email())
        );

        -- Users: update tasks assigned to their email
        CREATE POLICY "Tasks: user update assigned"
        ON public.periodical_tasks FOR UPDATE TO authenticated
        USING (
            (select public.get_user_role()) NOT IN ('admin', 'manager', 'supervisor')
            AND assigned_to = (select public.get_user_email())
        )
        WITH CHECK (
            (select public.get_user_role()) NOT IN ('admin', 'manager', 'supervisor')
            AND assigned_to = (select public.get_user_email())
        );
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. PROFIT & LOSS — Admin only
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profit_loss') THEN
        ALTER TABLE public.profit_loss ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow public access" ON public.profit_loss;
        DROP POLICY IF EXISTS "Allow authenticated access" ON public.profit_loss;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.profit_loss;
        DROP POLICY IF EXISTS "Enable insert for all users" ON public.profit_loss;
        DROP POLICY IF EXISTS "Enable update for all users" ON public.profit_loss;
        DROP POLICY IF EXISTS "Enable delete for all users" ON public.profit_loss;
        DROP POLICY IF EXISTS "Only admins can access P&L" ON public.profit_loss;
        DROP POLICY IF EXISTS "ProfitLoss: admin only" ON public.profit_loss;

        CREATE POLICY "ProfitLoss: admin only"
        ON public.profit_loss FOR ALL TO authenticated
        USING ((select public.get_user_role()) = 'admin')
        WITH CHECK ((select public.get_user_role()) = 'admin');
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. GLOBAL RATES — Admin only
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'global_rates') THEN
        ALTER TABLE public.global_rates ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow public access" ON public.global_rates;
        DROP POLICY IF EXISTS "Allow authenticated access" ON public.global_rates;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.global_rates;
        DROP POLICY IF EXISTS "Enable insert for all users" ON public.global_rates;
        DROP POLICY IF EXISTS "Enable update for all users" ON public.global_rates;
        DROP POLICY IF EXISTS "Enable delete for all users" ON public.global_rates;
        DROP POLICY IF EXISTS "GlobalRates: admin only" ON public.global_rates;

        CREATE POLICY "GlobalRates: admin only"
        ON public.global_rates FOR ALL TO authenticated
        USING ((select public.get_user_role()) = 'admin')
        WITH CHECK ((select public.get_user_role()) = 'admin');
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 10. PUBLIC HOLIDAYS — All can read, Admin can write
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'public_holidays') THEN
        ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow public access" ON public.public_holidays;
        DROP POLICY IF EXISTS "Allow authenticated access" ON public.public_holidays;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.public_holidays;
        DROP POLICY IF EXISTS "Enable insert for all users" ON public.public_holidays;
        DROP POLICY IF EXISTS "Enable update for all users" ON public.public_holidays;
        DROP POLICY IF EXISTS "Enable delete for all users" ON public.public_holidays;
        DROP POLICY IF EXISTS "Holidays: read" ON public.public_holidays;
        DROP POLICY IF EXISTS "Holidays: admin write" ON public.public_holidays;

        CREATE POLICY "Holidays: read"
        ON public.public_holidays FOR SELECT TO authenticated
        USING (true);

        CREATE POLICY "Holidays: admin write"
        ON public.public_holidays FOR ALL TO authenticated
        USING ((select public.get_user_role()) = 'admin')
        WITH CHECK ((select public.get_user_role()) = 'admin');
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 11. LEADS — Admin/Manager/Supervisor only
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
        ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow public access" ON public.leads;
        DROP POLICY IF EXISTS "Allow authenticated access" ON public.leads;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.leads;
        DROP POLICY IF EXISTS "Enable insert for all users" ON public.leads;
        DROP POLICY IF EXISTS "Enable update for all users" ON public.leads;
        DROP POLICY IF EXISTS "Enable delete for all users" ON public.leads;
        DROP POLICY IF EXISTS "Leads: role access" ON public.leads;

        CREATE POLICY "Leads: role access"
        ON public.leads FOR ALL TO authenticated
        USING ((select public.get_user_role()) IN ('admin', 'manager', 'supervisor'))
        WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager', 'supervisor'));
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 12. AUDIT LOGS — Admin read-only, no writes from client
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow public access" ON public.audit_logs;
        DROP POLICY IF EXISTS "Allow authenticated access" ON public.audit_logs;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.audit_logs;
        DROP POLICY IF EXISTS "Enable insert for all users" ON public.audit_logs;
        DROP POLICY IF EXISTS "Enable update for all users" ON public.audit_logs;
        DROP POLICY IF EXISTS "Enable delete for all users" ON public.audit_logs;
        DROP POLICY IF EXISTS "AuditLogs: admin read" ON public.audit_logs;

        CREATE POLICY "AuditLogs: admin read"
        ON public.audit_logs FOR SELECT TO authenticated
        USING ((select public.get_user_role()) = 'admin');
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 13. BLOCK OLD APP_CREDENTIALS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_credentials') THEN
        ALTER TABLE public.app_credentials ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.app_credentials;
        DROP POLICY IF EXISTS "Block public access" ON public.app_credentials;
        DROP POLICY IF EXISTS "AppCreds: blocked" ON public.app_credentials;

        CREATE POLICY "AppCreds: blocked"
        ON public.app_credentials FOR ALL USING (false);
    END IF;
END $$;
