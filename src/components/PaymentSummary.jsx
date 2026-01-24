import { useState, useEffect } from 'react';
import { getTimesheets, getContractors, getPayRates, getPaymentSummaries, savePaymentSummaries } from '../utils/storage';
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
    
    if (periodTimesheets.length === 0) {
      alert('No timesheets found for the selected period. Please create timesheets first.');
      return;
    }

    // Get unique contractor IDs
    const contractorIds = [...new Set(periodTimesheets.flatMap(ts => 
      ts.entries.map(e => e.contractorId)
    ))];

    // Consolidate payments for each contractor
    const consolidated = contractorIds.map(contractorId => {
      // Get all timesheets for this contractor in this period
      const contractorTimesheets = periodTimesheets
        .flatMap(ts => ts.entries.map(entry => ({
          ...entry,
          siteId: ts.siteId,
          siteName: ts.siteName,
          periodStart: ts.periodStart,
        })))
        .filter(entry => entry.contractorId === contractorId);

      // Get pay rates for each site
      let totalHours = 0;
      let totalPay = 0;
      const siteBreakdown = [];

      contractorTimesheets.forEach(entry => {
        const siteRate = payRates.find(r => r.siteId === entry.siteId);
        const rates = siteRate || { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 };
        
        // Calculate pay (simplified - would need full calculation)
        const hours = entry.totalHours || 0;
        const pay = entry.totalPay || (hours * rates.weekday);
        
        totalHours += hours;
        totalPay += pay;
        
        const existingSite = siteBreakdown.find(s => s.siteId === entry.siteId);
        if (existingSite) {
          existingSite.hours += hours;
          existingSite.pay += pay;
        } else {
          siteBreakdown.push({
            siteId: entry.siteId,
            siteName: entry.siteName,
            hours,
            pay,
          });
        }
      });

      return {
        contractorId,
        totalHours,
        totalPay,
        siteBreakdown,
      };
    });

    setSummary(consolidated);
    
    // Save summary
    const summaryRecord = {
      id: Date.now().toString(),
      period: selectedPeriod,
      summary: consolidated,
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

  // Get unique periods from timesheets
  const periods = [...new Set(timesheets.map(ts => ts.periodStart))].sort().reverse();

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
              <option key={period} value={period}>
                {period}
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
                    <td className="border border-gray-300 px-4 py-2 text-right font-medium text-green-600">
                      ${payment.totalPay.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {payment.siteBreakdown.map(s => `${s.siteName}: ${s.hours.toFixed(2)}h`).join(', ')}
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
