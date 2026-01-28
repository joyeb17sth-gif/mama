import { useState, useEffect, Fragment } from 'react';
import { generatePeriodDates, formatDateDisplay } from '../utils/dateUtils';
import { checkBudgetStatus, calculateTimesheetPay } from '../utils/payrollCalculations';
import { getPayRates, getTimesheets, savePayRates, saveSites, getSites, saveContractors, getContractors, logAction, getPublicHolidays } from '../utils/storage';
import ContractorForm from './ContractorForm';
import Toast from './Toast';

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
          setToastMsg('⚠️ Warning: Pay rates for this site are set to $0. Please configure rates in the Pay Rates tab.');
          setShowToast(true);
        }
      } else {
        const defaultRates = { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 };
        setPayRates(defaultRates);
        setToastMsg('⚠️ Warning: No pay rates configured for this site. Please set rates in the Pay Rates tab before saving.');
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
      setToastMsg(`⚠️ Please adjust pay rates for ${targetSite?.siteName || 'this site'} before entering hours.`);
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
    <div className="bg-white rounded-lg shadow p-6">
      {showToast && (
        <Toast
          message={toastMsg || `Timesheet updated for ${site.siteName}!`}
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
                    <li>Hours: {totalStats.hours.toFixed(2)} / {totalStats.budgetedHours} (Over by {budgetStatus.hoursOver.toFixed(2)})</li>
                  )}
                  {budgetStatus.amountOver > 0 && (
                    <li>Cost: ${totalStats.pay.toFixed(2)} / ${totalStats.budgetedAmount} (Over by ${budgetStatus.amountOver.toFixed(2)})</li>
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
          <span className={`text-xl font-medium ${budgetStatus?.hoursOver > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {totalStats.hours.toFixed(2)}
            {totalStats.budgetedHours > 0 && <span className="text-sm font-normal text-gray-500"> / {totalStats.budgetedHours}</span>}
          </span>
        </div>
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase">Total Cost</span>
          <span className={`text-xl font-medium ${budgetStatus?.amountOver > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${totalStats.pay.toFixed(2)}
            {totalStats.budgetedAmount > 0 && <span className="text-sm font-normal text-gray-500"> / ${totalStats.budgetedAmount}</span>}
          </span>
        </div>
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase">Status</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!budgetStatus || budgetStatus.withinBudget ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {!budgetStatus || budgetStatus.withinBudget ? 'Within Budget' : 'Over Budget'}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {site.siteName}
          </h3>
          <p className="text-xs text-gray-500 font-medium">{periodStart} to {periodEnd}</p>

          {/* Compact Rates Display with Larger Text */}
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Primary Site Rates */}
            <span className="text-sm bg-indigo-100 px-3 py-1 rounded-md font-semibold text-indigo-700 uppercase tracking-tight">
              Primary: Wk ${payRates.weekday}/h | Sat ${payRates.saturday}/h | Sun ${payRates.sunday}/h | PH ${payRates.publicHoliday}/h
            </span>

            {/* Subsite Rates */}
            {subSites.map(subSite => {
              const allRates = getPayRates();
              const subSiteRates = allRates.find(r => r.siteId === subSite.id) || { weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 };
              return (
                <span key={subSite.id} className="text-sm bg-slate-100 px-3 py-1 rounded-md font-semibold text-slate-700 uppercase tracking-tight">
                  {subSite.siteName}: Wk ${subSiteRates.weekday}/h | Sat ${subSiteRates.saturday}/h | Sun ${subSiteRates.sunday}/h | PH ${subSiteRates.publicHoliday}/h
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleOpenRateModal(site.id)}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-tight"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Adjust Rates
          </button>
          <button
            onClick={() => setShowNewContractorModal(true)}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-tight"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Add Contractor
          </button>
          <button
            onClick={() => setShowStaffModal(true)}
            className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-tight"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2" /></svg>
            Allocate Existing
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 text-xs font-semibold uppercase tracking-widest shadow-lg shadow-emerald-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            Save Timesheet
          </button>
        </div>
      </div>

      <div className="overflow-auto border border-gray-100 rounded-xl max-h-[70vh] custom-scrollbar relative">
        <table className="min-w-full border-collapse table-fixed md:table-auto">
          <thead className="bg-slate-800 sticky top-0 z-30">
            <tr>
              <th className="px-2 py-3 text-left text-[10px] font-semibold text-slate-300 uppercase tracking-widest sticky left-0 top-0 bg-slate-800 z-40 w-[180px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Employee & Location</th>
              {dates.map(date => {
                const isPH = publicHolidays.includes(date.date);
                const holidayName = getPublicHolidays().find(h => h.date === date.date)?.name;
                return (
                  <th
                    key={date.date}
                    className={`px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-widest min-w-[80px] border-l border-slate-700 ${isPH ? 'bg-violet-900/50 text-violet-200' : 'text-slate-300'}`}
                    title={isPH ? `Global Holiday: ${holidayName}` : ''}
                  >
                    {formatDateDisplay(date.date)}
                    {isPH && <div className="text-[7px] text-violet-400 font-bold block">PH</div>}
                  </th>
                );
              })}
              {(() => {
                const showLumpSum = site.isTrainingSite || entries.some(e => e.manualLumpSumHours !== null);
                const showExtraCol = entries.some(e => e.extraHours > 0 || e.isExtraMode);
                return (
                  <>
                    {showLumpSum && <th className="px-3 py-3 text-center text-[10px] font-semibold text-amber-300 uppercase tracking-widest border-l border-slate-700 bg-slate-900/50">Lump Sum</th>}
                    {showExtraCol && <th className="px-3 py-3 text-center text-[10px] font-semibold text-blue-300 uppercase tracking-widest border-l border-slate-700 bg-slate-900/50">Extra Hrs</th>}
                  </>
                );
              })()}
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-slate-300 uppercase tracking-widest border-l border-slate-700">Allow.</th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-slate-300 uppercase tracking-widest border-l border-slate-700">Other</th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-rose-300 uppercase tracking-widest border-l border-slate-700">Deduct.</th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-slate-300 uppercase tracking-widest border-l border-slate-700">Total Pay</th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-emerald-300 uppercase tracking-widest border-l border-slate-700 bg-emerald-900/10">Net Pay</th>
              <th className="px-3 py-3 text-center text-[10px] font-semibold text-amber-300 uppercase tracking-widest border-l border-slate-700">Held (T)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-transparent">
            {(() => {
              const showLumpSum = site.isTrainingSite || entries.some(e => e.manualLumpSumHours !== null);
              const relevantSites = [site, ...subSites];
              const totalCols = dates.length + (showLumpSum ? 1 : 0) + (entries.some(e => e.extraHours > 0 || e.isExtraMode) ? 1 : 0) + 6;

              if (entries.length === 0 && relevantSites.every(s => !(s.allocatedContractors?.length > 0))) {
                return (
                  <tr>
                    <td colSpan={totalCols + 1} className="py-20 text-center text-gray-400 font-medium uppercase tracking-widest text-xs italic">
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
                    <tr className="bg-slate-100/80">
                      {/* FIXED LEFT: Site Title */}
                      <td className="px-3 py-2 border-y border-slate-200 sticky left-0 z-20 bg-slate-100">
                        <div className="flex items-center gap-2 min-w-[350px]">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isPrimary ? 'bg-blue-600 text-white' : 'bg-slate-500 text-white'}`}>
                            {isPrimary ? 'PRIMARY' : 'SUB-SITE'}
                          </span>
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-widest whitespace-nowrap">{currentSite.siteName}</span>
                        </div>
                      </td>

                      {/* SPACER: Middle Columns */}
                      <td colSpan={totalCols - 1} className="border-y border-slate-200 bg-slate-100"></td>

                      {/* FIXED RIGHT: Actions */}
                      <td className="px-3 py-2 border-y border-slate-200 sticky right-0 z-20 bg-slate-100">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleQuickAddStaff(e.target.value, null, currentSite.id);
                                e.target.value = '';
                              }
                            }}
                            className="text-[9px] font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500 cursor-pointer shadow-sm text-slate-600 w-36"
                            value=""
                          >
                            <option value="">+ Add {isPrimary ? 'Staff' : 'Worker'}...</option>
                            {contractors
                              .filter(c => c.status === 'active')
                              .filter(c => !siteEntries.some(e => e.contractorId === c.id))
                              .map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))
                            }
                          </select>
                          <button
                            onClick={() => handleOpenRateModal(currentSite.id)}
                            className="p-1 hover:text-blue-500 text-slate-400 transition-colors"
                            title="Adjust Site Rates"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.012 -2.574c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.065-2.572c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
                      const isLastInSite = index === siteEntries.length - 1;
                      const groupColor = getGroupColor(entry.contractorId);

                      return (
                        <tr
                          key={`${entry.contractorId}-${entry.siteId}`}
                          className="hover:bg-slate-50 transition group"
                        >
                          <td className="px-2 py-3 sticky left-0 group-hover:bg-slate-50 z-20 border-r border-slate-100 min-w-[180px] shadow-[2px_0_5px_rgba(0,0,0,0.02)] bg-white">
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="font-black text-slate-800 text-sm tracking-tight">{entry.contractorName}</div>
                                <button
                                  onClick={() => handleRemoveEntry(entry.contractorId, entry.siteId)}
                                  className="text-rose-400 hover:text-rose-600 transition"
                                  title="Remove from site"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>

                              {effectiveRates.isCustom && (
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="h-1 w-1 rounded-full bg-indigo-500"></span>
                                  <span className="text-[8px] text-indigo-500 font-bold uppercase tracking-widest">
                                    Custom Rate (${effectiveRates.weekday}/${effectiveRates.saturday}/${effectiveRates.sunday})
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-2 pt-2">
                                <label className="flex items-center gap-1 cursor-pointer group/mode">
                                  <input
                                    type="checkbox"
                                    checked={isManual}
                                    onChange={(e) => handleLumpSumToggle(entry.contractorId, e.target.checked, entry.siteId)}
                                    className="h-2.5 w-2.5 rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-[8px] font-semibold text-gray-400 group-hover/mode:text-blue-500 uppercase tracking-tight">Manual</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer group/extra">
                                  <input
                                    type="checkbox"
                                    checked={entry.isExtraMode}
                                    onChange={(e) => {
                                      setEntries(entries.map(ent => (ent.contractorId === entry.contractorId && ent.siteId === entry.siteId) ? { ...ent, isExtraMode: e.target.checked } : ent));
                                    }}
                                    className="h-2.5 w-2.5 rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="text-[8px] font-semibold text-gray-400 group-hover/extra:text-indigo-500 uppercase tracking-tight">Extra</span>
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
                                className={`px-1 py-2 ${isManual ? 'bg-gray-50/50' : ''} ${isPH ? 'bg-violet-50/30' : ''}`}
                              >
                                <input
                                  type="number"
                                  value={dayEntry?.hours || ''}
                                  onChange={(e) => handleHoursChange(entry.contractorId, date.date, e.target.value, entry.siteId)}
                                  disabled={isManual}
                                  className={`w-full text-center py-1 text-sm font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded disabled:opacity-30 ${isPH ? 'text-violet-700' : 'text-gray-700 bg-transparent'}`}
                                  placeholder="0"
                                />
                                <div className="flex justify-center mt-1 gap-1.5 min-h-[12px]">
                                  {(site?.isTrainingSite || allSites.find(s => s.id === entry.siteId)?.isTrainingSite) && (
                                    <label className={`flex items-center gap-0.5 cursor-pointer ${dayEntry?.isTraining ? 'text-amber-600' : 'text-gray-300'} transition-colors hover:text-amber-500`}>
                                      <input
                                        type="checkbox"
                                        checked={dayEntry?.isTraining || false}
                                        onChange={() => handleTrainingToggle(entry.contractorId, date.date, entry.siteId)}
                                        disabled={isManual}
                                        className="h-2.5 w-2.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                      />
                                      <span className="text-[8px] font-black tracking-tighter">T</span>
                                    </label>
                                  )}
                                  {isPH && <span className="text-[8px] font-black text-violet-500/50">PH</span>}
                                </div>
                              </td>
                            );
                          })}

                          {showLumpSum && (
                            <td className="px-1 py-1 min-w-[140px] bg-amber-50/10">
                              {isManual && (
                                <div className="grid grid-cols-2 gap-1 p-1">
                                  {['weekday', 'saturday', 'sunday', 'publicHoliday'].map(type => (
                                    <div key={type} className="flex flex-col">
                                      <div className="text-[7px] font-semibold uppercase text-amber-500/70 text-center mb-0.5">{type.substring(0, 3)}</div>
                                      <input
                                        type="number"
                                        value={entry.manualLumpSumHours[type] || ''}
                                        onChange={(e) => handleLumpSumChange(entry.contractorId, type, e.target.value, entry.siteId)}
                                        className="w-full text-[10px] text-center font-medium text-amber-900 bg-white border border-amber-100 rounded outline-none py-0.5"
                                        placeholder="0"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          )}

                          {entries.some(e => e.extraHours > 0 || e.isExtraMode) && (
                            <td className="px-2 py-2 bg-indigo-50/20">
                              {(entry.isExtraMode || entry.extraHours > 0) ? (
                                <input
                                  type="number"
                                  value={entry.extraHours || ''}
                                  onChange={(e) => handleExtraHoursChange(entry.contractorId, e.target.value, entry.siteId)}
                                  className="w-full text-center py-1 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded outline-none"
                                  placeholder="+ Hrs"
                                />
                              ) : (
                                <div className="text-[9px] text-gray-300 font-medium text-center">—</div>
                              )}
                            </td>
                          )}

                          <td className="px-1 py-1">
                            <div className="relative">
                              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-gray-400">$</span>
                              <input type="number" value={entry.allowance || ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'allowance', e.target.value, entry.siteId)} className="w-full pl-3 py-1 text-xs text-slate-600 outline-none rounded bg-slate-50 focus:bg-white" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-1 py-1">
                            <div className="relative">
                              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-gray-400">$</span>
                              <input type="number" value={entry.otherPay || ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'otherPay', e.target.value, entry.siteId)} className="w-full pl-3 py-1 text-xs text-slate-600 outline-none rounded bg-slate-50 focus:bg-white" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-1 py-1">
                            <div className="relative">
                              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-rose-400">-</span>
                              <input type="number" value={entry.deduction || ''} onChange={(e) => handlePaymentFieldChange(entry.contractorId, 'deduction', e.target.value, entry.siteId)} className="w-full pl-3 text-rose-500 py-1 text-xs bg-slate-50 focus:bg-white outline-none rounded" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-medium text-xs text-slate-500">${calculation.totalPay.toFixed(2)}</td>
                          <td className="px-3 py-3 text-center font-semibold text-sm text-emerald-600 bg-emerald-50/20">${calculation.netPay.toFixed(2)}</td>
                          <td className="px-3 py-3 text-center font-semibold text-[10px] text-amber-500 tracking-tighter">
                            {calculation.trainingPay > 0 ? `$${calculation.trainingPay.toFixed(2)}` : '—'}
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
      {showRateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-slate-100 animate-in zoom-in-95 duration-300">
            <h4 className="text-xl font-semibold text-slate-900 uppercase tracking-tighter mb-1">Adjust Rates: {rateModalSite?.siteName}</h4>
            <p className="text-xs text-slate-400 font-medium mb-6">Updates apply to current sessions and future records.</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {['weekday', 'saturday', 'sunday', 'publicHoliday'].map(type => (
                <div key={type}>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase tracking-widest mb-1.5">{type}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input
                      type="number"
                      value={tempRates[type]}
                      onChange={(e) => setTempRates({ ...tempRates, [type]: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-6 pr-3 py-2.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 bg-white transition-all outline-none font-semibold text-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleUpdateRates} className="w-full py-4 bg-slate-900 text-white font-semibold uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:scale-[1.02] transition active:scale-95">Confirm Rates</button>
              <button onClick={() => setShowRateModal(false)} className="w-full py-3 text-slate-400 font-semibold uppercase tracking-widest hover:text-slate-600 transition">Discard Changes</button>
            </div>
          </div>
        </div>
      )}

      {showNewContractorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-slate-100 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="text-2xl font-semibold text-slate-900 uppercase tracking-tighter">Fast-Track Hire</h4>
                <p className="text-sm text-slate-400 font-medium">Onboard a new worker directly to this site.</p>
              </div>
              <button onClick={() => setShowNewContractorModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <ContractorForm onSave={handleQuickCreateContractor} onCancel={() => setShowNewContractorModal(false)} />
          </div>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <h4 className="text-xl font-semibold text-slate-900 uppercase tracking-tighter mb-1">Manage Workforce</h4>
            <p className="text-xs text-slate-400 font-medium mb-6 italic">Assign or un-assign staff members instantly.</p>

            <div className="overflow-y-auto pr-3 space-y-6 flex-1 custom-scrollbar">
              {/* CURRENT STAFF */}
              <div>
                <div className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Current Site Staff
                </div>
                <div className="space-y-2">
                  {contractors
                    .filter(c => site.allocatedContractors?.includes(c.id))
                    .map(c => {
                      const contractorSubSites = allSites.filter(s => s.isSubSite && s.parentSiteId === site.id && s.allocatedContractors?.includes(c.id));
                      const availableSubSites = subSites.filter(ss => !contractorSubSites.some(css => css.id === ss.id));

                      return (
                        <div key={c.id} className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-800 text-sm uppercase tracking-tight">{c.name}</div>
                              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">ID: {c.contractorId}</div>
                            </div>
                            <button
                              onClick={() => handleQuickRemoveStaff(c.id, site.id)}
                              className="p-2 bg-white text-rose-500 rounded-full shadow-sm border border-rose-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition active:scale-90"
                              title="Remove from Primary Site"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>

                          {/* SUB-SITE MANAGEMENT INSIDE MODAL */}
                          <div className="pt-3 border-t border-emerald-100/50">
                            <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Allocated Sub-sites</div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {contractorSubSites.map(ss => (
                                <div key={ss.id} className="bg-white px-2 py-1 rounded-lg border border-emerald-200 text-[10px] font-bold text-emerald-700 flex items-center gap-1.5">
                                  {ss.siteName}
                                  <button onClick={() => handleQuickRemoveStaff(c.id, ss.id)} className="text-rose-500 hover:text-rose-700 font-black px-1">×</button>
                                </div>
                              ))}
                              {contractorSubSites.length === 0 && <span className="text-[10px] text-slate-400 italic">No sub-sites assigned</span>}
                            </div>

                            {availableSubSites.length > 0 && (
                              <select
                                onChange={(e) => {
                                  handleQuickAddStaff(c.id, null, e.target.value);
                                  e.target.value = '';
                                }}
                                className="w-full text-[9px] font-bold bg-white/50 border border-emerald-100 rounded-lg px-2 py-1 outline-none focus:border-emerald-400"
                              >
                                <option value="">+ Allocate to Sub-site...</option>
                                {availableSubSites.map(ss => (
                                  <option key={ss.id} value={ss.id}>{ss.siteName}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {contractors.filter(c => site.allocatedContractors?.includes(c.id)).length === 0 && (
                    <div className="text-center py-4 text-slate-300 text-xs font-medium uppercase tracking-widest">No staff assigned</div>
                  )}
                </div>
              </div>

              {/* AVAILABLE STAFF */}
              <div>
                <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  Available for Assignment
                </div>
                <div className="space-y-2">
                  {contractors
                    .filter(c => c.status === 'active' && !site.allocatedContractors?.includes(c.id))
                    .map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition group">
                        <div>
                          <div className="font-medium text-slate-700 text-sm uppercase tracking-tight">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">ID: {c.contractorId}</div>
                        </div>
                        <button
                          onClick={() => handleQuickAddStaff(c.id)}
                          className="p-2 bg-white text-blue-600 rounded-full shadow-sm border border-slate-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition active:scale-90"
                          title="Add to site"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </button>
                      </div>
                    ))}
                  {contractors.filter(c => c.status === 'active' && !site.allocatedContractors?.includes(c.id)).length === 0 && (
                    <div className="text-center py-4 text-slate-300 text-xs font-medium uppercase tracking-widest">All staff assigned</div>
                  )}
                </div>
              </div>
            </div>

            <button onClick={() => setShowStaffModal(false)} className="mt-8 w-full py-4 bg-slate-900 text-white font-semibold uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-100 hover:bg-black transition active:scale-95">Complete Allocation</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetEntry;
