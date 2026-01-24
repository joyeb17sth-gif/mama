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
  // We store the whole array as one record for easy transition, 
  // or we could store row by row. Moving as one record for now to match current logic.
  await saveToCloud('contractors', 'main_list', contractors);
};
export const getContractorsAsync = () => getSingleFromCloud('contractors', 'main_list');

// --- SITES ---
export const saveSites = async (sites) => {
  await saveToCloud('sites', 'main_list', sites);
};
export const getSitesAsync = () => getSingleFromCloud('sites', 'main_list');

// --- TIMESHEETS ---
export const saveTimesheets = async (timesheets) => {
  await saveToCloud('timesheets', 'main_list', timesheets);
};
export const getTimesheetsAsync = () => getSingleFromCloud('timesheets', 'main_list');

// --- PAY RATES ---
export const savePayRates = async (rates) => {
  await saveToCloud('pay_rates', 'main_list', rates);
};
export const getPayRatesAsync = () => getSingleFromCloud('pay_rates', 'main_list');

// --- TRAINING RELEASES ---
export const saveTrainingReleases = async (releases) => {
  await saveToCloud('training_releases', 'main_list', releases);
};
export const getTrainingReleasesAsync = () => getSingleFromCloud('training_releases', 'main_list');

// --- AUDIT LOGS ---
export const saveAuditLogs = async (logs) => {
  await saveToCloud('audit_logs', 'main_list', logs);
};
export const getAuditLogsAsync = () => getSingleFromCloud('audit_logs', 'main_list');

// --- CREDENTIALS ---
export const saveCredentialsCloud = async (creds) => {
  await saveToCloud('app_credentials', 'main', creds);
};
export const getCredentialsCloud = () => getSingleFromCloud('app_credentials', 'main');


/** 
 * LEGACY / SYNCHRONOUS FALLBACKS 
 * (These are kept for UI compatibility but should ideally be updated to Async)
 */
export const getContractors = () => {
  const stored = localStorage.getItem('contractors');
  return (stored ? decryptData(stored) : null) || [];
};

export const getSites = () => {
  const stored = localStorage.getItem('sites');
  return (stored ? decryptData(stored) : null) || [];
};

export const getSiteAllocations = () => {
  const stored = localStorage.getItem('siteAllocations');
  return (stored ? decryptData(stored) : null) || [];
};

export const getTimesheets = () => {
  const stored = localStorage.getItem('timesheets');
  return (stored ? decryptData(stored) : null) || [];
};

export const getPayRates = () => {
  const stored = localStorage.getItem('payRates');
  return (stored ? decryptData(stored) : null) || [];
};

export const getTrainingReleases = () => {
  const stored = localStorage.getItem('trainingReleases');
  return (stored ? decryptData(stored) : null) || [];
};

export const getAuditLogs = () => {
  const stored = localStorage.getItem('auditLogs');
  return (stored ? decryptData(stored) : null) || [];
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
