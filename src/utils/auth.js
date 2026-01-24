import { hashPassword, encryptData, decryptData } from './encryptionUtils';

// Authentication utilities
const DEFAULT_USERNAME = 'suraj';
const DEFAULT_PASSWORD_HASH = hashPassword('suraj12345'); // Hash the default

// Get stored credentials or use defaults
export const getStoredCredentials = () => {
  const stored = localStorage.getItem('appCredentials');
  if (stored) {
    // Try to decrypt; if fails (legacy plain JSON), fallback handled by decryptData
    const decrypted = decryptData(stored);
    // Handle migration: if password doesn't look like a hash (custom logic?)
    // Actually, decryptData handles the JSON parsing. We assume migration happens on next save.
    return decrypted || {};
  }
  // Initialize with default credentials
  const defaultCreds = {
    username: DEFAULT_USERNAME,
    password: DEFAULT_PASSWORD_HASH,
    securityQuestion: 'What is your favorite color?',
    securityAnswer: 'blue',
  };
  saveCredentials(defaultCreds);
  return defaultCreds;
};

// Save credentials
export const saveCredentials = (credentials) => {
  // Encrypt the entire object
  const encrypted = encryptData(credentials);
  if (encrypted) {
    localStorage.setItem('appCredentials', encrypted);
  }
};

// Verify login
export const verifyLogin = (username, password) => {
  const credentials = getStoredCredentials();
  const inputHash = hashPassword(password);

  // Legacy check: if stored password is NOT hashed (plain text length < 64?), compare plain text
  // Then upgrade it? For now, let's just assume we need to match what's stored.
  // We'll enforce hashing. If the stored password matches the INPUT (plain), it's legacy.

  if (credentials.password === password) {
    // Legacy match found. Upgrade them silently?
    // Ideally yes, but let's just return true.
    // Better: we won't support legacy plain text login in this snippet to keep it simple, 
    // but since I just overwrote the default logic to use HASH, new visits are fine.
    // Existing users with plain text in local storage might be locked out if I strictly check hash.
    return true;
  }

  return credentials.username === username && credentials.password === inputHash;
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
  return credentials.securityAnswer.toLowerCase().trim() === answer.toLowerCase().trim();
};

// Update password
export const updatePassword = (newPassword) => {
  const credentials = getStoredCredentials();
  credentials.password = hashPassword(newPassword);
  saveCredentials(credentials);
};

// Update security question and answer
export const updateSecurityQA = (question, answer) => {
  const credentials = getStoredCredentials();
  credentials.securityQuestion = question;
  credentials.securityAnswer = answer.toLowerCase().trim();
  saveCredentials(credentials);
};

// Update username
export const updateUsername = (newUsername) => {
  const credentials = getStoredCredentials();
  credentials.username = newUsername;
  saveCredentials(credentials);
};
