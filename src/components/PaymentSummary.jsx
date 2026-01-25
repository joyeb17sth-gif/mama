import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { getTimesheets, getContractors, getPayRates, getPaymentSummaries, savePaymentSummaries, getTrainingReleases } from '../utils/storage';
import { consolidateContractorPay } from '../utils/payrollCalculations';
import { exportPaymentSummaryToCSV } from '../utils/exportUtils';

const PaymentSummary = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [payRates, setPayRates] = useState([]);
  const [summary, setSummary] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  const refreshData = () => {
    setTimesheets(getTimesheets());
    setContractors(getContractors());
    setPayRates(getPayRates());
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

      let totalHours = 0;
      let totalTrainingHours = 0;
      let totalPay = 0;
      const siteBreakdown = [];

      // Process timesheet entries
      contractorTimesheets.forEach(entry => {
        const hours = entry.totalHours || 0;
        const tHours = entry.trainingHours || 0;
        const pay = entry.totalPay || 0;

        totalHours += hours;
        totalTrainingHours += tHours;
        totalPay += pay;

        const existingSite = siteBreakdown.find(s => s.siteId === entry.siteId);
        if (existingSite) {
          existingSite.hours += hours;
          existingSite.trainingHours += tHours;
          existingSite.pay += pay;
        } else {
          siteBreakdown.push({
            siteId: entry.siteId,
            siteName: entry.siteName,
            hours,
            trainingHours: tHours,
            pay,
          });
        }
      });

      // Add releases to total pay
      totalPay += totalReleaseAmount;

      // Add releases to breakdown
      if (totalReleaseAmount > 0) {
        siteBreakdown.push({
          siteId: 'training-release',
          siteName: 'Training Pay Release',
          hours: 0,
          trainingHours: 0,
          pay: totalReleaseAmount,
          isRelease: true
        });
      }

      return {
        contractorId,
        contractorName: contractor?.name || 'Unknown',
        totalHours,
        totalTrainingHours,
        totalPay,
        siteBreakdown,
      };
    });

    // Final filter to remove rows with no pay and no hours (just in case)
    const filteredSummary = consolidated.filter(item => item.totalPay > 0 || item.totalHours > 0 || item.totalTrainingHours > 0);

    setSummary(filteredSummary);

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
    exportPaymentSummaryToCSV(summary, contractors);
  };

  // Get unique periods from timesheets with formatted labels
  const periods = [...new Set(timesheets.map(ts => ts.periodStart))]
    .sort()
    .reverse()
    .map(start => {
      const ts = timesheets.find(t => t.periodStart === start);
      const end = ts ? ts.periodEnd : '';
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
      return { value: start, label };
    });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Payment Summary & Consolidation</h3>

      {timesheets.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800">
            No timesheets found. Please create timesheets first in the Timesheets tab.
          </p>
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Pay Period
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a period...</option>
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={generateSummary}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Generate Summary
          </button>
          {summary.length > 0 && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
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
                <th className="border border-gray-300 px-4 py-2 text-left">Contractor ID</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left">BSB</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Account Number</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Total Hours</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Training Hrs</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Total Payable</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Site Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(payment => {
                const contractor = contractors.find(c => c.id === payment.contractorId);
                return (
                  <tr key={payment.contractorId} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{contractor?.contractorId}</td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{contractor?.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{contractor?.bsb}</td>
                    <td className="border border-gray-300 px-4 py-2">{contractor?.accountNumber}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{payment.totalHours.toFixed(2)}</td>
                    <td className={`border border-gray-300 px-4 py-2 text-right ${payment.totalTrainingHours > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                      {payment.totalTrainingHours?.toFixed(2) || '0.00'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-medium text-green-600">
                      ${payment.totalPay.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {payment.siteBreakdown.map(s => {
                        if (s.isRelease) {
                          return `${s.siteName}: $${s.pay.toFixed(2)}`;
                        }
                        const hourParts = [];
                        if (s.hours > 0) hourParts.push(`${s.hours.toFixed(2)}h`);
                        if (s.trainingHours > 0) hourParts.push(`${s.trainingHours.toFixed(2)}h (Training)`);

                        return `${s.siteName}: ${hourParts.join(' + ')}`;
                      }).join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentSummary;
