import { useState, useEffect } from 'react';
import { generatePeriodDates, formatDateDisplay } from '../utils/dateUtils';
import { calculateTimesheetPay } from '../utils/payrollCalculations';
import { getPayRates } from '../utils/storage';
import Toast from './Toast';

const TimesheetEntry = ({ site, periodStart, periodEnd, contractors, onSave }) => {
  const [dates, setDates] = useState([]);
  const [entries, setEntries] = useState([]);
  const [payRates, setPayRates] = useState({});
  const [manualLumpSum, setManualLumpSum] = useState({});
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (site && periodStart && periodEnd) {
      const periodDates = generatePeriodDates(periodStart, periodEnd);
      setDates(periodDates);
      
      // Load pay rates for this site
      const allRates = getPayRates();
      const siteRates = allRates.find(r => r.siteId === site.id);
      if (siteRates) {
        setPayRates({
          weekday: siteRates.weekday || 0,
          saturday: siteRates.saturday || 0,
          sunday: siteRates.sunday || 0,
          publicHoliday: siteRates.publicHoliday || 0,
        });
      } else {
        setPayRates({
          weekday: 0,
          saturday: 0,
          sunday: 0,
          publicHoliday: 0,
        });
        alert('⚠️ No pay rates configured for this site. Please configure pay rates first.');
      }
      
      // Initialize entries from allocated contractors
      const allocatedContractors = contractors.filter(c => 
        site.allocatedContractors?.includes(c.id)
      );
      
      if (allocatedContractors.length === 0) {
        alert('⚠️ No contractors allocated to this site. Please allocate contractors first.');
        return;
      }
      
      setEntries(allocatedContractors.map(contractor => ({
        contractorId: contractor.id,
        contractorName: contractor.name,
        dailyHours: periodDates.map(d => ({
          date: d.date,
          hours: 0,
          isTraining: false,
        })),
        manualLumpSumHours: null,
      })));
    }
  }, [site, periodStart, periodEnd, contractors]);

  const handleHoursChange = (contractorId, date, value) => {
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId) {
        return {
          ...entry,
          dailyHours: entry.dailyHours.map(dh =>
            dh.date === date ? { ...dh, hours: parseFloat(value) || 0 } : dh
          ),
        };
      }
      return entry;
    }));
  };

  const handleTrainingToggle = (contractorId, date) => {
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId) {
        return {
          ...entry,
          dailyHours: entry.dailyHours.map(dh =>
            dh.date === date ? { ...dh, isTraining: !dh.isTraining } : dh
          ),
        };
      }
      return entry;
    }));
  };

  const handleLumpSumChange = (contractorId, value) => {
    setManualLumpSum({
      ...manualLumpSum,
      [contractorId]: parseFloat(value) || null,
    });
    
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId) {
        return {
          ...entry,
          manualLumpSumHours: parseFloat(value) || null,
        };
      }
      return entry;
    }));
  };

  const handleSave = () => {
    const timesheet = {
      id: Date.now().toString(),
      siteId: site.id,
      siteName: site.siteName,
      periodStart,
      periodEnd,
      entries: entries.map(entry => ({
        ...entry,
        ...calculateTimesheetPay(entry, payRates),
      })),
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    onSave(timesheet);
    setShowToast(true);
  };

  if (entries.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          No contractors allocated to this site. Please allocate contractors first in the Allocation tab.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {showToast && (
        <Toast
          message={`Timesheet saved successfully for ${site.siteName}!`}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            Timesheet: {site.siteName} - {periodStart} to {periodEnd}
          </h3>
          {Object.values(payRates).some(r => r > 0) ? (
            <p className="text-sm text-gray-600 mt-1">
              Rates: Weekday ${payRates.weekday}/hr | Sat ${payRates.saturday}/hr | Sun ${payRates.sunday}/hr | PH ${payRates.publicHoliday}/hr
            </p>
          ) : (
            <p className="text-sm text-yellow-600 mt-1">
              ⚠️ No pay rates configured. Please set pay rates in the Pay Rates tab.
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          Save Timesheet
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700 sticky left-0 bg-gray-100 z-10">
                Employee Name
              </th>
              {dates.map(date => (
                <th
                  key={date.date}
                  className="border border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700 min-w-[100px]"
                >
                  {formatDateDisplay(date.date)}
                </th>
              ))}
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                Total Hours
              </th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                Payable Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => {
              const calculation = calculateTimesheetPay(entry, payRates);
              return (
                <tr key={entry.contractorId} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="font-medium text-sm">{entry.contractorName}</div>
                    {site.isTrainingSite && (
                      <div className="text-xs text-gray-500 mt-1">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={entry.manualLumpSumHours !== null}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                handleLumpSumChange(entry.contractorId, '');
                              }
                            }}
                            className="mr-1"
                          />
                          Manual Lump Sum
                        </label>
                        {entry.manualLumpSumHours !== null && (
                          <input
                            type="number"
                            value={entry.manualLumpSumHours || ''}
                            onChange={(e) => handleLumpSumChange(entry.contractorId, e.target.value)}
                            className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            placeholder="Total hours"
                          />
                        )}
                      </div>
                    )}
                  </td>
                  {dates.map(date => {
                    const dayEntry = entry.dailyHours.find(dh => dh.date === date.date);
                    return (
                      <td key={date.date} className="border border-gray-300 px-1 py-1">
                        <input
                          type="number"
                          value={dayEntry?.hours || ''}
                          onChange={(e) => handleHoursChange(entry.contractorId, date.date, e.target.value)}
                          min="0"
                          step="0.5"
                          disabled={entry.manualLumpSumHours !== null}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        {site.isTrainingSite && (
                          <label className="flex items-center mt-1 text-xs">
                            <input
                              type="checkbox"
                              checked={dayEntry?.isTraining || false}
                              onChange={() => handleTrainingToggle(entry.contractorId, date.date)}
                              disabled={entry.manualLumpSumHours !== null}
                              className="mr-1"
                            />
                            Training
                          </label>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                    {calculation.totalHours.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-medium text-green-600">
                    ${calculation.totalPay.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimesheetEntry;
