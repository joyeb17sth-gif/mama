-- WARNING: Running this script will immediately block the current live app from accessing data
-- because the live app relies on unauthenticated, public access.
-- ONLY run this script in your Supabase SQL Editor when you are ready to test the new secure Auth system.

-- 1. Create Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profile Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'admin'); -- Defaulting to admin for this specific use case (or 'user')
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Lock down existing tables to Authenticated Users ONLY

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename IN (
            'contractors', 'sites', 'timesheets', 'pay_rates', 
            'training_releases', 'audit_logs', 'payment_summaries', 
            'public_holidays', 'global_rates'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        
        -- Drop the old dangerously permissive policy
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON public.%I;', t_name);
        
        -- Create the new secure policy
        EXECUTE format('CREATE POLICY "Allow authenticated access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t_name);
    END LOOP;
END $$;

-- 4. Secure the old app_credentials table (if it exists) so it doesn't leak data
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_credentials') THEN
        ALTER TABLE public.app_credentials ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public access" ON public.app_credentials;
        -- Nobody should access this anymore directly from the client without tight restriction
        CREATE POLICY "Block public access" ON public.app_credentials FOR ALL USING (false);
    END IF;
END $$;
