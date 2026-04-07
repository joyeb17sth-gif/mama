import { supabase } from './supabaseClient';
import { encryptData, decryptData } from './encryptionUtils';
import localforage from 'localforage';

localforage.config({
  name: 'SitalPayslip',
  storeName: 'app_data'
});

export const memoryCache = {
  contractors: [],
  sites: [],
  siteAllocations: [],
  timesheets: [],
  payRates: [],
  trainingReleases: [],
  auditLogs: [],
  paymentSummaries: [],
  publicHolidays: []
};

// Initialize the storage on app start
export const initStorage = async () => {
  const keys = Object.keys(memoryCache);
  for (const key of keys) {
    let stored = await localforage.getItem(key);
    
    // Migration from old localStorage
    if (!stored) {
      const legacyStored = localStorage.getItem(key);
      if (legacyStored) {
        await localforage.setItem(key, legacyStored);
        stored = legacyStored;
        // Clean up small local storage but keeping it clean
        localStorage.removeItem(key);
      }
    }

    if (stored) {
      const decrypted = decryptData(stored);
      // For some keys it might be null, default to empty array
      memoryCache[key] = (decrypted || []).filter ? (decrypted || []).filter(Boolean) : (decrypted || []);
    } else {
      memoryCache[key] = [];
    }
  }
};

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
  memoryCache.contractors = contractors;
  await localforage.setItem('contractors', encryptData(contractors));
  await saveToCloud('contractors', 'main_list', contractors);
};
export const getContractorsAsync = () => getSingleFromCloud('contractors', 'main_list');
export const getContractors = () => memoryCache.contractors;

// --- SITES ---
export const saveSites = async (sites) => {
  memoryCache.sites = sites;
  await localforage.setItem('sites', encryptData(sites));
  await saveToCloud('sites', 'main_list', sites);
};
export const getSitesAsync = () => getSingleFromCloud('sites', 'main_list');
export const getSites = () => memoryCache.sites;

// --- SITE ALLOCATIONS ---
export const getSiteAllocations = () => memoryCache.siteAllocations;

// --- TIMESHEETS ---
export const saveTimesheets = async (timesheets) => {
  memoryCache.timesheets = timesheets;
  await localforage.setItem('timesheets', encryptData(timesheets));
  await saveToCloud('timesheets', 'main_list', timesheets);
};
export const getTimesheetsAsync = () => getSingleFromCloud('timesheets', 'main_list');
export const getTimesheets = () => memoryCache.timesheets;

// --- PAY RATES ---
export const savePayRates = async (rates) => {
  memoryCache.payRates = rates;
  await localforage.setItem('payRates', encryptData(rates));
  await saveToCloud('pay_rates', 'main_list', rates);
};
export const getPayRatesAsync = () => getSingleFromCloud('pay_rates', 'main_list');
export const getPayRates = () => memoryCache.payRates;

// --- TRAINING RELEASES ---
export const saveTrainingReleases = async (releases) => {
  memoryCache.trainingReleases = releases;
  await localforage.setItem('trainingReleases', encryptData(releases));
  await saveToCloud('training_releases', 'main_list', releases);
};
export const getTrainingReleasesAsync = () => getSingleFromCloud('training_releases', 'main_list');
export const getTrainingReleases = () => memoryCache.trainingReleases;

// --- AUDIT LOGS ---
export const saveAuditLogs = async (logs) => {
  memoryCache.auditLogs = logs;
  await localforage.setItem('auditLogs', encryptData(logs));
  await saveToCloud('audit_logs', 'main_list', logs);
};
export const getAuditLogsAsync = () => getSingleFromCloud('audit_logs', 'main_list');
export const getAuditLogs = () => memoryCache.auditLogs;

// --- PAYMENT SUMMARIES ---
export const savePaymentSummaries = async (summaries) => {
  memoryCache.paymentSummaries = summaries;
  await localforage.setItem('paymentSummaries', encryptData(summaries));
  await saveToCloud('payment_summaries', 'main_list', summaries);
};
export const getPaymentSummariesAsync = () => getSingleFromCloud('payment_summaries', 'main_list');
export const getPaymentSummaries = () => memoryCache.paymentSummaries;

// --- PUBLIC HOLIDAYS ---
export const savePublicHolidays = async (holidays) => {
  memoryCache.publicHolidays = holidays;
  await localforage.setItem('publicHolidays', encryptData(holidays));
  await saveToCloud('public_holidays', 'main_list', holidays);
};
export const getPublicHolidaysAsync = () => getSingleFromCloud('public_holidays', 'main_list');
export const getPublicHolidays = () => memoryCache.publicHolidays;


// --- USERS / CREDENTIALS ---

export const saveUserToCloud = async (userProfile) => {
  await saveToCloud('app_credentials', userProfile.username, userProfile);
};

export const getUserFromCloud = async (username) => {
  return await getSingleFromCloud('app_credentials', username);
};

export const saveCredentialsCloud = async (creds) => {
  await saveToCloud('app_credentials', 'main', creds);
};
export const getCredentialsCloud = () => getSingleFromCloud('app_credentials', 'main');

// --- ACTIONS LOGGING ---
export const logAction = (action, details, user = null) => {
  let finalUser = user;
  if (!finalUser || finalUser === 'Admin') {
    try {
      const stored = localStorage.getItem('appCredentials');
      if (stored) {
        const dec = decryptData(stored);
        finalUser = (dec && dec.username) ? dec.username : 'Unknown User';
      } else {
        finalUser = 'System';
      }
    } catch(e) {
      finalUser = 'System';
    }
  }

  const logs = [...getAuditLogs()];
  const newLog = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    user: finalUser,
    action,
    details
  };
  logs.unshift(newLog);
  saveAuditLogs(logs); // uses the new function which updates cache, localforage and cloud
};
