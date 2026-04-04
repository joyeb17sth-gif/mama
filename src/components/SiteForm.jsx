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
    codeRates: site?.codeRates || [],
  });

  const [newRateCode, setNewRateCode] = useState('');
  const [newRates, setNewRates] = useState({ weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 });

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
        codeRates: site.codeRates || [],
      });
    }
  }, [site]);

  const handleAddCodeRate = () => {
    if (!newRateCode.trim()) return;
    const updatedRates = [...(formData.codeRates || []), {
      code: newRateCode.toUpperCase().trim(),
      ...newRates
    }];
    setFormData({ ...formData, codeRates: updatedRates });
    setNewRateCode('');
    setNewRates({ weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 });
  };

  const removeCodeRate = (codeToRemove) => {
    setFormData({
      ...formData,
      codeRates: (formData.codeRates || []).filter(r => r.code !== codeToRemove)
    });
  };

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

      <div className="bg-white p-8 rounded-2xl border border-zinc-100 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none rounded-2xl"></div>

        <h3 className="text-p1 text-zinc-900 mb-2 relative z-10 font-bold">Code-Based Pay Rates</h3>
        <p className="text-p3 text-zinc-500 font-medium mb-6 relative z-10">Configure default pay rates for specific Role Codes on this site.</p>

        {/* Add Entry Card */}
        <div className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-200 mb-6 relative z-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-end">
            <div className="lg:col-span-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Contractor Code</label>
              <input
                type="text"
                value={newRateCode}
                onChange={(e) => setNewRateCode(e.target.value)}
                placeholder="e.g. PTE-2"
                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 font-semibold text-zinc-900 transition-all uppercase tracking-widest text-sm"
              />
            </div>
            {['weekday', 'saturday', 'sunday', 'publicHoliday'].map(type => (
              <div key={type}>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{type}</label>
                <div className="relative group/input">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 font-bold group-focus-within/input:text-primary-500 transition-colors">$</span>
                  <input
                    type="number"
                    value={newRates[type]}
                    onChange={(e) => setNewRates({ ...newRates, [type]: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-6 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 font-semibold text-zinc-900 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddCodeRate}
            disabled={!newRateCode.trim()}
            className="mt-6 w-full lg:w-auto px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
          >
            + Add Code Rate
          </button>
        </div>

        {/* List of overrides */}
        <div className="space-y-3 relative z-10">
          {(formData.codeRates || []).length > 0 && (
            <div className="grid grid-cols-5 gap-4 px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <div className="col-span-1">Code</div>
              <div className="col-span-3 grid grid-cols-4 gap-4 text-center">
                <span>Mon-Fri</span>
                <span>Sat</span>
                <span>Sun</span>
                <span>PH</span>
              </div>
              <div className="col-span-1 text-right">Action</div>
            </div>
          )}
          {(formData.codeRates || []).map(rate => (
            <div key={rate.code} className="grid grid-cols-5 gap-4 items-center p-4 bg-white border border-zinc-100 rounded-xl hover:border-primary-200 transition-all group">
              <div className="col-span-1">
                <div className="text-sm font-bold text-zinc-900 truncate tracking-widest">{rate.code}</div>
              </div>
              <div className="col-span-3 grid grid-cols-4 gap-4">
                <div className="text-center"><span className="text-xs font-semibold text-zinc-700 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">${rate.weekday}</span></div>
                <div className="text-center"><span className="text-xs font-semibold text-zinc-700 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">${rate.saturday}</span></div>
                <div className="text-center"><span className="text-xs font-semibold text-zinc-700 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">${rate.sunday}</span></div>
                <div className="text-center"><span className="text-xs font-semibold text-zinc-700 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">${rate.publicHoliday}</span></div>
              </div>
              <div className="col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => removeCodeRate(rate.code)}
                  className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  title="Remove Code Rate"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {(formData.codeRates || []).length === 0 && (
            <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/30">
              <div className="mb-2 text-4xl opacity-20">🏷️</div>
              <div className="text-zinc-500 font-medium text-sm">No code-based rates configured</div>
              <div className="text-zinc-400 text-xs mt-1">Add rates for specific worker codes</div>
            </div>
          )}
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
