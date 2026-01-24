import { useState, useEffect } from 'react';
import { 
  getContractors, saveContractors, 
  getSites, saveSites,
  getTimesheets, saveTimesheets,
  getSiteAllocations
} from './utils/storage';
import { isAuthenticated, setAuthenticated } from './utils/auth';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Settings from './components/Settings';
import ContractorForm from './components/ContractorForm';
import ContractorList from './components/ContractorList';
import SiteForm from './components/SiteForm';
import SiteList from './components/SiteList';
import SiteAllocation from './components/SiteAllocation';
import PayRateConfiguration from './components/PayRateConfiguration';
import TimesheetEntry from './components/TimesheetEntry';
import TimesheetList from './components/TimesheetList';
import PaymentSummary from './components/PaymentSummary';
import Toast from './components/Toast';

function App() {
  const [authenticated, setAuthenticatedState] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('contractors');
  
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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    setAuthenticatedState(isAuthenticated());
    setContractors(getContractors());
    setSites(getSites());
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
    } else {
      const newContractor = {
        id: Date.now().toString(),
        ...formData,
      };
      const updated = [...contractors, newContractor];
      setContractors(updated);
      saveContractors(updated);
    }
    setShowContractorForm(false);
    setEditingContractor(null);
  };

  const handleDeleteContractor = (id) => {
    if (window.confirm('Are you sure you want to delete this contractor?')) {
      const updated = contractors.filter(c => c.id !== id);
      setContractors(updated);
      saveContractors(updated);
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
    } else {
      const newSite = {
        id: Date.now().toString(),
        allocatedContractors: [],
        ...formData,
      };
      const updated = [...sites, newSite];
      setSites(updated);
      saveSites(updated);
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
    }
  };

  // Timesheet handler
  const handleSaveTimesheet = (timesheet) => {
    const allTimesheets = getTimesheets();
    allTimesheets.push(timesheet);
    saveTimesheets(allTimesheets);
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
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAuthenticatedState(false);
    setActiveTab('contractors');
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Contractor Timesheet & Payroll Management</h1>
          <p className="text-gray-600 mt-1">Cleaning & Housekeeping Services</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('contractors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'contractors'
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
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'sites'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sites
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'allocation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Allocation
            </button>
            <button
              onClick={() => setActiveTab('payrates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'payrates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pay Rates
            </button>
            <button
              onClick={() => setActiveTab('timesheets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'timesheets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Timesheets
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payment Summary
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'settings'
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
            ) : selectedSiteForTimesheet && timesheetPeriodStart && timesheetPeriodEnd ? (
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
                          onChange={(e) => setTimesheetPeriodEnd(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
