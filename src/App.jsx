import React, { useState, useEffect } from 'react';
import { parseISO, differenceInDays, addDays, format } from 'date-fns';
import {
  getContractors, saveContractors, getContractorsAsync,
  getSites, saveSites, getSitesAsync,
  getTimesheets, saveTimesheets, getTimesheetsAsync,
  getPayRates, savePayRates, getPayRatesAsync,
  getPublicHolidays, savePublicHolidays, getPublicHolidaysAsync,
  getTrainingReleasesAsync,
  getAuditLogsAsync,
  getPaymentSummariesAsync,
  logAction
} from './utils/storage';
import { encryptData } from './utils/encryptionUtils';
import { isAuthenticated, setAuthenticated, isFirstRun } from './utils/auth';

// Components
import Dashboard from './components/Dashboard';
import ContractorList from './components/ContractorList';
import ContractorForm from './components/ContractorForm';
import SiteList from './components/SiteList';
import SiteForm from './components/SiteForm';
import SiteAllocation from './components/SiteAllocation';
import PayRateConfiguration from './components/PayRateConfiguration';
import TimesheetEntry from './components/TimesheetEntry';
import TimesheetList from './components/TimesheetList';
import PaymentSummary from './components/PaymentSummary';
import TrainingEscrowManager from './components/TrainingEscrowManager';
import AuditLogViewer from './components/AuditLogViewer';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Settings from './components/Settings';
import PublicHolidayManager from './components/PublicHolidayManager';
import InitialSetup from './components/InitialSetup';
import ErrorBoundary from './components/ErrorBoundary';

import Toast from './components/Toast';
import Layout from './components/Layout';

