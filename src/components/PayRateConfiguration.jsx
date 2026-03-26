import React, { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import { getSites, getPayRates, savePayRates } from '../utils/storage';
import Toast from './Toast';

const PayRateConfiguration = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [rates, setRates] = useState({
    weekday: 0,
    saturday: 0,
    sunday: 0,
    publicHoliday: 0,
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = () => {
    setSites(getSites());
  };

  useEffect(() => {
    if (selectedSite) {
      loadRates();
    }
  }, [selectedSite]);

  const loadRates = () => {
    if (!selectedSite) return;
    const allRates = getPayRates();
    const siteRates = allRates.find(r => r.siteId === selectedSite.id);
    if (siteRates) {
      setRates({
        weekday: siteRates.weekday || 0,
        saturday: siteRates.saturday || 0,
        sunday: siteRates.sunday || 0,
        publicHoliday: siteRates.publicHoliday || 0,
      });
    } else {
      setRates({
        weekday: 0,
        saturday: 0,
        sunday: 0,
        publicHoliday: 0,
      });
    }
  };

  const handleRateChange = (dayType, value) => {
    setRates({
      ...rates,
      [dayType]: parseFloat(value) || 0,
    });
  };

  const handleSave = () => {
    if (!selectedSite) return;

    const allRates = getPayRates();
    const existingIndex = allRates.findIndex(r => r.siteId === selectedSite.id);

    const rateConfig = {
      siteId: selectedSite.id,
      siteName: selectedSite.siteName,
      ...rates,
    };

    if (existingIndex >= 0) {
      allRates[existingIndex] = rateConfig;
    } else {
      allRates.push(rateConfig);
    }

    savePayRates(allRates);
    setToastMessage(`Pay rates saved successfully for ${selectedSite.siteName}!`);
    setShowToast(true);
    loadRates(); // Refresh to show saved rates
  };

  // Get all pay rates summary
  const getAllPayRatesSummary = () => {
    const allRates = getPayRates();
    const currentSites = getSites();
    // Only show rates for sites that actually exist
    return allRates.filter(rate => currentSites.some(s => s.id === rate.siteId));
  };

  const payRatesSummary = getAllPayRatesSummary();

  return (
    <div className="space-y-8 p-2">
      {/* All Pay Rates Summary List */}
      <div className="bg-white rounded-[2rem] border border-zinc-100 overflow-hidden">
        <div className="p-8 border-b border-zinc-50 bg-gradient-to-br from-zinc-50/50 to-white">
          <h3 className="text-h1 font-bold text-zinc-900 tracking-tight">Financial Matrix</h3>
          <p className="text-p3 text-zinc-500 font-medium">Consolidated index of terminal-specific pay rate protocols.</p>
        </div>

        {payRatesSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-6 py-5 text-left text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                    Terminal Node
                  </th>
                  <th className="px-6 py-5 text-center text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                    Weekday Core
                  </th>
                  <th className="px-6 py-5 text-center text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                    Sat Premium
                  </th>
                  <th className="px-6 py-5 text-center text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                    Sun Premium
                  </th>
                  <th className="px-6 py-5 text-center text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                    Global Holiday
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-50">
                {payRatesSummary.map((rate) => (
                  <tr key={rate.siteId} className="hover:bg-zinc-50/50 transition-colors group/row">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover/row:bg-primary-50 group-hover/row:text-primary-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <span className="font-bold text-zinc-900 text-sm tracking-tight">{rate.siteName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-bold text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100 group-hover/row:bg-white transition-colors tracking-tight">
                        ${rate.weekday?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-sm text-zinc-900">
                      ${rate.saturday?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-sm text-zinc-900">
                      ${rate.sunday?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-sm text-primary-600 bg-primary-50/20">
                      ${rate.publicHoliday?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-8 border-t border-zinc-50 bg-zinc-50/30">
              <p className="text-p3 font-bold text-zinc-400 text-center">
                System Protocol: {payRatesSummary.length} Configured Site Terminals
              </p>
            </div>
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center text-zinc-300 mx-auto mb-6 border border-zinc-100">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h4 className="text-zinc-900 font-bold text-p3 mb-2">Matrix Depleted</h4>
            <p className="text-zinc-500 text-sm font-medium italic">Initialize terminal pay rate configuration parameters below.</p>
          </div>
        )}
      </div>

      {/* Pay Rate Configuration */}
      {/* Pay Rate Configuration */}
      <div className="bg-white rounded-[2rem] border border-zinc-100">
        {showToast && (
          <Toast
            message={toastMessage}
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
        <div className="p-8 border-b border-zinc-50 bg-gradient-to-br from-zinc-50/50 to-white rounded-t-[2rem]">
          <h3 className="text-h1 font-bold text-zinc-900 tracking-tight">Parameter Orchestration</h3>
          <p className="text-p3 text-zinc-500 font-medium">Fine-tune financial coefficients for selected terminal nodes.</p>
        </div>

        <div className="p-8">
          <div className="mb-10">
            <label className="block text-p3 font-bold text-zinc-400 mb-3 ml-1">
              Node Interface Selection
            </label>
            <Dropdown
              value={selectedSite?.id || ''}
              onChange={(val) => {
                const site = sites.find(s => s.id === val);
                setSelectedSite(site || null);
              }}
              options={sites.filter(s => !s.isSubSite).reduce((acc, mainSite) => {
                acc.push({ value: mainSite.id, label: `${mainSite.siteName} (Terminal One)` });
                const subs = sites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id);
                subs.forEach(sub => {
                  acc.push({ value: sub.id, label: `↳ Sub-Node: ${sub.siteName}` });
                });
                return acc;
              }, [])}
              placeholder="Select Target Site Node..."
            />
          </div>

          {selectedSite && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {Object.values(rates).some(r => r > 0) ? (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem] p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-emerald-900 leading-none mb-1">Active coefficients authorized</p>
                    <p className="text-xs text-emerald-600 font-bold">
                      WKD: ${rates.weekday} | SAT: ${rates.saturday} | SUN: ${rates.sunday} | PH: ${rates.publicHoliday}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/50 border border-amber-100 rounded-[1.5rem] p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-amber-900 leading-none mb-1">Protocol Warning: Unitialized values</p>
                    <p className="text-xs text-amber-600 font-bold">Terminal requires coefficient input for active deployment.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: 'weekday', label: 'Weekday Base Core', color: 'primary' },
                  { id: 'saturday', label: 'Saturday Weekend Premium', color: 'zinc' },
                  { id: 'sunday', label: 'Sunday Weekend Premium', color: 'zinc' },
                  { id: 'publicHoliday', label: 'Global Holiday Premium', color: 'amber' }
                ].map(field => (
                  <div key={field.id} className="group/field">
                    <label className="block text-p3 font-bold text-zinc-400 mb-3 ml-1 group-focus-within/field:text-zinc-900 transition-colors">
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={rates[field.id]}
                        onChange={(e) => handleRateChange(field.id, e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-5 py-4 bg-zinc-50 border border-transparent rounded-2xl focus:bg-white focus:border-zinc-900 outline-none font-bold text-zinc-900 transition-all text-p1 pl-10"
                      />
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">$</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <button
                  onClick={handleSave}
                  className="w-full md:w-auto px-12 py-5 bg-primary-600 text-white rounded-[1.5rem] hover:bg-primary-700 transition-all font-bold text-[11px] hover:-translate-y-1 active:translate-y-0"
                >
                  Authorize Parameters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayRateConfiguration;
