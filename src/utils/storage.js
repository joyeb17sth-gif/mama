import { supabase } from './supabaseClient';
import { encryptData, decryptData } from './encryptionUtils';

// Helper to save data to Supabase
const saveToCloud = async (table, id, data) => {
  const encrypted = encryptData(data);
  const { error } = await supabase
    .from(table)
    .upsert({ id, data: encrypted, updated_at: new Date() });

  if (error) console.error(`Error saving to ${table}:`, error);
};

// Helper to get all data from a Supabase table
const getFromCloud = async (table) => {
  const { data, error } = await supabase
    .from(table)
    .select('data');

  if (error) {
    console.error(`Error fetching from ${table}:`, error);
    return [];
  }

  return data.map(item => decryptData(item.data)).filter(Boolean);
};

// Helper for single record tables (like credentials or global settings)
const getSingleFromCloud = async (table, id) => {
  const { data, error } = await supabase
    .from(table)
    .select('data')
    .eq('id', id)
    .single();

  if (error) return null;
  return decryptData(data.data);
};

// --- CONTRACTORS ---
export const saveContractors = async (contractors) => {
  localStorage.setItem('contractors', encryptData(contractors));
  await saveToCloud('contractors', 'main_list', contractors);
};
export const getContractorsAsync = () => getSingleFromCloud('contractors', 'main_list');

// --- SITES ---
export const saveSites = async (sites) => {
  localStorage.setItem('sites', encryptData(sites));
  await saveToCloud('sites', 'main_list', sites);
};
export const getSitesAsync = () => getSingleFromCloud('sites', 'main_list');

// --- TIMESHEETS ---
export const saveTimesheets = async (timesheets) => {
  localStorage.setItem('timesheets', encryptData(timesheets));
  await saveToCloud('timesheets', 'main_list', timesheets);
};
export const getTimesheetsAsync = () => getSingleFromCloud('timesheets', 'main_list');

// --- PAY RATES ---
export const savePayRates = async (rates) => {
  localStorage.setItem('payRates', encryptData(rates));
  await saveToCloud('pay_rates', 'main_list', rates);
};
export const getPayRatesAsync = () => getSingleFromCloud('pay_rates', 'main_list');

// --- TRAINING RELEASES ---
export const saveTrainingReleases = async (releases) => {
  localStorage.setItem('trainingReleases', encryptData(releases));
  await saveToCloud('training_releases', 'main_list', releases);
};
export const getTrainingReleasesAsync = () => getSingleFromCloud('training_releases', 'main_list');

// --- AUDIT LOGS ---
export const saveAuditLogs = async (logs) => {
  await saveToCloud('audit_logs', 'main_list', logs);
};
export const getAuditLogsAsync = () => getSingleFromCloud('audit_logs', 'main_list');

// --- PAYMENT SUMMARIES ---
export const savePaymentSummaries = async (summaries) => {
  localStorage.setItem('paymentSummaries', encryptData(summaries));
  await saveToCloud('payment_summaries', 'main_list', summaries);
};
export const getPaymentSummariesAsync = () => getSingleFromCloud('payment_summaries', 'main_list');

// --- USERS / CREDENTIALS ---
// Replaces single 'main' credential with user-specific rows (id = username)
export const saveUserToCloud = async (userProfile) => {
  // We use the username as the unique ID for the row
  await saveToCloud('app_credentials', userProfile.username, userProfile);
};

export const getUserFromCloud = async (username) => {
  return await getSingleFromCloud('app_credentials', username);
};

export const saveCredentialsCloud = async (creds) => {
  // Legacy support or single-user fallback
  await saveToCloud('app_credentials', 'main', creds);
};
export const getCredentialsCloud = () => getSingleFromCloud('app_credentials', 'main');


// --- PUBLIC HOLIDAYS ---
export const savePublicHolidays = async (holidays) => {
  localStorage.setItem('publicHolidays', encryptData(holidays));
  await saveToCloud('public_holidays', 'main_list', holidays);
};
export const getPublicHolidaysAsync = () => getSingleFromCloud('public_holidays', 'main_list');

/** 
 * LEGACY / SYNCHRONOUS FALLBACKS 
 * (These are kept for UI compatibility but should ideally be updated to Async)
 */
export const getPublicHolidays = () => {
  const stored = localStorage.getItem('publicHolidays');
  return ((stored ? decryptData(stored) : null) || []).filter(Boolean);
};

export const getContractors = () => {
  const stored = localStorage.getItem('contractors');
  return ((stored ? decryptData(stored) : null) || []).filter(Boolean);
};

export const getSites = () => {
  const stored = localStorage.getItem('sites');
  return ((stored ? decryptData(stored) : null) || []).filter(Boolean);
};

export const getSiteAllocations = () => {
  const stored = localStorage.getItem('siteAllocations');
  return ((stored ? decryptData(stored) : null) || []).filter(Boolean);
};

export const getTimesheets = () => {
  const stored = localStorage.getItem('timesheets');
  return ((stored ? decryptData(stored) : null) || []).filter(Boolean);
};

export const getPayRates = () => {
  const stored = localStorage.getItem('payRates');
  return ((stored ? decryptData(stored) : null) || []).filter(Boolean);
};

export const getTrainingReleases = () => {
  const stored = localStorage.getItem('trainingReleases');
  return ((stored ? decryptData(stored) : null) || []).filter(Boolean);
};

export const getAuditLogs = () => {
  const stored = localStorage.getItem('auditLogs');
  return ((stored ? decryptData(stored) : null) || []).filter(Boolean);
};

export const getPaymentSummaries = () => {
  const stored = localStorage.getItem('paymentSummaries');
  return ((stored ? decryptData(stored) : null) || []).filter(Boolean);
};

export const logAction = (action, details, user = 'Admin') => {
  const logs = getAuditLogs();
  const newLog = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    user,
    action,
    details
  };
  logs.unshift(newLog);
  // This logs locally but we should trigger cloud save after
  localStorage.setItem('auditLogs', encryptData(logs));
  saveAuditLogs(logs);
};
