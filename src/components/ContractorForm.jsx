import React, { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import { getSites } from '../utils/storage';
import { ContractorSchema, validateData } from '../utils/validation';

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

  const [validationError, setValidationError] = useState('');

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
    setValidationError('');
    
    // Strict Input Validation
    const validationResult = validateData(ContractorSchema, formData);
    if (!validationResult.success) {
      setValidationError(validationResult.error);
      return;
    }

    onSave(validationResult.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in-up">
      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-bold shadow-sm animate-fade-in">
          {validationError}
        </div>
      )}
      <div className="notion-card p-10">
        <h3 className="text-display-secondary text-notion-black tracking-notion-display mb-8">Personal Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Identity Name <span className="text-notion-blue">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 transition-all"
            />
          </div>

          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Electronic Mail
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              className="w-full px-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 transition-all"
            />
          </div>

          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Contact Liaison
            </label>
            <div className="relative flex">
              <select
                value={phonePrefix}
                onChange={(e) => {
                  const newPrefix = e.target.value;
                  setPhonePrefix(newPrefix);
                  if (formData.phone) {
                    const cleanNum = formData.phone.replace(/^\+\d+\s?/, '');
                    setFormData({ ...formData, phone: `${newPrefix} ${cleanNum}` });
                  }
                }}
                className="absolute left-0 top-0 h-full pl-4 pr-2 bg-white whisper-border border-r-0 rounded-l-micro text-badge font-bold text-notion-black outline-none hover:bg-notion-warm-white transition-colors cursor-pointer appearance-none z-10"
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
                  const val = e.target.value.replace(/\D/g, ''); 
                  setFormData({
                    ...formData,
                    phone: `${phonePrefix} ${val}`
                  });
                }}
                placeholder="000 000 000"
                className="w-full px-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 transition-all"
                style={{ paddingLeft: '95px' }}
              />
              <div className="absolute left-[65px] top-1/2 -translate-y-1/2 pointer-events-none z-20">
                <svg className="w-2.5 h-2.5 text-notion-warm-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Access Codes <span className="text-notion-blue">*</span>
            </label>
            <div className="w-full px-3 py-2 bg-notion-warm-white whisper-border rounded-micro focus-within:shadow-notion-card transition-all min-h-[48px]">
              <div className="flex flex-wrap gap-2 items-center">
                {(formData.contractorId || '').split(',').filter(c => c.trim()).map((code, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-notion-black text-white rounded-micro text-badge font-bold tracking-widest uppercase shadow-notion-card"
                  >
                    {code.trim()}
                    <button
                      type="button"
                      onClick={() => {
                        const codes = formData.contractorId.split(',').filter(c => c.trim());
                        codes.splice(idx, 1);
                        setFormData({ ...formData, contractorId: codes.join(',') });
                      }}
                      className="w-4 h-4 flex items-center justify-center rounded-micro hover:bg-white/20 transition-colors"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={(formData.contractorId || '').split(',').filter(c => c.trim()).length === 0 ? "Type code & Enter" : "+ Add code"}
                  className="flex-1 min-w-[120px] py-1 bg-transparent outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 uppercase tracking-widest text-badge"
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ',') && e.target.value.trim()) {
                      e.preventDefault();
                      const newCode = e.target.value.trim().toUpperCase();
                      const existing = (formData.contractorId || '').split(',').filter(c => c.trim());
                      if (!existing.includes(newCode)) {
                        setFormData({ ...formData, contractorId: [...existing, newCode].join(',') });
                      }
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Functional Designations
            </label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder="e.g. Environmental Services, Supervisor, Logistics Specialist"
              className="w-full px-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="notion-card p-10">
        <h3 className="text-display-secondary text-notion-black tracking-notion-display mb-8">Financial Architecture</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              BSB Routing <span className="text-notion-blue">*</span>
            </label>
            <input
              type="text"
              name="bsb"
              value={formData.bsb}
              onChange={handleChange}
              required
              pattern="[0-9]{6}"
              placeholder="000-000"
              className="w-full px-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 tracking-notion-display tabular-nums"
            />
          </div>

          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Ledger Account <span className="text-notion-blue">*</span>
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              required
              placeholder="00000000"
              className="w-full px-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 tracking-notion-display tabular-nums"
            />
          </div>

          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Account Holder <span className="text-notion-blue">*</span>
            </label>
            <input
              type="text"
              name="accountName"
              value={formData.accountName}
              onChange={handleChange}
              required
              placeholder="Full Legal Name"
              className="w-full px-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 transition-all"
            />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Operational Status <span className="text-notion-blue">*</span>
            </label>
            <Dropdown
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
              options={[
                { value: 'active', label: 'Authorized Active' },
                { value: 'inactive', label: 'Administrative Suspension' }
              ]}
            />
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center p-3.5 bg-notion-warm-white whisper-border rounded-micro cursor-pointer hover:bg-zinc-200 transition-colors shadow-sm">
              <input
                type="checkbox"
                name="isReferred"
                id="isReferred"
                checked={formData.isReferred}
                onChange={handleChange}
                className="h-4 w-4 text-notion-blue focus:ring-0 border-notion-warm-gray-300 rounded-micro transition-all cursor-pointer"
              />
              <label htmlFor="isReferred" className="ml-3 block text-badge font-bold text-notion-black uppercase tracking-widest cursor-pointer select-none">
                Referral Protocol?
              </label>
            </div>

            {formData.isReferred && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-badge font-bold text-notion-blue uppercase tracking-widest pl-1 mb-2 block">
                  Reference Identity <span className="text-notion-blue">*</span>
                </label>
                <input
                  type="text"
                  name="referralName"
                  value={formData.referralName}
                  onChange={handleChange}
                  required={formData.isReferred}
                  placeholder="Who authorized this referral?"
                  className="w-full px-4 py-3 whisper-border bg-white rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 transition-all border-notion-blue"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="notion-card p-10 relative overflow-hidden">
        <h3 className="text-display-secondary text-notion-black tracking-notion-display mb-2">Compensation Matrix</h3>
        <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mb-10">Define custom rate overrides per terminal site. Required for automated pay synthesis.</p>

        {/* Add Entry Card */}
        <div className="bg-notion-warm-white/50 p-8 rounded-comfortable whisper-border mb-10 relative z-50 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
            <div className="lg:col-span-1">
              <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-3 block">Deployment Site</label>
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
                      label: `${mainSite.siteName} ${isMainAdded ? '(Locked)' : ''}`,
                      disabled: isMainAdded,
                      isParent: subs.length > 0
                    });

                    subs.forEach((sub, idx) => {
                      const isSubAdded = formData.customRates.some(r => r.siteId === sub.id);
                      acc.push({
                        value: sub.id,
                        label: `${sub.siteName} ${isSubAdded ? '(Locked)' : ''}`,
                        disabled: isSubAdded,
                        isSubItem: true,
                        isLastSubItem: idx === subs.length - 1
                      });
                    });
                    return acc;
                  }, [])
                }
                placeholder="Select Site..."
              />
            </div>
            {['weekday', 'saturday', 'sunday', 'publicHoliday'].map(type => (
              <div key={type}>
                <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-3 block truncate">{type === 'publicHoliday' ? 'P. Holiday' : type}</label>
                <div className="relative group/input">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-warm-gray-100 font-bold group-focus-within/input:text-notion-blue transition-colors">$</span>
                  <input
                    type="number"
                    value={newRates[type]}
                    onChange={(e) => setNewRates({ ...newRates, [type]: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2.5 bg-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all tabular-nums"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddCustomRate}
            disabled={!newRateSiteId}
            className="mt-8 w-full lg:w-auto px-10 py-3 bg-notion-black text-white rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-black transition shadow-notion-deep disabled:opacity-20 hover:-translate-y-0.5 active:translate-y-0"
          >
            + Register Override
          </button>
        </div>

        {/* List of overrides */}
        <div className="space-y-4 relative z-10">
          {formData.customRates.length > 0 && (
            <div className="grid grid-cols-5 gap-6 px-6 py-2 text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
              <div className="col-span-1">Site Identification</div>
              <div className="col-span-3 grid grid-cols-4 gap-6 text-center">
                <span>W.Day</span>
                <span>Sat</span>
                <span>Sun</span>
                <span>P.H</span>
              </div>
              <div className="col-span-1 text-right">Operation</div>
            </div>
          )}
          {formData.customRates.map(rate => (
            <div key={rate.siteId} className="grid grid-cols-5 gap-6 items-center p-6 bg-notion-warm-white/30 whisper-border rounded-comfortable hover:shadow-notion-card transition-all group">
              <div className="col-span-1">
                <div className="text-body-semibold text-notion-black uppercase tracking-tight truncate" title={rate.siteName}>{rate.siteName}</div>
              </div>
              <div className="col-span-3 grid grid-cols-4 gap-6">
                <div className="text-center font-bold text-notion-black tabular-nums bg-white whisper-border px-3 py-1.5 rounded-micro shadow-sm">${rate.weekday.toFixed(2)}</div>
                <div className="text-center font-bold text-notion-black tabular-nums bg-white whisper-border px-3 py-1.5 rounded-micro shadow-sm">${rate.saturday.toFixed(2)}</div>
                <div className="text-center font-bold text-notion-black tabular-nums bg-white whisper-border px-3 py-1.5 rounded-micro shadow-sm">${rate.sunday.toFixed(2)}</div>
                <div className="text-center font-bold text-notion-black tabular-nums bg-white whisper-border px-3 py-1.5 rounded-micro shadow-sm">${rate.publicHoliday.toFixed(2)}</div>
              </div>
              <div className="col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => removeCustomRate(rate.siteId)}
                  className="p-2.5 text-notion-warm-gray-100 hover:text-rose-600 hover:bg-notion-badge-rose-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                  title="Purge Override"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {formData.customRates.length === 0 && (
            <div className="text-center py-16 whisper-border border-dashed rounded-comfortable bg-notion-warm-white/10">
              <div className="mb-4 text-4xl opacity-10">🏷️</div>
              <div className="text-notion-warm-gray-300 font-bold text-badge uppercase tracking-widest">No custom overrides identified</div>
              <div className="text-notion-warm-gray-100 text-badge font-bold uppercase tracking-widest mt-2">Initialize rates to enable automated pay synthesis</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end items-center gap-6 pt-10">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-4 text-notion-black bg-white whisper-border rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-warm-white transition shadow-sm"
        >
          Abort Changes
        </button>
        <button
          type="submit"
          className="px-12 py-4 text-white bg-notion-blue rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-blue-active transition-all shadow-notion-card hover:-translate-y-0.5 active:translate-y-0"
        >
          {contractor ? 'Commit Modifications' : 'Initialize Personnel'}
        </button>
      </div>
    </form>
  );
};

export default ContractorForm;
