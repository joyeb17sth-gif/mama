import React, { useState, useEffect } from 'react';
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
    <div className="space-y-6">
      {/* All Pay Rates Summary List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 uppercase tracking-tight">All Saved Pay Rates</h3>
        {payRatesSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-100 rounded-xl overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Site Name
                  </th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Weekday ($/hr)
                  </th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Saturday ($/hr)
                  </th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Sunday ($/hr)
                  </th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Public Holiday ($/hr)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {payRatesSummary.map((rate) => (
                  <tr key={rate.siteId} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {rate.siteName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-700 font-medium">
                      ${rate.weekday?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-700 font-medium">
                      ${rate.saturday?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-700 font-medium">
                      ${rate.sunday?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-700 font-medium">
                      ${rate.publicHoliday?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-gray-400 font-black uppercase mt-3 tracking-widest">
              Total: {payRatesSummary.length} configured sites
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center">
            <p className="text-gray-500 font-medium">No pay rates configured yet. Configure pay rates for sites below.</p>
          </div>
        )}
      </div>

      {/* Pay Rate Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        {showToast && (
          <Toast
            message={toastMessage}
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
        <h3 className="text-lg font-semibold mb-6 text-gray-900 uppercase tracking-tight">Configure Pay Rates</h3>

        <div className="mb-6">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Select Site
          </label>
          <select
            value={selectedSite?.id || ''}
            onChange={(e) => {
              const site = sites.find(s => s.id === e.target.value);
              setSelectedSite(site || null);
            }}
            onFocus={loadSites}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none font-bold text-gray-900 transition-all shadow-sm"
          >
            <option value="">Choose a site...</option>
            {sites.filter(s => !s.isSubSite).map(mainSite => (
              <React.Fragment key={mainSite.id}>
                <option value={mainSite.id} className="font-black text-blue-600 bg-blue-50">
                  🏢 {mainSite.siteName} (Primary)
                </option>
                {sites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id).map(subSite => (
                  <option key={subSite.id} value={subSite.id} className="pl-4">
                    &nbsp;&nbsp;&nbsp;↳ {subSite.siteName}
                  </option>
                ))}
              </React.Fragment>
            ))}
          </select>
        </div>

        {selectedSite && (
          <div className="space-y-4">
            {Object.values(rates).some(r => r > 0) ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-700 font-medium">
                  ✓ Pay rates configured: Weekday ${rates.weekday}/hr | Sat ${rates.saturday}/hr | Sun ${rates.sunday}/hr | PH ${rates.publicHoliday}/hr
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-700">
                  ⚠️ No pay rates configured for this site yet
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekday Rate ($/hour)
                </label>
                <input
                  type="number"
                  value={rates.weekday}
                  onChange={(e) => handleRateChange('weekday', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saturday Rate ($/hour)
                </label>
                <input
                  type="number"
                  value={rates.saturday}
                  onChange={(e) => handleRateChange('saturday', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sunday Rate ($/hour)
                </label>
                <input
                  type="number"
                  value={rates.sunday}
                  onChange={(e) => handleRateChange('sunday', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Public Holiday Rate ($/hour)
                </label>
                <input
                  type="number"
                  value={rates.publicHoliday}
                  onChange={(e) => handleRateChange('publicHoliday', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Save Pay Rates
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayRateConfiguration;
