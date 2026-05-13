import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { getDayType } from '../utils/dateUtils';
import { getTimesheets, getContractors, getPaymentSummaries, savePaymentSummaries, getTrainingReleases, saveTimesheets, logAction, getPublicHolidays } from '../utils/storage';
import { consolidateContractorPay } from '../utils/payrollCalculations';
import { exportPaymentSummaryToCSV } from '../utils/exportUtils';
import Payslip from './Payslip';
import html2pdf from 'html2pdf.js';
import Toast from './Toast';
import { supabase } from '../utils/supabaseClient';
import JSZip from 'jszip';
import Dropdown from './Dropdown';

const PaymentSummary = ({ syncVersion }) => {
  const [timesheets, setTimesheets] = useState([]);
  const [contractors, setContractors] = useState([]);

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
  const [isZipping, setIsZipping] = useState(false);

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
          if (import.meta.env.DEV) console.warn(`Skipping ${payment.contractorName}: No email address.`);
          failCount++;
          continue;
        }

        // 1. TEMPORARILY SET AS SELECTED TO RENDER IT IN DOM (for PDF generation)
        setSelectedPayslip(payment);

        // Wait for React to render the component (one microtask)
        await new Promise(resolve => setTimeout(resolve, 500));

        const payslipElement = document.querySelector('.payslip-wrapper');

        if (!payslipElement) {
          if (import.meta.env.DEV) console.error('Could not find payslip element in DOM');
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
          if (import.meta.env.DEV) console.error(`Error sending to ${contractor.name}:`, error);
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
      if (import.meta.env.DEV) console.error('Fatal error in sending payslips:', error);
      alert('An error occurred while connecting to the email service.');
      setSelectedPayslip(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleZippedExport = async () => {
    if (selectedContractors.length === 0) {
      alert('Please select at least one contractor to export.');
      return;
    }

    setIsZipping(true);
    try {
      const zip = new JSZip();
      let successCount = 0;

      const targets = summary.filter(p => selectedContractors.includes(p.contractorId));

      for (const payment of targets) {
        const contractor = contractors.find(c => c.id === payment.contractorId);

        // 1. Render in DOM temporarily
        setSelectedPayslip(payment);

        // Wait for React to render the component 
        await new Promise(resolve => setTimeout(resolve, 500));

        const payslipElement = document.querySelector('.payslip-wrapper');

        if (!payslipElement) {
          if (import.meta.env.DEV) console.error('Could not find payslip element in DOM');
          continue;
        }

        // 2. Generate PDF
        const opt = {
          margin: [10, 10, 10, 10],
          filename: `Payslip - ${contractor.name} - ${selectedPeriod}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all'] }
        };

        const pdfBase64 = await html2pdf().set(opt).from(payslipElement).output('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        
        // Convert base64 to binary
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Add file to ZIP
        const fileName = `Payslip - ${contractor?.name || payment.contractorName}.pdf`;
        zip.file(fileName, bytes.buffer);
        successCount++;
      }

      // Cleanup view
      setSelectedPayslip(null);

      // 3. Generate Zip file and trigger download
      if (successCount > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        const zipFileName = `Payslips_Bundle_${selectedPeriod.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
        a.download = zipFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl);

        logAction('EXPORT_ARCHIVE', `Downloaded Zipped PDF Payslips for ${successCount} contractors`);
        
        setToastMessage(`Successfully exported ${successCount} payslip PDFs inside a ZIP package.`);
        setShowToast(true);
        setSelectedContractors([]);
      } else {
         alert('Failed to generate any PDFs.');
      }

    } catch (error) {
      if (import.meta.env.DEV) console.error('Error generating PDF bundle:', error);
      alert('An error occurred while generating the PDF bundle.');
      setSelectedPayslip(null);
    } finally {
      setIsZipping(false);
    }
  };

  const refreshData = () => {
    setTimesheets(getTimesheets());
    setContractors(getContractors());
    setPublicHolidays(getPublicHolidays());
  };

  useEffect(() => {
    refreshData();
  }, [syncVersion]);

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

    if (import.meta.env.DEV) {
      console.log('Generating summary for:', selectedPeriod);
      console.log('Found timesheets:', periodTimesheets.length);
      console.log('Found releases:', periodReleases.length);
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
          siteId: entry.siteId || ts.siteId,
          siteName: entry.siteName || ts.siteName,
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
      let totalCustomAddition = 0;
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
        const customAddition = entry.customAddition || 0;
        const deduction = entry.deduction || 0;
        const netPay = entry.netPay || (pay + allowance + otherPay + customAddition - deduction);

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
          effectiveRates = {
            weekday: 0,
            saturday: 0,
            sunday: 0,
            publicHoliday: 0
          };
        }

        totalHours += hours;
        totalTrainingHours += tHours;
        totalPay += pay;
        totalAllowance += allowance;
        totalOtherPay += otherPay;
        totalCustomAddition += customAddition;
        totalDeduction += deduction;
        totalNetPay += netPay;

        // Use rateCode in the identifier to separate different pay grades on the same site
        const identifier = entry.rateCode ? `${entry.siteId}-${entry.rateCode}` : entry.siteId;
        const existingSite = siteBreakdown.find(s => s.identifier === identifier);
        if (existingSite) {
          existingSite.hours += hours;
          existingSite.trainingHours += tHours;
          existingSite.pay += pay;
          existingSite.allowance += allowance;
          existingSite.otherPay += otherPay;
          existingSite.customAddition += customAddition;
          existingSite.deduction += deduction;
          existingSite.netPay += netPay;
          // Aggregate hours by type
          Object.keys(hoursByType).forEach(type => {
            existingSite.hoursByType[type] = (existingSite.hoursByType[type] || 0) + hoursByType[type];
          });
        } else {
          siteBreakdown.push({
            identifier,
            siteId: entry.siteId,
            siteName: entry.siteName,
            rateCode: entry.rateCode || null,
            hours,
            trainingHours: tHours,
            pay,
            allowance,
            otherPay,
            customAddition,
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
          identifier: 'training-release',
          siteId: 'training-release',
          siteName: 'Training Pay Release',
          rateCode: null,
          hours: totalReleaseHours,
          trainingHours: 0,
          pay: totalReleaseAmount,
          allowance: 0,
          otherPay: 0,
          customAddition: 0,
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
        totalCustomAddition,
        totalDeduction,
        totalNetPay,
        siteBreakdown: siteBreakdown.filter(s => s.hours > 0 || s.trainingHours > 0 || Math.abs(s.pay) > 0 || Math.abs(s.netPay) > 0 || s.isRelease),
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
        <div className="fixed inset-0 bg-notion-black/40 backdrop-blur-sm flex items-center justify-center z-[5000] p-4 animate-fade-in">
          <div className="bg-white rounded-comfortable shadow-notion-deep w-full max-h-[90vh] overflow-hidden border whisper-border flex flex-col animate-scale-in">
            {/* Header */}
            <div className="p-8 bg-notion-warm-white relative overflow-hidden">
              <div className="relative z-10 flex items-center gap-5">
                <div className="w-14 h-14 rounded-micro bg-notion-black text-white flex items-center justify-center shadow-notion-card">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-display-secondary text-notion-black tracking-notion-display">Escrow Distribution Required</h3>
                  <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-1">Found {unreleasedTrainingPay.length} pending training pay releases.</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                {unreleasedTrainingPay.map((item, index) => (
                  <div
                    key={item.contractorId}
                    className="group bg-notion-warm-white/30 rounded-micro p-6 whisper-border hover:shadow-notion-card transition-all relative overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-micro flex items-center justify-center font-bold text-xs shadow-sm whisper-border ${item.isEligible ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-notion-warm-gray-300'}`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-body-semibold text-notion-black uppercase tracking-tight">{item.contractorName}</h4>
                            {item.isEligible && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-micro text-badge font-bold whisper-border uppercase tracking-widest">Released</span>
                            )}
                          </div>
                          <div className="text-caption font-bold text-notion-warm-gray-300 mt-1 uppercase tracking-tight">
                            Progress: <span className={item.trainingDays >= 5 ? 'text-emerald-600' : 'text-notion-blue'}>{item.trainingDays} / 5 Units</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-badge font-bold text-notion-warm-gray-300 mb-1 uppercase tracking-widest">Accumulated Balance</div>
                        <div className="text-xl font-bold text-notion-black tracking-tight tabular-nums">${item.amount.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t whisper-border flex flex-wrap gap-6 relative z-10">
                      <div className="flex items-center gap-2 text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                        <span className={`w-2 h-2 rounded-full ${item.isEligible ? 'bg-emerald-500' : 'bg-notion-blue'}`}></span>
                        {item.isEligible ? 'Verified for immediate release' : `${5 - item.trainingDays} sessions remaining`}
                      </div>
                      <div className="flex items-center gap-2 text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                        <svg className="w-3.5 h-3.5 text-notion-warm-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Release Target: <span className="text-notion-black font-bold">{item.dueDateObj ? format(item.dueDateObj, 'dd MMM yyyy') : 'TBD'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-notion-black rounded-micro p-6 text-white relative overflow-hidden shadow-notion-deep">
                <div className="relative z-10 flex gap-4">
                  <div className="w-10 h-10 rounded-micro bg-white/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-notion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h5 className="text-badge font-bold text-notion-blue uppercase tracking-widest mb-1">Payroll Orchestration</h5>
                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">Training payouts are held in escrow for 150 days. Visit the <strong className="text-white">Operation Hub</strong> to manually authorize early releases for verified personnel.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-notion-warm-white border-t whisper-border flex flex-col md:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setShowTrainingPayAlert(false);
                  setToastMessage('Alert dismissed. Review pending items in the Dashboard.');
                  setShowToast(true);
                }}
                className="px-6 py-3 bg-white whisper-border text-notion-black rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-zinc-100 transition shadow-sm"
              >
                Dismiss Analytics
              </button>
              <button
                onClick={() => {
                  setShowTrainingPayAlert(false);
                  setToastMessage('Alert acknowledged. Pending items listed in Management Grid.');
                  setShowToast(true);
                }}
                className="px-8 py-3 bg-notion-black text-white rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-black transition shadow-notion-deep"
              >
                Confirm Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="notion-card p-10 animate-fade-in-up">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div className="space-y-1">
            <h3 className="text-display-secondary text-notion-black tracking-notion-display">Consolidated Settlement</h3>
            <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest">Review, audit, and dispatch processed payment cycles.</p>
          </div>

          {summary.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSendPayslips}
                disabled={isSending || selectedContractors.length === 0}
                className={`px-5 py-2 bg-notion-blue text-white rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-blue-active transition-all flex items-center gap-2 group shadow-notion-card ${isSending || selectedContractors.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
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
                onClick={handleZippedExport}
                disabled={isZipping || selectedContractors.length === 0}
                className={`px-5 py-2 bg-notion-warm-white text-notion-black whisper-border rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-sm ${isZipping || selectedContractors.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
              >
                {isZipping ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-notion-warm-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                )}
                {isZipping ? 'Bundling PDFs...' : `Export PDFs (${selectedContractors.length})`}
              </button>
              <button
                onClick={handleExport}
                className="px-5 py-2 bg-notion-black text-white rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-notion-deep hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
            </div>
          )}
        </div>

        {timesheets.length === 0 && (
          <div className="bg-orange-50 whisper-border rounded-comfortable p-6 mb-10 flex items-start gap-4">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-micro whisper-border">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h4 className="text-body-semibold text-orange-900 uppercase tracking-tight">Zero Activity Source</h4>
              <p className="text-caption text-orange-700 mt-1 font-bold uppercase tracking-widest">Process terminal timesheets before generating consolidated settlements.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Active Periods Selection */}
          <div className="space-y-3">
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1">
              Active Pay Cycles
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
              <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                Processed Vault
              </label>
              {completedPeriods.length > 5 && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className="text-[9px] px-3 py-1 bg-notion-warm-white bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none w-32 font-bold placeholder:text-notion-warm-gray-100 tracking-widest"
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
              options={completedPeriods.map(p => ({ ...p, label: `${p.label} (Audit Done)` }))}
              placeholder={historyFilter ? `Matching "${historyFilter}" (${completedPeriods.length})` : '-- View History --'}
            />
          </div>
        </div>

        <div className="bg-notion-warm-white/50 p-6 rounded-comfortable whisper-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-micro bg-white whisper-border flex items-center justify-center text-notion-warm-gray-100 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="text-body-semibold text-notion-black tracking-tight">
              {selectedPeriod ? (
                <div className="flex items-center gap-3">
                  Scope Identification: <span className="px-3 py-1 bg-white whisper-border rounded-micro text-notion-blue text-badge font-bold uppercase tracking-widest shadow-sm">{categorizedPeriods.find(p => p.value === selectedPeriod)?.label}</span>
                </div>
              ) : (
                <span className="text-notion-warm-gray-100 italic uppercase tracking-widest font-bold text-badge">Awaiting cycle identification...</span>
              )}
            </div>
          </div>
          <button
            onClick={generateSummary}
            disabled={!selectedPeriod}
            className="w-full md:w-auto px-8 py-3 bg-notion-black text-white rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-black transition-all shadow-notion-deep disabled:opacity-20"
          >
            Initiate Synthesis
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
            <div className="text-left bg-zinc-50 p-6 rounded-2xl border border-zinc-100 inline-block w-full">
              <p className="text-[10px] font-bold text-zinc-400 mb-4">Verification Checklist</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                  <span className="w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px]">1</span>
                  Confirm custom pay rates on each contractor
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
          <div className="mt-12 animate-fade-in-up">
            <div className="overflow-hidden rounded-comfortable whisper-border bg-white shadow-notion-deep">
              <table className="min-w-full divide-y whisper-border">
                <thead className="bg-notion-warm-white">
                  <tr>
                    <th className="px-6 py-4 text-center w-14">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded-micro border-notion-warm-gray-300 text-notion-blue focus:ring-0 transition-all cursor-pointer"
                        onChange={handleSelectAll}
                        checked={summary.length > 0 && selectedContractors.length === summary.length}
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Resource Identity</th>
                    <th className="px-6 py-4 text-center text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Cycle Load</th>
                    <th className="px-6 py-4 text-right text-caption font-bold text-emerald-600 bg-emerald-50/30 uppercase tracking-widest">Net Settlement</th>
                    <th className="px-6 py-4 text-left text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Site Allocations & Analytics</th>
                    <th className="px-6 py-4 text-right text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y whisper-border">
                  {summary.map(payment => {
                    const contractor = contractors.find(c => c.id === payment.contractorId);
                    const isSelected = selectedContractors.includes(payment.contractorId);
                    return (
                      <tr key={payment.contractorId} className={`transition-all group ${isSelected ? 'bg-notion-warm-white/50' : 'hover:bg-zinc-50/30'}`}>
                        <td className="px-6 py-6 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded-micro border-notion-warm-gray-300 text-notion-blue focus:ring-0 transition-all cursor-pointer"
                            checked={isSelected}
                            onChange={() => handleSelectContractor(payment.contractorId)}
                          />
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-micro bg-notion-black text-white flex items-center justify-center font-bold text-xs shadow-notion-card">
                              {contractor?.name[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-body-semibold text-notion-black tracking-tight">{contractor?.name}</div>
                              <div className="text-caption font-bold text-notion-warm-gray-300 mt-0.5 uppercase tracking-widest">ID: {contractor?.contractorId}</div>
                              {!contractor?.email && (
                                <span className="inline-flex mt-1.5 px-1.5 py-0.5 bg-notion-badge-rose-bg text-rose-600 text-badge font-bold rounded-micro whisper-border uppercase tracking-widest">Missing Email</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <div className="text-body-semibold text-notion-black tabular-nums">{payment.totalHours.toFixed(2)} <span className="text-[10px] text-notion-warm-gray-300 font-bold uppercase tracking-widest ml-1">hrs</span></div>
                        </td>
                        <td className="px-6 py-6 text-right font-bold text-emerald-600 bg-emerald-50/10 tabular-nums">
                          <div className="text-lg tracking-tight">${payment.totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="px-6 py-6 max-w-md">
                          <div className="flex flex-wrap gap-2 py-1">
                            {payment.siteBreakdown.map((s, idx) => (
                              <div key={idx} className="bg-notion-warm-white/50 group-hover:bg-white rounded-micro p-3 whisper-border transition-all flex flex-col min-w-[150px] shadow-sm">
                                <div className="flex justify-between items-center gap-4 mb-2">
                                  <span className="text-badge font-bold text-notion-black uppercase tracking-tight truncate max-w-[110px]">{s.siteName}</span>
                                  <span className="text-badge font-bold text-notion-black tabular-nums">${s.netPay.toFixed(2)}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {s.hours > 0 && <span className="text-[8px] font-bold text-notion-warm-gray-300 bg-notion-warm-white whisper-border px-1.5 py-0.5 rounded-micro uppercase tracking-widest">{s.hours.toFixed(1)}h</span>}
                                  {s.trainingHours > 0 && <span className="text-[8px] font-bold text-orange-600 bg-orange-50 whisper-border px-1.5 py-0.5 rounded-micro uppercase tracking-widest">Trn</span>}
                                  {(s.allowance > 0 || s.otherPay > 0) && <span className="text-[8px] font-bold text-notion-blue bg-notion-badge-blue-bg whisper-border px-1.5 py-0.5 rounded-micro uppercase tracking-widest">Adj</span>}
                                  {s.deduction > 0 && <span className="text-[8px] font-bold text-rose-500 bg-notion-badge-rose-bg whisper-border px-1.5 py-0.5 rounded-micro uppercase tracking-widest">Ded</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <button
                            onClick={() => setSelectedPayslip(payment)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-notion-black text-badge font-bold uppercase tracking-widest rounded-micro whisper-border hover:bg-notion-black hover:text-white transition-all shadow-sm group/btn"
                          >
                            <svg className="w-3.5 h-3.5 text-notion-warm-gray-100 group-hover/btn:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Audit
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
