-- This script ensures the Supabase database automatically sets the `updated_at` time using the SERVER's clock instead of the device's clock.
-- This fixes syncing issues between devices with different clock times (e.g. PC vs Mobile).

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply the trigger to all relevant tables
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'contractors', 
        'sites', 
        'timesheets', 
        'pay_rates', 
        'training_releases', 
        'audit_logs', 
        'payment_summaries', 
        'app_credentials',
        'public_holidays',
        'global_rates',
        'periodical_tasks'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Drop if it exists to avoid duplicates
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
        
        -- Create the trigger
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at()', t);
    END LOOP;
END $$;