function App() {
  const [authenticated, setAuthenticatedState] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Contractors
  const [contractors, setContractors] = useState([]);
  const [showContractorForm, setShowContractorForm] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);

  // Sites
  const [sites, setSites] = useState([]);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editingSite, setEditingSite] = useState(null);

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
      const cloudContractors = await getContractorsAsync();
      const cloudSites = await getSitesAsync();
      const cloudTimesheets = await getTimesheetsAsync();
      const cloudPayRates = await getPayRatesAsync();
      const cloudReleases = await getTrainingReleasesAsync();
      const cloudPublicHolidays = await getPublicHolidaysAsync();
      const cloudAuditLogs = await getAuditLogsAsync();
      const cloudPaymentSummaries = await getPaymentSummariesAsync();

      if (cloudContractors) {
        localStorage.setItem('contractors', encryptData(cloudContractors));
        setContractors(cloudContractors);
      }
      if (cloudSites) {
        localStorage.setItem('sites', encryptData(cloudSites));
        setSites(cloudSites);
      }
      if (cloudPublicHolidays) localStorage.setItem('publicHolidays', encryptData(cloudPublicHolidays));
      if (cloudTimesheets) localStorage.setItem('timesheets', encryptData(cloudTimesheets));
      if (cloudPayRates) localStorage.setItem('payRates', encryptData(cloudPayRates));
      if (cloudReleases) localStorage.setItem('trainingReleases', encryptData(cloudReleases));
      if (cloudAuditLogs) localStorage.setItem('auditLogs', encryptData(cloudAuditLogs));
      if (cloudPaymentSummaries) localStorage.setItem('paymentSummaries', encryptData(cloudPaymentSummaries));

    } catch (e) {
      console.error('Cloud sync failed', e);
      setSyncError('Sync failed. Working offline.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Check if first run (no credentials set up yet)
    if (isFirstRun()) {
      setShowInitialSetup(true);
      return;
    }

    const authStatus = isAuthenticated();
    setAuthenticatedState(authStatus);
    if (authStatus) {
      setContractors(getContractors());
      setSites(getSites());
      syncData();
    }
  }, []);

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
      const updated = contractors.filter(c => c.id !== id);
      setContractors(updated);
      saveContractors(updated);
      logAction('DELETE_CONTRACTOR', { id });
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

  const handleSaveSite = (formData) => {
    if (editingSite && editingSite.id) {
      const updated = sites.map(s =>
        s.id === editingSite.id ? { ...s, ...formData } : s
      );
      setSites(updated);
      saveSites(updated);
      logAction('UPDATE_SITE', {
        id: editingSite.id,
        name: formData.siteName,
        changes: formData
      });
    } else {
      const newSite = {
        id: Date.now().toString(),
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
    setShowSiteForm(false);
    setEditingSite(null);
    setSites(getSites()); // Refresh
  };

  const handleDeleteSite = (id) => {
    if (window.confirm('Are you sure you want to delete this site?')) {
      const updated = sites.filter(s => s.id !== id);
      setSites(updated);
      saveSites(updated);

      // Clean up associated pay rates
      const allRates = getPayRates();
      const updatedRates = allRates.filter(r => r.siteId !== id);
      savePayRates(updatedRates);

      logAction('DELETE_SITE', { id });
    }
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

  const handleLogout = () => {
    setAuthenticated(false);
    setAuthenticatedState(false);
    setActiveTab('dashboard');
  };

  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'sites') {
      setSites(getSites());
    }
  };

  // Show initial setup if first run
  if (showInitialSetup) {
    return (
      <InitialSetup
        onComplete={() => {
          setShowInitialSetup(false);
          setAuthenticatedState(true);
          setContractors(getContractors());
          setSites(getSites());
          syncData();
        }}
      />
    );
  }

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
        userProfile={{ name: 'Admin User', role: 'Administrator' }}
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
        {activeTab === 'dashboard' && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">System Overview</h2>
            </div>
            <Dashboard />
          </div>
        )}

        {activeTab === 'contractors' && (
          <div className="mt-6">
            {!showContractorForm ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Contractor Management</h2>
                  <button
                    onClick={handleAddContractor}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    + Add Contractor
                  </button>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
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
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {editingContractor ? 'Edit Contractor' : 'Add New Contractor'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowContractorForm(false);
                      setEditingContractor(null);
                    }}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    ← Back to List
                  </button>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
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
        {activeTab === 'sites' && (
          <div className="mt-6">
            {!showSiteForm ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Site Management</h2>
                  <button
                    onClick={() => {
                      setSites(getSites());
                      handleAddSite();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    + Add Site
                  </button>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
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
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {editingSite?.id ? 'Edit Site' : (editingSite?.isSubSite ? 'Add New Sub-Site' : 'Add New Site')}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSiteForm(false);
                      setEditingSite(null);
                    }}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    ← Back to List
                  </button>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <SiteForm
                    site={editingSite}
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
        {activeTab === 'allocation' && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Contractor Allocation</h2>
            <SiteAllocation key={sites.length} />
          </div>
        )}

        {/* Pay Rates Tab */}
        {activeTab === 'payrates' && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Pay Rate Configuration</h2>
            <PayRateConfiguration />
          </div>
        )}

        {/* Timesheets Tab */}
        {activeTab === 'timesheets' && (
          <div className="mt-6 space-y-6">
            {/* Saved Timesheets List - Always Visible */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Saved Timesheets</h3>
              <TimesheetList onEdit={handleEditTimesheet} />
            </div>

            {/* Create/Edit Timesheet Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {isEnteringTimesheet ? 'Timesheet Entry' : 'Create New Timesheet'}
                </h2>
                {isEnteringTimesheet && (
                  <button
                    onClick={() => {
                      setIsEnteringTimesheet(false);
                      setEditingTimesheet(null);
                      setSelectedSiteForTimesheet(null);
                      setTimesheetPeriodStart('');
                      setTimesheetPeriodEnd('');
                    }}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
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
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Site
                      </label>
                      <select
                        value={selectedSiteForTimesheet?.id || ''}
                        onChange={(e) => {
                          const site = getSites().find(s => s.id === e.target.value);
                          setSelectedSiteForTimesheet(site || null);
                        }}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-medium text-slate-900 transition-all shadow-sm"
                      >
                        <option value="">Choose a Primary Site...</option>
                        {getSites().filter(s => !s.isSubSite).map(mainSite => (
                          <option key={mainSite.id} value={mainSite.id} className="font-semibold text-blue-600">
                            🏢 {mainSite.siteName}
                          </option>
                        ))}
                      </select>
                      {selectedSiteForTimesheet && (!selectedSiteForTimesheet.allocatedContractors || selectedSiteForTimesheet.allocatedContractors.length === 0) && (
                        <p className="mt-2 text-sm text-yellow-600">
                          ⚠️ No contractors allocated to this site. Please allocate contractors first.
                        </p>
                      )}
                    </div>
                    {selectedSiteForTimesheet && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-base font-medium text-gray-700 mb-2">
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
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${(() => {
                                if (!timesheetPeriodStart || !selectedSiteForTimesheet) return 'border-gray-300';
                                const selectedDate = parseISO(timesheetPeriodStart);
                                const conflictingTimesheet = getTimesheets().find(ts => {
                                  if (ts.siteId !== selectedSiteForTimesheet.id) return false;
                                  const tsStart = parseISO(ts.periodStart);
                                  const tsEnd = parseISO(ts.periodEnd);
                                  return selectedDate >= tsStart && selectedDate <= tsEnd;
                                });
                                return conflictingTimesheet ? 'border-green-500 bg-green-50' : 'border-gray-300';
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
                                  <p className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1">
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
                            <label className="block text-base font-medium text-gray-700 mb-2">
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {selectedSiteForTimesheet && (
                              <p className="mt-1 text-xs text-gray-500">
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
                          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
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
                              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium shadow-md flex items-center gap-2"
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
            </div>
          </div>
        )}

        {/* Training Pay Tab */}
        {activeTab === 'training' && (
          <div className="mt-6">
            <TrainingEscrowManager />
          </div>
        )}

        {/* Payment Summary Tab */}
        {activeTab === 'payments' && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Payment Summary</h2>
            <PaymentSummary />
          </div>
        )}

        {/* Public Holidays Tab */}
        {activeTab === 'holidays' && (
          <div className="mt-6">
            <PublicHolidayManager />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="mt-6">
            <Settings onLogout={handleLogout} />
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'logs' && (
          <div className="mt-6">
            <AuditLogViewer />
          </div>
        )}
      </Layout>
    </ErrorBoundary>
  );

}

export default App;
