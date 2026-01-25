import { useState, useEffect } from 'react';
import { generatePeriodDates, formatDateDisplay } from '../utils/dateUtils';
import { checkBudgetStatus, calculateTimesheetPay } from '../utils/payrollCalculations';
import { getPayRates, getTimesheets } from '../utils/storage';
import Toast from './Toast';

const TimesheetEntry = ({ site, periodStart, periodEnd, contractors, onSave, initialData = null }) => {
  const [dates, setDates] = useState([]);
  const [entries, setEntries] = useState([]);
  const [payRates, setPayRates] = useState({});
  const [manualLumpSum, setManualLumpSum] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [totalStats, setTotalStats] = useState({ hours: 0, pay: 0 });

  useEffect(() => {
    if (entries.length > 0) {
      const totals = entries.reduce((acc, entry) => {
        const calc = calculateTimesheetPay(entry, payRates);
        return {
          hours: acc.hours + calc.totalHours,
          pay: acc.pay + calc.totalPay
        };
      }, { hours: 0, pay: 0 });

      setTotalStats(totals);

      if (site.budgetedHours || site.budgetedAmount) {
        const siteBudgetHours = parseFloat(site.budgetedHours) || 0;
        const siteBudgetAmount = parseFloat(site.budgetedAmount) || 0;

        const status = checkBudgetStatus(
          totals.hours,
          totals.pay,
          siteBudgetHours,
          siteBudgetAmount
        );
        setBudgetStatus(status);
      }
    }
  }, [entries, payRates, site]);

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

      if (initialData && initialData.entries) {
        // Load existing entries
        setEntries(initialData.entries);
        const lumpSums = {};
        initialData.entries.forEach(e => {
          if (e.manualLumpSumHours !== null) {
            lumpSums[e.contractorId] = e.manualLumpSumHours;
          }
        });
        setManualLumpSum(lumpSums);
      } else {
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
    }
  }, [site, periodStart, periodEnd, contractors, initialData]);

  const handleHoursChange = (contractorId, date, value) => {
    const numValue = parseFloat(value) || 0;

    if (numValue > 24) {
      alert("Cannot enter more than 24 hours in a single day.");
      return;
    }

    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId) {
        return {
          ...entry,
          dailyHours: entry.dailyHours.map(dh =>
            dh.date === date ? { ...dh, hours: numValue } : dh
          ),
        };
      }
      return entry;
    }));
  };

  const handleTrainingToggle = (contractorId, date) => {
    const allTimesheets = getTimesheets();
    // Exclude the current timesheet if we are editing so we don't double count
    const otherTimesheets = allTimesheets.filter(ts => ts.id !== initialData?.id);

    // Calculate how many training days this contractor has already used in OTHER timesheets
    const historicalTrainingDays = otherTimesheets.flatMap(ts => ts.entries)
      .filter(entry => entry.contractorId === contractorId)
      .reduce((sum, entry) => {
        return sum + (entry.dailyHours?.filter(d => d.isTraining && d.hours > 0).length || 0);
      }, 0);

    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId) {
        // Count currently selected training days in THIS timesheet
        const currentTimesheetTrainingDays = entry.dailyHours.filter(d => d.isTraining).length;
        const isCurrentDayTraining = entry.dailyHours.find(d => d.date === date)?.isTraining;

        // If trying to add (toggle on) and (historical + current) would exceed 5, block it
        if (!isCurrentDayTraining && (historicalTrainingDays + currentTimesheetTrainingDays) >= 5) {
          alert(`Maximum of 5 training days allowed in total. This contractor has already used ${historicalTrainingDays} training day(s) in previous timesheets.`);
          return entry;
        }

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
      id: initialData?.id || Date.now().toString(),
      siteId: site.id,
      siteName: site.siteName,
      periodStart,
      periodEnd,
      entries: entries.map(entry => ({
        ...entry,
        ...calculateTimesheetPay(entry, payRates),
      })),
      status: initialData?.status || 'draft',
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

      {/* Budget Status Banner */}
      {budgetStatus && (!budgetStatus.withinBudget) && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-500 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Budget Limit Exceeded</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {budgetStatus.hoursOver > 0 && (
                    <li>Hours: {totalStats.hours.toFixed(2)} / {site.budgetedHours} (Over by {budgetStatus.hoursOver.toFixed(2)})</li>
                  )}
                  {budgetStatus.amountOver > 0 && (
                    <li>Cost: ${totalStats.pay.toFixed(2)} / ${site.budgetedAmount} (Over by ${budgetStatus.amountOver.toFixed(2)})</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Info Bar */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase">Total Hours</span>
          <span className={`text-xl font-bold ${budgetStatus?.hoursOver > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {totalStats.hours.toFixed(2)}
            {site.budgetedHours > 0 && <span className="text-sm font-normal text-gray-500"> / {site.budgetedHours}</span>}
          </span>
        </div>
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase">Total Cost</span>
          <span className={`text-xl font-bold ${budgetStatus?.amountOver > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${totalStats.pay.toFixed(2)}
            {site.budgetedAmount > 0 && <span className="text-sm font-normal text-gray-500"> / ${site.budgetedAmount}</span>}
          </span>
        </div>
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase">Status</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!budgetStatus || budgetStatus.withinBudget ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            {!budgetStatus || budgetStatus.withinBudget ? 'Within Budget' : 'Over Budget'}
          </span>
        </div>
      </div>
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
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                Escrowed
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
                  <td className="border border-gray-300 px-3 py-2 text-center font-medium text-amber-600">
                    {calculation.trainingPay > 0 ? `$${calculation.trainingPay.toFixed(2)}` : '-'}
                    {calculation.trainingPay > 0 && <div className="text-xs text-gray-500">(Held)</div>}
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
