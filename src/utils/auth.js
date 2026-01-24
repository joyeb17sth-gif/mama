// Authentication utilities
const DEFAULT_USERNAME = 'suraj';
const DEFAULT_PASSWORD = 'suraj12345';

// Get stored credentials or use defaults
export const getStoredCredentials = () => {
  const stored = localStorage.getItem('appCredentials');
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with default credentials
  const defaultCreds = {
    username: DEFAULT_USERNAME,
    password: DEFAULT_PASSWORD,
    securityQuestion: 'What is your favorite color?',
    securityAnswer: 'blue',
  };
  saveCredentials(defaultCreds);
  return defaultCreds;
};

// Save credentials
export const saveCredentials = (credentials) => {
  localStorage.setItem('appCredentials', JSON.stringify(credentials));
};

// Verify login
export const verifyLogin = (username, password) => {
  const credentials = getStoredCredentials();
  return credentials.username === username && credentials.password === password;
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
  credentials.password = newPassword;
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
