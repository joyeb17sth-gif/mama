import React, { useState, useEffect } from 'react';
import { parseISO, differenceInDays, addDays, format } from 'date-fns';
import {
  initStorage, memoryCache,
  getContractors, saveContractors, getContractorsAsync,
  getSites, saveSites, getSitesAsync,
  getTimesheets, saveTimesheets, getTimesheetsAsync,
  getPublicHolidays, savePublicHolidays, getPublicHolidaysAsync,
  getTrainingReleasesAsync,
  getPaymentSummariesAsync,
  getPayRatesAsync,
  getGlobalRatesAsync,
  getPeriodicalTasks, savePeriodicalTasks, getPeriodicalTasksAsync,
  logAction
} from './utils/storage';
import { encryptData } from './utils/encryptionUtils';
import localforage from 'localforage';
import { isAuthenticated, isFirstRun, logoutUser } from './utils/auth';
import { supabase } from './utils/supabaseClient';

// Components
import Dashboard from './components/Dashboard';
import ContractorList from './components/ContractorList';
import ContractorForm from './components/ContractorForm';
import SiteList from './components/SiteList';
import SiteForm from './components/SiteForm';
import SiteAllocation from './components/SiteAllocation';

import TimesheetEntry from './components/TimesheetEntry';
import TimesheetList from './components/TimesheetList';
import TaskMatrix from './components/TaskMatrix';
import TaskBudgetMatrix from './components/TaskBudgetMatrix';
import TaskManagementModal from './components/TaskManagementModal';
import PaymentSummary from './components/PaymentSummary';
import TrainingEscrowManager from './components/TrainingEscrowManager';

import Login from './components/Login';
import Dropdown from './components/Dropdown';
import ForgotPassword from './components/ForgotPassword';
import UserManagement from './components/UserManagement';

import PublicHolidayManager from './components/PublicHolidayManager';
import InitialSetup from './components/InitialSetup';
import ErrorBoundary from './components/ErrorBoundary';

