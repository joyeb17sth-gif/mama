import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { getDayType } from '../utils/dateUtils';
import { getTimesheets, getContractors, getPayRates, getPaymentSummaries, savePaymentSummaries, getTrainingReleases, saveTimesheets, logAction, getPublicHolidays } from '../utils/storage';
import { consolidateContractorPay } from '../utils/payrollCalculations';
import { exportPaymentSummaryToCSV } from '../utils/exportUtils';
import Payslip from './Payslip';
import Toast from './Toast';

const PaymentSummary = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [payRates, setPayRates] = useState([]);
  const [summary, setSummary] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [showTrainingPayAlert, setShowTrainingPayAlert] = useState(false);
  const [unreleasedTrainingPay, setUnreleasedTrainingPay] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const refreshData = () => {
    setTimesheets(getTimesheets());
    setContractors(getContractors());
    setPayRates(getPayRates());
    setPublicHolidays(getPublicHolidays());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const generateSummary = () => {
    if (!selectedPeriod) {
      alert('Please select a period');
      return;
    }

    // Filter timesheets for selected period (include draft and approved)
    const periodTimesheets = timesheets.filter(
      ts => ts.periodStart === selectedPeriod
    );

    // Allow generation even if no timesheets if we have releases, but generally we need payroll.
    // If only releases exist for a month but no timesheets, we might want to handle that, 
    // but typically payroll is driven by timesheets.

    // Get releases for this period (checking month match)
    // selectedPeriod is YYYY-MM-DD
    const selectedMonth = selectedPeriod.substring(0, 7);
    const allReleases = getTrainingReleases();
    const periodReleases = allReleases.filter(r => r.period === selectedMonth);

    if (periodTimesheets.length === 0 && periodReleases.length === 0) {
      alert('No timesheets or released training pay found for the selected period.');
      return;
    }

    // 4. Get unique contractor IDs from both timesheets AND releases
    // Filter out any invalid IDs
    const timesheetContractorIds = periodTimesheets.flatMap(ts => ts.entries.map(e => e.contractorId));
    const releaseContractorIds = periodReleases.map(r => r.contractorId);
    const contractorIds = [...new Set([...timesheetContractorIds, ...releaseContractorIds])].filter(Boolean);

    // 5. Consolidate payments for each contractor
    const consolidated = contractorIds.map(contractorId => {
      const contractor = contractors.find(c => c.id === contractorId);

      // Get all timesheets for this contractor in this period
      const contractorTimesheets = periodTimesheets
        .flatMap(ts => ts.entries.map(entry => ({
          ...entry,
          siteId: ts.siteId,
          siteName: ts.siteName,
          periodStart: ts.periodStart,
        })))
        .filter(entry => entry.contractorId === contractorId);

      // Get releases for this contractor
      const contractorReleases = periodReleases.filter(r => r.contractorId === contractorId);
      const totalReleaseAmount = contractorReleases.reduce((sum, r) => sum + r.amount, 0);
      const totalReleaseHours = contractorReleases.reduce((sum, r) => sum + (r.hours || 0), 0);

      let totalHours = 0;
      let totalTrainingHours = 0;
      let totalPay = 0;
      let totalAllowance = 0;
      let totalOtherPay = 0;
      let totalDeduction = 0;
      let totalNetPay = 0;
      const siteBreakdown = [];

      // Process timesheet entries
      contractorTimesheets.forEach(entry => {
        // For accuracy, we use the values stored in the entry which include manual adjustments
        const hours = entry.totalHours || 0;
        const tHours = entry.trainingHours || 0;
        const pay = entry.totalPay || 0;
        const allowance = entry.allowance || 0;
        const otherPay = entry.otherPay || 0;
        const deduction = entry.deduction || 0;
        const netPay = entry.netPay || (pay + allowance + otherPay - deduction);

        // Supporting legacy entries: Re-calculate hoursByType if missing
        let hoursByType = entry.hoursByRateType;
        if (!hoursByType) {
          hoursByType = { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 };
          const isManual = entry.manualLumpSumHours !== null;
          if (isManual) {
            const manualData = entry.manualLumpSumHours;
            if (typeof manualData === 'object') {
              ['weekday', 'saturday', 'sunday', 'publicHoliday'].forEach(type => {
                hoursByType[type] = parseFloat(manualData[type]) || 0;
              });
            } else {
              hoursByType.weekday = parseFloat(manualData) || 0;
            }
          } else {
            entry.dailyHours?.forEach(day => {
              if (day.hours > 0 && !day.isTraining) {
                const dayType = day.isPH ? 'publicHoliday' : getDayType(day.date, publicHolidays);
                hoursByType[dayType] += day.hours;
              }
            });
          }
          if (entry.extraHours > 0) {
            hoursByType.weekday += parseFloat(entry.extraHours) || 0;
          }
        }

        // Supporting legacy entries: Find rates if missing
        let effectiveRates = entry.rates;
        if (!effectiveRates) {
          const siteRates = payRates.find(r => r.siteId === entry.siteId);
          const contractorRates = siteRates?.contractorRates?.[contractorId];
          effectiveRates = contractorRates || {
            weekday: siteRates?.weekday || 0,
            saturday: siteRates?.saturday || 0,
            sunday: siteRates?.sunday || 0,
            publicHoliday: siteRates?.publicHoliday || 0
          };
        }

        totalHours += hours;
        totalTrainingHours += tHours;
        totalPay += pay;
        totalAllowance += allowance;
        totalOtherPay += otherPay;
        totalDeduction += deduction;
        totalNetPay += netPay;

        const existingSite = siteBreakdown.find(s => s.siteId === entry.siteId);
        if (existingSite) {
          existingSite.hours += hours;
          existingSite.trainingHours += tHours;
          existingSite.pay += pay;
          existingSite.allowance += allowance;
          existingSite.otherPay += otherPay;
          existingSite.deduction += deduction;
          existingSite.netPay += netPay;
          // Aggregate hours by type
          Object.keys(hoursByType).forEach(type => {
            existingSite.hoursByType[type] = (existingSite.hoursByType[type] || 0) + hoursByType[type];
          });
        } else {
          siteBreakdown.push({
            siteId: entry.siteId,
            siteName: entry.siteName,
            hours,
            trainingHours: tHours,
            pay,
            allowance,
            otherPay,
            deduction,
            netPay,
            rates: effectiveRates,
            hoursByType: { ...hoursByType }
          });
        }
      });

      // Add releases to total pay
      totalPay += totalReleaseAmount;
      totalNetPay += totalReleaseAmount;

      // Add releases to breakdown
      if (totalReleaseAmount > 0) {
        siteBreakdown.push({
          siteId: 'training-release',
          siteName: 'Training Pay Release',
          hours: totalReleaseHours,
          trainingHours: 0,
          pay: totalReleaseAmount,
          allowance: 0,
          otherPay: 0,
          deduction: 0,
          netPay: totalReleaseAmount,
          isRelease: true,
          rates: { weekday: totalReleaseHours > 0 ? (totalReleaseAmount / totalReleaseHours) : 0 },
          hoursByType: { weekday: totalReleaseHours }
        });
      }

      return {
        contractorId,
        contractorName: contractor?.name || 'Unknown',
        totalHours,
        totalTrainingHours,
        totalPay,
        totalAllowance,
        totalOtherPay,
        totalDeduction,
        totalNetPay,
        siteBreakdown,
      };
    });

    // Final filter to remove rows with no pay and no hours (just in case)
    const filteredSummary = consolidated.filter(item => item.totalNetPay > 0 || item.totalHours > 0 || item.totalTrainingHours > 0);

    setSummary(filteredSummary);

    // Check for unreleased training pay
    const trainingReleases = getTrainingReleases();
    const unreleasedContractors = [];

    // Calculate unreleased training pay for all contractors with training hours
    timesheets.forEach(ts => {
      ts.entries.forEach(entry => {
        if (entry.trainingPay && entry.trainingPay > 0) {
          const contractorId = entry.contractorId;
          const contractor = contractors.find(c => c.id === contractorId);

          if (contractor) {
            // Calculate total accumulated training pay
            const allContractorEntries = timesheets.flatMap(t => t.entries).filter(e => e.contractorId === contractorId);
            const totalAccumulated = allContractorEntries.reduce((sum, e) => sum + (e.trainingPay || 0), 0);

            // Calculate total released
            const contractorReleases = trainingReleases.filter(r => r.contractorId === contractorId);
            const totalReleased = contractorReleases.reduce((sum, r) => sum + r.amount, 0);

            // Calculate balance
            const balance = totalAccumulated - totalReleased;

            // Calculate training days
            const totalTrainingDays = allContractorEntries.reduce((sum, e) => {
              return sum + (e.dailyHours?.filter(d => d.isTraining && d.hours > 0).length || 0);
            }, 0);

            // Calculate due date based on training days
            const firstTrainingEntry = allContractorEntries.find(e => e.dailyHours?.some(d => d.isTraining && d.hours > 0));
            let dueDate = 'Not Yet Due';
            let dueDateObj = null;

            if (firstTrainingEntry) {
              const firstTrainingDay = firstTrainingEntry.dailyHours.find(d => d.isTraining && d.hours > 0);
              if (firstTrainingDay) {
                const firstDate = new Date(firstTrainingDay.date);

                // Always calculate the actual release date (5 months from first training day)
                const releaseDate = new Date(firstDate);
                releaseDate.setDate(releaseDate.getDate() + 150); // ~5 months
                dueDateObj = releaseDate;

                // Format the display text based on eligibility
                if (totalTrainingDays >= 5) {
                  dueDate = format(releaseDate, 'dd MMM yyyy');
                } else {
                  // Still show the date, but indicate they need more days
                  dueDate = `After ${5 - totalTrainingDays} more training day${5 - totalTrainingDays > 1 ? 's' : ''}`;
                }
              }
            }

            // Show notification for ANY unreleased training pay, regardless of training days
            if (balance > 0) {
              // Check if already in list
              const existing = unreleasedContractors.find(u => u.contractorId === contractorId);
              if (!existing) {
                unreleasedContractors.push({
                  contractorId,
                  contractorName: contractor.name,
                  amount: balance,
                  trainingDays: totalTrainingDays,
                  dueDate,
                  isEligible: totalTrainingDays >= 5,
                  dueDateObj
                });
              }
            }
          }
        }
      });
    });

    // Show alert if there are unreleased training payments
    if (unreleasedContractors.length > 0) {
      setUnreleasedTrainingPay(unreleasedContractors);
      setShowTrainingPayAlert(true);
    }

    // Save summary
    const summaryRecord = {
      id: Date.now().toString(),
      period: selectedPeriod,
      summary: filteredSummary,
      generatedAt: new Date().toISOString(),
    };

    const allSummaries = getPaymentSummaries();
    allSummaries.push(summaryRecord);
    savePaymentSummaries(allSummaries);
  };

  const handleExport = () => {
    if (summary.length === 0) {
      alert('Please generate summary first');
      return;
    }

    // 1. Mark involved timesheets as "done"
    const allTimesheets = getTimesheets();
    const updatedTimesheets = allTimesheets.map(ts => {
      if (ts.periodStart === selectedPeriod) {
        return { ...ts, status: 'done', updatedAt: new Date().toISOString() };
      }
      return ts;
    });
    saveTimesheets(updatedTimesheets);
    setTimesheets(updatedTimesheets);
    logAction('EXPORT_CSV_COMPLETED', { period: selectedPeriod });

    // 2. Perform actual CSV export
    exportPaymentSummaryToCSV(summary, contractors);
  };

  // Organize periods into categories: Active and Completed
  const allUniquePeriods = [...new Set(timesheets.map(ts => ts.periodStart))].sort().reverse();

  const categorizedPeriods = allUniquePeriods.map(start => {
    const periodTimesheets = timesheets.filter(t => t.periodStart === start);
    const end = periodTimesheets[0]?.periodEnd || '';
    const isCompleted = periodTimesheets.length > 0 && periodTimesheets.every(ts => ts.status === 'done');

    let label = start;
    if (end) {
      try {
        const sDate = parseISO(start);
        const eDate = parseISO(end);
        label = `${format(sDate, 'd MMM yyyy')} - ${format(eDate, 'd MMM yyyy')}`;
      } catch (e) {
        label = `${start} to ${end}`;
      }
    }
    return { value: start, label, isCompleted };
  });

  const activePeriods = categorizedPeriods.filter(p => !p.isCompleted);
  const completedPeriods = categorizedPeriods.filter(p => {
    if (!p.isCompleted) return false;
    if (!historyFilter) return true;
    return p.label.toLowerCase().includes(historyFilter.toLowerCase()) ||
      p.value.toLowerCase().includes(historyFilter.toLowerCase());
  });

  if (selectedPayslip) {
    return (
      <Payslip
        payment={selectedPayslip}
        period={selectedPeriod}
        contractor={contractors.find(c => c.id === selectedPayslip.contractorId)}
        onBack={() => setSelectedPayslip(null)}
      />
    );
  }

  return (
    <>
      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
      {/* Training Pay Alert Modal */}
      {showTrainingPayAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white/20 rounded-full">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Unreleased Training Pay Alert</h3>
                  <p className="text-amber-100 text-sm mt-1">Action required for {unreleasedTrainingPay.length} contractor{unreleasedTrainingPay.length > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-gray-600 mb-4 text-base">
                The following contractors have unreleased training pay in escrow:
              </p>

              <div className="space-y-3">
                {unreleasedTrainingPay.map((item, index) => (
                  <div
                    key={item.contractorId}
                    className={`rounded-lg p-4 shadow-sm border-l-4 ${item.isEligible
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500'
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${item.isEligible ? 'bg-amber-500' : 'bg-blue-500'
                            }`}>
                            #{index + 1}
                          </span>
                          <h4 className="text-lg font-bold text-gray-900">{item.contractorName}</h4>
                          {item.isEligible && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              ELIGIBLE FOR RELEASE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Training Days Completed:
                          <span className={`font-semibold ml-1 ${item.trainingDays >= 5 ? 'text-green-600' : 'text-blue-600'
                            }`}>
                            {item.trainingDays} / 5
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-semibold uppercase tracking-wider ${item.isEligible ? 'text-amber-600' : 'text-blue-600'
                          }`}>
                          Unreleased Amount
                        </div>
                        <div className={`text-2xl font-bold ${item.isEligible ? 'text-amber-700' : 'text-blue-700'
                          }`}>
                          ${item.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className={`mt-3 pt-3 border-t ${item.isEligible ? 'border-amber-200' : 'border-blue-200'
                      }`}>
                      <div className="space-y-2">
                        {/* Training Status */}
                        <div className="flex items-center gap-2 text-sm">
                          <svg className={`w-4 h-4 ${item.isEligible ? 'text-green-600' : 'text-blue-600'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-700">
                            Status:
                            <span className={`font-bold ml-1 ${item.isEligible ? 'text-green-700' : 'text-blue-700'
                              }`}>
                              {item.isEligible ? 'Ready for Release' : `${5 - item.trainingDays} more day${5 - item.trainingDays > 1 ? 's' : ''} needed`}
                            </span>
                          </span>
                        </div>

                        {/* Due Release Date - Always Show */}
                        <div className="flex items-center gap-2 text-sm">
                          <svg className={`w-4 h-4 ${item.isEligible ? 'text-amber-600' : 'text-blue-600'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-gray-700">
                            Due Release Date:
                            <span className={`font-bold ml-1 ${item.isEligible ? 'text-amber-700' : 'text-blue-700'
                              }`}>
                              {item.dueDateObj ? format(item.dueDateObj, 'dd MMM yyyy') : 'Calculating...'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Next Steps:</p>
                    <p>Please navigate to the <span className="font-bold">Training Pay</span> tab to release these payments manually, or they will be automatically released on the due date.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTrainingPayAlert(false);
                  setToastMessage('Training pay alert dismissed. You can review this in the Dashboard.');
                  setShowToast(true);
                }}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                I'll Handle This Later
              </button>
              <button
                onClick={() => {
                  setShowTrainingPayAlert(false);
                  setToastMessage(`Training pay alert acknowledged for ${unreleasedTrainingPay.length} contractor${unreleasedTrainingPay.length > 1 ? 's' : ''}. Please process releases in the Dashboard.`);
                  setShowToast(true);
                }}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 shadow-lg shadow-amber-200 transition"
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Summary & Consolidation</h3>

        {timesheets.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800">
              No timesheets found. Please create timesheets first in the Timesheets tab.
            </p>
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Periods Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-blue-600 uppercase tracking-widest">
              Pending Pay Periods
            </label>
            <div className="flex gap-2">
              <select
                value={!categorizedPeriods.find(p => p.value === selectedPeriod)?.isCompleted ? selectedPeriod : ''}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setSummary([]);
                }}
                className="flex-1 px-3 py-2 border border-blue-100 bg-blue-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
              >
                <option value="">Select Pending Period...</option>
                {activePeriods.map(period => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Completed Periods Dropdown */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black text-emerald-600 uppercase tracking-widest">
                Completed / Exported Periods
              </label>
              {completedPeriods.length > 5 && (
                <input
                  type="text"
                  placeholder="Filter history..."
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="text-[10px] px-2 py-0.5 border border-emerald-200 rounded focus:ring-1 focus:ring-emerald-500 outline-none w-24"
                />
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={categorizedPeriods.find(p => p.value === selectedPeriod)?.isCompleted ? selectedPeriod : ''}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setSummary([]);
                }}
                className="flex-1 px-3 py-2 border border-emerald-100 bg-emerald-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
              >
                <option value="">
                  {historyFilter ? `Matching "${historyFilter}" (${completedPeriods.length})...` : 'View History...'}
                </option>
                {completedPeriods.map(period => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
          <div className="text-sm font-medium text-slate-500 italic">
            {selectedPeriod ? `Selected: ${categorizedPeriods.find(p => p.value === selectedPeriod)?.label}` : 'Please select a period to continue'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateSummary}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-blue-700 transition shadow-lg shadow-blue-100"
            >
              Generate Summary
            </button>
            {summary.length > 0 && (
              <button
                onClick={handleExport}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
            )}
          </div>
        </div>

        {summary.length > 0 && (
          <div className="overflow-x-auto mt-6">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest">Contractor ID</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest">Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest">Total Hours</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-widest bg-emerald-50 text-emerald-700">Total Net Payable</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest">Site Detailed Breakdown</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(payment => {
                  const contractor = contractors.find(c => c.id === payment.contractorId);
                  return (
                    <tr key={payment.contractorId} className="hover:bg-gray-50 transition-colors">
                      <td className="border border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-tighter">{contractor?.contractorId}</td>
                      <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">{contractor?.name}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-900">{payment.totalHours.toFixed(2)}h</td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-black text-emerald-600 bg-emerald-50/30">
                        ${payment.totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="space-y-2 py-1">
                          {payment.siteBreakdown.map((s, idx) => (
                            <div key={idx} className="bg-gray-50/50 rounded p-2 text-[10px] border border-gray-100">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-gray-700 truncate max-w-[150px]">{s.siteName}</span>
                                <span className="font-black text-gray-900 underline decoration-emerald-300 underline-offset-2">${s.netPay.toFixed(2)}</span>
                              </div>
                              <div className="flex gap-2 text-gray-400 font-medium">
                                {s.hours > 0 && <span>{s.hours.toFixed(1)}h Worked</span>}
                                {s.trainingHours > 0 && <span className="text-amber-600">({s.trainingHours.toFixed(1)}h Training)</span>}
                                {s.allowance > 0 && <span className="text-blue-500">+${s.allowance} Allow.</span>}
                                {s.deduction > 0 && <span className="text-rose-500">-${s.deduction} Ded.</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <button
                          onClick={() => setSelectedPayslip(payment)}
                          className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition shadow-lg shadow-slate-100 flex items-center gap-1 mx-auto"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Payslip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default PaymentSummary;
