import React, { useState, useEffect } from 'react';
import { parseISO, differenceInDays, addDays, format } from './utils/dateUtils';
import {
  initStorage, memoryCache,
  getSites, saveSites, getSitesAsync,
  getPeriodicalTasks, savePeriodicalTasks, getPeriodicalTasksAsync,
  getProfitLossAsync, migrateProfitLossData,
  getLeads, saveLeads, getLeadsAsync,
  saveLeadReports, getLeadReportsAsync, getLeadReports,
  saveLeadCounselors, getLeadCounselorsAsync, getLeadCounselors,
  logAction,
  clearSyncTimestamps, setOnSaveError
} from './utils/storage';
import { encryptData } from './utils/encryptionUtils';
import localforage from 'localforage';
import { isAuthenticated, isFirstRun, logoutUser } from './utils/auth';
import { supabase } from './utils/supabaseClient';

// Components
import Dashboard from './components/Dashboard';
import SiteForm from './components/SiteForm';
import TaskManagementModal from './components/TaskManagementModal';

import Login from './components/Login';
import Dropdown from './components/Dropdown';
import ForgotPassword from './components/ForgotPassword';
import UserManagement from './components/UserManagement';
import InitialSetup from './components/InitialSetup';
import ErrorBoundary from './components/ErrorBoundary';

import Toast from './components/Toast';
import Layout from './components/Layout';

// Lazy loaded heavy components
const SiteList = React.lazy(() => import('./components/SiteList'));
const TaskMatrix = React.lazy(() => import('./components/TaskMatrix'));
const TaskBudgetMatrix = React.lazy(() => import('./components/TaskBudgetMatrix'));
const ProfitLoss = React.lazy(() => import('./components/ProfitLoss'));
const LeadManager = React.lazy(() => import('./components/LeadManager'));

