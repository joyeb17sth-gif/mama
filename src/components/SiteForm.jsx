import React, { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
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
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up font-sans">
      <div className="bg-white p-8 rounded-2xl border border-zinc-100">
        <h3 className="text-p1 font-bold text-zinc-900 mb-6">Site Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2">
              Site Name <span className="text-primary-600">*</span>
            </label>
            <input
              type="text"
              name="siteName"
              value={formData.siteName}
              onChange={handleChange}
              required
              placeholder="e.g. City Hotel"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400"
            />
          </div>

          <div>
            <label className="block mb-2">
              Client Name
            </label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              placeholder="Client Company Name"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400"
            />
          </div>

          <div>
            <label className="block mb-2">
              Payroll Cycle <span className="text-primary-600">*</span>
            </label>
            <Dropdown
              value={formData.payrollCycle}
              onChange={(val) => setFormData({ ...formData, payrollCycle: val })}
              options={[
                { value: 'weekly', label: 'Weekly Cycle' },
                { value: 'fortnightly', label: 'Fortnightly Cycle' },
                { value: 'custom', label: 'Custom Protocol' }
              ]}
            />
          </div>

          <div>
            <label className="block mb-2">
              Cleaning Type <span className="text-primary-600">*</span>
            </label>
            <Dropdown
              value={formData.cleaningType}
              onChange={(val) => {
                const e = { target: { name: 'cleaningType', value: val } };
                handleChange(e);
              }}
              options={[
                { value: 'housekeeping', label: 'Housekeeping Operations' },
                { value: 'cleaning', label: 'Commercial Cleaning' }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-zinc-100 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-50 rounded-full mix-blend-multiply filter blur-3xl -mr-32 -mt-32 pointer-events-none opacity-50 overflow-hidden rounded-2xl"></div>
        <h3 className="text-p1 font-bold text-zinc-900 mb-6 relative z-10">Budget & Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div>
            <label className="block mb-2">
              Budgeted Hours (per cycle)
            </label>
            <div className="relative group/input">
              <input
                type="number"
                name="budgetedHours"
                value={formData.budgetedHours}
                onChange={handleChange}
                min="0"
                step="0.5"
                className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs pointer-events-none">HRS</span>
            </div>
          </div>

          <div>
            <label className="block mb-2">
              Budgeted Amount (per cycle)
            </label>
            <div className="relative group/input">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold group-focus-within/input:text-primary-500 transition-colors pointer-events-none">$</span>
              <input
                type="number"
                name="budgetedAmount"
                value={formData.budgetedAmount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full pl-8 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4 relative z-10">
          <div className="flex items-center p-4 bg-zinc-50/80 border border-zinc-200 rounded-xl hover:bg-white transition-all cursor-pointer group">
            <input
              type="checkbox"
              name="isTrainingSite"
              id="isTrainingSite"
              checked={formData.isTrainingSite}
              onChange={handleChange}
              disabled={formData.cleaningType !== 'housekeeping'}
              className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-zinc-300 rounded transition-all cursor-pointer disabled:opacity-50"
            />
            <div className="ml-3">
              <label htmlFor="isTrainingSite" className={`block text-p3 font-bold ${formData.cleaningType !== 'housekeeping' ? 'text-zinc-400' : 'text-zinc-800'} cursor-pointer`}>
                Enable Training Mode
              </label>
              <p className="text-xs text-zinc-500">Allows management of training pay escrow (Housekeeping only)</p>
            </div>
          </div>

          <div className={`p-5 rounded-xl border transition-all duration-300 ${formData.isSubSite ? 'bg-primary-50/40 border-primary-200' : 'bg-transparent border-transparent'}`}>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isSubSite"
                id="isSubSite"
                checked={formData.isSubSite}
                onChange={handleChange}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-zinc-300 rounded-lg transition-all cursor-pointer"
              />
              <label htmlFor="isSubSite" className="ml-3 block text-p3 font-bold text-zinc-900 cursor-pointer select-none">
                Mark as Sub-Site (Nested Project)
              </label>
            </div>

            {formData.isSubSite && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 pl-8">
                <label className="block mb-2">
                  Select Parent Site <span className="text-primary-600">*</span>
                </label>
                <Dropdown
                  value={formData.parentSiteId}
                  onChange={(val) => {
                    const e = { target: { name: 'parentSiteId', value: val } };
                    handleChange(e);
                  }}
                  options={allSites.map(s => ({ value: s.id, label: s.siteName }))}
                  placeholder="-- Choose Terminal Master --"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 text-zinc-600 bg-white border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 hover:border-zinc-300 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-8 py-3 text-white bg-primary-600 rounded-xl font-semibold hover:bg-primary-700 hover:-translate-y-0.5 transition-all"
        >
          {site ? 'Update Changes' : 'Create Site'}
        </button>
      </div>
    </form>
  );
};

export default SiteForm;
