-- 1. Create Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT TO authenticated USING (true);


-- 2. Create Data Tables
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
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(''utc''::text, now())
            );
            ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Allow public access" ON public.%I;
            CREATE POLICY "Allow public access" ON public.%I FOR ALL USING (true) WITH CHECK (true);
        ', t_name, t_name, t_name, t_name);
    END LOOP;
END $$;
