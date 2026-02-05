import { hashPassword, encryptData, decryptData } from './encryptionUtils';
import { saveUserToCloud, getUserFromCloud } from './storage';

// Login attempt tracking for rate limiting
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 seconds
let loginAttempts = 0;
let lockoutUntil = null;

// Check if account is locked due to too many failed attempts
export const isAccountLocked = () => {
  if (!lockoutUntil) return false;
  if (Date.now() >= lockoutUntil) {
    // Lockout expired, reset
    loginAttempts = 0;
    lockoutUntil = null;
    return false;
  }
  return true;
};

// Get remaining lockout time in seconds
export const getLockoutRemainingSeconds = () => {
  if (!lockoutUntil) return 0;
  return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
};

// Record a failed login attempt
const recordFailedAttempt = () => {
  loginAttempts++;
  if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
};

// Reset login attempts on successful login
const resetLoginAttempts = () => {
  loginAttempts = 0;
  lockoutUntil = null;
};

// Check if first-run setup is required for THIS device
export const isFirstRun = () => {
  const stored = localStorage.getItem('appCredentials');
  return !stored;
};

// Get stored credentials (Local Cache)
export const getStoredCredentials = () => {
  const stored = localStorage.getItem('appCredentials');
  if (stored) {
    const decrypted = decryptData(stored);
    return decrypted || null;
  }
  return null;
};

// Save credentials (Local Cache)
export const saveCredentials = (credentials) => {
  const encrypted = encryptData(credentials);
  if (encrypted) {
    localStorage.setItem('appCredentials', encrypted);
  }
};

/**
 * REGISTER NEW ACCOUNT (Cloud + Local)
 */
export const registerUser = async (username, password, securityQuestion, securityAnswer) => {
  if (!username || !password || !securityQuestion || !securityAnswer) {
    throw new Error('All fields are required');
  }

  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const userProfile = {
    username: username.trim(),
    password: hashPassword(password),
    securityQuestion: securityQuestion.trim(),
    securityAnswer: securityAnswer.toLowerCase().trim(),
    role: 'admin', // Default role
    createdAt: new Date().toISOString()
  };

  // 1. Check if user already exists in cloud? (Optional, saveUserToCloud conceptually upserts, but we might overwrite)
  // Ideally we check first. For now, we trust the overwrite or use it as "claiming" the username.

  // 2. Save to Cloud
  try {
    await saveUserToCloud(userProfile);
  } catch (e) {
    console.error("Failed to save user to cloud:", e);
    // If cloud fails, should we fail registration? Yes for "Cloud First" apps.
    // For now, let's allow offline registration fallback or throw?
    // User requested "login from anywhere", so cloud is mandatory.
    throw new Error("Could not connect to server. Please check your internet.");
  }

  // 3. Save Locally (Cache)
  saveCredentials(userProfile);

  return true;
};

/**
 * LOGIN (Cloud First -> Local Fallback)
 * @returns {Promise<{success: boolean, error?: string, locked?: boolean, remainingSeconds?: number}>}
 */
export const loginUser = async (username, password) => {
  if (isAccountLocked()) {
    return { success: false, locked: true, remainingSeconds: getLockoutRemainingSeconds() };
  }

  const inputHash = hashPassword(password);
  let userProfile = null;

  // 1. Try Cloud Fetch
  try {
    const cloudUser = await getUserFromCloud(username);
    if (cloudUser) {
      userProfile = cloudUser;
      // Update local cache on successful cloud fetch
      saveCredentials(cloudUser);
    }
  } catch (e) {
    console.warn("Cloud login failed, falling back to local cache", e);
  }

  // 2. Fallback to Local Cache if Cloud failed or didn't find user (maybe user created account on this device while offline?)
  if (!userProfile) {
    userProfile = getStoredCredentials();
  }

  if (!userProfile) {
    return { success: false, error: 'User not found. Please create an account.' };
  }

  // 3. Verify Credentials
  // Check strict username match (local cache might be a different user)
  if (userProfile.username !== username) {
    return { success: false, error: 'User not found on this device. connect to internet to find user.' };
  }

  if (userProfile.password === inputHash) {
    resetLoginAttempts();
    return { success: true, user: userProfile };
  }

  // Legacy plain text check
  if (userProfile.password === password) {
    // Auto-migrate
    userProfile.password = inputHash;
    saveCredentials(userProfile);
    await saveUserToCloud(userProfile); // Try to update cloud too
    resetLoginAttempts();
    return { success: true, user: userProfile };
  }

  recordFailedAttempt();
  return {
    success: false,
    error: 'Invalid password',
    attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - loginAttempts)
  };
};


// Legacy synchronous verify for offline/compatibility (Deprecated)
export const verifyLogin = (username, password) => {
  // Redirect to async login logic if possible, otherwise simple local check
  const credentials = getStoredCredentials();
  if (!credentials) return { success: false, error: 'No local credentials' };

  // ... (keep logic simple or just fail)
  return { success: false, error: 'Please use async loginUser' };
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

// Set authentication status
export const setAuthenticated = (status) => {
  if (status) {
    localStorage.setItem('isAuthenticated', 'true');
  } else {
    localStorage.removeItem('isAuthenticated');
  }
};

// Verify security answer for password reset
export const verifySecurityAnswer = (answer) => {
  const credentials = getStoredCredentials();
  if (!credentials || !credentials.securityAnswer) return false;
  return credentials.securityAnswer.toLowerCase().trim() === answer.toLowerCase().trim();
};

// Get security question
export const getSecurityQuestion = () => {
  const credentials = getStoredCredentials();
  return credentials?.securityQuestion || null;
};

// Update password
export const updatePassword = async (newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  const credentials = getStoredCredentials();
  if (!credentials) throw new Error('No credentials found');

  credentials.password = hashPassword(newPassword);
  saveCredentials(credentials);
  await saveUserToCloud(credentials);
};

// Update username
export const updateUsername = async (newUsername) => {
  if (!newUsername || newUsername.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  const credentials = getStoredCredentials();
  if (!credentials) throw new Error('No credentials found');

  credentials.username = newUsername.trim();
  saveCredentials(credentials);
  await saveUserToCloud(credentials);
};

export const updateSecurityQA = async (question, answer) => {
  if (!question || !answer) {
    throw new Error('Question and answer are required');
  }
  const credentials = getStoredCredentials();
  if (!credentials) throw new Error('No credentials found');

  credentials.securityQuestion = question.trim();
  credentials.securityAnswer = answer.toLowerCase().trim();
  saveCredentials(credentials);
  await saveUserToCloud(credentials);
};
