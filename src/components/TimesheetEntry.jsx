import { useState, useEffect, Fragment } from 'react';
import { generatePeriodDates, formatDateDisplay } from '../utils/dateUtils';
import { checkBudgetStatus, calculateTimesheetPay } from '../utils/payrollCalculations';
import { getPayRates, getTimesheets, savePayRates, saveSites, getSites, saveContractors, getContractors, logAction, getPublicHolidays } from '../utils/storage';
import ContractorForm from './ContractorForm';
import Toast from './Toast';
import Dropdown from './Dropdown';

const TimesheetEntry = ({ site: initialSite, periodStart, periodEnd, contractors, onSave, onQuickAddContractor, initialData = null }) => {
  const [site, setSite] = useState(initialSite);
  const [dates, setDates] = useState([]);
  const [entries, setEntries] = useState([]);
  const [payRates, setPayRates] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [totalStats, setTotalStats] = useState({ hours: 0, pay: 0, budgetedHours: 0, budgetedAmount: 0 });

  const [showRateModal, setShowRateModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showNewContractorModal, setShowNewContractorModal] = useState(false);
  const [tempRates, setTempRates] = useState({ weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 });
  const [toastMsg, setToastMsg] = useState('');
  const [allSites, setAllSites] = useState(getSites());
  const [rateModalSite, setRateModalSite] = useState(null);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const subSites = allSites.filter(s => s.isSubSite && s.parentSiteId === site.id);

  const getEffectiveRates = (contractorId, targetSiteId) => {
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

    // Get base rates for the target site
    const allRates = getPayRates();
    const siteRates = allRates.find(r => r.siteId === useSiteId);
    if (siteRates) {
      return {
        weekday: parseFloat(siteRates.weekday) || 0,
        saturday: parseFloat(siteRates.saturday) || 0,
        sunday: parseFloat(siteRates.sunday) || 0,
        publicHoliday: parseFloat(siteRates.publicHoliday) || 0,
        isCustom: false
      };
    }

    return { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0, isCustom: false };
  };

  useEffect(() => {
    if (entries.length > 0) {
      const totals = entries.reduce((acc, entry) => {
        const effectiveRates = getEffectiveRates(entry.contractorId, entry.siteId);
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
  }, [entries, payRates, site, allSites]);

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

      // Load pay rates for this site
      const allRates = getPayRates();
      const siteRates = allRates.find(r => r.siteId === site.id);
      if (siteRates) {
        const rates = {
          weekday: parseFloat(siteRates.weekday) || 0,
          saturday: parseFloat(siteRates.saturday) || 0,
          sunday: parseFloat(siteRates.sunday) || 0,
          publicHoliday: parseFloat(siteRates.publicHoliday) || 0,
        };
        setPayRates(rates);

        const allZero = Object.values(rates).every(r => r === 0);
        if (allZero) {
          setToastMsg('Operational Alert: Pay rates for this site are currently $0. Configuration required.');
          setShowToast(true);
        }
      } else {
        const defaultRates = { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 };
        setPayRates(defaultRates);
        setToastMsg('Status Critical: No pay rates configured for this terminal. Configuration mandated before data entry.');
        setShowToast(true);
      }

      if (initialData && initialData.entries) {
        setEntries(initialData.entries);
      } else {
        // Load contractors from primary site AND all sub-sites
        const primaryAllocated = contractors.filter(c => site.allocatedContractors?.includes(c.id));
        const subSitesAllocated = subSites.flatMap(ss =>
          contractors
            .filter(c => ss.allocatedContractors?.includes(c.id))
            .map(c => ({ contractor: c, siteId: ss.id, siteName: ss.siteName }))
        );

        const initialEntries = [
          ...primaryAllocated.map(c => ({
            contractorId: c.id,
            contractorName: c.name,
            siteId: site.id,
            siteName: site.siteName,
            dailyHours: periodDates.map(d => ({ date: d.date, hours: 0, isTraining: false })),
            manualLumpSumHours: null,
            extraHours: 0,
            allowance: 0,
            otherPay: 0,
            deduction: 0
          })),
          ...subSitesAllocated.map(({ contractor, siteId, siteName }) => ({
            contractorId: contractor.id,
            contractorName: contractor.name,
            siteId: siteId,
            siteName: siteName,
            dailyHours: periodDates.map(d => ({ date: d.date, hours: 0, isTraining: false })),
            manualLumpSumHours: null,
            extraHours: 0,
            allowance: 0,
            otherPay: 0,
            deduction: 0
          }))
        ];

        setEntries(initialEntries);
      }
    }
  }, [site.id, periodStart, periodEnd, initialData?.id]);

  const handleOpenRateModal = (targetSiteId) => {
    const targetSite = allSites.find(s => s.id === targetSiteId);
    if (!targetSite) return;

    const allRates = getPayRates();
    const siteRates = allRates.find(r => r.siteId === targetSiteId);

    setTempRates(siteRates ? {
      weekday: parseFloat(siteRates.weekday) || 0,
      saturday: parseFloat(siteRates.saturday) || 0,
      sunday: parseFloat(siteRates.sunday) || 0,
      publicHoliday: parseFloat(siteRates.publicHoliday) || 0,
    } : { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 });

    setRateModalSite(targetSite);
    setShowRateModal(true);
  };

  const handleUpdateRates = () => {
    if (!rateModalSite) return;

    const allRates = getPayRates();
    const existingIndex = allRates.findIndex(r => r.siteId === rateModalSite.id);
    const updatedRate = { siteId: rateModalSite.id, siteName: rateModalSite.siteName, ...tempRates };

    if (existingIndex >= 0) allRates[existingIndex] = updatedRate;
    else allRates.push(updatedRate);

    savePayRates(allRates);

    // If we updated the primary site, update the local payRates state too
    if (rateModalSite.id === site.id) {
      setPayRates(tempRates);
    }

    setShowRateModal(false);
    setRateModalSite(null);
    setToastMsg(`Pay rates updated for ${rateModalSite.siteName}.`);
    setShowToast(true);
  };

  const handleQuickAddStaff = (contractorId, contractorObj = null, targetSiteId) => {
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

    // Check if entry already exists for this contractor and site
    const exists = entries.some(e => e.contractorId === contractorId && e.siteId === useSiteId);

    if (contractor && !exists) {
      const targetSiteName = updatedSites.find(s => s.id === useSiteId)?.siteName;
      setEntries([...entries, {
        contractorId: contractor.id,
        contractorName: contractor.name,
        siteId: useSiteId,
        siteName: targetSiteName,
        dailyHours: dates.map(d => ({ date: d.date, hours: 0, isTraining: false })),
        manualLumpSumHours: null,
        extraHours: 0,
        allowance: 0,
        otherPay: 0,
        deduction: 0
      }]);
    }
    setToastMsg("Allocation updated.");
    setShowToast(true);
  };
  const handleQuickRemoveStaff = (contractorId, targetSiteId) => {
    const useSiteId = targetSiteId || site.id;
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

    // Remove from active grid
    setEntries(entries.filter(e => !(e.contractorId === contractorId && e.siteId === useSiteId)));
    setToastMsg("Staff allocation updated.");
    setShowToast(true);
  };
  const handleQuickCreateContractor = (formData) => {
    try {
      const newContractor = {
        id: Date.now().toString(),
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
      console.error(e);
      alert("Error saving contractor: " + e.message);
    }
  };

  const handleHoursChange = (contractorId, date, value, targetSiteId) => {
    const rates = getEffectiveRates(contractorId, targetSiteId);
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
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId) {
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

  const handleTrainingToggle = (contractorId, date, targetSiteId) => {
    const allTimesheets = getTimesheets();
    const otherTimesheets = allTimesheets.filter(ts => ts.id !== initialData?.id);

    const historicalTrainingDays = otherTimesheets.flatMap(ts => ts.entries)
      .filter(entry => entry.contractorId === contractorId)
      .reduce((sum, entry) => {
        return sum + (entry.dailyHours?.filter(d => d.isTraining && d.hours > 0).length || 0);
      }, 0);

    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId) {
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

  const handleLumpSumToggle = (contractorId, isChecked, targetSiteId) => {
    const defaultValue = isChecked ? { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 } : null;
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId) {
        return { ...entry, manualLumpSumHours: defaultValue };
      }
      return entry;
    }));
  };

  const handleLumpSumChange = (contractorId, type, value, targetSiteId) => {
    const rates = getEffectiveRates(contractorId, targetSiteId);
    const hasRates = rates.weekday > 0 || rates.saturday > 0 || rates.sunday > 0 || rates.publicHoliday > 0;

    if (!hasRates) {
      const targetSite = allSites.find(s => s.id === targetSiteId);
      setToastMsg(`⚠️ Please adjust pay rates for ${targetSite?.siteName || 'this site'} before entering lump sum hours.`);
      setShowToast(true);
      return;
    }

    const numValue = Math.max(0, parseFloat(value) || 0);
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId) {
        const currentManual = entry.manualLumpSumHours || { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 };
        return {
          ...entry,
          manualLumpSumHours: { ...currentManual, [type]: numValue }
        };
      }
      return entry;
    }));
  };

  const handleExtraHoursChange = (contractorId, value, targetSiteId) => {
    const rates = getEffectiveRates(contractorId, targetSiteId);
    const hasRates = rates.weekday > 0 || rates.saturday > 0 || rates.sunday > 0 || rates.publicHoliday > 0;

    if (!hasRates) {
      const targetSite = allSites.find(s => s.id === targetSiteId);
      setToastMsg(`⚠️ Please adjust pay rates for ${targetSite?.siteName || 'this site'} before entering extra hours.`);
      setShowToast(true);
      return;
    }

    const numValue = Math.max(0, parseFloat(value) || 0);
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId) {
        return { ...entry, extraHours: numValue };
      }
      return entry;
    }));
  };

  const handlePaymentFieldChange = (contractorId, field, value, targetSiteId) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setEntries(entries.map(entry => {
      if (entry.contractorId === contractorId && entry.siteId === targetSiteId) {
        return { ...entry, [field]: numValue };
      }
      return entry;
    }));
  };

  const handleRemoveEntry = (contractorId, siteId) => {
    // For now, allow removing any row.
    setEntries(entries.filter(e => !(e.contractorId === contractorId && e.siteId === siteId)));
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
      id: initialData?.id || existingTs?.id || `${site.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      siteId: site.id,
      siteName: site.siteName,
      periodStart,
      periodEnd,
      entries: entries.map(entry => {
        const effectiveRates = getEffectiveRates(entry.contractorId, entry.siteId);
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

    onSave(timesheet);
  };

  return (
    <div className="bg-white rounded-lg p-6">
      {showToast && (
        <Toast
          message={toastMsg || `Timesheet updated for ${site.siteName}!`}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Budget Status Banner */}
      {budgetStatus && (!budgetStatus.withinBudget) && (
        <div className="mb-10 bg-rose-50/50 border border-rose-100 rounded-[2.5rem] p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rose-500">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h3 className="text-p1 font-bold text-rose-900 tracking-tight">Terminal Alert: Budget Violation</h3>
                <p className="text-xs text-rose-500 font-bold mt-1">Resource expenditure beyond authorized limits.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {budgetStatus.hoursOver > 0 && (
                <div className="bg-white/80 border border-rose-100 px-4 py-3 rounded-2xl flex flex-col">
                  <span className="text-[9px] font-bold text-rose-300 leading-none mb-1">Hours Overflow</span>
                  <span className="text-sm font-bold text-rose-600">+{budgetStatus.hoursOver.toFixed(1)} hrs</span>
                </div>
              )}
              {budgetStatus.amountOver > 0 && (
                <div className="bg-white/80 border border-rose-100 px-4 py-3 rounded-2xl flex flex-col">
                  <span className="text-[9px] font-bold text-rose-300 leading-none mb-1">Financial Load Over</span>
                  <span className="text-sm font-bold text-rose-600">${budgetStatus.amountOver.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Premium Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 flex items-center justify-between group transition-all hover:border-primary-100">
          <div>
            <span className="block text-[11px] font-bold text-zinc-400 mb-1">Cumulative Hours</span>
            <span className={`text-h2 font-bold tracking-tight ${budgetStatus?.hoursOver > 0 ? 'text-rose-600' : 'text-zinc-900 group-hover:text-primary-600'}`}>
              {totalStats.hours.toFixed(2)}
              {totalStats.budgetedHours > 0 && <span className="text-xs font-bold text-zinc-300 ml-1.5">/ {totalStats.budgetedHours}</span>}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${budgetStatus?.hoursOver > 0 ? 'bg-rose-50 text-rose-600' : 'bg-zinc-50 text-zinc-400 group-hover:bg-primary-50 group-hover:text-primary-600'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 p-6 flex items-center justify-between group transition-all hover:border-emerald-100">
          <div>
            <span className="block text-[11px] font-bold text-zinc-400 mb-1">Financial Load</span>
            <span className={`text-h2 font-bold tracking-tight ${budgetStatus?.amountOver > 0 ? 'text-rose-600' : 'text-emerald-600 group-hover:text-emerald-500'}`}>
              ${totalStats.pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              {totalStats.budgetedAmount > 0 && <span className="text-xs font-bold text-zinc-300 ml-1.5">/ ${totalStats.budgetedAmount}</span>}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${budgetStatus?.amountOver > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-50 group-hover:text-emerald-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 p-6 flex items-center justify-between group transition-all">
          <div>
            <span className="block text-[11px] font-bold text-zinc-400 mb-1">Site Health</span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${!budgetStatus || budgetStatus.withinBudget ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></span>
              <span className={`text-lg font-bold tracking-tight ${!budgetStatus || budgetStatus.withinBudget ? 'text-emerald-700' : 'text-rose-700'}`}>
                {!budgetStatus || budgetStatus.withinBudget ? 'Verified' : 'Over Budget'}
              </span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${!budgetStatus || budgetStatus.withinBudget ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={!budgetStatus || budgetStatus.withinBudget ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
            </svg>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 flex items-center justify-between group transition-all">
          <div className="flex flex-col gap-1">
            <span className="block text-[11px] font-bold text-zinc-500">Active Workforce</span>
            <span className="text-2xl font-bold text-white tracking-tight">{entries.length} Workers</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 p-2">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-h1 font-bold text-zinc-900 tracking-tight">{site.siteName}</h3>
              <div className="px-2.5 py-1 bg-primary-50 text-primary-600 rounded-xl text-[10px] font-bold border border-primary-100">Active Site</div>
            </div>
            <p className="text-sm text-zinc-400 font-bold flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {formatDateDisplay(periodStart)} — {formatDateDisplay(periodEnd)}
            </p>
          </div>

          {/* Compact Rates Visualization */}
          <div className="flex flex-wrap gap-2.5">
            {/* Primary Site Rates */}
            <div className="bg-white border border-zinc-100 rounded-2xl px-4 py-3 flex items-center gap-4">
              <div className="w-1.5 h-6 bg-primary-500 rounded-full"></div>
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-zinc-300 leading-none mb-1">Weekday</span>
                  <span className="text-xs font-bold text-zinc-900">${payRates.weekday}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-zinc-300 leading-none mb-1">Saturday</span>
                  <span className="text-xs font-bold text-zinc-900">${payRates.saturday}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-zinc-300 leading-none mb-1">Sunday</span>
                  <span className="text-xs font-bold text-zinc-900">${payRates.sunday}</span>
                </div>
              </div>
            </div>

            {/* Subsite Aggregate Display */}
            {subSites.length > 0 && (
              <div className="flex -space-x-3 hover:space-x-1 transition-all">
                {subSites.map(subSite => {
                  const allRates = getPayRates();
                  const subSiteRates = allRates.find(r => r.siteId === subSite.id) || { weekday: 0 };
                  return (
                    <div key={subSite.id} className="w-10 h-10 rounded-2xl bg-white border-2 border-zinc-50 flex items-center justify-center text-[10px] font-bold text-zinc-400 cursor-help hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all" title={`${subSite.siteName}: $${subSiteRates.weekday}/hr`}>
                      {subSite.siteName[0].toUpperCase()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <button
            onClick={() => handleOpenRateModal(site.id)}
            className="flex-1 xl:flex-none px-5 py-3 bg-white text-zinc-600 border border-zinc-100 rounded-2xl hover:bg-zinc-50 transition-all flex items-center justify-center gap-2.5 text-[11px] font-bold hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Rates
          </button>
          <button
            onClick={() => setShowNewContractorModal(true)}
            className="flex-1 xl:flex-none px-5 py-3 bg-white text-zinc-600 border border-zinc-100 rounded-2xl hover:bg-zinc-50 transition-all flex items-center justify-center gap-2.5 text-[11px] font-bold hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Onboard
          </button>
          <button
            onClick={() => setShowStaffModal(true)}
            className="flex-1 xl:flex-none px-5 py-3 bg-white text-zinc-600 border border-zinc-100 rounded-2xl hover:bg-zinc-50 transition-all flex items-center justify-center gap-2.5 text-[11px] font-bold hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2" /></svg>
            Allocate
          </button>
          <button
            onClick={handleSave}
            className="flex-1 xl:flex-none px-8 py-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition-all flex items-center justify-center gap-3 text-[11px] font-bold hover:-translate-y-1 active:translate-y-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            Publish Entry
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-[2rem] border border-zinc-100 max-h-[75vh] custom-scrollbar relative bg-white">
        <table className="min-w-full border-collapse table-fixed md:table-auto">
          <thead className="bg-zinc-900 sticky top-0 z-[60]">
            <tr className="divide-x divide-zinc-800">
              <th className="px-6 py-5 text-left text-p3 font-bold text-zinc-400 sticky left-0 top-0 bg-zinc-900 z-[70] w-[220px]">Employee Profile</th>
              {dates.map(date => {
                const isPH = publicHolidays.includes(date.date);
                const holidayName = getPublicHolidays().find(h => h.date === date.date)?.name;
                return (
                  <th
                    key={date.date}
                    className={`px-1 py-5 text-center text-[11px] font-bold min-w-[90px] ${isPH ? 'bg-primary-900/50 text-primary-200' : 'text-zinc-400'}`}
                    title={isPH ? `Global Holiday: ${holidayName}` : ''}
                  >
                    {formatDateDisplay(date.date)}
                    {isPH && <div className="text-[8px] text-primary-400 font-bold block mt-1">PH</div>}
                  </th>
                );
              })}
              {(() => {
                const showLumpSum = site.isTrainingSite || entries.some(e => e.manualLumpSumHours !== null);
                const showExtraCol = entries.some(e => e.extraHours > 0 || e.isExtraMode);
                return (
                  <>
                    {showLumpSum && <th className="px-3 py-5 text-center text-[11px] font-bold text-amber-500 bg-amber-500/5 min-w-[120px]">Escrow Release</th>}
                    {showExtraCol && <th className="px-3 py-5 text-center text-[11px] font-bold text-primary-400 bg-primary-400/5 min-w-[100px]">Extra Hours</th>}
                  </>
                );
              })()}
              <th className="px-3 py-5 text-center text-[11px] font-bold text-zinc-500 min-w-[80px]">Allow.</th>
              <th className="px-3 py-5 text-center text-[11px] font-bold text-zinc-500 min-w-[80px]">Other</th>
              <th className="px-3 py-5 text-center text-[11px] font-bold text-rose-500 bg-rose-500/5 min-w-[90px]">Deductions</th>
              <th className="px-3 py-5 text-center text-p3 font-bold text-zinc-400 min-w-[110px]">Gross Pay</th>
              <th className="px-3 py-5 text-center text-[11px] font-bold text-emerald-500 bg-emerald-500/10 min-w-[120px] sticky right-0 z-[70] bg-zinc-900">Net Settlement</th>
              <th className="px-3 py-5 text-center text-[11px] font-bold text-amber-500 min-w-[90px]">Escrow (T)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {(() => {
              const showLumpSum = site.isTrainingSite || entries.some(e => e.manualLumpSumHours !== null);
              const relevantSites = [site, ...subSites];
              const totalCols = dates.length + (showLumpSum ? 1 : 0) + (entries.some(e => e.extraHours > 0 || e.isExtraMode) ? 1 : 0) + 6;

              if (entries.length === 0 && relevantSites.every(s => !(s.allocatedContractors?.length > 0))) {
                return (
                  <tr>
                    <td colSpan={totalCols + 1} className="py-20 text-center text-zinc-400 font-medium text-xs italic">
                      No staff assigned. Use the dropdowns below or buttons above to add workers.
                    </td>
                  </tr>
                );
              }

              return relevantSites.map(currentSite => {
                const isPrimary = currentSite.id === site.id;
                const siteEntries = entries.filter(e => e.siteId === currentSite.id);

                // Colors for grouping
                const colors = [
                  { border: 'border-blue-500', bg: 'bg-blue-50/20' },
                  { border: 'border-emerald-500', bg: 'bg-emerald-50/20' },
                  { border: 'border-indigo-500', bg: 'bg-indigo-50/20' },
                  { border: 'border-amber-500', bg: 'bg-amber-50/20' },
                  { border: 'border-rose-500', bg: 'bg-rose-50/20' },
                  { border: 'border-violet-500', bg: 'bg-violet-50/20' },
                ];
                const getGroupColor = (cId) => {
                  const idStr = String(cId);
                  const hash = idStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  return colors[hash % colors.length];
                };

                return (
                  <Fragment key={currentSite.id}>
                    {/* Site Header Row */}
                    <tr className="bg-zinc-50/80 group/site">
                      {/* FIXED LEFT: Site Title */}
                      <td className="px-6 py-4 border-y border-zinc-100 sticky left-0 z-[50] bg-zinc-50">
                        <div className="flex items-center gap-3 min-w-[380px]">
                          <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${isPrimary ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200'}`}>
                            {isPrimary ? 'Terminal' : 'Sub-Hub'}
                          </div>
                          <span className="text-xs font-bold text-zinc-900 whitespace-nowrap">{currentSite.siteName}</span>
                        </div>
                      </td>

                      {/* SPACER: Middle Columns */}
                      <td colSpan={totalCols - 1} className="border-y border-zinc-100 bg-zinc-50/50"></td>

                      {/* FIXED RIGHT: Actions */}
                      <td className="px-6 py-4 border-y border-zinc-100 sticky right-0 z-[50] bg-zinc-50 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Dropdown
                            value=""
                            onChange={(val) => {
                              if (val) {
                                handleQuickAddStaff(val, null, currentSite.id);
                              }
                            }}
                            options={contractors
                              .filter(c => c.status === 'active')
                              .filter(c => !siteEntries.some(e => e.contractorId === c.id))
                              .map(c => ({ value: c.id, label: c.name }))
                            }
                            placeholder="+ Deploy Resource..."
                            variant="compact"
                            showSelected={false}
                            className="w-48"
                          />
                          <button
                            onClick={() => handleOpenRateModal(currentSite.id)}
                            className="p-2 bg-white border border-zinc-200 text-zinc-400 rounded-xl hover:text-zinc-900 hover:border-zinc-900 transition-all"
                            title="Adjust Site Rates"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.012 -2.574c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.065-2.572c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Site Entries */}
                    {siteEntries.length === 0 ? (
                      <tr>
                        <td colSpan={totalCols + 1} className="px-4 py-4 text-center text-[10px] text-slate-400 italic">No workers assigned to this site yet.</td>
                      </tr>
                    ) : siteEntries.map((entry, index) => {
                      const effectiveRates = getEffectiveRates(entry.contractorId, entry.siteId);
                      const calculation = calculateTimesheetPay(entry, effectiveRates, publicHolidays);
                      const isManual = entry.manualLumpSumHours !== null;
                      return (
                        <tr
                          key={`${entry.contractorId}-${entry.siteId}`}
                          className="hover:bg-zinc-50/50 transition-colors group/row border-b border-zinc-50"
                        >
                          <td className="px-6 py-4 sticky left-0 group-hover/row:bg-zinc-50 z-[40] border-r border-zinc-100 min-w-[220px] bg-white transition-colors">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-bold text-zinc-900 text-sm tracking-tight group-hover/row:text-primary-600 transition-colors">{entry.contractorName}</div>
                                <button
                                  onClick={() => handleRemoveEntry(entry.contractorId, entry.siteId)}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover/row:opacity-100"
                                  title="De-allocate Resource"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>

                              {effectiveRates.isCustom && (
                                <div className="flex items-center gap-1.5">
                                  <div className="px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded text-[8px] font-bold border border-primary-100/50">Custom Override</div>
                                </div>
                              )}

                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer group/mode">
                                  <div className="relative flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={isManual}
                                      onChange={(e) => handleLumpSumToggle(entry.contractorId, e.target.checked, entry.siteId)}
                                      className="peer h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 transition-all cursor-pointer"
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-zinc-400 peer-checked:text-zinc-900 transition-colors">Manual</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer group/extra">
                                  <div className="relative flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={entry.isExtraMode}
                                      onChange={(e) => {
                                        setEntries(entries.map(ent => (ent.contractorId === entry.contractorId && ent.siteId === entry.siteId) ? { ...ent, isExtraMode: e.target.checked } : ent));
                                      }}
                                      className="peer h-3.5 w-3.5 rounded border-zinc-300 text-primary-600 focus:ring-primary-100 transition-all cursor-pointer"
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-zinc-400 peer-checked:text-primary-600 transition-colors">Extra</span>
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
                                className={`px-1 py-4 transition-colors ${isManual ? 'bg-zinc-50/30' : ''} ${isPH ? 'bg-primary-50/20' : ''}`}
                              >
                                <div className="flex flex-col items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={dayEntry?.hours || ''}
                                    onChange={(e) => handleHoursChange(entry.contractorId, date.date, e.target.value, entry.siteId)}
                                    disabled={isManual}
                                    className={`w-full text-center py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 rounded-xl disabled:opacity-20 transition-all ${isPH ? 'text-primary-700' : 'text-zinc-900 bg-transparent hover:bg-zinc-50/50 focus:bg-white'}`}
                                    placeholder="0"
                                  />
                                  <div className="flex items-center justify-center gap-2 min-h-[14px]">
                                    {(site?.isTrainingSite || allSites.find(s => s.id === entry.siteId)?.isTrainingSite) && (
                                      <button
                                        onClick={() => !isManual && handleTrainingToggle(entry.contractorId, date.date, entry.siteId)}
                                        className={`flex items-center justify-center w-3.5 h-3.5 rounded border transition-all ${dayEntry?.isTraining ? 'bg-amber-500 border-amber-600 text-white' : 'bg-transparent border-zinc-200 text-zinc-300 hover:border-amber-400'}`}
                                        disabled={isManual}
                                      >
                                        <span className="text-[7px] font-bold">T</span>
                                      </button>
                                    )}
                                    {isPH && <span className="text-[8px] font-bold text-primary-400/60 tracking-tighter">PH</span>}
                                  </div>
                                </div>
                              </td>
                            );
                          })}

                          {showLumpSum && (
                            <td className="px-2 py-4 min-w-[150px] bg-amber-50/5">
                              {isManual && (
                                <div className="grid grid-cols-2 gap-2 p-1">
                                  {['weekday', 'saturday', 'sunday', 'publicHoliday'].map(type => (
                                    <div key={type} className="flex flex-col gap-0.5">
                                      <div className="text-[7px] font-bold uppercase text-amber-500/70 text-center tracking-widest">{type.substring(0, 3)}</div>
                                      <input
                                        type="number"
                                        value={entry.manualLumpSumHours[type] || ''}
                                        onChange={(e) => handleLumpSumChange(entry.contractorId, type, e.target.value, entry.siteId)}
                                        className="w-full text-[10px] text-center font-bold text-amber-900 bg-white border border-amber-100 rounded-lg outline-none py-1.5 focus:ring-2 focus:ring-amber-200"
                                        placeholder="0"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          )}

                          {entries.some(e => e.extraHours > 0 || e.isExtraMode) && (
                            <td className="px-3 py-4 bg-primary-50/10">
                              {(entry.isExtraMode || entry.extraHours > 0) ? (
                                <input
                                  type="number"
                                  value={entry.extraHours || ''}
                                  onChange={(e) => handleExtraHoursChange(entry.contractorId, e.target.value, entry.siteId)}
                                  className="w-full text-center py-1.5 text-sm font-bold text-primary-600 bg-white border border-primary-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-100"
                                  placeholder="+ Hrs"
                                />
                              ) : (
                                <div className="text-[10px] text-zinc-300 font-bold text-center tracking-widest">—</div>
                              )}
                            </td>
                          )}

                          <td className="px-2 py-4">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-300">$</span>
                              <input type="number" value={entry.allowance || ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'allowance', e.target.value, entry.siteId)} className="w-full pl-5 pr-2 py-2 text-[11px] font-bold text-zinc-600 outline-none rounded-xl bg-zinc-50 border-transparent border focus:bg-white focus:border-zinc-200 transition-all" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-2 py-4">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-300">$</span>
                              <input type="number" value={entry.otherPay || ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'otherPay', e.target.value, entry.siteId)} className="w-full pl-5 pr-2 py-2 text-[11px] font-bold text-zinc-600 outline-none rounded-xl bg-zinc-50 border-transparent border focus:bg-white focus:border-zinc-200 transition-all" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-2 py-4">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-300">-</span>
                              <input type="number" value={entry.deduction || ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'deduction', e.target.value, entry.siteId)} className="w-full pl-5 pr-2 py-2 text-[11px] font-bold text-rose-500 bg-rose-50/5 border-transparent border outline-none rounded-xl focus:bg-white focus:border-rose-100 transition-all" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-xs text-zinc-400 tracking-tight">${calculation.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 text-center sticky right-0 z-[40] bg-emerald-50/50">
                            <span className="font-bold text-sm text-emerald-600">${calculation.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {calculation.trainingPay > 0 ? (
                              <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg font-bold text-[10px] tracking-tight border border-amber-100">
                                ${calculation.trainingPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-200 tracking-widest">—</span>
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
        showRateModal && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden border border-zinc-100 flex flex-col animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="p-8 border-b border-zinc-50 bg-gradient-to-br from-zinc-50 to-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Financial Calibration</h3>
                  <p className="text-sm text-zinc-500 font-medium">Adjusting rates for {rateModalSite?.siteName}</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-2 gap-5 mb-8">
                  {['weekday', 'saturday', 'sunday', 'publicHoliday'].map(type => (
                    <div key={type}>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">{type}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-sm">$</span>
                        <input
                          type="number"
                          value={tempRates[type]}
                          onChange={(e) => setTempRates({ ...tempRates, [type]: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-8 pr-4 py-3 bg-zinc-50 border border-transparent rounded-2xl focus:bg-white focus:border-zinc-900 transition-all outline-none font-bold text-zinc-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleUpdateRates}
                    className="w-full py-4 bg-zinc-900 text-white font-bold uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-black transition-all hover:-translate-y-0.5"
                  >
                    Verify & Apply Rates
                  </button>
                  <button
                    onClick={() => setShowRateModal(false)}
                    className="w-full py-3 text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] hover:text-zinc-600 transition-all"
                  >
                    Discard Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        showNewContractorModal && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden border border-zinc-100 flex flex-col animate-in slide-in-from-bottom-8 duration-500">
              {/* Header */}
              <div className="p-8 border-b border-zinc-50 bg-gradient-to-br from-zinc-50 to-white relative overflow-hidden flex justify-between items-center">
                <div className="relative z-10">
                  <div className="px-3 py-1 bg-primary-50 text-primary-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-primary-100/50 mb-2 inline-block">Direct Onboarding</div>
                  <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">Fast-Track Hire</h3>
                  <p className="text-zinc-500 font-medium pb-2">Initialize immediate resource allocation for this hub.</p>
                </div>
                <button
                  onClick={() => setShowNewContractorModal(false)}
                  className="w-12 h-12 flex items-center justify-center bg-zinc-50 rounded-2xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all border border-zinc-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
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
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden border border-zinc-100 flex flex-col animate-in zoom-in-95 duration-300 max-h-[85vh]">
              {/* Header */}
              <div className="p-8 border-b border-zinc-50 bg-gradient-to-br from-zinc-50 to-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Workforce Orchestration</h3>
                  <p className="text-sm text-zinc-500 font-medium">Manage deployment for {site.siteName}</p>
                </div>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                {/* CURRENT STAFF */}
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">
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
                          <div key={c.id} className="p-5 bg-zinc-50/50 rounded-3xl border border-zinc-100 space-y-4 transition-all hover:bg-white group/worker">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                                  {c.name[0]}
                                </div>
                                <div>
                                  <div className="font-bold text-zinc-900 text-sm uppercase tracking-tight">{c.name}</div>
                                  <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">{c.contractorId}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleQuickRemoveStaff(c.id, site.id)}
                                className="w-10 h-10 flex items-center justify-center bg-white text-rose-500 rounded-2xl border border-zinc-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all active:scale-95"
                                title="Revoke Assignment"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>

                            {/* SUB-SITE MANAGEMENT */}
                            <div className="pt-4 border-t border-zinc-100">
                              <div className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest mb-3">Allocated Hubs</div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {contractorSubSites.map(ss => (
                                  <div key={ss.id} className="bg-white px-3 py-1.5 rounded-xl border border-zinc-100 text-[10px] font-bold text-zinc-600 flex items-center gap-2 group/hub">
                                    {ss.siteName}
                                    <button onClick={() => handleQuickRemoveStaff(c.id, ss.id)} className="text-zinc-300 hover:text-rose-500 transition-colors">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                ))}
                                {contractorSubSites.length === 0 && <span className="text-[10px] text-zinc-300 font-bold italic">Hub-Locked</span>}
                              </div>

                              {availableSubSites.length > 0 && (
                                <div className="relative">
                                  <select
                                    onChange={(e) => {
                                      handleQuickAddStaff(c.id, null, e.target.value);
                                      e.target.value = '';
                                    }}
                                    className="appearance-none w-full text-[9px] font-bold bg-white border border-zinc-100 rounded-xl px-4 py-2.5 outline-none focus:border-zinc-900 transition-all cursor-pointer text-zinc-500 hover:bg-zinc-50"
                                  >
                                    <option value="">Move to Alternate Hub...</option>
                                    {availableSubSites.map(ss => (
                                      <option key={ss.id} value={ss.id}>{ss.siteName}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-300">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {contractors.filter(c => site.allocatedContractors?.includes(c.id)).length === 0 && (
                      <div className="text-center py-10 bg-zinc-50/50 rounded-3xl border border-dashed border-zinc-200 text-zinc-300 text-[10px] font-bold">Station Empty</div>
                    )}
                  </div>
                </div>

                {/* AVAILABLE STAFF */}
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-primary-500 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                    Pending Deployment
                  </div>
                  <div className="space-y-2">
                    {contractors
                      .filter(c => c.status === 'active' && !site.allocatedContractors?.includes(c.id))
                      .map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-100 hover:border-primary-100 transition-all group/avail">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center font-bold text-[10px] group-hover/avail:bg-primary-50 group-hover/avail:text-primary-600 transition-colors">
                              {c.name[0]}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 text-sm tracking-tight">{c.name}</div>
                              <div className="text-[9px] text-zinc-400 font-bold mt-0.5">{c.contractorId}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleQuickAddStaff(c.id)}
                            className="w-9 h-9 flex items-center justify-center bg-zinc-50 text-zinc-400 rounded-xl hover:bg-primary-600 hover:text-white transition-all active:scale-95"
                            title="Assign to Site"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </button>
                        </div>
                      ))}
                    {contractors.filter(c => c.status === 'active' && !site.allocatedContractors?.includes(c.id)).length === 0 && (
                      <div className="text-center py-10 bg-zinc-50/50 rounded-3xl border border-dashed border-zinc-200 text-zinc-300 text-[10px] font-bold">Workforce Exhausted</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-zinc-50 border-t border-zinc-100">
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="w-full py-4 bg-zinc-900 text-white font-bold text-[11px] rounded-2xl hover:bg-black transition-all hover:-translate-y-0.5"
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