function App() {
  const [authenticated, setAuthenticatedState] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const [userProfileData, setUserProfileData] = useState({ name: 'Loading...', role: 'user' });
  const [isAdmin, setIsAdmin] = useState(false);

  const hasPermission = (tab) => {
    const role = userProfileData.role?.toLowerCase() || 'user';
    if (role === 'admin') return true;

    if (role === 'supervisor' || role === 'manager') {
      return ['task-matrix', 'sites', 'lead-manager'].includes(tab);
    }

    if (role === 'payslip_management') {
      // Payslip management can access most tabs except task matrix, user management, profit-loss, and settings
      return !['task-matrix', 'users', 'profit-loss', 'settings'].includes(tab);
    }

    if (role === 'leads_team') {
      return ['lead-manager'].includes(tab);
    }

    // Default basic role
    return ['dashboard', 'timesheets'].includes(tab);
  };



  // Sites
  const [sites, setSites] = useState([]);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editingSite, setEditingSite] = useState(null);

  // Periodical Tasks
  const [periodicalTasks, setPeriodicalTasks] = useState([]);
  const [managingTasksSite, setManagingTasksSite] = useState(null);

  // Leads
  const [leads, setLeads] = useState([]);
  const [leadReports, setLeadReports] = useState([]);
  const [leadCounselors, setLeadCounselors] = useState([]);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const visibleSites = React.useMemo(() => {
    return sites;
  }, [sites]);

  const visiblePeriodicalTasks = React.useMemo(() => {
    if (isAdmin) return periodicalTasks;

    const userEmail = userProfileData?.name;
    if (!userEmail || userEmail === 'Loading...') return [];

    // Only show tasks specifically assigned to this user, regardless of whether they are a supervisor or normal user
    return periodicalTasks.filter(t => Array.isArray(t.assignedTo) ? t.assignedTo.includes(userEmail) : t.assignedTo === userEmail);
  }, [periodicalTasks, isAdmin, userProfileData]);

  const syncDataRef = React.useRef(null);

  const syncData = async () => {
    if (!isAuthenticated()) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const role = userProfileData.role?.toLowerCase() || 'user';

      let cloudSites, cloudPeriodicalTasks, cloudProfitLoss, cloudLeads, cloudLeadReports, cloudLeadCounselors;

      const promises = [];
      const promiseKeys = [];

      // Determine what to download based on role
      if (role === 'admin') {
        promises.push(
          getSitesAsync(),
          getPeriodicalTasksAsync(),
          getProfitLossAsync(),
          getLeadsAsync(),
          getLeadReportsAsync(),
          getLeadCounselorsAsync()
        );
        promiseKeys.push(
          'sites',
          'periodicalTasks',
          'profitLoss',
          'leads',
          'leadReports',
          'leadCounselors'
        );
      } else if (role === 'supervisor' || role === 'manager') {
        promises.push(
          getSitesAsync(),
          getPeriodicalTasksAsync(),
          getLeadsAsync(),
          getLeadReportsAsync(),
          getLeadCounselorsAsync()
        );
        promiseKeys.push(
          'sites',
          'periodicalTasks',
          'leads',
          'leadReports',
          'leadCounselors'
        );
      } else if (role === 'leads_team') {
        promises.push(
          getLeadsAsync(),
          getLeadReportsAsync(),
          getLeadCounselorsAsync()
        );
        promiseKeys.push(
          'leads',
          'leadReports',
          'leadCounselors'
        );
      } else {
        // Default users download nothing
      }

      // Only execute parallel call if there are promises to run
      if (promises.length > 0) {
        const results = await Promise.all(promises);
        results.forEach((val, idx) => {
          const key = promiseKeys[idx];
          if (key === 'sites') cloudSites = val;
          else if (key === 'periodicalTasks') cloudPeriodicalTasks = val;
          else if (key === 'profitLoss') cloudProfitLoss = val;
          else if (key === 'leads') cloudLeads = val;
          else if (key === 'leadReports') cloudLeadReports = val;
          else if (key === 'leadCounselors') cloudLeadCounselors = val;
        });
      }

      let hasChanges = false;

      // Update memoryCache + localforage + React state for data types that were queried
      if (cloudSites !== undefined) {
        hasChanges = true;
        if (cloudSites) {
          memoryCache.sites = cloudSites;
          await localforage.setItem('sites', encryptData(cloudSites));
          setSites(cloudSites);
        }
      }

      if (cloudPeriodicalTasks !== undefined) {
        hasChanges = true;
        if (cloudPeriodicalTasks) {
          memoryCache.periodicalTasks = cloudPeriodicalTasks;
          await localforage.setItem('periodicalTasks', encryptData(cloudPeriodicalTasks));
          setPeriodicalTasks(cloudPeriodicalTasks);
        }
      }
      if (cloudProfitLoss !== undefined) {
        hasChanges = true;
        if (cloudProfitLoss) {
          const migratedPL = migrateProfitLossData(cloudProfitLoss);
          memoryCache.profitLoss = migratedPL;
          await localforage.setItem('profitLoss', encryptData(migratedPL));
        }
      }

      if (cloudLeads !== undefined) {
        // Only overwrite local state if cloud returned actual data.
        // An empty array could mean cloud save failed — don't wipe local state.
        if (Array.isArray(cloudLeads) && cloudLeads.length > 0) {
          hasChanges = true;
          memoryCache.leads = cloudLeads;
          await localforage.setItem('leads', encryptData(cloudLeads));
          setLeads(cloudLeads);
        }
      }

      if (cloudLeadReports !== undefined) {
        hasChanges = true;
        if (cloudLeadReports) {
          memoryCache.payscleep_lead_reports_v2 = cloudLeadReports;
          await localforage.setItem('payscleep_lead_reports_v2', encryptData(cloudLeadReports));
          setLeadReports(cloudLeadReports);
        }
      }

      if (cloudLeadCounselors !== undefined) {
        hasChanges = true;
        if (cloudLeadCounselors) {
          memoryCache.payscleep_lead_counselors_v3 = cloudLeadCounselors;
          await localforage.setItem('payscleep_lead_counselors_v3', encryptData(cloudLeadCounselors));
          setLeadCounselors(cloudLeadCounselors);
        }
      }

      // Bump sync version only if at least one data type has actual changes, forcing re-render
      if (hasChanges) {
        setSyncVersion(v => v + 1);
      }

    } catch (e) {
      if (import.meta.env.DEV) console.error('Cloud sync failed', e);
      setSyncError('Sync failed. Working offline.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Force sync: clears stale timestamps and pulls everything fresh from cloud
  const forceSync = async () => {
    await clearSyncTimestamps();
    await syncData();
  };

  React.useEffect(() => {
    syncDataRef.current = syncData;
  }, [syncData]);

  useEffect(() => {
    initStorage().then(() => {
      setIsStorageReady(true);
    });
  }, []);

  // Wire up cloud save error notifications
  useEffect(() => {
    setOnSaveError((msg) => {
      setToastMessage(msg);
      setToastType('error');
      setShowToast(true);
    });
    return () => setOnSaveError(null);
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;

    // Initial setup logic removed - admin accounts managed directly
    /*
    if (isFirstRun()) {
      setShowInitialSetup(true);
      return;
    }
    */

    let intervalId;
    let focusListener;
    let visibilityListener;

    const checkAuth = async () => {
      const authStatus = await isAuthenticated();
      setAuthenticatedState(authStatus);

      if (authStatus) {
        // Fetch user info securely
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const email = session.user.email;
          let role = 'user';

          try {
            const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();

            if (profileError && profileError.code === 'PGRST116') {
              // Profile doesn't exist, create it with default 'user' role
              await supabase.from('profiles').insert({
                id: session.user.id,
                email: email,
                role: 'user'
              });
            } else if (profile && profile.role) {
              role = profile.role;
            }
          } catch (e) {
            if (import.meta.env.DEV) console.error('Profile check failed:', e);
          }
          setUserProfileData({ name: email, role });
          setIsAdmin(role === 'admin');

          const normalizedRole = role.toLowerCase();
          if (normalizedRole === 'supervisor' || normalizedRole === 'manager') {
            setActiveTab(prev => (prev === 'dashboard' ? 'task-matrix' : prev));
          }
        }

        setSites(getSites());
        setPeriodicalTasks(getPeriodicalTasks());
        setLeads(getLeads());

        // Force fresh download on login by clearing stale timestamps, then sync
        if (document.visibilityState === 'visible') {
          clearSyncTimestamps().then(() => syncDataRef.current?.());
        }

        // Active focus / visible trigger
        const triggerSyncIfVisible = () => {
          if (document.visibilityState === 'visible' && syncDataRef.current) {
            syncDataRef.current();
          }
        };

        window.addEventListener('focus', triggerSyncIfVisible);
        document.addEventListener('visibilitychange', triggerSyncIfVisible);

        focusListener = triggerSyncIfVisible;
        visibilityListener = triggerSyncIfVisible;

        // Periodic sync every 30 seconds only if active
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible' && syncDataRef.current) {
            syncDataRef.current();
          }
        }, 30000);
      }
    };

    checkAuth();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (focusListener) window.removeEventListener('focus', focusListener);
      if (visibilityListener) document.removeEventListener('visibilitychange', visibilityListener);
    };
  }, [authenticated, isStorageReady]);



  // Site handlers
  const handleAddSite = () => {
    setEditingSite(null);
    setShowSiteForm(true);
  };

  const handleEditSite = (site) => {
    setEditingSite(site);
    setShowSiteForm(true);
  };

  const handleAddSubSite = (parentSite) => {
    // Create a skeleton site object with the relationship pre-filled
    setEditingSite({
      isSubSite: true,
      parentSiteId: parentSite.id,
      siteName: '', // Let user type name
      clientName: parentSite.clientName // Inherit client by default?
    });
    setShowSiteForm(true);
  };

  const handleSaveSite = async (formData, siteTasks = []) => {
    let siteId = editingSite?.id;
    let newSiteName = formData.siteName;

    if (siteId) {
      const updated = sites.map(s =>
        s.id === siteId ? { ...s, ...formData } : s
      );
      setSites(updated);
      saveSites(updated);
      logAction('UPDATE_SITE', {
        id: siteId,
        name: formData.siteName,
        changes: formData
      });
    } else {
      siteId = crypto.randomUUID();
      const newSite = {
        id: siteId,
        allocatedContractors: [],
        ...formData,
      };
      const updated = [...sites, newSite];
      setSites(updated);
      saveSites(updated);
      logAction('CREATE_SITE', {
        id: newSite.id,
        name: newSite.siteName
      });
    }

    // Process Periodical Tasks for this site
    const tasksToSave = siteTasks.map(t => ({ ...t, siteId }));

    // FETCH LATEST FROM CLOUD BEFORE MERGING TO PREVENT OVERWRITES!
    let currentGlobalTasks = periodicalTasks;
    try {
      const latestCloud = await getPeriodicalTasksAsync();
      if (latestCloud) currentGlobalTasks = latestCloud;
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to fetch latest cloud tasks before merge:', e);
    }

    // Merge into global periodicalTasks (remove old ones for this site, add new ones)
    const otherTasks = isAdmin
      ? currentGlobalTasks.filter(t => t.siteId !== siteId)
      : currentGlobalTasks.filter(t => !(t.siteId === siteId && (Array.isArray(t.assignedTo) ? t.assignedTo.includes(userProfileData.name) : t.assignedTo === userProfileData.name)));
    const updatedPeriodicalTasks = [...otherTasks, ...tasksToSave];

    setPeriodicalTasks(updatedPeriodicalTasks);
    savePeriodicalTasks(updatedPeriodicalTasks);

    setShowSiteForm(false);
    setEditingSite(null);
  };

  const handleDeleteSite = (id) => {
    if (window.confirm('Are you sure you want to delete this site?')) {
      const siteToDelete = sites.find(s => s.id === id);
      const updated = sites.filter(s => s.id !== id);
      setSites(updated);
      saveSites(updated);

      // Cascade: clean up orphaned periodical tasks for this site
      const cleanedTasks = periodicalTasks.filter(t => t.siteId !== id);
      if (cleanedTasks.length !== periodicalTasks.length) {
        setPeriodicalTasks(cleanedTasks);
        savePeriodicalTasks(cleanedTasks);
      }

      logAction('DELETE_SITE', {
        id,
        siteName: siteToDelete?.siteName || 'Unknown Site'
      });
    }
  };

  // Periodical Tasks toggle handler
  const handleToggleTaskStatus = (task, schedule, specificStatus, scopeOfWork, completedHours, completionDate) => {
    let newStatus = specificStatus;
    if (!newStatus) {
      if (schedule.status === 'Scheduled') newStatus = 'Completed';
      else if (schedule.status === 'Completed') newStatus = 'Completed Not Claimed';
      else newStatus = 'Scheduled';
    }

    const updatedTasks = periodicalTasks.map(t => {
      if (t.id === task.id) {
        const updatedSchedules = t.schedules.map(s => {
          if (s.id === schedule.id) {
            const updated = { ...s, status: newStatus, scopeOfWork: scopeOfWork !== undefined ? scopeOfWork : (s.scopeOfWork || '') };
            if (completedHours !== undefined) {
              updated.completedHours = completedHours;
            }
            if (completionDate !== undefined) {
              updated.completionDate = completionDate;
            }
            return updated;
          }
          return s;
        });
        return { ...t, schedules: updatedSchedules };
      }
      return t;
    });

    setPeriodicalTasks(updatedTasks);
    savePeriodicalTasks(updatedTasks);
    logAction('UPDATE_TASK_STATUS', { taskId: task.id, scheduleId: schedule.id, newStatus, scopeOfWork: scopeOfWork || '', completedHours, completionDate });
  };

  const handleUpdateScheduleOverrides = (taskId, scheduleId, overrides) => {
    const updatedTasks = periodicalTasks.map(t => {
      if (t.id === taskId) {
        const updatedSchedules = t.schedules.map(s => {
          if (s.id === scheduleId) {
            // Check if exactDate has changed across month boundaries
            let updatedTargetPeriod = s.targetPeriod;
            if (overrides.exactDate) {
              const newDateStr = overrides.exactDate; // expected yyyy-MM-dd
              const parts = newDateStr.split('-');
              if (parts.length >= 2) {
                updatedTargetPeriod = `${parts[0]}-${parts[1]}`;
              }
            }
            return {
              ...s,
              ...overrides,
              targetPeriod: updatedTargetPeriod
            };
          }
          return s;
        });
        return { ...t, schedules: updatedSchedules };
      }
      return t;
    });

    setPeriodicalTasks(updatedTasks);
    savePeriodicalTasks(updatedTasks);
    logAction('UPDATE_SCHEDULE_OVERRIDES', { taskId, scheduleId, overrides });
  };

  // Lead Manager handler
  const handleSaveLeads = (leadData, actionType) => {
    let updatedLeads;
    if (actionType === 'REPLACE') {
      updatedLeads = leadData; // Full replacement (e.g., sample data)
    } else if (actionType === 'DELETE') {
      updatedLeads = leadData; // leadData contains the updated array
      logAction('DELETE_LEAD', { count: leads.length - updatedLeads.length });
    } else {
      const isEditing = actionType;
      if (isEditing) {
        updatedLeads = leads.map(l => l.id === leadData.id ? leadData : l);
        logAction('UPDATE_LEAD', { id: leadData.id, name: leadData.name });
      } else {
        updatedLeads = [leadData, ...leads]; // Add to beginning
        logAction('CREATE_LEAD', { id: leadData.id, name: leadData.name });
      }
    }
    setLeads(updatedLeads);
    saveLeads(updatedLeads);
    showToastMessage('Leads saved successfully', 'success');
  };

  const handleSetLeadReports = (action) => {
    const newVal = typeof action === 'function' ? action(leadReports) : action;
    setLeadReports(newVal);
    saveLeadReports(newVal);
  };

  const handleSetLeadCounselors = (action) => {
    const newVal = typeof action === 'function' ? action(leadCounselors) : action;
    setLeadCounselors(newVal);
    saveLeadCounselors(newVal);
  };

  // Timesheet handler
  const handleSaveTimesheet = (timesheet) => {
    const allTimesheets = getTimesheets();
    const existingIndex = allTimesheets.findIndex(t => t.id === timesheet.id);

    if (existingIndex >= 0) {
      allTimesheets[existingIndex] = timesheet;
      logAction('UPDATE_TIMESHEET', {
        id: timesheet.id,
        siteName: timesheet.siteName,
        totalPay: timesheet.entries.reduce((sum, e) => sum + e.totalPay, 0)
      });
    } else {
      allTimesheets.push(timesheet);
      logAction('SAVE_TIMESHEET', {
        siteId: timesheet.siteId,
        siteName: timesheet.siteName,
        period: `${timesheet.periodStart} to ${timesheet.periodEnd}`,
        totalPay: timesheet.entries.reduce((sum, e) => sum + e.totalPay, 0)
      });
    }

    saveTimesheets(allTimesheets);
    setToastMessage(`Timesheet saved successfully for ${timesheet.siteName}!`);
    setShowToast(true);
    setSelectedSiteForTimesheet(null);
    setTimesheetPeriodStart('');
    setTimesheetPeriodEnd('');
    setEditingTimesheet(null);
  };

  const handleEditTimesheet = (timesheet) => {
    const site = getSites().find(s => s.id === timesheet.siteId);
    if (!site) {
      showToastMessage('Error: Associated site not found. It may have been deleted.', 'error');
      return;
    }
    setSelectedSiteForTimesheet(site);
    setTimesheetPeriodStart(timesheet.periodStart);
    setTimesheetPeriodEnd(timesheet.periodEnd);
    setEditingTimesheet(timesheet);
    setIsEnteringTimesheet(true);
    setShowTimesheetList(false);
  };

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleLogin = (action) => {
    if (action === 'forgot') {
      setShowForgotPassword(true);
    } else {
      setAuthenticatedState(true);
      syncData();
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error('Sign out error:', e);
    }
    setAuthenticatedState(false);
    setActiveTab('dashboard');
  };

  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'sites') {
      setSites(getSites());
    }
    if (tab === 'lead-manager') {
      setLeadReports(getLeadReports());
      setLeadCounselors(getLeadCounselors());
    }
  };

  useEffect(() => {
    // Clean up future schedules from previously created tasks
    if (periodicalTasks.length > 0 && isStorageReady) {
      let needsCleanup = false;
      const currentYear = new Date().getFullYear();
      const cleanedTasks = periodicalTasks.map(task => {
        if (!task.schedules) return task;

        // Extract creation year from ID (if it's a timestamp), otherwise fallback to current year
        const parsedId = parseInt(task.id);
        const creationYear = (!isNaN(parsedId) && parsedId > 1600000000000)
          ? new Date(parsedId).getFullYear()
          : currentYear;

        // Calculate the maximum valid date (12 months from startingMonth in the creation year)
        const startingMonth = task.startingMonth || 0;
        const maxDate = new Date(creationYear + 1, startingMonth, 1);

        const validSchedules = task.schedules.filter(s => {
          if (!s.targetPeriod) return true;
          const parts = s.targetPeriod.split('-');
          const scheduleDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);

          if (!isNaN(scheduleDate.getTime()) && scheduleDate >= maxDate) {
            needsCleanup = true;
            return false;
          }
          return true;
        });

        if (validSchedules.length !== task.schedules.length) {
          return { ...task, schedules: validSchedules };
        }
        return task;
      });

      if (needsCleanup) {
        setPeriodicalTasks(cleanedTasks);
        savePeriodicalTasks(cleanedTasks);
      }
    }
  }, [periodicalTasks, isStorageReady]);

  // Loading state while IndexedDB mounts
  if (!isStorageReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-zinc-200 border-t-primary-600 animate-spin"></div>
          <p className="text-zinc-500 font-medium text-sm">Mounting Secure Storage...</p>
        </div>
      </div>
    );
  }

  // Show initial setup if first run - DISABLED
  /*
  if (showInitialSetup) {
    return (
      <InitialSetup
        onComplete={() => {
          setShowInitialSetup(false);
          setAuthenticatedState(true);
          syncData();
        }}
      />
    );
  }
  */

  // Show login if not authenticated
  if (!authenticated) {
    if (showForgotPassword) {
      return (
        <ForgotPassword
          onBack={() => setShowForgotPassword(false)}
          onLogin={() => {
            setShowForgotPassword(false);
            setAuthenticatedState(true);
            syncData();
          }}
        />
      );
    }
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary showDetails={!import.meta.env.PROD}>
      <Layout
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onLogout={handleLogout}
        isSyncing={isSyncing}
        syncData={syncData}
        onForceSync={forceSync}
        userProfile={{ name: userProfileData.name, role: userProfileData.role }}
        isAdmin={isAdmin}
      >
        <div className="print:hidden">
          {showToast && (
            <Toast
              message={toastMessage}
              type={toastType}
              onClose={() => setShowToast(false)}
            />
          )}
        </div>

        {/* Content Area */}
        <React.Suspense fallback={<div className="flex items-center justify-center h-full text-notion-warm-gray-400">Loading module...</div>}>
        {/* Tab Content */}
        {activeTab === 'dashboard' && hasPermission('dashboard') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-display-secondary text-notion-black tracking-notion-display">System Overview</h2>
            </div>
            <Dashboard syncVersion={syncVersion} periodicalTasks={visiblePeriodicalTasks} />
          </div>
        )}



        {/* Sites Tab */}
        {activeTab === 'sites' && hasPermission('sites') && (
          <div className="space-y-6">
            {!showSiteForm ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-display-secondary text-notion-black tracking-notion-display">Site Management</h2>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSites(getSites());
                        handleAddSite();
                      }}
                      className="px-4 py-2 bg-notion-blue text-white rounded-micro hover:bg-notion-blue-active transition shadow-notion-card font-semibold text-sm"
                    >
                      + Add Site
                    </button>
                  )}
                </div>
                <div className="notion-card p-6">
                  <SiteList
                    sites={visibleSites}
                    isAdmin={isAdmin}
                    onEdit={handleEditSite}
                    onAddSubSite={handleAddSubSite}
                    onDelete={handleDeleteSite}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-display-secondary text-notion-black tracking-notion-display">
                    {editingSite?.id ? 'Edit Site' : (editingSite?.isSubSite ? 'Add New Sub-Site' : 'Add New Site')}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSiteForm(false);
                      setEditingSite(null);
                    }}
                    className="text-notion-warm-gray-500 hover:text-notion-black text-sm font-medium underline underline-offset-4"
                  >
                    ← Back to List
                  </button>
                </div>
                <div className="notion-card p-6">
                  <SiteForm
                    site={editingSite}
                    isAdmin={isAdmin}
                    availableSites={visibleSites}
                    periodicalTasks={visiblePeriodicalTasks.filter(t => t.siteId === editingSite?.id)}
                    onSave={handleSaveSite}
                    onCancel={() => {
                      setShowSiteForm(false);
                      setEditingSite(null);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}


        {/* Task Matrix Tab */}
        {activeTab === 'task-matrix' && hasPermission('task-matrix') && (
          <div className="space-y-6">
            <h2 className="text-display-secondary text-notion-black tracking-notion-display mb-4">Contractor Periodicals & Budgets</h2>
            <TaskBudgetMatrix sites={visibleSites} periodicalTasks={visiblePeriodicalTasks} />
            <TaskMatrix
              sites={visibleSites}
              periodicalTasks={visiblePeriodicalTasks}
              onToggleStatus={handleToggleTaskStatus}
              onUpdateScheduleOverrides={handleUpdateScheduleOverrides}
              onManageTasks={(site) => setManagingTasksSite(site)}
            />
          </div>
        )}

        {/* Task Management Modal */}
        {managingTasksSite && (
          <TaskManagementModal
            site={managingTasksSite}
            tasks={visiblePeriodicalTasks.filter(t => t.siteId === managingTasksSite.id)}
            onSave={(siteId, updatedTasks) => {
              const tasksToSave = updatedTasks.map(t => ({ ...t, siteId }));
              const updatedPeriodicalTasks = isAdmin
                ? periodicalTasks.filter(t => t.siteId !== siteId)
                : periodicalTasks.filter(t => !(t.siteId === siteId && (Array.isArray(t.assignedTo) ? t.assignedTo.includes(userProfileData?.name) : t.assignedTo === userProfileData?.name)));
              const merged = [...updatedPeriodicalTasks, ...tasksToSave];
              setPeriodicalTasks(merged);
              savePeriodicalTasks(merged);
              setManagingTasksSite(null);
            }}
            onClose={() => setManagingTasksSite(null)}
          />
        )}

        {/* Lead Manager Tab */}
        {activeTab === 'lead-manager' && hasPermission('lead-manager') && (
          <LeadManager 
            leads={leads} 
            onSave={handleSaveLeads} 
            leadReports={leadReports}
            setLeadReports={handleSetLeadReports}
            counselors={leadCounselors}
            setCounselors={handleSetLeadCounselors}
          />
        )}

        {/* Profit & Loss Tab */}
        {activeTab === 'profit-loss' && hasPermission('profit-loss') && (
          <ProfitLoss syncVersion={syncVersion} />
        )}

        {/* User Management Tab (Main Admin Only) */}
        {activeTab === 'users' && hasPermission('users') && (
          <div className="mt-6">
            <UserManagement />
          </div>
        )}
        </React.Suspense>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
