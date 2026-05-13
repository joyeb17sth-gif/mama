import { supabase } from './supabaseClient';
import { encryptData, decryptData } from './encryptionUtils';
import localforage from 'localforage';

localforage.config({
  name: 'SitalPayslip',
  storeName: 'app_data'
});

export const DEFAULT_GLOBAL_RATES = { allowancePerHour: 2.80, otherPerDay: 10.00 };

export const memoryCache = {
  contractors: [],
  sites: [],
  siteAllocations: [],
  timesheets: [],
  payRates: [],
  trainingReleases: [],
  auditLogs: [],
  paymentSummaries: [],
  publicHolidays: [],
  periodicalTasks: [],
  globalRates: { ...DEFAULT_GLOBAL_RATES }
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

  if (error && import.meta.env.DEV) console.error(`Error saving to ${table}:`, error);
};

// Helper to get all data from a Supabase table
const getFromCloud = async (table) => {
  const { data, error } = await supabase
    .from(table)
    .select('data');

  if (error) {
    if (import.meta.env.DEV) console.error(`Error fetching from ${table}:`, error);
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

// --- PERIODICAL TASKS ---
export const savePeriodicalTasks = async (tasks) => {
  memoryCache.periodicalTasks = tasks;
  await localforage.setItem('periodicalTasks', encryptData(tasks));
  await saveToCloud('periodical_tasks', 'main_list', tasks);
};
export const getPeriodicalTasksAsync = () => getSingleFromCloud('periodical_tasks', 'main_list');
export const getPeriodicalTasks = () => memoryCache.periodicalTasks;

// --- GLOBAL RATES (Allowance per hour, Other per day) ---
export const saveGlobalRates = async (rates) => {
  memoryCache.globalRates = rates;
  await localforage.setItem('globalRates', encryptData(rates));
  await saveToCloud('global_rates', 'main_list', rates);
};
export const getGlobalRatesAsync = () => getSingleFromCloud('global_rates', 'main_list');
export const getGlobalRates = () => ({ ...DEFAULT_GLOBAL_RATES, ...(memoryCache.globalRates || {}) });



// --- ACTIONS LOGGING ---
export const logAction = async (action, details, user = null) => {
  let finalUser = user;
  if (!finalUser || finalUser === 'Admin') {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        finalUser = session.user.email;
      } else {
        finalUser = 'System';
      }
    } catch(e) {
      finalUser = 'System';
    }
  }

  const newLog = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    user: finalUser,
    action,
    details
  };

  try {
    // Fetch the absolute latest logs from the cloud directly to prevent concurrency overwrite issues
    const cloudLogs = await getSingleFromCloud('audit_logs', 'main_list');
    
    let latestLogs = [];
    if (cloudLogs && Array.isArray(cloudLogs)) {
      latestLogs = cloudLogs;
    } else {
      latestLogs = [...getAuditLogs()];
    }

    // Prepend the new log
    latestLogs.unshift(newLog);

    // Calculate the date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Filter to only keep logs from the last 90 days
    let filteredLogs = latestLogs.filter(log => {
      try {
        return new Date(log.timestamp) >= ninetyDaysAgo;
      } catch (e) {
        return true; // if parsing fails, keep it just in case
      }
    });

    // Keep unbounded growth in check - e.g., max 2000 items as secondary fallback
    const trimmedLogs = filteredLogs.slice(0, 2000);

    // Save back to cloud, localforage, and update cache
    await saveAuditLogs(trimmedLogs);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error writing audit log safely:", err);
    // Fallback to purely local append
    const logs = [...getAuditLogs()];
    logs.unshift(newLog);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let filteredLogs = logs.filter(log => {
      try {
        return new Date(log.timestamp) >= ninetyDaysAgo;
      } catch (e) {
        return true;
      }
    });

    saveAuditLogs(filteredLogs.slice(0, 2000));
  }
};
