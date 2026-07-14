import { useState, useEffect, Fragment, useMemo, useCallback } from 'react';
import { generatePeriodDates, formatDateDisplay } from '../utils/dateUtils';
import { checkBudgetStatus, calculateTimesheetPay } from '../utils/payrollCalculations';
import { getTimesheets, saveSites, getSites, saveContractors, getContractors, logAction, getPublicHolidays, getGlobalRates } from '../utils/storage';
import { TimesheetSchema, validateData } from '../utils/validation';
import ContractorForm from './ContractorForm';
import Toast from './Toast';
import Dropdown from './Dropdown';

const TimesheetEntry = ({ site: initialSite, periodStart, periodEnd, contractors, onSave, onQuickAddContractor, initialData = null }) => {
  const [site, setSite] = useState(initialSite);
  const [dates, setDates] = useState([]);
  const [entries, setEntries] = useState([]);

  const [showToast, setShowToast] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [totalStats, setTotalStats] = useState({ hours: 0, pay: 0, budgetedHours: 0, budgetedAmount: 0 });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showNewContractorModal, setShowNewContractorModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [allSites, setAllSites] = useState(getSites());
  const [publicHolidays, setPublicHolidays] = useState([]);
  const subSites = useMemo(() => allSites.filter(s => s.isSubSite && s.parentSiteId === site.id), [allSites, site.id]);

  const getEffectiveRates = useCallback((contractorId, targetSiteId, entryRateCode = null) => {
    const contractor = contractors.find(c => c.id === contractorId);
    const useSiteId = targetSiteId || site.id;
    const customRate = contractor?.customRates?.find(r => r.siteId === useSiteId);

    if (customRate) {
      return {
        weekday: customRate.weekday || 0,
        saturday: customRate.saturday || 0,
        sunday: customRate.sunday || 0,
        publicHoliday: customRate.publicHoliday || 0,
        isCustom: true
      };
    }

    const targetSiteObj = allSites.find(s => s.id === useSiteId);
    if (targetSiteObj && targetSiteObj.codeRates && contractor) {
      // If a specific rateCode is provided (from multi-code deployment), use that
      const codeToMatch = entryRateCode || null;
      
      if (codeToMatch) {
        const codeRate = targetSiteObj.codeRates.find(r => r.code === codeToMatch);
        if (codeRate) {
          return {
            weekday: codeRate.weekday || 0,
            saturday: codeRate.saturday || 0,
            sunday: codeRate.sunday || 0,
            publicHoliday: codeRate.publicHoliday || 0,
            isCustom: true,
            matchedCode: codeToMatch
          };
        }
      }
      
      // Fall back: check all contractor codes against site codeRates
      const contractorCodes = (contractor.contractorId || '').split(',').map(c => c.trim()).filter(Boolean);
      for (const code of contractorCodes) {
        const codeRate = targetSiteObj.codeRates.find(r => r.code === code);
        if (codeRate) {
          return {
            weekday: codeRate.weekday || 0,
            saturday: codeRate.saturday || 0,
            sunday: codeRate.sunday || 0,
            publicHoliday: codeRate.publicHoliday || 0,
            isCustom: true,
            matchedCode: code
          };
        }
      }
    }

    return { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0, isCustom: false };
  }, [contractors, site.id, allSites]);

  useEffect(() => {
    if (entries.length > 0) {
      const totals = entries.reduce((acc, entry) => {
        const effectiveRates = getEffectiveRates(entry.contractorId, entry.siteId, entry.rateCode);
        const calc = calculateTimesheetPay(entry, effectiveRates, publicHolidays);
        return {
          hours: acc.hours + calc.totalHours,
          pay: acc.pay + calc.netPay
        };
      }, { hours: 0, pay: 0 });

      // Calculate combined budget from all unique sites in the timesheet
      const uniqueSiteIds = [...new Set(entries.map(e => e.siteId))];
      const combinedBudget = uniqueSiteIds.reduce((acc, sId) => {
        const s = allSites.find(siteObj => siteObj.id === sId);
        if (s) {
          return {
            hours: acc.hours + (parseFloat(s.budgetedHours) || 0),
            money: acc.money + (parseFloat(s.budgetedAmount) || 0)
          };
        }
        return acc;
      }, { hours: 0, money: 0 });

      setTotalStats({
        ...totals,
        budgetedHours: combinedBudget.hours,
        budgetedAmount: combinedBudget.money
      });

      const status = checkBudgetStatus(
        totals.hours,
        totals.pay,
        combinedBudget.hours,
        combinedBudget.money
      );
      setBudgetStatus(status);
    } else {
      // Reset if no entries
      const primaryBudget = {
        hours: parseFloat(site.budgetedHours) || 0,
        money: parseFloat(site.budgetedAmount) || 0
      };
      setTotalStats({ hours: 0, pay: 0, budgetedHours: primaryBudget.hours, budgetedAmount: primaryBudget.money });
      setBudgetStatus(checkBudgetStatus(0, 0, primaryBudget.hours, primaryBudget.money));
    }
  }, [entries, site, allSites]);

  // Reset entries only when switching to a completely different site or period
  useEffect(() => {
    setEntries([]);
  }, [site.id, periodStart, periodEnd]);

  useEffect(() => {
    if (site && periodStart && periodEnd) {
      const periodDates = generatePeriodDates(periodStart, periodEnd);
      setDates(periodDates);

      // Load global holidays
      const holidays = getPublicHolidays().map(h => h.date);
      setPublicHolidays(holidays);



      if (initialData && initialData.entries) {
        setEntries(initialData.entries);
      } else {
        // Load contractors from sub-sites only (main site is display-only)
        const subSitesAllocated = subSites.flatMap(ss =>
          contractors
            .filter(c => ss.allocatedContractors?.includes(c.id))
            .map(c => ({ contractor: c, siteId: ss.id, siteName: ss.siteName }))
        );

        const initialEntries = [
          ...subSitesAllocated.flatMap(({ contractor, siteId, siteName }) => {
            const codes = (contractor.contractorId || '').split(',').map(c => c.trim()).filter(Boolean);
            if (codes.length === 0) {
              return [{
                contractorId: contractor.id,
                contractorName: contractor.name,
                rateCode: null,
                siteId: siteId,
                siteName: siteName,
                dailyHours: periodDates.map(d => ({ date: d.date, hours: 0, isTraining: false })),
                manualLumpSumHours: null,
                extraHours: 0,
                allowance: 0,
                otherPay: 0,
                customAddition: 0,
                deduction: 0
              }];
            }
            return codes.map(code => ({
              contractorId: contractor.id,
              contractorName: contractor.name,
              rateCode: code,
              siteId: siteId,
              siteName: siteName,
              dailyHours: periodDates.map(d => ({ date: d.date, hours: 0, isTraining: false })),
              manualLumpSumHours: null,
              extraHours: 0,
              allowance: 0,
              otherPay: 0,
              customAddition: 0,
              deduction: 0
            }));
          })
        ];

        setEntries(initialEntries);
      }
    }
  }, [site.id, periodStart, periodEnd, initialData?.id]);



  const handleQuickAddStaff = (contractorId, contractorObj = null, targetSiteId, rateCode = null) => {
    const useSiteId = targetSiteId || site.id;
    const allSitesRaw = getSites();
    const updatedSites = allSitesRaw.map(s => {
      if (s.id === useSiteId) {
        const allocated = s.allocatedContractors || [];
        if (!allocated.includes(contractorId)) {
          return { ...s, allocatedContractors: [...allocated, contractorId] };
        }
      }
      return s;
    });

    saveSites(updatedSites);
    setAllSites(updatedSites);
    const updatedSite = updatedSites.find(s => s.id === site.id);
    if (updatedSite) setSite(updatedSite);

    const contractor = contractorObj || contractors.find(c => c.id === contractorId);

    // Check if entry already exists for this contractor and site and rateCode
    const exists = entries.some(e => e.contractorId === contractorId && e.siteId === useSiteId && (e.rateCode || null) === (rateCode || null));

    if (contractor && !exists) {
      const targetSiteName = updatedSites.find(s => s.id === useSiteId)?.siteName;
      setEntries([...entries, {
        contractorId: contractor.id,
        contractorName: contractor.name,
        rateCode: rateCode,
        siteId: useSiteId,
        siteName: targetSiteName,
        dailyHours: dates.map(d => ({ date: d.date, hours: 0, isTraining: false })),
        manualLumpSumHours: null,
        extraHours: 0,
        allowance: 0,
        otherPay: 0,
        customAddition: 0,
        deduction: 0
      }]);
    }
    setToastMsg("Allocation updated.");
    setShowToast(true);
  };
  const handleQuickRemoveStaff = (contractorId, targetSiteId, rateCode = null) => {
    const useSiteId = targetSiteId || site.id;
    
    // Remove from active grid
    setEntries(entries.filter(e => !(e.contractorId === contractorId && e.siteId === useSiteId && (e.rateCode || null) === (rateCode || null))));
    
    // Only remove from site allocation if NO MORE entries exist for this contractor on this site
    const remainingEntries = entries.filter(e => e.contractorId === contractorId && e.siteId === useSiteId && (e.rateCode || null) !== (rateCode || null));
    if (remainingEntries.length === 0) {
      const allSitesRaw = getSites();
      const updatedSites = allSitesRaw.map(s => {
        if (s.id === useSiteId) {
          const allocated = s.allocatedContractors || [];
          return { ...s, allocatedContractors: allocated.filter(id => id !== contractorId) };
        }
        return s;
      });

      saveSites(updatedSites);
      setAllSites(updatedSites);
      const updatedSite = updatedSites.find(s => s.id === site.id);
      setSite(updatedSite);
    }
    
    setToastMsg("Staff allocation updated.");
    setShowToast(true);
  };
  const handleQuickCreateContractor = (formData) => {
    try {
      const newContractor = {
        id: crypto.randomUUID(),
        ...formData,
      };

      const existingContractors = getContractors();
      const allContractors = [...existingContractors, newContractor];
      saveContractors(allContractors);

      logAction('CREATE_CONTRACTOR_QUICK', {
        id: newContractor.id,
        name: newContractor.name,
        site: site.siteName
      });

      handleQuickAddStaff(newContractor.id, newContractor);
      if (onQuickAddContractor) onQuickAddContractor(allContractors);

      setShowNewContractorModal(false);
      setToastMsg(`Contractor ${newContractor.name} hiring completed.`);
      setShowToast(true);
    } catch (e) {
      if (import.meta.env.DEV) console.error(e);
      alert("Error saving contractor: " + e.message);
    }
  };

  const handleHoursChange = (contractorId, date, value, targetSiteId, rateCode = null) => {
    const rates = getEffectiveRates(contractorId, targetSiteId, rateCode);
    const hasRates = rates.weekday > 0 || rates.saturday > 0 || rates.sunday > 0 || rates.publicHoliday > 0;

    if (!hasRates) {
      const targetSite = allSites.find(s => s.id === targetSiteId);
      setToastMsg(`Rate Conflict: Please adjust pay rates for ${targetSite?.siteName || 'this site'} prior to initializing hours.`);
      setShowToast(true);
      return;
    }

    const numValue = Math.max(0, parseFloat(value) || 0);
    if (numValue > 24) {
      alert("Cannot enter more than 24 hours in a single day.");
      return;
    }

    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId && (entry.rateCode || null) === (rateCode || null)) {
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

  const handleTrainingToggle = (contractorId, date, targetSiteId, rateCode = null) => {
    const allTimesheets = getTimesheets();
    const otherTimesheets = allTimesheets.filter(ts => ts.id !== initialData?.id);

    const historicalTrainingDays = otherTimesheets.flatMap(ts => ts.entries)
      .filter(entry => entry.contractorId === contractorId)
      .reduce((sum, entry) => {
        return sum + (entry.dailyHours?.filter(d => d.isTraining && d.hours > 0).length || 0);
      }, 0);

    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId && (entry.rateCode || null) === (rateCode || null)) {
        const currentTimesheetTrainingDays = entry.dailyHours.filter(d => d.isTraining).length;
        const isCurrentDayTraining = entry.dailyHours.find(d => d.date === date)?.isTraining;

        if (!isCurrentDayTraining && (historicalTrainingDays + currentTimesheetTrainingDays) >= 5) {
          alert(`Maximum of 5 training days allowed in total. Already used ${historicalTrainingDays} training day(s).`);
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

  const handleLumpSumToggle = (contractorId, isChecked, targetSiteId, rateCode = null) => {
    const defaultValue = isChecked ? { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 } : null;
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId && (entry.rateCode || null) === (rateCode || null)) {
        return { ...entry, manualLumpSumHours: defaultValue };
      }
      return entry;
    }));
  };

  const handleLumpSumChange = (contractorId, type, value, targetSiteId, rateCode = null) => {
    const rates = getEffectiveRates(contractorId, targetSiteId, rateCode);
    const hasRates = rates.weekday > 0 || rates.saturday > 0 || rates.sunday > 0 || rates.publicHoliday > 0;

    if (!hasRates) {
      const targetSite = allSites.find(s => s.id === targetSiteId);
      setToastMsg(`⚠️ Please adjust pay rates for ${targetSite?.siteName || 'this site'} before entering lump sum hours.`);
      setShowToast(true);
      return;
    }

    const numValue = Math.max(0, parseFloat(value) || 0);
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId && (entry.rateCode || null) === (rateCode || null)) {
        const currentManual = entry.manualLumpSumHours || { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 };
        return {
          ...entry,
          manualLumpSumHours: { ...currentManual, [type]: numValue }
        };
      }
      return entry;
    }));
  };

  const handleExtraHoursChange = (contractorId, value, targetSiteId, rateCode = null) => {
    const rates = getEffectiveRates(contractorId, targetSiteId, rateCode);
    const hasRates = rates.weekday > 0 || rates.saturday > 0 || rates.sunday > 0 || rates.publicHoliday > 0;

    if (!hasRates) {
      const targetSite = allSites.find(s => s.id === targetSiteId);
      setToastMsg(`⚠️ Please adjust pay rates for ${targetSite?.siteName || 'this site'} before entering extra hours.`);
      setShowToast(true);
      return;
    }

    // Enforce upper boundary to prevent accidental/malicious logic errors
    const numValue = Math.min(100, Math.max(0, parseFloat(value) || 0));
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId && (entry.rateCode || null) === (rateCode || null)) {
        return { ...entry, extraHours: numValue };
      }
      return entry;
    }));
  };

  const handlePaymentFieldChange = (contractorId, field, value, targetSiteId, rateCode = null) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId && (entry.rateCode || null) === (rateCode || null)) {
        return { ...entry, [field]: numValue };
      }
      return entry;
    }));
  };

  const handleRemoveEntry = (contractorId, siteId, rateCode = null) => {
    // Only call handleQuickRemoveStaff to properly update site allocation checks
    handleQuickRemoveStaff(contractorId, siteId, rateCode);
  };

  const handleSave = () => {
    // Save ALL entries (Primary + Sub-sites) into a single consolidated timesheet under the primary site
    const allTimesheets = getTimesheets();
    const existingTs = allTimesheets.find(t =>
      t.siteId === site.id &&
      t.periodStart === periodStart &&
      t.periodEnd === periodEnd
    );

    const timesheet = {
      id: initialData?.id || existingTs?.id || crypto.randomUUID(),
      siteId: site.id,
      siteName: site.siteName,
      periodStart,
      periodEnd,
      entries: entries.map(entry => {
        const effectiveRates = getEffectiveRates(entry.contractorId, entry.siteId, entry.rateCode);
        return {
          ...entry,
          rates: effectiveRates,
          ...calculateTimesheetPay(entry, effectiveRates, publicHolidays),
        };
      }),
      status: existingTs?.status || 'draft',
      createdAt: existingTs?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Strict Input Validation
    const validationResult = validateData(TimesheetSchema, timesheet);
    if (!validationResult.success) {
      setToastMsg(`Validation Error: ${validationResult.error}`);
      setShowToast(true);
      return;
    }

    onSave(validationResult.data);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {showToast && (
        <Toast
          message={toastMsg || `Timesheet updated for ${site.siteName}!`}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Budget Status Banner */}
      {budgetStatus && (!budgetStatus.withinBudget) && (
        <div className="bg-notion-badge-rose-bg border whisper-border rounded-comfortable p-6 shadow-notion-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-white rounded-micro whisper-border flex items-center justify-center text-rose-500 shadow-notion-card">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h3 className="text-body-semibold text-rose-900 tracking-tight">Terminal Alert: Budget Violation</h3>
                <p className="text-caption text-rose-500 font-bold mt-1 uppercase tracking-widest">Resource expenditure beyond authorized limits.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {budgetStatus.hoursOver > 0 && (
                <div className="bg-white whisper-border px-4 py-2 rounded-micro flex flex-col shadow-sm">
                  <span className="text-[9px] font-bold text-rose-300 uppercase leading-none mb-1 tracking-widest">Hours Overflow</span>
                  <span className="text-sm font-bold text-rose-600 tabular-nums">+{budgetStatus.hoursOver.toFixed(1)}h</span>
                </div>
              )}
              {budgetStatus.amountOver > 0 && (
                <div className="bg-white whisper-border px-4 py-2 rounded-micro flex flex-col shadow-sm">
                  <span className="text-[9px] font-bold text-rose-300 uppercase leading-none mb-1 tracking-widest">Financial Load</span>
                  <span className="text-sm font-bold text-rose-600 tabular-nums">${budgetStatus.amountOver.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Premium Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="notion-card p-6 flex items-center justify-between group transition-all hover:border-notion-blue/20">
          <div>
            <span className="block text-badge text-notion-warm-gray-300 mb-1 uppercase tracking-widest">Cumulative Hours</span>
            <span className={`text-display-secondary font-bold tracking-notion-display ${budgetStatus?.hoursOver > 0 ? 'text-rose-600' : 'text-notion-black'}`}>
              {totalStats.hours.toFixed(2)}
              {totalStats.budgetedHours > 0 && <span className="text-xs font-bold text-notion-warm-gray-300 ml-2">/ {totalStats.budgetedHours}h</span>}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-micro flex items-center justify-center transition-all ${budgetStatus?.hoursOver > 0 ? 'bg-rose-50 text-rose-600' : 'bg-notion-warm-white text-notion-warm-gray-300 group-hover:bg-notion-blue/10 group-hover:text-notion-blue'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="notion-card p-6 flex items-center justify-between group transition-all hover:border-emerald-200">
          <div>
            <span className="block text-badge text-notion-warm-gray-300 mb-1 uppercase tracking-widest">Financial Load</span>
            <span className={`text-display-secondary font-bold tracking-notion-display ${budgetStatus?.amountOver > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ${totalStats.pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              {totalStats.budgetedAmount > 0 && <span className="text-xs font-bold text-notion-warm-gray-300 ml-2">/ ${totalStats.budgetedAmount.toLocaleString()}</span>}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-micro flex items-center justify-center transition-all ${budgetStatus?.amountOver > 0 ? 'bg-rose-50 text-rose-600' : 'bg-notion-warm-white text-emerald-600 group-hover:bg-emerald-50'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="notion-card p-6 flex items-center justify-between group transition-all">
          <div>
            <span className="block text-badge text-notion-warm-gray-300 mb-1 uppercase tracking-widest">Site Health</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${!budgetStatus || budgetStatus.withinBudget ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
              <span className={`text-body-semibold tracking-tight ${!budgetStatus || budgetStatus.withinBudget ? 'text-emerald-700' : 'text-rose-700'}`}>
                {!budgetStatus || budgetStatus.withinBudget ? 'Operational' : 'Limit Exceeded'}
              </span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-micro flex items-center justify-center ${!budgetStatus || budgetStatus.withinBudget ? 'bg-emerald-50 text-emerald-600 font-bold' : 'bg-rose-50 text-rose-600'}`}>
            {!budgetStatus || budgetStatus.withinBudget ? 'OK' : '!'}
          </div>
        </div>

        <div className="bg-notion-black rounded-comfortable p-6 flex items-center justify-between group shadow-notion-deep">
          <div className="flex flex-col gap-1">
            <span className="block text-badge text-notion-warm-gray-300 uppercase tracking-widest">Workforce</span>
            <span className="text-display-secondary font-bold text-white tracking-notion-display">{entries.length} Nodes</span>
          </div>
          <div className="w-10 h-10 rounded-micro bg-white/10 flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 p-2">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-display-secondary text-notion-black tracking-notion-display underline decoration-notion-blue/20 underline-offset-8 decoration-2">{site.siteName}</h3>
              <div className="px-2 py-0.5 bg-notion-badge-blue-bg text-notion-blue rounded-micro text-badge font-bold whisper-border uppercase tracking-widest">Active Terminal</div>
            </div>
            <p className="text-caption text-notion-warm-gray-300 font-bold flex items-center gap-2 uppercase tracking-tight">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {formatDateDisplay(periodStart)} — {formatDateDisplay(periodEnd)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <button
            onClick={() => setShowNewContractorModal(true)}
            className="flex-1 xl:flex-none px-4 py-2 bg-notion-warm-white text-notion-black rounded-micro hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 text-badge font-bold uppercase tracking-widest shadow-sm whisper-border"
          >
            <svg className="w-3 h-3 text-notion-warm-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Onboard
          </button>
          <button
            onClick={() => setShowStaffModal(true)}
            className="flex-1 xl:flex-none px-4 py-2 bg-notion-warm-white text-notion-black rounded-micro hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 text-badge font-bold uppercase tracking-widest shadow-sm whisper-border"
          >
            <svg className="w-3 h-3 text-notion-warm-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2" /></svg>
            Allocate
          </button>
          <button
            onClick={handleSave}
            className="flex-1 xl:flex-none px-6 py-2 bg-notion-blue text-white rounded-micro hover:bg-notion-blue-active transition-all flex items-center justify-center gap-2 text-badge font-bold uppercase tracking-widest shadow-notion-card"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            Publish Entry
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-comfortable whisper-border max-h-[75vh] custom-scrollbar relative bg-white shadow-notion-deep">
        <table className="min-w-full border-collapse table-fixed md:table-auto">
          <thead className="bg-notion-warm-white sticky top-0 z-[2000]">
            <tr className="divide-x whisper-border">
              <th className="px-6 py-4 text-left text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest sticky left-0 top-0 bg-notion-warm-white z-[2010] w-[220px]">Employee Profile</th>
              {dates.map(date => {
                const isPH = publicHolidays.includes(date.date);
                const holidayName = getPublicHolidays().find(h => h.date === date.date)?.name;
                return (
                  <th
                    key={date.date}
                    className={`px-1 py-4 text-center text-badge font-bold min-w-[90px] uppercase tracking-tighter ${isPH ? 'bg-orange-50 text-orange-600' : 'text-notion-warm-gray-300'}`}
                    title={isPH ? `Global Holiday: ${holidayName}` : ''}
                  >
                    {formatDateDisplay(date.date)}
                    {isPH && <div className="text-[8px] text-orange-400 font-bold block mt-1 tracking-widest">HOLIDAY</div>}
                  </th>
                );
              })}
              <th className="px-3 py-4 text-center text-badge font-bold text-notion-black bg-slate-100 min-w-[80px] uppercase tracking-widest">Total Hrs</th>
              {(() => {
                const showLumpSum = site.isTrainingSite || entries.some(e => e.manualLumpSumHours !== null);
                const showExtraCol = entries.some(e => e.extraHours > 0 || e.isExtraMode);
                return (
                  <>
                    {showLumpSum && <th className="px-3 py-4 text-center text-badge font-bold text-orange-500 bg-orange-50 min-w-[120px] uppercase tracking-widest">Escrow Release</th>}
                    {showExtraCol && <th className="px-3 py-4 text-center text-badge font-bold text-notion-blue bg-notion-badge-blue-bg min-w-[100px] uppercase tracking-widest">Extra Hours</th>}
                  </>
                );
              })()}
              <th className="px-3 py-4 text-center text-badge font-bold text-notion-warm-gray-300 min-w-[80px] uppercase tracking-widest">Allow. (h)</th>
              <th className="px-3 py-4 text-center text-badge font-bold text-notion-warm-gray-300 min-w-[80px] uppercase tracking-widest">Other (d)</th>
              <th className="px-3 py-4 text-center text-badge font-bold text-notion-blue bg-notion-badge-blue-bg min-w-[90px] uppercase tracking-widest">Extras ($)</th>
              <th className="px-3 py-4 text-center text-badge font-bold text-rose-500 bg-notion-badge-rose-bg min-w-[90px] uppercase tracking-widest">Deductions</th>
              <th className="px-3 py-4 text-center text-caption font-bold text-notion-warm-gray-300 min-w-[110px] uppercase tracking-widest">Gross Pay</th>
              <th className="px-3 py-4 text-center text-badge font-bold text-emerald-600 bg-emerald-50 min-w-[120px] sticky right-0 z-[2010] bg-notion-warm-white uppercase tracking-widest">Net Settlement</th>
              <th className="px-3 py-4 text-center text-badge font-bold text-orange-500 min-w-[90px] uppercase tracking-widest">Escrow (T)</th>
            </tr>
          </thead>
          <tbody className="divide-y whisper-border">
            {(() => {
              const showLumpSum = site.isTrainingSite || entries.some(e => e.manualLumpSumHours !== null);
              const relevantSites = [site, ...subSites];
              const totalCols = dates.length + 1 + (showLumpSum ? 1 : 0) + (entries.some(e => e.extraHours > 0 || e.isExtraMode) ? 1 : 0) + 6;

              if (entries.length === 0 && relevantSites.every(s => !(s.allocatedContractors?.length > 0))) {
                return (
                  <tr>
                    <td colSpan={totalCols + 1} className="py-24 text-center text-notion-warm-gray-300 font-bold text-badge uppercase tracking-widest italic">
                      Zero Resources Allocated. Use operational controls for deployment.
                    </td>
                  </tr>
                );
              }

              return relevantSites.map((currentSite, siteIdx) => {
                const isPrimary = currentSite.id === site.id;
                const siteEntries = entries.filter(e => e.siteId === currentSite.id);

                // Solid background tints for sub-site groups (prevents see-through on sticky cols)
                const subSiteTints = [
                  '#f6fafe',   // blue (equivalent to 4% opacity over white)
                  '#f4fcf8',   // emerald 
                  '#fefaf2',   // amber
                  '#f9f7fe',   // violet
                  '#fef5fa',   // pink
                  '#f3fbfd',   // cyan
                ];
                const subSiteBorders = [
                  'rgba(59, 130, 246, 0.15)',   // blue
                  'rgba(16, 185, 129, 0.15)',   // emerald
                  'rgba(245, 158, 11, 0.15)',   // amber
                  'rgba(139, 92, 246, 0.15)',   // violet
                  'rgba(236, 72, 153, 0.15)',   // pink
                  'rgba(6, 182, 212, 0.15)',    // cyan
                ];
                const subSiteIndex = isPrimary ? -1 : relevantSites.filter(s => s.id !== site.id).indexOf(currentSite);
                const tint = isPrimary ? 'transparent' : subSiteTints[subSiteIndex % subSiteTints.length];
                const borderTint = isPrimary ? undefined : subSiteBorders[subSiteIndex % subSiteBorders.length];
                const baseZ = 1000 - (siteIdx * 100);

                return (
                  <Fragment key={currentSite.id}>
                    {/* Site Header Row */}
                    <tr style={{ backgroundColor: isPrimary ? undefined : tint }}>
                      {/* FIXED LEFT: Site Title */}
                      <td className="px-6 py-3.5 border-y whisper-border sticky left-0 shadow-sm" style={{ backgroundColor: isPrimary ? '#fcfcfc' : tint, borderLeftWidth: isPrimary ? 0 : 3, borderLeftColor: borderTint, borderLeftStyle: 'solid', zIndex: baseZ }}>
                        <div className="flex items-center gap-3 min-w-[380px]">
                          <div className={`px-2 py-0.5 rounded-micro text-[10px] font-bold border whisper-border uppercase tracking-widest ${isPrimary ? 'bg-notion-black text-white' : 'bg-white text-notion-warm-gray-300'}`}>
                            {isPrimary ? 'TERMINAL' : 'SUB-HUB'}
                          </div>
                          <span className="text-body-semibold text-notion-black whitespace-nowrap">{currentSite.siteName}</span>
                        </div>
                      </td>

                      {/* SPACER: Middle Columns */}
                      <td colSpan={totalCols - 1} className="border-y whisper-border shadow-sm" style={{ backgroundColor: isPrimary ? '#fcfcfc' : tint }}></td>

                      {/* FIXED RIGHT: Actions (only for sub-sites) */}
                      <td className="px-6 py-3.5 border-y whisper-border sticky right-0 text-right shadow-sm" style={{ backgroundColor: isPrimary ? '#fcfcfc' : tint, zIndex: baseZ }}>
                        {!isPrimary && (
                          <div className="flex items-center justify-end gap-3">
                            <Dropdown
                              value=""
                              onChange={(val) => {
                                if (val) {
                                  let [cid, rcode] = val.split('::');
                                  if (rcode === 'undefined') rcode = null;
                                  handleQuickAddStaff(cid, null, currentSite.id, rcode || null);
                                }
                              }}
                              options={contractors
                                .filter(c => c.status === 'active')
                                .reduce((acc, c) => {
                                  const codes = (c.contractorId || '').split(',').map(code => code.trim()).filter(Boolean);
                                  if (codes.length === 0) {
                                    if (!siteEntries.some(e => e.contractorId === c.id && !e.rateCode)) {
                                      acc.push({ value: c.id, label: c.name });
                                    }
                                  } else {
                                    codes.forEach(code => {
                                      if (!siteEntries.some(e => e.contractorId === c.id && e.rateCode === code)) {
                                        acc.push({ value: `${c.id}::${code}`, label: `${c.name} (${code})` });
                                      }
                                    });
                                  }
                                  return acc;
                                }, [])
                              }
                              placeholder="+ DEPLOY RESOURCE..."
                              variant="compact"
                              showSelected={false}
                              className="w-56"
                            />
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Site Entries - only for sub-sites */}
                    {isPrimary ? null : siteEntries.length === 0 ? (
                      <tr style={{ backgroundColor: tint }}>
                        <td colSpan={totalCols + 1} className="px-4 py-4 text-center text-[10px] text-slate-400 italic">No workers assigned to this site yet.</td>
                      </tr>
                    ) : siteEntries.map((entry, index) => {
                      const effectiveRates = getEffectiveRates(entry.contractorId, entry.siteId, entry.rateCode);
                      const calculation = calculateTimesheetPay(entry, effectiveRates, publicHolidays);
                      const isManual = entry.manualLumpSumHours !== null;
                      return (
                        <tr
                          key={`${entry.contractorId}-${entry.siteId}-${entry.rateCode || 'none'}`}
                          className="hover:brightness-[0.98] transition-all group/row border-b whisper-border"
                          style={{ backgroundColor: tint }}
                        >
                          <td className="px-6 py-4 sticky left-0 transition-colors shadow-sm" style={{ backgroundColor: tint, borderLeftWidth: 3, borderLeftColor: borderTint, borderLeftStyle: 'solid', zIndex: baseZ - 10 - index }}>
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-body-semibold text-notion-black tracking-tight group-hover/row:text-notion-blue transition-colors">
                                  {entry.contractorName} {entry.rateCode && <span className="ml-1 px-1.5 py-0.5 bg-notion-warm-white text-notion-warm-gray-300 rounded-micro text-badge font-mono tracking-widest whisper-border">{entry.rateCode}</span>}
                                </div>
                                <button
                                  onClick={() => handleRemoveEntry(entry.contractorId, entry.siteId, entry.rateCode)}
                                  className="w-6 h-6 flex items-center justify-center rounded-micro text-notion-warm-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover/row:opacity-100"
                                  title="De-allocate Resource"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>

                              {effectiveRates.isCustom && (
                                <div className="flex items-center gap-1.5">
                                  <div className="px-1.5 py-0.5 bg-notion-badge-blue-bg text-notion-blue rounded-micro text-[8px] font-bold whisper-border uppercase tracking-widest">Custom Rate</div>
                                </div>
                              )}

                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer group/mode">
                                  <div className="relative flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={isManual}
                                      onChange={(e) => handleLumpSumToggle(entry.contractorId, e.target.checked, entry.siteId, entry.rateCode)}
                                      className="peer h-3 w-3 rounded-micro border-notion-warm-gray-300 text-notion-black focus:ring-0 transition-all cursor-pointer"
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-notion-warm-gray-300 peer-checked:text-notion-black uppercase tracking-widest transition-colors">Manual</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer group/extra">
                                  <div className="relative flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={entry.isExtraMode}
                                      onChange={(e) => {
                                        setEntries(entries.map(ent => (ent.contractorId === entry.contractorId && ent.siteId === entry.siteId && (ent.rateCode || null) === (entry.rateCode || null)) ? { ...ent, isExtraMode: e.target.checked } : ent));
                                      }}
                                      className="peer h-3 w-3 rounded-micro border-notion-warm-gray-300 text-notion-blue focus:ring-0 transition-all cursor-pointer"
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-notion-warm-gray-300 peer-checked:text-notion-blue uppercase tracking-widest transition-colors">Extra</span>
                                </label>
                              </div>
                            </div>
                          </td>

                          {dates.map(date => {
                            const dayEntry = entry.dailyHours.find(dh => dh.date === date.date);
                            const isPH = publicHolidays.includes(date.date);

                            return (
                              <td
                                key={date.date}
                                className={`px-1 py-4 transition-colors whisper-border ${isManual ? 'bg-notion-warm-white/20' : ''} ${isPH ? 'bg-orange-50/20' : ''}`}
                              >
                                <div className="flex flex-col items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={dayEntry?.hours || ''}
                                    onChange={(e) => handleHoursChange(entry.contractorId, date.date, e.target.value, entry.siteId, entry.rateCode)}
                                    disabled={isManual}
                                    className={`w-full text-center py-1 text-sm font-bold tabular-nums outline-none rounded-micro disabled:opacity-20 transition-all ${isPH ? 'text-orange-600' : 'text-notion-black bg-transparent hover:bg-zinc-100 focus:bg-white focus:shadow-sm'}`}
                                    placeholder="0"
                                  />
                                  <div className="flex items-center justify-center gap-2 min-h-[14px]">
                                    {(site?.isTrainingSite || allSites.find(s => s.id === entry.siteId)?.isTrainingSite) && (
                                      <button
                                        onClick={() => !isManual && handleTrainingToggle(entry.contractorId, date.date, entry.siteId)}
                                        className={`flex items-center justify-center w-3 h-3 rounded-micro border transition-all ${dayEntry?.isTraining ? 'bg-orange-500 border-orange-600 text-white' : 'bg-transparent border-notion-warm-gray-300 text-notion-warm-gray-300 hover:border-orange-400'}`}
                                        disabled={isManual}
                                      >
                                        <span className="text-[7px] font-bold">T</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}

                          <td className="px-2 py-4 text-center text-sm font-bold text-notion-black bg-slate-50 whisper-border tabular-nums">
                            {calculation.totalHours + calculation.trainingHours > 0 ? (calculation.totalHours + calculation.trainingHours).toFixed(2).replace(/\.00$/, '') : '—'}
                          </td>

                          {showLumpSum && (
                            <td className="px-2 py-4 min-w-[150px] bg-orange-50/10 whisper-border">
                              {isManual && (
                                <div className="grid grid-cols-2 gap-2 p-1">
                                  {['weekday', 'saturday', 'sunday', 'publicHoliday'].map(type => (
                                    <div key={type} className="flex flex-col gap-0.5">
                                      <div className="text-[7px] font-bold uppercase text-orange-400 text-center tracking-widest">{type.substring(0, 3)}</div>
                                      <input
                                        type="number"
                                        value={entry.manualLumpSumHours[type] || ''}
                                        onChange={(e) => handleLumpSumChange(entry.contractorId, type, e.target.value, entry.siteId, entry.rateCode)}
                                        className="w-full text-badge text-center font-bold text-orange-900 bg-white whisper-border rounded-micro outline-none py-1 tabular-nums focus:shadow-sm"
                                        placeholder="0"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          )}

                          {entries.some(e => e.extraHours > 0 || e.isExtraMode) && (
                            <td className="px-3 py-4 bg-notion-badge-blue-bg/20 whisper-border">
                              {(entry.isExtraMode || entry.extraHours > 0) ? (
                                <input
                                  type="number"
                                  value={entry.extraHours || ''}
                                  onChange={(e) => handleExtraHoursChange(entry.contractorId, e.target.value, entry.siteId, entry.rateCode)}
                                  className="w-full text-center py-1 text-sm font-bold text-notion-blue bg-white whisper-border rounded-micro outline-none tabular-nums"
                                  placeholder="+ Hrs"
                                />
                              ) : (
                                <div className="text-badge text-notion-warm-gray-300 font-bold text-center tracking-widest">—</div>
                              )}
                            </td>
                          )}

                          <td className="px-2 py-4 whisper-border">
                            <div className="relative group/field" title={`$${getGlobalRates().allowancePerHour.toFixed(2)} per hour`}>
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-notion-warm-gray-300">H</span>
                              <input type="number" value={entry.allowance ? parseFloat((entry.allowance / getGlobalRates().allowancePerHour).toFixed(2)) : ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'allowance', (parseFloat(e.target.value) || 0) * getGlobalRates().allowancePerHour, entry.siteId, entry.rateCode)} className="w-full pl-5 pr-2 py-1.5 text-badge font-bold text-notion-warm-gray-300 outline-none rounded-micro bg-notion-warm-white border-transparent border focus:bg-white focus:whisper-border transition-all tabular-nums" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-2 py-4 whisper-border">
                            <div className="relative group/field" title={`$${getGlobalRates().otherPerDay.toFixed(2)} per day`}>
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-notion-warm-gray-300">D</span>
                              <input type="number" value={entry.otherPay ? parseFloat((entry.otherPay / getGlobalRates().otherPerDay).toFixed(2)) : ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'otherPay', (parseFloat(e.target.value) || 0) * getGlobalRates().otherPerDay, entry.siteId, entry.rateCode)} className="w-full pl-5 pr-2 py-1.5 text-badge font-bold text-notion-warm-gray-300 outline-none rounded-micro bg-notion-warm-white border-transparent border focus:bg-white focus:whisper-border transition-all tabular-nums" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-2 py-4 whisper-border">
                            <div className="relative group/field">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-notion-blue">+</span>
                              <input type="number" value={entry.customAddition || ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'customAddition', e.target.value, entry.siteId, entry.rateCode)} className="w-full pl-5 pr-2 py-1.5 text-badge font-bold text-notion-blue bg-notion-badge-blue-bg/10 border-transparent border outline-none rounded-micro focus:bg-white focus:whisper-border transition-all tabular-nums" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-2 py-4 whisper-border">
                            <div className="relative group/field">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-300">-</span>
                              <input type="number" value={entry.deduction || ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'deduction', e.target.value, entry.siteId, entry.rateCode)} className="w-full pl-5 pr-2 py-1.5 text-badge font-bold text-rose-500 bg-notion-badge-rose-bg/10 border-transparent border outline-none rounded-micro focus:bg-white focus:whisper-border transition-all tabular-nums" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-badge text-notion-warm-gray-300 tabular-nums whisper-border">${calculation.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 text-center sticky right-0 shadow-sm whisper-border" style={{ backgroundColor: tint, zIndex: baseZ - 10 - index }}>
                            <span className="font-bold text-sm text-emerald-600 tabular-nums">${calculation.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="px-4 py-4 text-center whisper-border">
                            {calculation.trainingPay > 0 ? (
                              <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-micro font-bold text-badge whisper-border uppercase tracking-widest">
                                ${calculation.trainingPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-badge font-bold text-notion-warm-gray-100 tracking-widest">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      {
        showNewContractorModal && (
          <div className="fixed inset-0 bg-notion-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
            <div className="bg-white rounded-comfortable w-full max-h-[90vh] overflow-hidden shadow-notion-deep border whisper-border flex flex-col animate-scale-in">
              {/* Header */}
              <div className="p-8 pb-6 bg-notion-warm-white relative overflow-hidden flex justify-between items-center">
                <div className="relative z-10">
                  <div className="px-2 py-0.5 bg-notion-badge-blue-bg text-notion-blue rounded-micro text-badge font-bold uppercase tracking-widest whisper-border mb-3 inline-block">Direct Onboarding</div>
                  <h3 className="text-display-secondary text-notion-black tracking-notion-display">Fast-Track Hire</h3>
                  <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-1">Resource allocation for this terminal.</p>
                </div>
                <button
                  onClick={() => setShowNewContractorModal(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white rounded-micro text-notion-warm-gray-300 hover:text-notion-black transition-all shadow-sm whisper-border"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <ContractorForm onSave={handleQuickCreateContractor} onCancel={() => setShowNewContractorModal(false)} />
              </div>
            </div>
          </div>
        )
      }

      {
        showStaffModal && (
          <div className="fixed inset-0 bg-notion-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-comfortable w-full overflow-hidden shadow-notion-deep border whisper-border flex flex-col animate-scale-in max-h-[85vh]">
              {/* Header */}
              <div className="p-8 bg-notion-warm-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-display-secondary text-notion-black tracking-notion-display">Workforce Orchestration</h3>
                  <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-1">Manage deployment for {site.siteName}</p>
                </div>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                {/* CURRENT STAFF */}
                <div className="space-y-4">
                  <div className="text-badge font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Stationed Personnel
                  </div>
                  <div className="space-y-3">
                    {contractors
                      .filter(c => site.allocatedContractors?.includes(c.id))
                      .map(c => {
                        const contractorSubSites = allSites.filter(s => s.isSubSite && s.parentSiteId === site.id && s.allocatedContractors?.includes(c.id));
                        const availableSubSites = subSites.filter(ss => !contractorSubSites.some(css => css.id === ss.id));

                        return (
                          <div key={c.id} className="p-5 bg-notion-warm-white/50 rounded-comfortable whisper-border space-y-4 transition-all hover:bg-white group/worker">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-micro bg-notion-black text-white flex items-center justify-center font-bold text-xs shadow-notion-card">
                                  {c.name[0]}
                                </div>
                                <div>
                                  <div className="text-body-semibold text-notion-black uppercase tracking-tight">{c.name}</div>
                                  <div className="text-[9px] text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-0.5">{c.contractorId}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleQuickRemoveStaff(c.id, site.id)}
                                className="w-9 h-9 flex items-center justify-center bg-white text-rose-500 rounded-micro whisper-border hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                title="Revoke Assignment"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>

                            <div className="pt-4 border-t whisper-border">
                              <div className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-3">Allocated Hubs</div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {contractorSubSites.map(ss => (
                                  <div key={ss.id} className="bg-white px-3 py-1.5 rounded-micro whisper-border shadow-sm text-badge font-bold text-notion-black flex items-center gap-2 group/hub">
                                    {ss.siteName}
                                    <button onClick={() => handleQuickRemoveStaff(c.id, ss.id)} className="text-notion-warm-gray-100 hover:text-rose-500 transition-colors">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                ))}
                                {contractorSubSites.length === 0 && <span className="text-badge text-notion-warm-gray-100 font-bold italic">Terminal Locked</span>}
                              </div>

                              {availableSubSites.length > 0 && (
                                <div className="relative">
                                  <select
                                    onChange={(e) => {
                                      handleQuickAddStaff(c.id, null, e.target.value);
                                      e.target.value = '';
                                    }}
                                    className="appearance-none w-full text-badge font-bold bg-white whisper-border rounded-micro px-4 py-2 outline-none focus:shadow-notion-card transition-all cursor-pointer text-notion-warm-gray-300 hover:bg-notion-warm-white"
                                  >
                                    <option value="">RE-DEPLOY TO ALTERNATE HUB...</option>
                                    {availableSubSites.map(ss => (
                                      <option key={ss.id} value={ss.id}>{ss.siteName}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-notion-warm-gray-100">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {contractors.filter(c => site.allocatedContractors?.includes(c.id)).length === 0 && (
                      <div className="text-center py-10 bg-notion-warm-white/50 rounded-comfortable whisper-border text-notion-warm-gray-100 text-badge font-bold uppercase tracking-widest">Station Empty</div>
                    )}
                  </div>
                </div>

                {/* AVAILABLE STAFF */}
                <div className="space-y-4">
                  <div className="text-badge font-bold text-notion-blue flex items-center gap-3 uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-notion-blue"></div>
                    Pending Deployment
                  </div>
                  <div className="space-y-2">
                    {contractors
                      .filter(c => c.status === 'active' && !site.allocatedContractors?.includes(c.id))
                      .map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-white rounded-comfortable whisper-border hover:shadow-notion-card transition-all group/avail">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-micro bg-notion-warm-white text-notion-warm-gray-300 flex items-center justify-center font-bold text-[10px] group-hover/avail:bg-notion-blue/10 group-hover/avail:text-notion-blue transition-colors">
                              {c.name[0]}
                            </div>
                            <div>
                              <div className="text-body-semibold text-notion-black tracking-tight">{c.name}</div>
                              <div className="text-caption text-notion-warm-gray-300 font-bold mt-0.5">{c.contractorId}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleQuickAddStaff(c.id)}
                            className="w-9 h-9 flex items-center justify-center bg-notion-warm-white text-notion-warm-gray-300 rounded-micro hover:bg-notion-blue hover:text-white transition-all shadow-sm"
                            title="Assign to Site"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </button>
                        </div>
                      ))}
                    {contractors.filter(c => c.status === 'active' && !site.allocatedContractors?.includes(c.id)).length === 0 && (
                      <div className="text-center py-10 bg-notion-warm-white/50 rounded-comfortable whisper-border text-notion-warm-gray-100 text-badge font-bold uppercase tracking-widest">Workforce Exhausted</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-notion-warm-white border-t whisper-border">
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="w-full py-4 bg-notion-black text-white font-bold text-badge uppercase tracking-widest rounded-micro shadow-notion-deep hover:-translate-y-0.5 transition-all"
                >
                  Confirm Deployment Plan
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default TimesheetEntry;
