-- ⚠️ DANGER: THIS SCRIPT DELETES ALL DATA FROM THE SYSTEM ⚠️
-- Run this in the Supabase SQL Editor to reset the entire application.

BEGIN;

-- Truncate all tables (cascades not usually needed if no relationships, but good practice)
TRUNCATE TABLE contractors RESTART IDENTITY;
TRUNCATE TABLE sites RESTART IDENTITY;
TRUNCATE TABLE timesheets RESTART IDENTITY;
TRUNCATE TABLE pay_rates RESTART IDENTITY;
TRUNCATE TABLE public_holidays RESTART IDENTITY;
TRUNCATE TABLE training_releases RESTART IDENTITY;
TRUNCATE TABLE audit_logs RESTART IDENTITY;
TRUNCATE TABLE payment_summaries RESTART IDENTITY;
TRUNCATE TABLE app_credentials RESTART IDENTITY; -- This deletes all User Accounts!

COMMIT;

-- Verification
SELECT 
    (SELECT count(*) FROM contractors) as contractors_count,
    (SELECT count(*) FROM app_credentials) as users_count,
    (SELECT count(*) FROM timesheets) as timesheets_count;
