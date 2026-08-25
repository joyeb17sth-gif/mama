-- =========================================================================================
-- FIX: RLS SELECT POLICY HARDENING   (Audit finding §3.1 — Broken read access control)
-- =========================================================================================
-- Apply this in the Supabase SQL editor AGAINST AN ALREADY-PROVISIONED database (one that
-- was set up with DATABASE_MASTER_SETUP.sql). For fresh setups the same hardening now lives
-- at the end of DATABASE_MASTER_SETUP.sql (Section 5) — keep the two in sync if you edit one.
--
-- ── PROBLEM ──────────────────────────────────────────────────────────────────────────────
-- DATABASE_MASTER_SETUP.sql gives every core table a SELECT policy of:
--
--     CREATE POLICY "<t>_select_auth" ON public.<t>
--       FOR SELECT TO authenticated USING (true);
--
-- `USING (true)` means ANY authenticated account — including a self-registered `user` who
-- sees no navigation in the UI — can call the Supabase REST/JS API directly and read EVERY
-- row of payroll, PII (bank BSB / account numbers), and financial tables. The client-side
-- hasPermission() gate (src/App.jsx) is cosmetic; it is NOT enforced at the data layer. And
-- the client-side AES "encryption" does not help: the key is inlined into the browser bundle
-- (§3.2), so any authenticated user can fetch the blobs and decrypt them.
--
-- ── FIX ──────────────────────────────────────────────────────────────────────────────────
-- Replace each `USING (true)` SELECT policy with a role predicate that mirrors the
-- application's own permission model (src/App.jsx `hasPermission` and src/components/Layout.jsx
-- nav gating):
--
--     Facilities data (sites, periodical_tasks) .......... admin, supervisor, manager
--     Financial / payroll / PII (all other core tables) .. admin only
--     profiles ........................................... own row always; admin reads all
--
-- INSERT / UPDATE / DELETE policies are already admin-only and are NOT touched here — this is
-- purely a confidentiality (read) fix.
--
-- ── SCOPE / NOT CHANGED ────────────────────────────────────────────────────────────────────
--  * public.leads / public.lead_status_history already have correct row-scoped policies
--    (consultant sees own rows; admin + leads_team see all — see FIX_LEADS_TEAM_RLS.sql) and
--    are intentionally left as-is. NOTE: the branchPerformance_* / sydneySalesSummary_* blobs
--    are stored inside the leads table under fixed ids, so they remain readable by leads_team.
--    Tightening that (moving those datasets to their own tables) is tracked as a separate item.
--  * The `payslip_management` role is granted nothing here on purpose: the entire
--    payslip / timesheet / contractor subsystem is currently archived (legacy/, unreachable),
--    so those tables (contractors, timesheets, pay_rates, training_releases, payment_summaries,
--    public_holidays, global_rates) have NO live readers and are locked to admin. If that
--    subsystem is ever revived, grant payslip_management SELECT on the relevant tables then.
--
-- IDEMPOTENT: safe to run multiple times.
-- =========================================================================================


-- -----------------------------------------------------------------------------------------
-- 1. Role-lookup helper (SECURITY DEFINER)
-- -----------------------------------------------------------------------------------------
-- Returns the current user's role from profiles. Marked SECURITY DEFINER so its internal
-- read bypasses RLS. This is REQUIRED: without it, a SELECT policy on `profiles` that itself
-- queries `profiles` would recurse ("infinite recursion detected in policy for relation
-- profiles"). It also makes the admin check on every other table cheaper and consistent.
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


-- -----------------------------------------------------------------------------------------
-- 2. Core-table SELECT policies (replace the USING(true) policies)
-- -----------------------------------------------------------------------------------------
DO $$
DECLARE
    t_name text;
    -- Financial / payroll / PII: admin only.
    admin_only text[] := ARRAY[
        'contractors', 'timesheets', 'pay_rates', 'training_releases',
        'audit_logs', 'payment_summaries', 'public_holidays', 'global_rates',
        'staff_productivity_reports', 'profit_loss'
    ];
    -- Facilities data used by the Sites / Task Matrix screens: admin + supervisor + manager.
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


-- -----------------------------------------------------------------------------------------
-- 3. profiles SELECT policy
-- -----------------------------------------------------------------------------------------
-- Every authenticated user must read their OWN profile row — the app resolves the user's
-- role from it at login (src/App.jsx:319, src/utils/storage.js). Only admin may read all
-- rows (the User Management directory: src/utils/storage.js getProfilesAsync).
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.current_user_role() = 'admin'
  );


-- -----------------------------------------------------------------------------------------
-- 4. Verification (optional — run manually, read-only)
-- -----------------------------------------------------------------------------------------
-- List every SELECT policy and its USING clause so you can confirm none still say `true`:
--
--   SELECT tablename, policyname, qual
--   FROM pg_policies
--   WHERE schemaname = 'public' AND cmd = 'SELECT'
--   ORDER BY tablename, policyname;
--
-- Manual smoke test: sign in as a non-admin (e.g. a `user` account) and confirm that
--   SELECT * FROM public.profit_loss;   -- returns 0 rows
--   SELECT * FROM public.profiles;      -- returns ONLY that user's own row
-- while an admin still sees everything.
