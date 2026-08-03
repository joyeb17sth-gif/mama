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
  profitLoss: null,
  profiles: null,
  leads: [],
  payscleep_lead_reports_v2: [],
  payscleep_lead_counselors_v3: []
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
const saveToCloud = async (table, id, data, consultantId = null) => {
  const encrypted = encryptData(data);
  const payload = { id, data: encrypted };
  if (consultantId) {
    payload.consultant_id = consultantId;
  }
  
  const { data: responseData, error } = await supabase
    .from(table)
    .upsert(payload)
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

// --- PROFIT & LOSS (Multi-Company) ---
// Data shape: { version: 2, profiles: [...], companies: { companyId: [...periods] } }
// Backward compat: if loaded data is an old-style array, it gets auto-migrated.

const DEFAULT_PL_PROFILES = [
  { id: 'seetal_management', name: 'Seetal Management', type: 'site_based', color: '#0075de', icon: 'building' },
  { id: 'search_education_australia', name: 'Search Education Australia', type: 'income_expense', color: '#7c3aed', icon: 'graduation' },
  { id: 'search_education_chile', name: 'Search Education Chile', type: 'income_expense', color: '#7c3aed', icon: 'graduation' },
  { id: 'search_education_nepal', name: 'Search Education Nepal', type: 'income_expense', color: '#7c3aed', icon: 'graduation' },
  { id: 'astra', name: 'Astra', type: 'astra', color: '#f59e0b', icon: 'building' },
  { id: 'medisafe', name: 'Medisafe', type: 'cogs_based', color: '#059669', icon: 'medical' },
];

export const migrateProfitLossData = (raw) => {
  // Already new format
  if (raw && raw.version === 2 && raw.profiles && raw.companies) {
    if (raw.companies.search_education && !raw.companies.search_education_australia) {
      raw.companies.search_education_australia = raw.companies.search_education;
      delete raw.companies.search_education;
    }
    raw.profiles = [...DEFAULT_PL_PROFILES];
    if (!raw.companies.search_education_australia) raw.companies.search_education_australia = [];
    if (!raw.companies.search_education_chile) raw.companies.search_education_chile = [];
    if (!raw.companies.search_education_nepal) raw.companies.search_education_nepal = [];
    if (!raw.companies.astra) raw.companies.astra = [];
    if (!raw.companies.medisafe) raw.companies.medisafe = [];
    return raw;
  }
  // Old format: an array of periods — migrate to Seetal Management
  if (Array.isArray(raw)) {
    return {
      version: 2,
      profiles: [...DEFAULT_PL_PROFILES],
      companies: {
        seetal_management: raw,
        search_education_australia: [],
        search_education_chile: [],
        search_education_nepal: [],
        astra: [],
        medisafe: [],
      },
    };
  }
  // Empty / null
  return {
    version: 2,
    profiles: [...DEFAULT_PL_PROFILES],
    companies: {
      seetal_management: [],
      search_education_australia: [],
      search_education_chile: [],
      search_education_nepal: [],
      astra: [],
      medisafe: [],
    },
  };
};

export const saveProfitLoss = async (data) => {
  const migrated = migrateProfitLossData(data);
  memoryCache.profitLoss = migrated;
  await localforage.setItem('profitLoss', encryptData(migrated));
  await saveToCloud('profit_loss', 'main_list', migrated);
};
export const getProfitLossAsync = () => getSingleFromCloud('profit_loss', 'main_list');
export const getProfitLoss = () => {
  const raw = memoryCache.profitLoss;
  return migrateProfitLossData(raw);
};

// --- LEADS ---
export const saveLeads = async (leads) => {
  memoryCache.leads = leads;
  await localforage.setItem('leads', encryptData(leads));
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;
    
    // Check if user is Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    const isAdmin = profile?.role === 'admin';
    
    if (isAdmin) {
      // Group leads by consultantId (fallback to admin's ID if unassigned)
      const grouped = leads.reduce((acc, lead) => {
        const cid = lead.consultantId || userId;
        if (!acc[cid]) acc[cid] = [];
        acc[cid].push(lead);
        return acc;
      }, {});
      
      // Save each group to its respective row
      for (const cid in grouped) {
        await saveToCloud('leads', 'user_' + cid, grouped[cid], cid);
      }
    } else {
      // Consultant: force all leads to belong to them and save to their row
      const myLeads = leads.map(l => ({ ...l, consultantId: userId }));
      await saveToCloud('leads', 'user_' + userId, myLeads, userId);
    }
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error saving leads to cloud:", err);
    if (_onSaveError) _onSaveError('Failed to sync leads to cloud. Changes saved locally.');
  }
};

export const getLeadsAsync = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const userId = session.user.id;
    
    // Check if user is Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    const isAdmin = profile?.role === 'admin';
    
    if (isAdmin) {
      // Fetch all rows for Admin
      const { data, error } = await supabase.from('leads').select('data, consultant_id');
      if (error) return null;
      
      let allLeads = [];
      data.forEach(row => {
        const decrypted = decryptData(row.data);
        if (Array.isArray(decrypted)) {
          // Ensure consultantId is stamped on the objects if not already
          const tagged = decrypted.map(l => ({ ...l, consultantId: l.consultantId || row.consultant_id }));
          allLeads = [...allLeads, ...tagged];
        }
      });
      return allLeads;
    } else {
      // Fetch single row for Consultant
      const myLeads = await getSingleFromCloud('leads', 'user_' + userId);
      if (myLeads && Array.isArray(myLeads)) {
        return myLeads.map(l => ({ ...l, consultantId: userId }));
      }
      return myLeads;
    }
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching leads from cloud:", err);
    return null;
  }
};

export const getLeads = () => memoryCache.leads;

// --- LEAD REPORTS (Global) ---
export const saveLeadReports = async (reports) => {
  memoryCache.payscleep_lead_reports_v2 = reports;
  await localforage.setItem('payscleep_lead_reports_v2', encryptData(reports));
  await saveToCloud('leads', 'payscleep_lead_reports_v2', reports);
};
export const getLeadReportsAsync = () => getSingleFromCloud('leads', 'payscleep_lead_reports_v2');
export const getLeadReports = () => memoryCache.payscleep_lead_reports_v2 || [];

// --- LEAD COUNSELORS (Global) ---
export const saveLeadCounselors = async (counselors) => {
  memoryCache.payscleep_lead_counselors_v3 = counselors;
  await localforage.setItem('payscleep_lead_counselors_v3', encryptData(counselors));
  await saveToCloud('leads', 'payscleep_lead_counselors_v3', counselors);
};
export const getLeadCounselorsAsync = () => getSingleFromCloud('leads', 'payscleep_lead_counselors_v3');
export const getLeadCounselors = () => memoryCache.payscleep_lead_counselors_v3 || [];


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
