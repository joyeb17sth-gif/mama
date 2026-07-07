-- Enhanced Role-Based Access Control (RBAC) for Seetal Management
-- WARNING: This replaces the generic "USING (true)" policies with stricter checks.

-- 1. Create a helper function to get the current user's role efficiently
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 2. Apply strict policies for Periodical Tasks
ALTER TABLE public.periodical_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated access" ON public.periodical_tasks;

-- Admins and Supervisors can see and edit all tasks
CREATE POLICY "Admins and Supervisors have full access to tasks" 
ON public.periodical_tasks 
FOR ALL 
TO authenticated 
USING (auth.user_role() IN ('admin', 'supervisor', 'manager'));

-- Normal users can only view and update tasks assigned to them
CREATE POLICY "Users can access assigned tasks" 
ON public.periodical_tasks 
FOR SELECT 
TO authenticated 
USING (assigned_to = (SELECT email FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update assigned tasks" 
ON public.periodical_tasks 
FOR UPDATE 
TO authenticated 
USING (assigned_to = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- 3. Apply strict policies for Sites
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated access" ON public.sites;

-- Only Admins and Supervisors can manage sites
CREATE POLICY "Admins and Supervisors can manage sites" 
ON public.sites 
FOR ALL 
TO authenticated 
USING (auth.user_role() IN ('admin', 'supervisor', 'manager'));

-- Users can view sites but not edit them
CREATE POLICY "Users can view sites" 
ON public.sites 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Apply strict policies for Profit & Loss
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profit_loss') THEN
        ALTER TABLE public.profit_loss ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow authenticated access" ON public.profit_loss;
        
        -- ONLY Admins can access Profit & Loss data
        CREATE POLICY "Only admins can access P&L" 
        ON public.profit_loss 
        FOR ALL 
        TO authenticated 
        USING (auth.user_role() = 'admin');
    END IF;
END $$;
