import { supabase } from './supabaseClient';

// Login attempt tracking for rate limiting (UI level)
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 seconds
let loginAttempts = 0;
let lockoutUntil = null;

export const isAccountLocked = () => {
  if (!lockoutUntil) return false;
  if (Date.now() >= lockoutUntil) {
    loginAttempts = 0;
    lockoutUntil = null;
    return false;
  }
  return true;
};

export const getLockoutRemainingSeconds = () => {
  if (!lockoutUntil) return 0;
  return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
};

const recordFailedAttempt = () => {
  loginAttempts++;
  if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
};

const resetLoginAttempts = () => {
  loginAttempts = 0;
  lockoutUntil = null;
};

export const isFirstRun = () => {
  return localStorage.getItem('isFirstRunComplete') !== 'true';
};

export const completeFirstRun = () => {
  localStorage.setItem('isFirstRunComplete', 'true');
};

/**
 * REGISTER NEW ACCOUNT (Supabase Auth)
 */
export const registerUser = async (email, password) => {
  if (!email || !password) throw new Error('Email and password are required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password
  });

  if (error) {
    let safeMessage = 'Registration failed. Please try again.';
    if (error.message.includes('already registered')) safeMessage = 'This email is already registered.';
    if (error.message.toLowerCase().includes('password')) safeMessage = error.message; // Allow password complexity rules
    throw new Error(safeMessage);
  }
  completeFirstRun();
  return true;
};

/**
 * LOGIN (Supabase Auth)
 */
export const loginUser = async (email, password) => {
  if (isAccountLocked()) {
    return { success: false, locked: true, remainingSeconds: getLockoutRemainingSeconds() };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) {
    recordFailedAttempt();
    
    // Sanitize error to prevent backend leakage
    let safeMessage = 'Invalid login credentials.';
    if (error.message.includes('Email not confirmed')) {
        safeMessage = 'Email not confirmed. Please check your inbox.';
    }
    
    return { 
      success: false, 
      error: safeMessage,
      attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - loginAttempts)
    };
  }

  resetLoginAttempts();

  completeFirstRun();
  return { success: true, user: data.user };
};

export const logoutUser = async () => {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Supabase signOut error:', e);
  }
};

export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

export const setAuthenticated = (status) => {
    // No-op. Session state is managed by Supabase Auth now.
};

export const resetPasswordForEmail = async (email) => {
  if (!email) throw new Error('Email is required');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin + '/reset-password',
  });
  if (error) throw new Error(error.message);
};

export const updatePassword = async (newPassword) => {
  if (!newPassword || newPassword.length < 6) throw new Error('Password must be at least 6 characters');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
};

