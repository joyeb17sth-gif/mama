import { useState, useEffect } from 'react';
import { getSites } from '../utils/storage';

const SiteForm = ({ site, onSave, onCancel }) => {
  const [allSites, setAllSites] = useState([]);
  const [formData, setFormData] = useState({
    siteName: site?.siteName || '',
    clientName: site?.clientName || '',
    cleaningType: site?.cleaningType || 'housekeeping',
    payrollCycle: site?.payrollCycle || 'weekly',
    budgetedHours: site?.budgetedHours || 0,
    budgetedAmount: site?.budgetedAmount || 0,
    isTrainingSite: site?.isTrainingSite || false,
    isSubSite: site?.isSubSite || false,
    parentSiteId: site?.parentSiteId || '',
  });

  useEffect(() => {
    // Load all sites to populate parent site dropdown
    const sites = getSites().filter(s => s.id !== site?.id && !s.isSubSite);
    setAllSites(sites);

    // If site prop changes (e.g. clicking + Sub-Site while form is open), update local state
    if (site) {
      setFormData({
        siteName: site.siteName || '',
        clientName: site.clientName || '',
        cleaningType: site.cleaningType || 'housekeeping',
        payrollCycle: site.payrollCycle || 'weekly',
        budgetedHours: site.budgetedHours || 0,
        budgetedAmount: site.budgetedAmount || 0,
        isTrainingSite: site.isTrainingSite || false,
        isSubSite: site.isSubSite || false,
        parentSiteId: site.parentSiteId || '',
      });
    }
  }, [site]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const name = e.target.name;

    // If parent site is being selected, inherit its cleaning type
    if (name === 'parentSiteId' && value) {
      const parentSite = allSites.find(s => s.id === value);
      if (parentSite) {
        setFormData({
          ...formData,
          [name]: value,
          cleaningType: parentSite.cleaningType || 'housekeeping',
          clientName: parentSite.clientName || formData.clientName,
          // Uncheck training if parent is not housekeeping
          isTrainingSite: parentSite.cleaningType === 'housekeeping' ? formData.isTrainingSite : false,
        });
        return;
      }
    }

    // If cleaning type changes to non-housekeeping, uncheck training site
    if (name === 'cleaningType' && value !== 'housekeeping') {
      setFormData({
        ...formData,
        [name]: value,
        isTrainingSite: false,
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Site Name *
          </label>
          <input
            type="text"
            name="siteName"
            value={formData.siteName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Name
          </label>
          <input
            type="text"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payroll Cycle *
          </label>
          <select
            name="payrollCycle"
            value={formData.payrollCycle}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cleaning Type *
          </label>
          <select
            name="cleaningType"
            value={formData.cleaningType}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="housekeeping">Housekeeping</option>
            <option value="cleaning">Cleaning</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budgeted Hours (per cycle)
          </label>
          <input
            type="number"
            name="budgetedHours"
            value={formData.budgetedHours}
            onChange={handleChange}
            min="0"
            step="0.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budgeted Amount (per cycle)
          </label>
          <input
            type="number"
            name="budgetedAmount"
            value={formData.budgetedAmount}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="isTrainingSite"
            checked={formData.isTrainingSite}
            onChange={handleChange}
            disabled={formData.cleaningType !== 'housekeeping'}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label className={`ml-2 block text-sm ${formData.cleaningType !== 'housekeeping' ? 'text-gray-400' : 'text-gray-700'}`}>
            Training Site (Housekeeping only - enables training pay management)
          </label>
        </div>

        <div className="md:col-span-2 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-6">
          <div className="flex items-center min-w-[200px]">
            <input
              type="checkbox"
              name="isSubSite"
              id="isSubSite"
              checked={formData.isSubSite}
              onChange={handleChange}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg"
            />
            <label htmlFor="isSubSite" className="ml-3 block text-sm font-bold text-indigo-900 uppercase tracking-tight">
              Mark as Sub-Site
            </label>
          </div>

          {formData.isSubSite && (
            <div className="flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
              <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">
                Select Parent Site *
              </label>
              <select
                name="parentSiteId"
                value={formData.parentSiteId}
                onChange={handleChange}
                required={formData.isSubSite}
                className="w-full px-4 py-2 bg-white border-2 border-indigo-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-indigo-900 transition-all shadow-sm"
              >
                <option value="">-- Choose a Main Site --</option>
                {allSites.map(s => (
                  <option key={s.id} value={s.id}>{s.siteName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
        >
          {site ? 'Update' : 'Add'} Site
        </button>
      </div>
    </form>
  );
};

export default SiteForm;
