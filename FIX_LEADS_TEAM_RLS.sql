-- Fix to allow leads_team to manage global leads configuration (Counselors, Reports, etc.)
-- This extends the "leads_admin" policy to also include "leads_team"

DROP POLICY IF EXISTS "leads_admin" ON public.leads;

CREATE POLICY "leads_admin" ON public.leads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'leads_team')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'leads_team')
    )
  );

-- Also ensure leads_team can manage the lead_status_history table
DROP POLICY IF EXISTS "lead_history_admin" ON public.lead_status_history;

CREATE POLICY "lead_history_admin" ON public.lead_status_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'leads_team')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'leads_team')
    )
  );
