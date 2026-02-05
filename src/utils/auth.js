import { hashPassword, encryptData, decryptData } from './encryptionUtils';

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

// Check if first-run setup is required (no credentials configured)
export const isFirstRun = () => {
  const stored = localStorage.getItem('appCredentials');
  return !stored;
};

// Get stored credentials
export const getStoredCredentials = () => {
  const stored = localStorage.getItem('appCredentials');
  if (stored) {
    const decrypted = decryptData(stored);
    return decrypted || null;
  }
  return null;
};

// Save credentials
export const saveCredentials = (credentials) => {
  const encrypted = encryptData(credentials);
  if (encrypted) {
    localStorage.setItem('appCredentials', encrypted);
  }
};

// Initial setup - create credentials for first time
export const createInitialCredentials = (username, password, securityQuestion, securityAnswer) => {
  if (!username || !password || !securityQuestion || !securityAnswer) {
    throw new Error('All fields are required for initial setup');
  }

  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const credentials = {
    username: username.trim(),
    password: hashPassword(password),
    securityQuestion: securityQuestion.trim(),
    securityAnswer: securityAnswer.toLowerCase().trim(),
  };

  saveCredentials(credentials);
  return true;
};

// Verify login
export const verifyLogin = (username, password) => {
  if (isAccountLocked()) {
    return { success: false, locked: true, remainingSeconds: getLockoutRemainingSeconds() };
  }

  const credentials = getStoredCredentials();
  if (!credentials) {
    return { success: false, error: 'No credentials configured' };
  }

  const inputHash = hashPassword(password);

  // Check credentials
  if (credentials.username === username && credentials.password === inputHash) {
    resetLoginAttempts();
    return { success: true };
  }

  // Legacy plain text password support (for migration)
  if (credentials.username === username && credentials.password === password) {
    // Migrate to hashed password
    credentials.password = inputHash;
    saveCredentials(credentials);
    resetLoginAttempts();
    return { success: true };
  }

  recordFailedAttempt();
  return {
    success: false,
    error: 'Invalid username or password',
    attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - loginAttempts)
  };
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
export const updatePassword = (newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  const credentials = getStoredCredentials();
  if (!credentials) throw new Error('No credentials found');

  credentials.password = hashPassword(newPassword);
  saveCredentials(credentials);
};

// Update security question and answer
export const updateSecurityQA = (question, answer) => {
  if (!question || !answer) {
    throw new Error('Question and answer are required');
  }
  const credentials = getStoredCredentials();
  if (!credentials) throw new Error('No credentials found');

  credentials.securityQuestion = question.trim();
  credentials.securityAnswer = answer.toLowerCase().trim();
  saveCredentials(credentials);
};

// Update username
export const updateUsername = (newUsername) => {
  if (!newUsername || newUsername.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  const credentials = getStoredCredentials();
  if (!credentials) throw new Error('No credentials found');

  credentials.username = newUsername.trim();
  saveCredentials(credentials);
};
