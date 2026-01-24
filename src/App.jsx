import { useState, useEffect } from 'react';
import {
  getContractors, saveContractors, getContractorsAsync,
  getSites, saveSites, getSitesAsync,
  getTimesheets, saveTimesheets, getTimesheetsAsync,
  getPayRatesAsync,
  getTrainingReleasesAsync,
  getAuditLogsAsync,
  getSiteAllocations,
  logAction
} from './utils/storage';
import { encryptData } from './utils/encryptionUtils';
import { isAuthenticated, setAuthenticated } from './utils/auth';
// ... other imports ...

function App() {
  const [authenticated, setAuthenticatedState] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('contractors');
  const [isSyncing, setIsSyncing] = useState(false);

  // Contractors ... (other states stay same)

  const syncData = async () => {
    if (!isAuthenticated()) return;
    setIsSyncing(true);
    try {
      const cloudContractors = await getContractorsAsync();
      const cloudSites = await getSitesAsync();
      const cloudTimesheets = await getTimesheetsAsync();
      const cloudPayRates = await getPayRatesAsync();
      const cloudReleases = await getTrainingReleasesAsync();
      const cloudAuditLogs = await getAuditLogsAsync();

      if (cloudContractors) {
        localStorage.setItem('contractors', encryptData(cloudContractors));
        setContractors(cloudContractors);
      }
      if (cloudSites) {
        localStorage.setItem('sites', encryptData(cloudSites));
        setSites(cloudSites);
      }
      if (cloudTimesheets) localStorage.setItem('timesheets', encryptData(cloudTimesheets));
      if (cloudPayRates) localStorage.setItem('payRates', encryptData(cloudPayRates));
      if (cloudReleases) localStorage.setItem('trainingReleases', encryptData(cloudReleases));
      if (cloudAuditLogs) localStorage.setItem('auditLogs', encryptData(cloudAuditLogs));

    } catch (e) {
      console.error('Cloud sync failed', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
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

  const handleSaveSite = (formData) => {
    if (editingSite) {
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
      logAction('DELETE_SITE', { id });
    }
  };

  // Timesheet handler
  const handleSaveTimesheet = (timesheet) => {
    const allTimesheets = getTimesheets();
    allTimesheets.push(timesheet);
    saveTimesheets(allTimesheets);

    logAction('SAVE_TIMESHEET', {
      siteId: timesheet.siteId,
      siteName: timesheet.siteName,
      period: `${timesheet.periodStart} to ${timesheet.periodEnd}`,
      totalPay: timesheet.entries.reduce((sum, e) => sum + e.totalPay, 0)
    });
    setToastMessage(`Timesheet saved successfully for ${timesheet.siteName}!`);
    setShowToast(true);
    setSelectedSiteForTimesheet(null);
    setTimesheetPeriodStart('');
    setTimesheetPeriodEnd('');
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleLogin = (action) => {
    if (action === 'forgot') {
      setShowForgotPassword(true);
    } else {
      setAuthenticatedState(true);
      syncData(); // Sync immediately on login
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAuthenticatedState(false);
    setActiveTab('contractors');
    localStorage.clear(); // Clear local data on logout for shared machine security
  };

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
    <div className="min-h-screen bg-gray-100">
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contractor Timesheet & Payroll Management</h1>
            <p className="text-gray-600 mt-1">Cleaning & Housekeeping Services</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isSyncing ? (
                <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Syncing Cloud...</span>
                </div>
              ) : (
                <button
                  onClick={syncData}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
                  title="Sync with Cloud"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('contractors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'contractors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Contractors
            </button>
            <button
              onClick={() => {
                setActiveTab('sites');
                setSites(getSites());
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'sites'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Sites
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'allocation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Allocation
            </button>
            <button
              onClick={() => setActiveTab('payrates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'payrates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Pay Rates
            </button>
            <button
              onClick={() => setActiveTab('timesheets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'timesheets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Timesheets
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'training'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Training Pay
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Payment Summary
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Contractors Tab */}
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
                    sites={getSites()}
                    onEdit={handleEditSite}
                    onDelete={handleDeleteSite}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {editingSite ? 'Edit Site' : 'Add New Site'}
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
          <div className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Timesheet Management</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTimesheetList(!showTimesheetList)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                >
                  {showTimesheetList ? 'Create New' : 'View Saved Timesheets'}
                </button>
              </div>
            </div>
            {showTimesheetList ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Saved Timesheets</h3>
                <TimesheetList />
              </div>
            ) : isEnteringTimesheet && selectedSiteForTimesheet && timesheetPeriodStart && timesheetPeriodEnd ? (
              <div>
                <button
                  onClick={() => setIsEnteringTimesheet(false)}
                  className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  ← Back to Selection
                </button>
                <TimesheetEntry
                  site={getSites().find(s => s.id === selectedSiteForTimesheet.id)}
                  periodStart={timesheetPeriodStart}
                  periodEnd={timesheetPeriodEnd}
                  contractors={contractors}
                  onSave={(timesheet) => {
                    handleSaveTimesheet(timesheet);
                    setSelectedSiteForTimesheet(null);
                    setTimesheetPeriodStart('');
                    setTimesheetPeriodEnd('');
                    setIsEnteringTimesheet(false);
                  }}
                />
              </div>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a site...</option>
                      {getSites().map(site => (
                        <option key={site.id} value={site.id}>
                          {site.siteName} {site.allocatedContractors?.length > 0 ? `(${site.allocatedContractors.length} contractors)` : '(no contractors allocated)'}
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Period Start Date
                          </label>
                          <input
                            type="date"
                            value={timesheetPeriodStart}
                            onChange={(e) => setTimesheetPeriodStart(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Period End Date
                          </label>
                          <input
                            type="date"
                            value={timesheetPeriodEnd}
                            min={timesheetPeriodStart}
                            onChange={(e) => setTimesheetPeriodEnd(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {timesheetPeriodStart && timesheetPeriodEnd && selectedSiteForTimesheet.allocatedContractors?.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                          <button
                            onClick={() => setIsEnteringTimesheet(true)}
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
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Contractor Timesheet & Payroll Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
