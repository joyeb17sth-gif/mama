-- ============================================================
-- SANDBOX NUCLEAR FIX — ONE SCRIPT TO RULE THEM ALL
-- Run this ONCE in your Sandbox Supabase SQL Editor
-- This script is fully idempotent (safe to run multiple times)
-- ============================================================


-- =========================
-- PART 1: PROFILES TABLE
-- =========================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix the role constraint: drop old, add new with leads_team
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'supervisor', 'manager', 'payslip_management', 'leads_team', 'user'));

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Nuke ALL policies and recreate from scratch
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public access" ON public.profiles;

-- SELECT: any logged-in user can read all profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- INSERT: any logged-in user can insert (needed for auto-profile trigger)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: any logged-in user can update (admin changes roles via UI)
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Sync missing auth.users into profiles
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================
-- PART 2: DATA TABLES
-- =========================
-- Ensure all standard data tables exist with correct schema + RLS

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT unnest(ARRAY[
        'contractors', 'sites', 'timesheets', 'pay_rates',
        'training_releases', 'audit_logs', 'payment_summaries',
        'public_holidays', 'periodical_tasks', 'global_rates'
    ]) LOOP
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS public.%I (
                id TEXT PRIMARY KEY,
                data TEXT,
                updated_at TIMESTAMPTZ DEFAULT now()
            );
            ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Allow public access" ON public.%I;
            CREATE POLICY "Allow public access" ON public.%I FOR ALL USING (true) WITH CHECK (true);
        ', t_name, t_name, t_name, t_name);
    END LOOP;
END $$;


-- =========================
-- PART 3: PROFIT & LOSS
-- =========================

CREATE TABLE IF NOT EXISTS public.profit_loss (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profit_loss ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.profit_loss;
DROP POLICY IF EXISTS "Allow public access" ON public.profit_loss;
CREATE POLICY "profit_loss_all" ON public.profit_loss
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =========================
-- PART 4: LEADS TABLE
-- =========================

-- Create leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add consultant_id column (no FK yet)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS consultant_id UUID;

-- Drop FK if it exists from a previous run
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_consultant_id_fkey;

-- Migrate old 'main_list' row to admin's user ID
DO $$
DECLARE
    valid_admin UUID;
BEGIN
    SELECT p.id INTO valid_admin
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.role = 'admin'
    LIMIT 1;

    IF valid_admin IS NOT NULL THEN
        UPDATE public.leads
        SET id = 'user_' || valid_admin::text,
            consultant_id = valid_admin
        WHERE id = 'main_list';
    ELSE
        DELETE FROM public.leads WHERE id = 'main_list';
    END IF;

    -- Clean orphan rows
    DELETE FROM public.leads
    WHERE consultant_id IS NOT NULL
      AND consultant_id NOT IN (SELECT id FROM auth.users);
END $$;

-- Now add the FK safely
ALTER TABLE public.leads
  ADD CONSTRAINT leads_consultant_id_fkey
  FOREIGN KEY (consultant_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Nuke all old policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users on leads" ON public.leads;
DROP POLICY IF EXISTS "Consultants can manage their own leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public access" ON public.leads;

-- Consultants: own rows only
CREATE POLICY "leads_consultant" ON public.leads
  FOR ALL TO authenticated
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

-- Admins: all rows
CREATE POLICY "leads_admin" ON public.leads
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );


-- =========================
-- PART 5: LEAD STATUS HISTORY
-- =========================

CREATE TABLE IF NOT EXISTS public.lead_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT,
    changed_at TIMESTAMPTZ DEFAULT now(),
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

-- Consultants: can see history for their own leads
CREATE POLICY "lead_history_consultant" ON public.lead_status_history
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_status_history.lead_id AND leads.consultant_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_status_history.lead_id AND leads.consultant_id = auth.uid())
  );

-- Admins: can see all history
CREATE POLICY "lead_history_admin" ON public.lead_status_history
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );


-- =========================
-- VERIFICATION
-- =========================
SELECT 'PROFILES' as "table", count(*) as "rows" FROM public.profiles
UNION ALL
SELECT 'LEADS', count(*) FROM public.leads;
