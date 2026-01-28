import React, { useState, useEffect } from 'react';
import { getSites } from '../utils/storage';

const ContractorForm = ({ contractor, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: contractor?.name || '',
    contractorId: contractor?.contractorId || '',
    bsb: contractor?.bsb || '',
    accountNumber: contractor?.accountNumber || '',
    accountName: contractor?.accountName || '',
    status: contractor?.status || 'active',
    isReferred: contractor?.isReferred || false,
    referralName: contractor?.referralName || '',
    customRates: contractor?.customRates || [],
  });

  const [newRateSiteId, setNewRateSiteId] = useState('');
  const [newRates, setNewRates] = useState({ weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 });
  const [availableSites, setAvailableSites] = useState([]);

  useEffect(() => {
    setAvailableSites(getSites());
  }, []);

  const handleAddCustomRate = () => {
    if (!newRateSiteId) return;
    const site = availableSites.find(s => s.id === newRateSiteId);
    const updatedRates = [...formData.customRates, {
      siteId: site.id,
      siteName: site.siteName,
      ...newRates
    }];
    setFormData({ ...formData, customRates: updatedRates });
    setNewRateSiteId('');
    setNewRates({ weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 });
  };

  const removeCustomRate = (siteId) => {
    setFormData({
      ...formData,
      customRates: formData.customRates.filter(r => r.siteId !== siteId)
    });
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-inter">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Contractor ID *
          </label>
          <input
            type="text"
            name="contractorId"
            value={formData.contractorId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            BSB *
          </label>
          <input
            type="text"
            name="bsb"
            value={formData.bsb}
            onChange={handleChange}
            required
            pattern="[0-9]{6}"
            placeholder="000000"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Account Number *
          </label>
          <input
            type="text"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Account Name *
          </label>
          <input
            type="text"
            name="accountName"
            value={formData.accountName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Status *
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            name="isReferred"
            id="isReferred"
            checked={formData.isReferred}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
          />
          <label htmlFor="isReferred" className="ml-2 block text-sm text-slate-700 font-medium">
            Referral Check (Referred by someone)
          </label>
        </div>

        {formData.isReferred && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Referral Person Name *
            </label>
            <input
              type="text"
              name="referralName"
              value={formData.referralName}
              onChange={handleChange}
              required={formData.isReferred}
              placeholder="Who referred this contractor?"
              className="w-full px-3 py-2 border border-blue-200 bg-blue-50/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-4">Custom Pay Rates Override</h3>
        <p className="text-xs text-slate-400 font-medium mb-6">Set specific rates for this contractor that override site defaults.</p>

        {/* Add Entry Card */}
        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Select Site</label>
              <select
                value={newRateSiteId}
                onChange={(e) => setNewRateSiteId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
              >
                <option value="">Choose Site...</option>
                {availableSites
                  .filter(s => !s.isSubSite) // Get all main sites
                  .filter(mainSite => {
                    // Show if main site isn't added OR if it has any sub-site not yet added
                    const mainNotAdded = !formData.customRates.some(r => r.siteId === mainSite.id);
                    const hasAvailableSubSites = availableSites.some(s =>
                      s.isSubSite && s.parentSiteId === mainSite.id && !formData.customRates.some(r => r.siteId === s.id)
                    );
                    return mainNotAdded || hasAvailableSubSites;
                  })
                  .map(mainSite => {
                    const isMainAdded = formData.customRates.some(r => r.siteId === mainSite.id);
                    return (
                      <React.Fragment key={mainSite.id}>
                        <option
                          value={mainSite.id}
                          disabled={isMainAdded}
                          className={isMainAdded ? "text-slate-300" : "font-semibold text-blue-600 bg-blue-50"}
                        >
                          🏢 {mainSite.siteName} (Primary) {isMainAdded ? '- Already Added' : ''}
                        </option>
                        {availableSites
                          .filter(s => s.isSubSite && s.parentSiteId === mainSite.id)
                          .map(subSite => {
                            const isSubAdded = formData.customRates.some(r => r.siteId === subSite.id);
                            return (
                              <option
                                key={subSite.id}
                                value={subSite.id}
                                disabled={isSubAdded}
                                className={`pl-4 ${isSubAdded ? 'text-slate-300' : ''}`}
                              >
                                &nbsp;&nbsp;&nbsp;↳ {subSite.siteName} {isSubAdded ? '- Already Added' : ''}
                              </option>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
              </select>
            </div>
            {['weekday', 'saturday', 'sunday', 'publicHoliday'].map(type => (
              <div key={type}>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{type}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-medium">$</span>
                  <input
                    type="number"
                    value={newRates[type]}
                    onChange={(e) => setNewRates({ ...newRates, [type]: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddCustomRate}
            disabled={!newRateSiteId}
            className="mt-6 w-full lg:w-auto px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-100"
          >
            + Add Custom Rate Override
          </button>
        </div>

        {/* List of overrides */}
        <div className="space-y-3">
          {formData.customRates.map(rate => (
            <div key={rate.siteId} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition group">
              <div>
                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-tighter">{rate.siteName}</div>
                <div className="flex gap-4 mt-1">
                  <span className="text-[10px] font-medium text-slate-400">Regular: <b className="text-slate-800">${rate.weekday}</b></span>
                  <span className="text-[10px] font-medium text-slate-400">Sat: <b className="text-slate-800">${rate.saturday}</b></span>
                  <span className="text-[10px] font-medium text-slate-400">Sun: <b className="text-slate-800">${rate.sunday}</b></span>
                  <span className="text-[10px] font-medium text-slate-400">PH: <b className="text-slate-800">${rate.publicHoliday}</b></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeCustomRate(rate.siteId)}
                className="p-2 opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
          {formData.customRates.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl text-slate-300 font-medium uppercase tracking-widest text-[10px]">No overrides set. Default site rates will be used.</div>
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
          {contractor ? 'Update' : 'Add'} Contractor
        </button>
      </div>
    </form>
  );
};

export default ContractorForm;
