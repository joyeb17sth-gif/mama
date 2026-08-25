-- =========================================================================================
-- MASTER SUPABASE SETUP SCRIPT
-- =========================================================================================
-- Use this single file to initialize either your local or live Supabase environment.
-- It contains ALL necessary tables, constraints, secure RLS policies, triggers, and buckets.
-- =========================================================================================

-- =========================
-- 1. PROFILES TABLE & AUTH
-- =========================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user'::text,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'supervisor', 'manager', 'payslip_management', 'leads_team', 'user'));

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_only" ON public.profiles;

-- Secure Policies for Profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Auto-create profile trigger on signup
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

-- Sync any missing auth.users into profiles
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;


-- =========================
-- 2. CORE DATA TABLES
-- =========================

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT unnest(ARRAY[
        'contractors', 'sites', 'timesheets', 'pay_rates', 
        'training_releases', 'audit_logs', 'payment_summaries', 
        'public_holidays', 'periodical_tasks', 'global_rates',
        'staff_productivity_reports', 'profit_loss'
    ]) LOOP
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS public.%I (
                id TEXT PRIMARY KEY,
                data TEXT,
                updated_at TIMESTAMPTZ DEFAULT timezone(''utc''::text, now())
            );
            ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
            
            -- Drop old insecure policies
            DROP POLICY IF EXISTS "Allow public access" ON public.%I;
            DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I;
            DROP POLICY IF EXISTS "profit_loss_all" ON public.%I;
            
            -- Recreate secure policies
            DROP POLICY IF EXISTS "%I_select_auth" ON public.%I;
            CREATE POLICY "%I_select_auth" ON public.%I
              FOR SELECT TO authenticated USING (true);
              
            DROP POLICY IF EXISTS "%I_insert_admin" ON public.%I;
            CREATE POLICY "%I_insert_admin" ON public.%I
              FOR INSERT TO authenticated
              WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''));
              
            DROP POLICY IF EXISTS "%I_update_admin" ON public.%I;
            CREATE POLICY "%I_update_admin" ON public.%I
              FOR UPDATE TO authenticated
              USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))
              WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''));
              
            DROP POLICY IF EXISTS "%I_delete_admin" ON public.%I;
            CREATE POLICY "%I_delete_admin" ON public.%I
              FOR DELETE TO authenticated
              USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''));
        ', t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name);
    END LOOP;
END $$;


-- =========================
-- 3. LEADS & LEAD HISTORY
-- =========================

CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    consultant_id UUID
);

-- Ensure the column exists if the table was created previously without it
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS consultant_id UUID;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_consultant_id_fkey;

-- Clean orphan rows and fix existing consultant_id
DO $$
DECLARE
    valid_admin UUID;
BEGIN
    SELECT p.id INTO valid_admin FROM public.profiles p JOIN auth.users u ON p.id = u.id WHERE p.role = 'admin' LIMIT 1;
    IF valid_admin IS NOT NULL THEN
        UPDATE public.leads SET id = 'user_' || valid_admin::text, consultant_id = valid_admin WHERE id = 'main_list';
    ELSE
        DELETE FROM public.leads WHERE id = 'main_list';
    END IF;
    DELETE FROM public.leads WHERE consultant_id IS NOT NULL AND consultant_id NOT IN (SELECT id FROM auth.users);
END $$;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_consultant_id_fkey
  FOREIGN KEY (consultant_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for authenticated users on leads" ON public.leads;
DROP POLICY IF EXISTS "Consultants can manage their own leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public access" ON public.leads;
DROP POLICY IF EXISTS "leads_consultant" ON public.leads;
DROP POLICY IF EXISTS "leads_admin" ON public.leads;

-- Lead Policies
CREATE POLICY "leads_consultant" ON public.leads
  FOR ALL TO authenticated
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "leads_admin" ON public.leads
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Lead Status History
CREATE TABLE IF NOT EXISTS public.lead_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT,
    changed_at TIMESTAMPTZ DEFAULT now(),
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_history_consultant" ON public.lead_status_history;
DROP POLICY IF EXISTS "lead_history_admin" ON public.lead_status_history;

CREATE POLICY "lead_history_consultant" ON public.lead_status_history
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_status_history.lead_id AND leads.consultant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_status_history.lead_id AND leads.consultant_id = auth.uid()));

CREATE POLICY "lead_history_admin" ON public.lead_status_history
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));


-- =========================
-- 4. STORAGE BUCKETS
-- =========================

INSERT INTO storage.buckets (id, name, public)
VALUES ('scope_files', 'scope_files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access for scope files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload for scope files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update for scope files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete for scope files" ON storage.objects;

CREATE POLICY "Public Access for scope files" ON storage.objects FOR SELECT USING (bucket_id = 'scope_files');
CREATE POLICY "Authenticated Upload for scope files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scope_files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update for scope files" ON storage.objects FOR UPDATE USING (bucket_id = 'scope_files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete for scope files" ON storage.objects FOR DELETE USING (bucket_id = 'scope_files' AND auth.role() = 'authenticated');


-- =========================
-- 5. RLS SELECT HARDENING  (Audit §3.1)
-- =========================
-- Section 2 above creates a permissive `<t>_select_auth ... USING (true)` SELECT policy on
-- every core table, which would let ANY authenticated account read all payroll / PII /
-- financial rows. This section REPLACES those SELECT policies with role predicates that
-- mirror the app's own permission model (src/App.jsx hasPermission / Layout nav):
--   * Facilities data (sites, periodical_tasks) ....... admin, supervisor, manager
--   * Financial / payroll / PII (all other tables) .... admin only
--   * profiles ........................................ own row always; admin reads all
-- INSERT/UPDATE/DELETE stay admin-only (unchanged). leads/lead_status_history keep their
-- existing row-scoped consultant/admin(+leads_team) policies and are not touched here.
-- (This is identical to the standalone FIX_RLS_SELECT_POLICIES.sql — keep the two in sync.)

-- Role-lookup helper. SECURITY DEFINER so its read bypasses RLS: this is required, else the
-- profiles SELECT policy below (which checks for admin) would recurse on profiles.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DO $$
DECLARE
    t_name text;
    admin_only text[] := ARRAY[
        'contractors', 'timesheets', 'pay_rates', 'training_releases',
        'audit_logs', 'payment_summaries', 'public_holidays', 'global_rates',
        'staff_productivity_reports', 'profit_loss'
    ];
    facilities text[] := ARRAY['sites', 'periodical_tasks'];
BEGIN
    FOREACH t_name IN ARRAY admin_only LOOP
        EXECUTE format($fmt$
            DROP POLICY IF EXISTS %1$I ON public.%2$I;
            CREATE POLICY %1$I ON public.%2$I
              FOR SELECT TO authenticated
              USING (public.current_user_role() = 'admin');
        $fmt$, t_name || '_select_auth', t_name);
    END LOOP;

    FOREACH t_name IN ARRAY facilities LOOP
        EXECUTE format($fmt$
            DROP POLICY IF EXISTS %1$I ON public.%2$I;
            CREATE POLICY %1$I ON public.%2$I
              FOR SELECT TO authenticated
              USING (public.current_user_role() IN ('admin', 'supervisor', 'manager'));
        $fmt$, t_name || '_select_auth', t_name);
    END LOOP;
END $$;

-- profiles: own row always (needed for login role resolution); admin sees all (User Management).
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.current_user_role() = 'admin'
  );
