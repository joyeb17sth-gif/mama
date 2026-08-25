-- SECURE_RLS_POLICIES.sql
-- This script replaces the vulnerable "USING (true)" SELECT policies with strict role-based access control.

-- Helper function to fetch the current user's role securely without triggering infinite recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. Profiles Table
-- Users should only be able to read their own profile, UNLESS they are an admin.
DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
CREATE POLICY "profiles_select_auth" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR public.get_my_role() = 'admin'
  );

-- 2. Financial / Highly Sensitive Tables (Admin only)
-- These tables contain PII, payroll, and company financials.
DROP POLICY IF EXISTS "contractors_select_auth" ON public.contractors;
CREATE POLICY "contractors_select_auth" ON public.contractors
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profit_loss_select_auth" ON public.profit_loss;
CREATE POLICY "profit_loss_select_auth" ON public.profit_loss
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "staff_productivity_reports_select_auth" ON public.staff_productivity_reports;
CREATE POLICY "staff_productivity_reports_select_auth" ON public.staff_productivity_reports
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

-- Other orphaned legacy financial tables (lock them down too just in case)
DROP POLICY IF EXISTS "timesheets_select_auth" ON public.timesheets;
CREATE POLICY "timesheets_select_auth" ON public.timesheets
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "pay_rates_select_auth" ON public.pay_rates;
CREATE POLICY "pay_rates_select_auth" ON public.pay_rates
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "training_releases_select_auth" ON public.training_releases;
CREATE POLICY "training_releases_select_auth" ON public.training_releases
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "payment_summaries_select_auth" ON public.payment_summaries;
CREATE POLICY "payment_summaries_select_auth" ON public.payment_summaries
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

-- 3. Operations Tables (Admin, Supervisor, Manager)
DROP POLICY IF EXISTS "sites_select_auth" ON public.sites;
CREATE POLICY "sites_select_auth" ON public.sites
  FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'supervisor', 'manager'));

DROP POLICY IF EXISTS "periodical_tasks_select_auth" ON public.periodical_tasks;
CREATE POLICY "periodical_tasks_select_auth" ON public.periodical_tasks
  FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'supervisor', 'manager'));

-- 4. Leads Table
-- Leads are already locked down for write, but SELECT needs to be restricted to admins, leads_team, and the consultant who owns the lead.
DROP POLICY IF EXISTS "leads_select_auth" ON public.leads;
CREATE POLICY "leads_select_auth" ON public.leads
  FOR SELECT TO authenticated
  USING (
    id = 'user_' || auth.uid() OR
    public.get_my_role() IN ('admin', 'leads_team')
  );
