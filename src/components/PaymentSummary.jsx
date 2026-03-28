import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { getDayType } from '../utils/dateUtils';
import { getTimesheets, getContractors, getPayRates, getPaymentSummaries, savePaymentSummaries, getTrainingReleases, saveTimesheets, logAction, getPublicHolidays } from '../utils/storage';
import { consolidateContractorPay } from '../utils/payrollCalculations';
import { exportPaymentSummaryToCSV } from '../utils/exportUtils';
import Payslip from './Payslip';
import html2pdf from 'html2pdf.js';
import Toast from './Toast';
import { supabase } from '../utils/supabaseClient';
import Dropdown from './Dropdown';

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
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedContractors, setSelectedContractors] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Handle individual checkbox change
  const handleSelectContractor = (contractorId) => {
    setSelectedContractors(prev => {
      if (prev.includes(contractorId)) {
        return prev.filter(id => id !== contractorId);
      } else {
        return [...prev, contractorId];
      }
    });
  };

  // Handle "Select All" checkbox change
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = summary.map(p => p.contractorId);
      setSelectedContractors(allIds);
    } else {
      setSelectedContractors([]);
    }
  };

  const handleSendPayslips = async () => {
    if (selectedContractors.length === 0) {
      alert('Please select at least one contractor to send payslips to.');
      return;
    }

    if (!confirm(`Are you sure you want to send payslips to ${selectedContractors.length} contractors?`)) {
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const targets = summary.filter(p => selectedContractors.includes(p.contractorId));

      for (const payment of targets) {
        const contractor = contractors.find(c => c.id === payment.contractorId);

        if (!contractor?.email) {
          console.warn(`Skipping ${payment.contractorName}: No email address.`);
          failCount++;
          continue;
        }

        // 1. TEMPORARILY SET AS SELECTED TO RENDER IT IN DOM (for PDF generation)
        setSelectedPayslip(payment);

        // Wait for React to render the component (one microtask)
        await new Promise(resolve => setTimeout(resolve, 500));

        const payslipElement = document.querySelector('.payslip-wrapper');

        if (!payslipElement) {
          console.error('Could not find payslip element in DOM');
          setSelectedPayslip(null);
          failCount++;
          continue;
        }

        // 2. GENERATE PDF AS BASE64
        const opt = {
          margin: [10, 10, 10, 10],
          filename: `Payslip - ${contractor.name} - ${selectedPeriod}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all'] }
        };

        const pdfBase64 = await html2pdf().set(opt).from(payslipElement).output('datauristring');
        // Extract raw base64 from data URI
        const base64Data = pdfBase64.split(',')[1];

        // 3. CALL EDGE FUNCTION WITH ATTACHMENT
        const { data, error } = await supabase.functions.invoke('send-payslip', {
          body: {
            to: contractor.email,
            contractorName: payment.contractorName,
            period: selectedPeriod,
            totalNetPay: payment.totalNetPay,
            siteBreakdown: payment.siteBreakdown,
            pdfAttachment: base64Data // NEW FIELD
          }
        });

        // 4. CLEAN UP
        setSelectedPayslip(null);

        if (error) {
          console.error(`Error sending to ${contractor.name}:`, error);
          failCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        setToastMessage(`Successfully sent ${successCount} payslip${successCount > 1 ? 's' : ''} with PDF attachments!${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        setShowToast(true);
        setSelectedContractors([]);
      } else if (failCount > 0) {
        alert(`Failed to send ${failCount} payslips. Please check the console.`);
      }
    } catch (error) {
      console.error('Fatal error in sending payslips:', error);
      alert('An error occurred while connecting to the email service.');
      setSelectedPayslip(null);
    } finally {
      setIsSending(false);
    }
  };

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
      setHasGenerated(true);
      return;
    }

    console.log('Generating summary for:', selectedPeriod);
    console.log('Found timesheets:', periodTimesheets.length);
    console.log('Found releases:', periodReleases.length);

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
    setHasGenerated(true);
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
        period={categorizedPeriods.find(p => p.value === selectedPeriod)?.label || selectedPeriod}
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
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden border border-zinc-100 flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-zinc-50 bg-gradient-to-br from-zinc-50 to-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary-50 rounded-full blur-3xl -mr-24 -mt-24 opacity-50"></div>
              <div className="relative z-10 flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-h1 font-bold text-zinc-900 tracking-tight">Escrow Distribution Required</h3>
                  <p className="text-zinc-500 font-medium">System detected {unreleasedTrainingPay.length} pending training pay releases.</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                {unreleasedTrainingPay.map((item, index) => (
                  <div
                    key={item.contractorId}
                    className="group bg-white rounded-[2rem] p-6 border border-zinc-100 hover:border-primary-200 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${item.isEligible ? 'bg-primary-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-p1 font-bold text-zinc-900">{item.contractorName}</h4>
                            {item.isEligible && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold border border-emerald-100">Eligible</span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-zinc-400 mt-0.5">
                            Progress: <span className={item.trainingDays >= 5 ? 'text-emerald-600' : 'text-primary-600'}>{item.trainingDays} / 5 Days</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-zinc-400 mb-1">Accumulated Escrow</div>
                        <div className="text-2xl font-bold text-zinc-900 tracking-tighter">${item.amount.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-zinc-50 flex flex-wrap gap-4 relative z-10">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                        <span className={`w-2 h-2 rounded-full ${item.isEligible ? 'bg-emerald-500' : 'bg-primary-500'}`}></span>
                        {item.isEligible ? 'Verified for immediate release' : `${5 - item.trainingDays} sessions remaining`}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                        <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Release Date: <span className="text-zinc-900 font-bold">{item.dueDateObj ? format(item.dueDateObj, 'dd MMM yyyy') : 'TBD'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-zinc-900 rounded-[2rem] p-6 text-white relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary-600 rounded-full blur-3xl -mb-16 -mr-16 opacity-30"></div>
                <div className="relative z-10 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h5 className="font-bold text-sm mb-1 text-primary-400">Payroll Integration</h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">Training payments are held in escrow for 150 days. Visit the <strong className="text-white">Management Grid</strong> to manually authorize early releases for eligible contractors.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex flex-col md:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setShowTrainingPayAlert(false);
                  setToastMessage('Alert dismissed. Review pending items in the Dashboard.');
                  setShowToast(true);
                }}
                className="px-8 py-4 bg-white border border-zinc-200 text-zinc-900 rounded-2xl font-bold text-[10px] hover:bg-zinc-100 transition"
              >
                Decline & Continue
              </button>
              <button
                onClick={() => {
                  setShowTrainingPayAlert(false);
                  setToastMessage('Alert acknowledged. Pending items listed in Management Grid.');
                  setShowToast(true);
                }}
                className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold text-[10px] hover:bg-black transition"
              >
                Acknowledge Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-100 p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-h2 font-bold text-zinc-900 tracking-tight">Payment Summary & Consolidation</h3>
            <p className="text-sm text-zinc-500 font-medium">Review, export, and send payslips for processed periods.</p>
          </div>

          {summary.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSendPayslips}
                disabled={isSending || selectedContractors.length === 0}
                className={`px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-[11px] hover:bg-primary-700 transition-all flex items-center gap-2 group ${isSending || selectedContractors.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
              >
                {isSending ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                {isSending ? 'Sending Dispatch...' : `Send Payslips (${selectedContractors.length})`}
              </button>
              <button
                onClick={handleExport}
                className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-[11px] hover:bg-zinc-800 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
            </div>
          )}
        </div>

        {timesheets.length === 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">No Timesheets Available</h4>
              <p className="text-sm text-amber-700 mt-1 font-medium">Please process timesheets in the dedicated tab before generating a payment summary.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Active Periods Selection */}
          <div className="space-y-3">
            <label className="block pl-1">
              Pending Pay Periods
            </label>
            <Dropdown
              value={!categorizedPeriods.find(p => p.value === selectedPeriod)?.isCompleted ? selectedPeriod : ''}
              onChange={(val) => {
                setSelectedPeriod(val);
                setSummary([]);
                setHasGenerated(false);
              }}
              options={activePeriods}
              placeholder="-- Choose Pending Cycle --"
            />
          </div>

          {/* Completed Periods Dropdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center pl-1">
              <label className="block">
                Export History
              </label>
              {completedPeriods.length > 5 && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className="text-[9px] px-3 py-1 bg-white border border-zinc-200 rounded-full focus:ring-2 focus:ring-emerald-100 outline-none w-32 font-bold placeholder:text-zinc-300 transition-all border-dashed hover:border-emerald-300"
                  />
                </div>
              )}
            </div>
            <Dropdown
              value={categorizedPeriods.find(p => p.value === selectedPeriod)?.isCompleted ? selectedPeriod : ''}
              onChange={(val) => {
                setSelectedPeriod(val);
                setSummary([]);
                setHasGenerated(false);
              }}
              options={completedPeriods.map(p => ({ ...p, label: `${p.label} (Processed)` }))}
              placeholder={historyFilter ? `Matching "${historyFilter}" (${completedPeriods.length})` : '-- View Processed Vault --'}
            />
          </div>
        </div>

        <div className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-zinc-400 border border-zinc-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="text-sm font-bold text-zinc-900 tracking-tight">
              {selectedPeriod ? (
                <span className="flex items-center gap-2">
                  Current Scope: <span className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-primary-600">{categorizedPeriods.find(p => p.value === selectedPeriod)?.label}</span>
                </span>
              ) : (
                <span className="text-zinc-400 italic font-medium">Please select a cycle to generate analysis...</span>
              )}
            </div>
          </div>
          <button
            onClick={generateSummary}
            disabled={!selectedPeriod}
            className="w-full md:w-auto px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold text-[11px] hover:bg-black transition-all disabled:opacity-30 hover:-translate-y-0.5 active:translate-y-0"
          >
            Start Verification
          </button>
        </div>

        {hasGenerated && summary.length === 0 && (
          <div className="bg-white border border-zinc-100 rounded-3xl p-12 text-center mt-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-300 mb-6 font-bold text-4xl">
              ?
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">Zero Activity Detected</h3>
            <p className="text-zinc-500 max-w-sm mx-auto mb-8 font-medium">
              We parsed the timesheets for this period but found no billable hours or payment data.
            </p>
            <div className="text-left bg-zinc-50 p-6 rounded-2xl border border-zinc-100 inline-block max-w-md w-full">
              <p className="text-[10px] font-bold text-zinc-400 mb-4">Verification Checklist</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                  <span className="w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px]">1</span>
                  Confirm pay rates in configuration
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                  <span className="w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px]">2</span>
                  Verify non-zero hours in timesheets
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                  <span className="w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px]">3</span>
                  Check status of assigned contractors
                </li>
              </ul>
            </div>
          </div>
        )}

        {summary.length > 0 && (
          <div className="mt-10 animate-fade-in-up">
            <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
              <table className="min-w-full divide-y divide-zinc-100">
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="px-6 py-4 text-center w-12">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded-lg border-zinc-300 text-primary-600 focus:ring-primary-100 transition-all cursor-pointer"
                        onChange={handleSelectAll}
                        checked={summary.length > 0 && selectedContractors.length === summary.length}
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-400">Employee Identity</th>
                    <th className="px-6 py-4 text-center text-[11px] font-bold text-zinc-400">Workload</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-emerald-600 bg-emerald-50/50">Net Payable</th>
                    <th className="px-6 py-4 text-left text-[11px] font-bold text-zinc-400">Site Allocations & Details</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-zinc-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {summary.map(payment => {
                    const contractor = contractors.find(c => c.id === payment.contractorId);
                    const isSelected = selectedContractors.includes(payment.contractorId);
                    return (
                      <tr key={payment.contractorId} className={`transition-all group ${isSelected ? 'bg-primary-50/20' : 'hover:bg-zinc-50/50'}`}>
                        <td className="px-6 py-5 text-center">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded-lg border-zinc-300 text-primary-600 focus:ring-primary-100 transition-all cursor-pointer"
                            checked={isSelected}
                            onChange={() => handleSelectContractor(payment.contractorId)}
                          />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold text-xs border border-zinc-200">
                              {contractor?.name[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-zinc-900 tracking-tight">{contractor?.name}</div>
                              <div className="text-[10px] font-bold text-zinc-400">ID: {contractor?.contractorId}</div>
                              {!contractor?.email && (
                                <span className="inline-flex mt-1 px-1.5 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-bold rounded border border-rose-100">Missing Email</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="text-sm font-bold text-zinc-900">{payment.totalHours.toFixed(2)} <span className="text-[10px] text-zinc-400 font-medium">hrs</span></div>
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-emerald-600 bg-emerald-50/10">
                          <div className="text-base tracking-tight">${payment.totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="px-6 py-5 max-w-md">
                          <div className="flex flex-wrap gap-2 py-1">
                            {payment.siteBreakdown.map((s, idx) => (
                              <div key={idx} className="bg-zinc-50 group-hover:bg-white rounded-xl p-3 border border-zinc-200/50 transition-all flex flex-col min-w-[140px]">
                                <div className="flex justify-between items-center gap-4 mb-2">
                                  <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-tighter truncate max-w-[100px]">{s.siteName}</span>
                                  <span className="text-[11px] font-bold text-zinc-900">${s.netPay.toFixed(2)}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {s.hours > 0 && <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100/50 px-1.5 py-0.5 rounded">{s.hours.toFixed(1)}h wrk</span>}
                                  {s.trainingHours > 0 && <span className="text-[9px] font-bold text-amber-500 bg-amber-50/50 px-1.5 py-0.5 rounded">Trn</span>}
                                  {(s.allowance > 0 || s.otherPay > 0) && <span className="text-[9px] font-bold text-primary-500 bg-primary-50/50 px-1.5 py-0.5 rounded">+Adj</span>}
                                  {s.deduction > 0 && <span className="text-[9px] font-bold text-rose-500 bg-rose-50/50 px-1.5 py-0.5 rounded">-Ded</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => setSelectedPayslip(payment)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-900 text-[11px] font-bold rounded-xl border border-zinc-200 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all group/btn"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Preview
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PaymentSummary;
