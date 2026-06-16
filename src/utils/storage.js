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
  globalRates: { ...DEFAULT_GLOBAL_RATES },
  profitLoss: [],
  profiles: null,
  leads: []
};

export const syncMetadata = {};

// Error callback for save failures — App.jsx hooks into this to show toast
let _onSaveError = null;
export const setOnSaveError = (callback) => { _onSaveError = callback; };

// Initialize the storage on app start
export const initStorage = async () => {
  try {
    const storedMetadata = await localforage.getItem('sync_metadata');
    if (storedMetadata) {
      Object.assign(syncMetadata, storedMetadata);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error("Error loading sync metadata:", e);
  }

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
  const { data: responseData, error } = await supabase
    .from(table)
    .upsert({ id, data: encrypted })
    .select('updated_at')
    .single();

  if (error) {
    console.error(`Cloud sync failed for ${table}:`, error);
    if (_onSaveError) _onSaveError(`Failed to sync data to cloud. Changes saved locally.`);
    return false;
  }

  if (responseData && responseData.updated_at) {
    const cacheKey = `${table}_${id}`;
    syncMetadata[cacheKey] = responseData.updated_at;
    await localforage.setItem('sync_metadata', syncMetadata);
  }
  return true;
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
  try {
    // 1. Fetch only the updated_at timestamp to see if cloud has newer data
    const { data: cloudRow, error: timeError } = await supabase
      .from(table)
      .select('updated_at')
      .eq('id', id)
      .single();

    if (timeError || !cloudRow) {
      // Row doesn't exist yet, or other read issue: fall back to normal fetch
      const { data, error } = await supabase
        .from(table)
        .select('data, updated_at')
        .eq('id', id)
        .single();

      if (error) return null;
      
      const decrypted = decryptData(data.data);
      if (data.updated_at) {
        const cacheKey = `${table}_${id}`;
        syncMetadata[cacheKey] = data.updated_at;
        await localforage.setItem('sync_metadata', syncMetadata);
      }
      return decrypted;
    }

    const cloudTimestamp = cloudRow.updated_at;
    const cacheKey = `${table}_${id}`;
    const localTimestamp = syncMetadata[cacheKey];

    // If local version matches or is newer, skip download and return undefined to signal "no change"
    if (localTimestamp && cloudTimestamp) {
      const localTime = new Date(localTimestamp).getTime();
      const cloudTime = new Date(cloudTimestamp).getTime();
      if (localTime >= cloudTime) {
        return undefined;
      }
    }

    // 2. Otherwise (no timestamp or older), fetch the actual data blob
    const { data, error } = await supabase
      .from(table)
      .select('data, updated_at')
      .eq('id', id)
      .single();

    if (error) return null;

    if (data.updated_at) {
      syncMetadata[cacheKey] = data.updated_at;
      await localforage.setItem('sync_metadata', syncMetadata);
    }
    return decryptData(data.data);
  } catch (err) {
    if (import.meta.env.DEV) console.error(`Error in getSingleFromCloud for ${table}:`, err);
    return null;
  }
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
  // Audit logging removed to minimize Supabase egress
};
export const getAuditLogsAsync = () => Promise.resolve(undefined);
export const getAuditLogs = () => [];

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

// --- PROFIT & LOSS ---
export const saveProfitLoss = async (data) => {
  memoryCache.profitLoss = data;
  await localforage.setItem('profitLoss', encryptData(data));
  await saveToCloud('profit_loss', 'main_list', data);
};
export const getProfitLossAsync = () => getSingleFromCloud('profit_loss', 'main_list');
export const getProfitLoss = () => memoryCache.profitLoss;

// --- LEADS ---
export const saveLeads = async (leads) => {
  memoryCache.leads = leads;
  await localforage.setItem('leads', encryptData(leads));
  await saveToCloud('leads', 'main_list', leads);
};
export const getLeadsAsync = () => getSingleFromCloud('leads', 'main_list');
export const getLeads = () => memoryCache.leads;



// --- ACTIONS LOGGING ---
export const logAction = async (action, details, user = null) => {
  // Audit logging removed completely to eliminate Supabase egress/storage usage
};

// --- PROFILES CACHE & FETCH ---
export const getProfilesAsync = async (forceRefresh = false) => {
  if (memoryCache.profiles && !forceRefresh) {
    return memoryCache.profiles;
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    memoryCache.profiles = data || [];
    return memoryCache.profiles;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching profiles:", err);
    return memoryCache.profiles || [];
  }
};

export const clearProfilesCache = () => {
  memoryCache.profiles = null;
};

// Clear all sync timestamps to force a full re-download on next sync
export const clearSyncTimestamps = async () => {
  Object.keys(syncMetadata).forEach(key => delete syncMetadata[key]);
  await localforage.removeItem('sync_metadata');
};
