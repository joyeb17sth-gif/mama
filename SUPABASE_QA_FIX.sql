-- ============================================================
-- QA FIX: Secure the new user trigger default role
-- Run this in your Supabase SQL Editor
-- ============================================================
-- CRITICAL FIX: The old trigger defaulted ALL new users to 'admin' role.
-- This fix changes it to 'user' so self-registered users (if any)
-- don't get admin access.

-- 1. Fix the trigger function to default new users to 'user' role
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself doesn't need to be recreated since the function body changed in place.
-- But for safety, recreate it:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- NOTE: This does NOT affect existing users. Their roles in the
-- profiles table remain unchanged. Only NEW signups get 'user'.
-- ============================================================
