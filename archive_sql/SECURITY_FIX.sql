-- ============================================================
-- SECURITY_FIX.sql
-- Run this in Supabase Dashboard > SQL Editor
-- This hardens RLS policies WITHOUT touching any data.
-- ============================================================


-- =========================
-- PART 1: PROFILES TABLE
-- =========================

-- 1a. Fix the role constraint to include 'leads_team'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'supervisor', 'manager', 'payslip_management', 'leads_team', 'user'));

-- 1b. Drop ALL existing profile policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_only" ON public.profiles;

-- 1c. SELECT: any authenticated user can read all profiles (needed for UI)
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 1d. INSERT: any authenticated user can insert their OWN profile (auto-profile on signup)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 1e. UPDATE: users can update their own row BUT only admins can change the role column
--     Strategy: allow self-update only if role stays the same; admins can change anything
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    -- The user is keeping their own role unchanged
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- =========================
-- PART 2: DATA TABLES
-- Harden: sites, contractors, timesheets, pay_rates,
--         training_releases, payment_summaries,
--         public_holidays, periodical_tasks, global_rates,
--         staff_productivity_reports
-- Pattern: authenticated can READ; only admin can WRITE
-- =========================

DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN SELECT unnest(ARRAY[
        'contractors', 'sites', 'timesheets', 'pay_rates',
        'training_releases', 'payment_summaries',
        'public_holidays', 'periodical_tasks', 'global_rates',
        'staff_productivity_reports'
    ]) LOOP
        -- Drop old permissive policies
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON public.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I;', t_name);

        -- SELECT: any authenticated user can read
        EXECUTE format('
            DROP POLICY IF EXISTS "%s_select_auth" ON public.%I;
            CREATE POLICY "%s_select_auth" ON public.%I
              FOR SELECT TO authenticated USING (true);
        ', t_name, t_name, t_name, t_name);

        -- INSERT: admin only
        EXECUTE format('
            DROP POLICY IF EXISTS "%s_insert_admin" ON public.%I;
            CREATE POLICY "%s_insert_admin" ON public.%I
              FOR INSERT TO authenticated
              WITH CHECK (
                EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin'')
              );
        ', t_name, t_name, t_name, t_name);

        -- UPDATE: admin only
        EXECUTE format('
            DROP POLICY IF EXISTS "%s_update_admin" ON public.%I;
            CREATE POLICY "%s_update_admin" ON public.%I
              FOR UPDATE TO authenticated
              USING (
                EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin'')
              )
              WITH CHECK (
                EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin'')
              );
        ', t_name, t_name, t_name, t_name);

        -- DELETE: admin only
        EXECUTE format('
            DROP POLICY IF EXISTS "%s_delete_admin" ON public.%I;
            CREATE POLICY "%s_delete_admin" ON public.%I
              FOR DELETE TO authenticated
              USING (
                EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin'')
              );
        ', t_name, t_name, t_name, t_name);
    END LOOP;
END $$;


-- =========================
-- PART 3: PROFIT & LOSS TABLE
-- Same pattern: read for auth, write for admin
-- =========================

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.profit_loss;
DROP POLICY IF EXISTS "Allow public access" ON public.profit_loss;
DROP POLICY IF EXISTS "profit_loss_all" ON public.profit_loss;

CREATE POLICY "profit_loss_select" ON public.profit_loss
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profit_loss_insert_admin" ON public.profit_loss
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profit_loss_update_admin" ON public.profit_loss
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profit_loss_delete_admin" ON public.profit_loss
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- =========================
-- PART 4: LEADS TABLE
-- Already properly scoped — consultant sees own, admin sees all.
-- No changes needed. Just verifying existing policies are intact.
-- =========================

-- (No modifications to leads or lead_status_history policies)


-- =========================
-- PART 5: STORAGE BUCKET (scope-files)
-- Already has proper policies — no changes needed.
-- =========================


-- =========================
-- VERIFICATION
-- Run this to confirm policies are in place
-- =========================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
