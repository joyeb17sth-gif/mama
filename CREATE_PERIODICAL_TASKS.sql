-- The SitalPayslip application uses an encrypted JSON blob storage pattern.
-- Tables require id (TEXT), data (TEXT), and updated_at (TIMESTAMP) columns.

CREATE TABLE IF NOT EXISTS public.periodical_tasks (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.periodical_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access" ON public.periodical_tasks;
CREATE POLICY "Allow public access" ON public.periodical_tasks FOR ALL USING (true) WITH CHECK (true);
