-- ============================================================
-- THE ULTIMATE ADMIN FIX
-- Run this in your Supabase SQL Editor
-- ============================================================

-- If the table was empty, the previous UPDATE wouldn't affect anything!
-- This query grabs your user account directly from the auth system 
-- and FORCES an 'admin' profile to be created or updated for you.

INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET role = 'admin';

-- Verify it worked (you should see at least 1 row now!):
SELECT email, role FROM public.profiles;