import Toast from './components/Toast';
import Layout from './components/Layout';
import GlobalRatesConfig from './components/GlobalRatesConfig';

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
      return ['task-matrix', 'sites'].includes(tab);
    }

    if (role === 'payslip_management') {
      // Payslip management can access all but task matrix and user management
      return tab !== 'task-matrix' && tab !== 'users';
    }

    // Default basic role
    return ['dashboard', 'timesheets'].includes(tab);
  };

  // Contractors
  const [contractors, setContractors] = useState([]);
  const [showContractorForm, setShowContractorForm] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);

  // Sites
  const [sites, setSites] = useState([]);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editingSite, setEditingSite] = useState(null);

  // Periodical Tasks
  const [periodicalTasks, setPeriodicalTasks] = useState([]);
  const [managingTasksSite, setManagingTasksSite] = useState(null);

  // Timesheets
  const [selectedSiteForTimesheet, setSelectedSiteForTimesheet] = useState(null);
  const [timesheetPeriodStart, setTimesheetPeriodStart] = useState('');
  const [timesheetPeriodEnd, setTimesheetPeriodEnd] = useState('');
  const [showTimesheetList, setShowTimesheetList] = useState(false);
  const [isEnteringTimesheet, setIsEnteringTimesheet] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const syncData = async () => {
    if (!isAuthenticated()) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const role = userProfileData.role?.toLowerCase() || 'user';
      
      let cloudContractors, cloudSites, cloudTimesheets, cloudPayRates,
          cloudReleases, cloudPublicHolidays, cloudPaymentSummaries,
          cloudPeriodicalTasks, cloudGlobalRates;

      const promises = [];
      const promiseKeys = [];

      // Determine what to download based on role
      if (role === 'admin') {
        promises.push(
          getContractorsAsync(),
          getSitesAsync(),
          getTimesheetsAsync(),
          getPayRatesAsync(),
          getTrainingReleasesAsync(),
          getPublicHolidaysAsync(),
          getPaymentSummariesAsync(),
          getPeriodicalTasksAsync(),
          getGlobalRatesAsync()
        );
        promiseKeys.push(
          'contractors',
          'sites',
          'timesheets',
          'payRates',
          'releases',
          'publicHolidays',
          'paymentSummaries',
          'periodicalTasks',
          'globalRates'
        );
      } else if (role === 'supervisor' || role === 'manager') {
        promises.push(
          getSitesAsync(),
          getPeriodicalTasksAsync()
        );
        promiseKeys.push(
          'sites',
          'periodicalTasks'
        );
      } else if (role === 'payslip_management') {
        promises.push(
          getContractorsAsync(),
          getSitesAsync(),
          getTimesheetsAsync(),
          getPayRatesAsync(),
          getTrainingReleasesAsync(),
          getPublicHolidaysAsync(),
          getPaymentSummariesAsync(),
          getGlobalRatesAsync()
        );
        promiseKeys.push(
          'contractors',
          'sites',
          'timesheets',
          'payRates',
          'releases',
          'publicHolidays',
          'paymentSummaries',
          'globalRates'
        );
      } else {
        // Default users download nothing
      }

      // Only execute parallel call if there are promises to run
      if (promises.length > 0) {
        const results = await Promise.all(promises);
        results.forEach((val, idx) => {
          const key = promiseKeys[idx];
          if (key === 'contractors') cloudContractors = val;
          else if (key === 'sites') cloudSites = val;
          else if (key === 'timesheets') cloudTimesheets = val;
          else if (key === 'payRates') cloudPayRates = val;
          else if (key === 'releases') cloudReleases = val;
          else if (key === 'publicHolidays') cloudPublicHolidays = val;
          else if (key === 'paymentSummaries') cloudPaymentSummaries = val;
          else if (key === 'periodicalTasks') cloudPeriodicalTasks = val;
          else if (key === 'globalRates') cloudGlobalRates = val;
        });
      }

      let hasChanges = false;

      // Update memoryCache + localforage + React state for data types that were queried
      if (cloudContractors !== undefined) {
        hasChanges = true;
        if (cloudContractors) {
          memoryCache.contractors = cloudContractors;
          await localforage.setItem('contractors', encryptData(cloudContractors));
          setContractors(cloudContractors);
        }
      }
      if (cloudSites !== undefined) {
        hasChanges = true;
        if (cloudSites) {
          memoryCache.sites = cloudSites;
          await localforage.setItem('sites', encryptData(cloudSites));
          setSites(cloudSites);
        }
      }
      if (cloudTimesheets !== undefined) {
        hasChanges = true;
        if (cloudTimesheets) {
          memoryCache.timesheets = cloudTimesheets;
          await localforage.setItem('timesheets', encryptData(cloudTimesheets));
        }
      }
      if (cloudPayRates !== undefined) {
        hasChanges = true;
        if (cloudPayRates) {
          memoryCache.payRates = cloudPayRates;
          await localforage.setItem('payRates', encryptData(cloudPayRates));
        }
      }
      if (cloudPublicHolidays !== undefined) {
        hasChanges = true;
        if (cloudPublicHolidays) {
          memoryCache.publicHolidays = cloudPublicHolidays;
          await localforage.setItem('publicHolidays', encryptData(cloudPublicHolidays));
        }
      }
      if (cloudReleases !== undefined) {
        hasChanges = true;
        if (cloudReleases) {
          memoryCache.trainingReleases = cloudReleases;
          await localforage.setItem('trainingReleases', encryptData(cloudReleases));
        }
      }
      if (cloudPaymentSummaries !== undefined) {
        hasChanges = true;
        if (cloudPaymentSummaries) {
          memoryCache.paymentSummaries = cloudPaymentSummaries;
          await localforage.setItem('paymentSummaries', encryptData(cloudPaymentSummaries));
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
      if (cloudGlobalRates !== undefined) {
        hasChanges = true;
        if (cloudGlobalRates) {
          memoryCache.globalRates = cloudGlobalRates;
          await localforage.setItem('globalRates', encryptData(cloudGlobalRates));
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

  useEffect(() => {
    initStorage().then(() => {
      setIsStorageReady(true);
    });
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
          if (email === 'jungjoyeb@gmail.com' || email.includes('joyeb')) role = 'admin';
          
          try {
             const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
             
             if (profileError && profileError.code === 'PGRST116') {
               // Profile doesn't exist, create it
               await supabase.from('profiles').insert({
                 id: session.user.id,
                 email: email,
                 role: (email === 'jungjoyeb@gmail.com' || email.includes('joyeb')) ? 'admin' : 'user'
               });
             } else if (profile && profile.role) {
               role = profile.role;
             }

             // If this is the specific admin email, ensure it stays admin in state
             if (email === 'jungjoyeb@gmail.com') role = 'admin';
          } catch(e) {
            if (import.meta.env.DEV) console.error('Profile check failed:', e);
          }
          setUserProfileData({ name: email, role });
          setIsAdmin(role === 'admin' || email.includes('joyeb'));
          
          const normalizedRole = role.toLowerCase();
          if (normalizedRole === 'supervisor' || normalizedRole === 'manager') {
            setActiveTab(prev => (prev === 'dashboard' ? 'task-matrix' : prev));
          }
        }

        setContractors(getContractors());
        setSites(getSites());
        setPeriodicalTasks(getPeriodicalTasks());
        
        // Initial sync only if active
        if (document.visibilityState === 'visible') {
          syncData();
        }

        // Active focus / visible trigger
        const triggerSyncIfVisible = () => {
          if (document.visibilityState === 'visible') {
            syncData();
          }
        };

        window.addEventListener('focus', triggerSyncIfVisible);
        document.addEventListener('visibilitychange', triggerSyncIfVisible);
        
        focusListener = triggerSyncIfVisible;
        visibilityListener = triggerSyncIfVisible;

        // Periodic sync every 2 minutes (120000ms) only if active
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            syncData();
          }
        }, 120000);
      }
    };

    checkAuth();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (focusListener) window.removeEventListener('focus', focusListener);
      if (visibilityListener) document.removeEventListener('visibilitychange', visibilityListener);
    };
  }, [authenticated, isStorageReady]);

  // Contractor handlers
  const handleAddContractor = () => {
    setEditingContractor(null);
    setShowContractorForm(true);
  };

  const handleEditContractor = (contractor) => {
    setEditingContractor(contractor);
    setShowContractorForm(true);
  };

  const handleSaveContractor = (formData) => {
    if (editingContractor) {
      const updated = contractors.map(c =>
        c.id === editingContractor.id ? { ...c, ...formData } : c
      );
      setContractors(updated);
      saveContractors(updated);
      logAction('UPDATE_CONTRACTOR', {
        id: editingContractor.id,
        name: formData.name,
        changes: formData
      });
    } else {
      const newContractor = {
        id: Date.now().toString(),
        ...formData,
      };
      const updated = [...contractors, newContractor];
      setContractors(updated);
      saveContractors(updated);
      logAction('CREATE_CONTRACTOR', {
        id: newContractor.id,
        name: newContractor.name
      });
    }
    setShowContractorForm(false);
    setEditingContractor(null);
  };

  const handleDeleteContractor = (id) => {
    if (window.confirm('Are you sure you want to delete this contractor?')) {
      const contractorToDelete = contractors.find(c => c.id === id);
      const updated = contractors.filter(c => c.id !== id);
      setContractors(updated);
      saveContractors(updated);
      logAction('DELETE_CONTRACTOR', { 
        id,
        name: contractorToDelete?.name || 'Unknown Contractor'
      });
    }
  };

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

  const handleSaveSite = (formData, siteTasks = []) => {
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
      siteId = Date.now().toString();
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
    
    // Merge into global periodicalTasks (remove old ones for this site, add new ones)
    const otherTasks = periodicalTasks.filter(t => t.siteId !== siteId);
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

      logAction('DELETE_SITE', { 
        id,
        siteName: siteToDelete?.siteName || 'Unknown Site'
      });
    }
  };

  // Periodical Tasks toggle handler
  const handleToggleTaskStatus = (task, schedule, specificStatus, scopeOfWork) => {
    let newStatus = specificStatus;
    if (!newStatus) {
      if (schedule.status === 'Scheduled') newStatus = 'Completed';
      else if (schedule.status === 'Completed') newStatus = 'Completed Not Claimed';
      else newStatus = 'Scheduled';
    }

    const updatedTasks = periodicalTasks.map(t => {
      if (t.id === task.id) {
        const updatedSchedules = t.schedules.map(s => 
          s.id === schedule.id ? { ...s, status: newStatus, scopeOfWork: scopeOfWork !== undefined ? scopeOfWork : (s.scopeOfWork || '') } : s
        );
        return { ...t, schedules: updatedSchedules };
      }
      return t;
    });

    setPeriodicalTasks(updatedTasks);
    savePeriodicalTasks(updatedTasks);
    logAction('UPDATE_TASK_STATUS', { taskId: task.id, scheduleId: schedule.id, newStatus, scopeOfWork: scopeOfWork || '' });
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
    await logoutUser();
    setAuthenticatedState(false);
    setActiveTab('dashboard');
  };

  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'sites') {
      setSites(getSites());
    }
  };

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

        {/* Tab Content */}
        {activeTab === 'dashboard' && hasPermission('dashboard') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-display-secondary text-notion-black tracking-notion-display">System Overview</h2>
            </div>
            <Dashboard syncVersion={syncVersion} />
          </div>
        )}

        {activeTab === 'contractors' && hasPermission('contractors') && (
          <div className="space-y-6">
            {!showContractorForm ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-display-secondary text-notion-black tracking-notion-display">Contractor Management</h2>
                  <button
                    onClick={handleAddContractor}
                    className="px-4 py-2 bg-notion-blue text-white rounded-micro hover:bg-notion-blue-active transition shadow-notion-card font-semibold text-sm"
                  >
                    + Add Contractor
                  </button>
                </div>
                <div className="notion-card p-6">
                  <ContractorList
                    contractors={contractors}
                    onEdit={handleEditContractor}
                    onDelete={handleDeleteContractor}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-display-secondary text-notion-black tracking-notion-display">
                    {editingContractor ? 'Edit Contractor' : 'Add New Contractor'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowContractorForm(false);
                      setEditingContractor(null);
                    }}
                    className="text-notion-warm-gray-500 hover:text-notion-black text-sm font-medium underline underline-offset-4"
                  >
                    ← Back to List
                  </button>
                </div>
                <div className="notion-card p-6">
                  <ContractorForm
                    contractor={editingContractor}
                    onSave={handleSaveContractor}
                    onCancel={() => {
                      setShowContractorForm(false);
                      setEditingContractor(null);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sites Tab */}
        {activeTab === 'sites' && hasPermission('sites') && (
          <div className="space-y-6">
            {!showSiteForm ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-display-secondary text-notion-black tracking-notion-display">Site Management</h2>
                  <button
                    onClick={() => {
                      setSites(getSites());
                      handleAddSite();
                    }}
                    className="px-4 py-2 bg-notion-blue text-white rounded-micro hover:bg-notion-blue-active transition shadow-notion-card font-semibold text-sm"
                  >
                    + Add Site
                  </button>
                </div>
                <div className="notion-card p-6">
                  <SiteList
                    sites={sites}
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
                    periodicalTasks={periodicalTasks.filter(t => t.siteId === editingSite?.id)}
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

        {/* Allocation Tab */}
        {activeTab === 'allocation' && hasPermission('allocation') && (
          <div className="space-y-6">
            <h2 className="text-display-secondary text-notion-black tracking-notion-display mb-4">Contractor Allocation</h2>
            <SiteAllocation key={`${sites.length}-${syncVersion}`} />
          </div>
        )}

        {/* Task Matrix Tab */}
        {activeTab === 'task-matrix' && hasPermission('task-matrix') && (
          <div className="space-y-6">
            <h2 className="text-display-secondary text-notion-black tracking-notion-display mb-4">Contractor Periodicals & Budgets</h2>
            <TaskBudgetMatrix sites={sites} periodicalTasks={periodicalTasks} />
            <TaskMatrix 
              sites={sites} 
              periodicalTasks={periodicalTasks} 
              onToggleStatus={handleToggleTaskStatus}
              onManageTasks={(site) => setManagingTasksSite(site)}
            />
          </div>
        )}

        {/* Task Management Modal */}
        {managingTasksSite && (
          <TaskManagementModal
            site={managingTasksSite}
            tasks={periodicalTasks.filter(t => t.siteId === managingTasksSite.id)}
            onSave={(siteId, updatedTasks) => {
              const tasksToSave = updatedTasks.map(t => ({ ...t, siteId }));
              const otherTasks = periodicalTasks.filter(t => t.siteId !== siteId);
              const merged = [...otherTasks, ...tasksToSave];
              setPeriodicalTasks(merged);
              savePeriodicalTasks(merged);
              setManagingTasksSite(null);
            }}
            onClose={() => setManagingTasksSite(null)}
          />
        )}



        {/* Timesheets Tab */}
        {activeTab === 'timesheets' && hasPermission('timesheets') && (
          <div className="space-y-6">

            {/* Create/Edit Timesheet Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-display-secondary text-notion-black tracking-notion-display">
                  {isEnteringTimesheet ? 'Timesheet Entry' : 'Create New Timesheet'}
                </h2>
              </div>
              {isEnteringTimesheet && (
                <button
                  onClick={() => {
                    setIsEnteringTimesheet(false);
                    setEditingTimesheet(null);
                    setSelectedSiteForTimesheet(null);
                    setTimesheetPeriodStart('');
                    setTimesheetPeriodEnd('');
                  }}
                  className="text-notion-blue hover:text-notion-blue-active flex items-center gap-1 font-medium text-sm underline underline-offset-4"
                >
                  ← Cancel
                </button>
              )}
            </div>

            {isEnteringTimesheet && selectedSiteForTimesheet && timesheetPeriodStart && timesheetPeriodEnd ? (
              <TimesheetEntry
                site={getSites().find(s => s.id === selectedSiteForTimesheet.id)}
                periodStart={timesheetPeriodStart}
                periodEnd={timesheetPeriodEnd}
                contractors={contractors}
                initialData={editingTimesheet}
                onQuickAddContractor={setContractors}
                onSave={(timesheet) => {
                  handleSaveTimesheet(timesheet);
                  setSelectedSiteForTimesheet(null);
                  setTimesheetPeriodStart('');
                  setTimesheetPeriodEnd('');
                  setIsEnteringTimesheet(false);
                  setEditingTimesheet(null);
                }}
              />
            ) : (
              <div className="notion-card p-6 w-full">
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 ml-1">
                      Select Site
                    </label>
                    <Dropdown
                      value={selectedSiteForTimesheet?.id || ''}
                      onChange={(val) => {
                        const site = getSites().find(s => s.id === val);
                        setSelectedSiteForTimesheet(site || null);
                      }}
                      options={getSites().filter(s => !s.isSubSite).map(s => ({
                        value: s.id,
                        label: `${s.siteName} (Terminal-Alpha)`
                      }))}
                      placeholder="Initialize Terminal Node..."
                    />
                    {selectedSiteForTimesheet && (!selectedSiteForTimesheet.allocatedContractors || selectedSiteForTimesheet.allocatedContractors.length === 0) && (
                      <div className="mt-4 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-widest leading-none mb-1">Operational Blocker: Empty Roster</p>
                          <p className="text-xs text-amber-600 font-bold uppercase tracking-tight">No resources allocated to this terminal node.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedSiteForTimesheet && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-2 ml-1">
                            Period Start Date
                          </label>
                          <input
                            type="date"
                            value={timesheetPeriodStart}
                            onChange={(e) => {
                              setTimesheetPeriodStart(e.target.value);
                              // Auto-clear end date if cycle changes or if it becomes invalid
                              setTimesheetPeriodEnd('');
                            }}
                            className={`w-full px-3 py-1.5 whisper-border rounded-micro focus:outline-none focus:ring-1 focus:ring-notion-focus-blue text-sm ${(() => {
                              if (!timesheetPeriodStart || !selectedSiteForTimesheet) return 'bg-white';
                              const selectedDate = parseISO(timesheetPeriodStart);
                              const conflictingTimesheet = getTimesheets().find(ts => {
                                if (ts.siteId !== selectedSiteForTimesheet.id) return false;
                                const tsStart = parseISO(ts.periodStart);
                                const tsEnd = parseISO(ts.periodEnd);
                                return selectedDate >= tsStart && selectedDate <= tsEnd;
                              });
                              return conflictingTimesheet ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white';
                            })()
                              }`}
                          />
                          {(() => {
                            if (!timesheetPeriodStart || !selectedSiteForTimesheet) return null;
                            const selectedDate = parseISO(timesheetPeriodStart);
                            const conflictingTimesheet = getTimesheets().find(ts => {
                              if (ts.siteId !== selectedSiteForTimesheet.id) return false;
                              const tsStart = parseISO(ts.periodStart);
                              const tsEnd = parseISO(ts.periodEnd);
                              return selectedDate >= tsStart && selectedDate <= tsEnd;
                            });

                            if (conflictingTimesheet) {
                              return (
                                <p className="mt-1 text-badge text-emerald-600 font-semibold flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Timesheet exists: {format(parseISO(conflictingTimesheet.periodStart), 'dd MMM')} - {format(parseISO(conflictingTimesheet.periodEnd), 'dd MMM yyyy')}
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div>
                          <label className="block mb-2 ml-1">
                            Period End Date
                          </label>
                          <input
                            type="date"
                            value={timesheetPeriodEnd}
                            min={timesheetPeriodStart}
                            max={(() => {
                              if (!timesheetPeriodStart || !selectedSiteForTimesheet) return "";
                              const start = parseISO(timesheetPeriodStart);
                              if (selectedSiteForTimesheet.payrollCycle === 'weekly') {
                                return format(addDays(start, 6), 'yyyy-MM-dd');
                              }
                              if (selectedSiteForTimesheet.payrollCycle === 'fortnightly') {
                                return format(addDays(start, 13), 'yyyy-MM-dd');
                              }
                              return "";
                            })()}
                            onChange={(e) => setTimesheetPeriodEnd(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white whisper-border rounded-micro focus:outline-none focus:ring-1 focus:ring-notion-focus-blue text-sm"
                          />
                          {selectedSiteForTimesheet && (
                            <p className="mt-1 text-badge text-notion-warm-gray-300">
                              {selectedSiteForTimesheet.payrollCycle === 'weekly'
                                ? 'Max 7 days allowed'
                                : selectedSiteForTimesheet.payrollCycle === 'fortnightly'
                                  ? 'Max 14 days allowed'
                                  : 'Custom range selected'}
                            </p>
                          )}
                        </div>
                      </div>

                      {timesheetPeriodStart && timesheetPeriodEnd && selectedSiteForTimesheet.allocatedContractors?.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-notion-warm-white flex justify-end">
                          <button
                            onClick={() => {
                              const start = parseISO(timesheetPeriodStart);
                              const end = parseISO(timesheetPeriodEnd);
                              const days = differenceInDays(end, start) + 1;

                              if (selectedSiteForTimesheet.payrollCycle === 'weekly' && days > 7) {
                                showToastMessage('Error: Weekly payroll cycle cannot exceed 7 days.', 'error');
                                return;
                              }
                              if (selectedSiteForTimesheet.payrollCycle === 'fortnightly' && days > 14) {
                                showToastMessage('Error: Fortnightly payroll cycle cannot exceed 14 days.', 'error');
                                return;
                              }
                              if (days <= 0) {
                                showToastMessage('Error: End date must be after start date.', 'error');
                                return;
                              }

                              // Check for any date overlap with existing timesheets
                              const newStart = parseISO(timesheetPeriodStart);
                              const newEnd = parseISO(timesheetPeriodEnd);

                              const overlappingTimesheet = getTimesheets().find(ts => {
                                if (ts.siteId !== selectedSiteForTimesheet.id) return false;

                                const existingStart = parseISO(ts.periodStart);
                                const existingEnd = parseISO(ts.periodEnd);

                                // Check if there's any overlap between the date ranges
                                // Overlap exists if: new start is before existing end AND new end is after existing start
                                return newStart <= existingEnd && newEnd >= existingStart;
                              });

                              if (overlappingTimesheet) {
                                const existingStart = format(parseISO(overlappingTimesheet.periodStart), 'dd MMM yyyy');
                                const existingEnd = format(parseISO(overlappingTimesheet.periodEnd), 'dd MMM yyyy');
                                showToastMessage(
                                  `Cannot create timesheet: Dates overlap with existing timesheet (${existingStart} - ${existingEnd}). Please select dates after ${existingEnd}.`,
                                  'error'
                                );
                                return;
                              }

                              setIsEnteringTimesheet(true);
                            }}
                            className="px-5 py-1.5 bg-notion-blue text-white rounded-micro hover:bg-notion-blue-active transition shadow-notion-card font-semibold text-sm flex items-center gap-2"
                          >
                            <span>Confirm & Proceed</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Saved Timesheets List - Always Visible */}
            <div className="notion-card p-6 w-full">
              <h3 className="text-card-title text-notion-black tracking-notion-card mb-4">Saved Timesheets</h3>
              <TimesheetList syncVersion={syncVersion} onEdit={handleEditTimesheet} />
            </div>
          </div>
        )}

        {/* Training Pay Tab */}
        {activeTab === 'training' && hasPermission('training') && (
          <div className="mt-6">
            <TrainingEscrowManager syncVersion={syncVersion} />
          </div>
        )}

        {/* Payment Summary Tab */}
        {activeTab === 'payments' && hasPermission('payments') && (
          <div className="space-y-6">
            <h2 className="text-display-secondary text-notion-black tracking-notion-display mb-4">Payment Summary</h2>
            <PaymentSummary syncVersion={syncVersion} />
          </div>
        )}

        {/* Public Holidays Tab */}
        {activeTab === 'holidays' && hasPermission('holidays') && (
          <div className="mt-6">
            <PublicHolidayManager syncVersion={syncVersion} />
          </div>
        )}





        {/* Global Rates Settings Tab */}
        {activeTab === 'settings' && hasPermission('settings') && (
          <div className="space-y-6">
            <h2 className="text-display-secondary text-notion-black tracking-notion-display mb-4">Global Rates Configuration</h2>
            <GlobalRatesConfig syncVersion={syncVersion} />
          </div>
        )}

        {/* User Management Tab (Main Admin Only) */}
        {activeTab === 'users' && hasPermission('users') && (
          <div className="mt-6">
            <UserManagement />
          </div>
        )}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
