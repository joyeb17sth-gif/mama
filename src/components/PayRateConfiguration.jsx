import { useState, useEffect } from 'react';
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
        <h3 className="text-lg font-semibold mb-4">All Saved Pay Rates</h3>
        {payRatesSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Site Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Weekday ($/hr)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Saturday ($/hr)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Sunday ($/hr)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Public Holiday ($/hr)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payRatesSummary.map((rate) => (
                  <tr key={rate.siteId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      {rate.siteName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700 border border-gray-300">
                      ${rate.weekday?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700 border border-gray-300">
                      ${rate.saturday?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700 border border-gray-300">
                      ${rate.sunday?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700 border border-gray-300">
                      ${rate.publicHoliday?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-600 mt-3">
              Total: {payRatesSummary.length} site(s) with configured pay rates
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">No pay rates configured yet. Configure pay rates for sites below.</p>
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
        <h3 className="text-lg font-semibold mb-4">Configure Pay Rates</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Site
          </label>
          <select
            value={selectedSite?.id || ''}
            onChange={(e) => {
              const site = sites.find(s => s.id === e.target.value);
              setSelectedSite(site || null);
            }}
            onFocus={loadSites}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a site...</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.siteName}
              </option>
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
