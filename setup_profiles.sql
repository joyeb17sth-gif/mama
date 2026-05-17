-- Run this in your Supabase Dashboard > SQL Editor

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'supervisor', 'manager', 'payslip_management', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Allow authenticated users to read all profiles
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 4. Allow admins to insert profiles
CREATE POLICY "Allow insert for authenticated"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Allow admins to update profiles  
CREATE POLICY "Allow update for authenticated"
ON public.profiles FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Insert the two user profiles
INSERT INTO public.profiles (id, email, role) VALUES
    ('af953812-7498-416b-8e0c-2a22a0173134', 'jungjoyeb@gmail.com', 'admin'),
    ('5773f327-12d1-411b-9883-f7920cdad4ce', 'joyeb17sth@gmail.com', 'payslip_management')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- 7. Auto-create profile on new user signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
