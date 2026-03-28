import React, { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import { getSites } from '../utils/storage';

const ContractorForm = ({ contractor, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: contractor?.name || '',
    phone: contractor?.phone || '',
    email: contractor?.email || '',
    contractorId: contractor?.contractorId || '',
    role: contractor?.role || '',
    bsb: contractor?.bsb || '',
    accountNumber: contractor?.accountNumber || '',
    accountName: contractor?.accountName || '',
    status: contractor?.status || 'active',
    isReferred: contractor?.isReferred || false,
    referralName: contractor?.referralName || '',
    customRates: contractor?.customRates || [],
  });

  const [phonePrefix, setPhonePrefix] = useState(
    contractor?.phone?.startsWith('+61') ? '+61' : '+977'
  );

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
    <form onSubmit={handleSubmit} className="space-y-8 font-sans animate-fade-in-up">
      <div className="bg-white p-8 rounded-2xl border border-zinc-100">
        <h3 className="text-p1 text-zinc-900 mb-6 font-bold">Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2">
              Full Name <span className="text-primary-600">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400"
            />
          </div>

          <div>
            <label className="block mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400"
            />
          </div>

          <div>
            <label className="block mb-2 text-p3 font-bold text-zinc-400 uppercase tracking-widest">
              Phone Number
            </label>
            <div className="relative flex">
              <select
                value={phonePrefix}
                onChange={(e) => {
                  const newPrefix = e.target.value;
                  setPhonePrefix(newPrefix);
                  // Optionally update formData if there's already a number
                  if (formData.phone) {
                    const cleanNum = formData.phone.replace(/^\+\d+\s?/, '');
                    setFormData({ ...formData, phone: `${newPrefix} ${cleanNum}` });
                  }
                }}
                className="absolute left-0 top-0 h-full pl-4 pr-2 bg-zinc-100/50 border-r border-zinc-200 rounded-l-xl text-sm font-bold text-zinc-600 outline-none hover:bg-zinc-200 transition-colors cursor-pointer appearance-none"
                style={{ width: '85px' }}
              >
                <option value="+977">NP +977</option>
                <option value="+61">AU +61</option>
              </select>
              <input
                type="tel"
                name="phone"
                value={formData.phone.startsWith(phonePrefix) ? formData.phone.replace(phonePrefix, '').trim() : formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, ''); // keep only digits
                  setFormData({
                    ...formData,
                    phone: `${phonePrefix} ${val}`
                  });
                }}
                placeholder="000000000"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400"
                style={{ paddingLeft: '95px' }}
              />
              <div className="absolute left-[70px] top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-2">
              Code <span className="text-primary-600">*</span>
            </label>
            <input
              type="text"
              name="contractorId"
              value={formData.contractorId}
              onChange={handleChange}
              required
              placeholder="CODE-001"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400 font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-2">
              Contractor Roles
            </label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder="e.g. Housekeeping, Supervisor, General Cleaner"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-zinc-100">
        <h3 className="text-p1 text-zinc-900 mb-6 font-bold">Financial Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block mb-2">
              BSB <span className="text-primary-600">*</span>
            </label>
            <input
              type="text"
              name="bsb"
              value={formData.bsb}
              onChange={handleChange}
              required
              pattern="[0-9]{6}"
              placeholder="000000"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400 font-mono tracking-widest"
            />
          </div>

          <div>
            <label className="block mb-2">
              Account Number <span className="text-primary-600">*</span>
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              required
              placeholder="00000000"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400 font-mono tracking-widest"
            />
          </div>

          <div>
            <label className="block mb-2">
              Account Name <span className="text-primary-600">*</span>
            </label>
            <input
              type="text"
              name="accountName"
              value={formData.accountName}
              onChange={handleChange}
              required
              placeholder="Account Holder Name"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-all font-medium text-zinc-900 placeholder-zinc-400"
            />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2">
              Status <span className="text-primary-600">*</span>
            </label>
            <Dropdown
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
              options={[
                { value: 'active', label: 'Active Protocol' },
                { value: 'inactive', label: 'Suspended Status' }
              ]}
            />
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-100 transition-colors">
              <input
                type="checkbox"
                name="isReferred"
                id="isReferred"
                checked={formData.isReferred}
                onChange={handleChange}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-zinc-300 rounded transition-all cursor-pointer"
              />
              <label htmlFor="isReferred" className="ml-3 block text-sm text-zinc-700 font-semibold cursor-pointer select-none">
                Has Referral Source?
              </label>
            </div>

            {formData.isReferred && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-p3 text-primary-600 uppercase tracking-widest mb-2 font-bold">
                  Referral Name <span className="text-primary-600">*</span>
                </label>
                <input
                  type="text"
                  name="referralName"
                  value={formData.referralName}
                  onChange={handleChange}
                  required={formData.isReferred}
                  placeholder="Who referred this contractor?"
                  className="w-full px-4 py-3 border border-primary-200 bg-primary-50/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-all font-medium text-primary-900 placeholder-primary-300"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-zinc-100 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none rounded-2xl"></div>

        <h3 className="text-p1 text-zinc-900 mb-2 relative z-10 font-bold">Custom Pay Rates</h3>
        <p className="text-p3 text-zinc-500 font-medium mb-6 relative z-10">Set specific rates for this contractor that override site defaults.</p>

        {/* Add Entry Card */}
        <div className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-200 mb-6 relative z-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-end">
            <div className="lg:col-span-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Select Site</label>
              <Dropdown
                value={newRateSiteId}
                onChange={(val) => setNewRateSiteId(val)}
                options={availableSites
                  .filter(s => !s.isSubSite)
                  .reduce((acc, mainSite) => {
                    const isMainAdded = formData.customRates.some(r => r.siteId === mainSite.id);
                    const subs = availableSites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id);

                    acc.push({
                      value: mainSite.id,
                      label: `${mainSite.siteName} ${isMainAdded ? '(Active)' : ''}`,
                      disabled: isMainAdded,
                      isParent: subs.length > 0
                    });

                    subs.forEach((sub, idx) => {
                      const isSubAdded = formData.customRates.some(r => r.siteId === sub.id);
                      acc.push({
                        value: sub.id,
                        label: `${sub.siteName} ${isSubAdded ? '(Active)' : ''}`,
                        disabled: isSubAdded,
                        isSubItem: true,
                        isLastSubItem: idx === subs.length - 1
                      });
                    });
                    return acc;
                  }, [])
                }
                placeholder="Choose Site..."
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
            onClick={handleAddCustomRate}
            disabled={!newRateSiteId}
            className="mt-6 w-full lg:w-auto px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
          >
            + Add Rate Override
          </button>
        </div>

        {/* List of overrides */}
        <div className="space-y-3 relative z-10">
          {formData.customRates.length > 0 && (
            <div className="grid grid-cols-5 gap-4 px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <div className="col-span-1">Site</div>
              <div className="col-span-3 grid grid-cols-4 gap-4 text-center">
                <span>Mon-Fri</span>
                <span>Sat</span>
                <span>Sun</span>
                <span>PH</span>
              </div>
              <div className="col-span-1 text-right">Action</div>
            </div>
          )}
          {formData.customRates.map(rate => (
            <div key={rate.siteId} className="grid grid-cols-5 gap-4 items-center p-4 bg-white border border-zinc-100 rounded-xl hover:border-primary-200 transition-all group">
              <div className="col-span-1">
                <div className="text-sm font-bold text-zinc-900 truncate" title={rate.siteName}>{rate.siteName}</div>
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
                  onClick={() => removeCustomRate(rate.siteId)}
                  className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  title="Remove Override"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {formData.customRates.length === 0 && (
            <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/30">
              <div className="mb-2 text-4xl opacity-20">🏷️</div>
              <div className="text-zinc-500 font-medium text-sm">No specific rate overrides configured</div>
              <div className="text-zinc-400 text-xs mt-1">Default site rates will be applied automatically</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-6">
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
          {contractor ? 'Update Changes' : 'Create Contractor'}
        </button>
      </div>
    </form>
  );
};

export default ContractorForm;
