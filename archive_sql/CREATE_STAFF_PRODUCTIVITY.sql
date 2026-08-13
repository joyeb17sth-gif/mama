-- ============================================================
-- SQL SCRIPT: CREATE STAFF PRODUCTIVITY TABLE
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_productivity_reports (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.staff_productivity_reports ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write to the table
DROP POLICY IF EXISTS "Allow public access" ON public.staff_productivity_reports;
CREATE POLICY "Allow public access" 
ON public.staff_productivity_reports 
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- End of script
