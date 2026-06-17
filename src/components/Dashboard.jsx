import { useState, useEffect } from 'react';
import {
    getSites, getTimesheets, getContractors,
    getTrainingReleases, saveTrainingReleases,
    getAuditLogs, logAction, getPeriodicalTasks
} from '../utils/storage';
import { calculateTimesheetPay, checkBudgetStatus } from '../utils/payrollCalculations';
import { exportPaymentSummaryToCSV } from '../utils/exportUtils';
import Toast from './Toast';
import Archiver from './Archiver';

const Dashboard = ({ syncVersion, periodicalTasks: propPeriodicalTasks }) => {
    const [sites, setSites] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [timesheets, setTimesheets] = useState([]);
    const [releases, setReleases] = useState([]);
    const [periodicalTasks, setPeriodicalTasks] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [releaseAmount, setReleaseAmount] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [siteSearch, setSiteSearch] = useState('');
    const [contractorSearch, setContractorSearch] = useState('');
    const [payrollSearch, setPayrollSearch] = useState('');

    useEffect(() => {
        loadAllData();
    }, []);

    useEffect(() => {
        if (propPeriodicalTasks) {
            setPeriodicalTasks(propPeriodicalTasks);
        }
    }, [propPeriodicalTasks]);

    const loadAllData = () => {
        setSites(getSites());
        setContractors(getContractors());
        setTimesheets(getTimesheets());
        setReleases(getTrainingReleases());
        if (!propPeriodicalTasks) {
            setPeriodicalTasks(getPeriodicalTasks());
        }
    };

    // Helper: Get training balance for a contractor
    const getTrainingBalance = (contractorId) => {
        const contractorTimesheets = (timesheets || []).flatMap(ts => ts.entries || [])
            .filter(entry => entry.contractorId === contractorId);

        const totalAccumulated = contractorTimesheets.reduce((sum, entry) => sum + (entry.trainingPay || 0), 0);
        const contractorReleases = (releases || []).filter(r => r.contractorId === contractorId);
        const totalReleased = contractorReleases.reduce((sum, r) => sum + r.amount, 0);

        const totalTrainingDays = contractorTimesheets.reduce((sum, entry) => {
            return sum + (entry.dailyHours?.filter(d => d.isTraining && d.hours > 0).length || 0);
        }, 0);

        return {
            accumulated: totalAccumulated,
            released: totalReleased,
            balance: totalAccumulated - totalReleased,
            days: totalTrainingDays
        };
    };

    // 1. Calculate base stats for EVERY site (Actuals)
    const baseSiteStats = (sites || []).map(s => {
        const siteTimesheets = (timesheets || []).filter(ts => ts.siteId === s.id);
        const entriesForSite = (timesheets || []).flatMap(ts => ts.entries || []).filter(e => e.siteId === s.id);

        const totalHours = entriesForSite.reduce((sum, e) => sum + (e.totalHours || 0), 0);
        const totalCost = entriesForSite.reduce((sum, e) => sum + (e.totalPay || 0), 0);

        return {
            ...s,
            actualHours: totalHours,
            actualCost: totalCost,
            budgetHours: parseFloat(s.budgetedHours) || 0,
            budgetAmount: parseFloat(s.budgetedAmount) || 0
        };
    });

    // 2. Group and Consolidate under Primary sites
    const consolidatedSiteBudgets = baseSiteStats.filter(s => !s.isSubSite).map(mainSite => {
        const mySubSites = baseSiteStats.filter(s => s.isSubSite && s.parentSiteId === mainSite.id);

        const consolidatedActualHours = mainSite.actualHours + mySubSites.reduce((sum, ss) => sum + ss.actualHours, 0);
        const consolidatedActualCost = mainSite.actualCost + mySubSites.reduce((sum, ss) => sum + ss.actualCost, 0);
        const consolidatedBudgetHours = mainSite.budgetHours + mySubSites.reduce((sum, ss) => sum + ss.budgetHours, 0);
        const consolidatedBudgetAmount = mainSite.budgetAmount + mySubSites.reduce((sum, ss) => sum + ss.budgetAmount, 0);

        const status = checkBudgetStatus(
            consolidatedActualHours,
            consolidatedActualCost,
            consolidatedBudgetHours,
            consolidatedBudgetAmount
        );

        return {
            ...mainSite,
            subSitesData: mySubSites,
            totalHours: consolidatedActualHours,
            totalCost: consolidatedActualCost,
            combinedBudgetHours: consolidatedBudgetHours,
            combinedBudgetAmount: consolidatedBudgetAmount,
            status
        };
    });

    // Payroll Preview (Consolidated)
    const consolidatedPayroll = (contractors || []).filter(c => c.status === 'active').map(contractor => {
        const contractorEntries = (timesheets || []).flatMap(ts => (ts.entries || []).map(e => ({ ...e, siteName: ts.siteName })))
            .filter(entry => entry.contractorId === contractor.id);

        const totalHours = contractorEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
        const totalPay = contractorEntries.reduce((sum, e) => sum + (e.totalPay || 0), 0);

        return {
            id: contractor.id,
            name: contractor.name,
            contractorId: contractor.contractorId,
            totalHours,
            totalPay,
            sites: [...new Set(contractorEntries.map(e => e.siteName))].join(', ')
        };
    }).filter(p => p.totalHours > 0);

    const getUpcomingTasks = () => {
        const today = new Date();
        const currentMonthStr = today.toISOString().slice(0, 7); // yyyy-MM
        const upcoming = [];

        if (!periodicalTasks || !Array.isArray(periodicalTasks)) return upcoming;

        periodicalTasks.forEach(task => {
            const site = sites.find(s => s.id === task.siteId);
            const schedule = task.schedules?.find(s => s.targetPeriod === currentMonthStr && s.status === 'Scheduled');
            if (schedule) {
                let timing = 'Early';
                const monthIndex = today.getMonth();
                const periods = task.periodBudgets || [];
                if (periods.length) {
                    if (task.frequency === 'Monthly') {
                        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
                        timing = periods.find(p => p.name === monthName && !p.isDisabled)?.timing || 'Early';
                    } else if (task.frequency === 'Quarterly') {
                        let diff = monthIndex - (task.startingMonth || 0);
                        if (diff < 0) diff += 12;
                        const qIndex = Math.floor(diff / 3);
                        const expectedName = qIndex === 0 ? '1st Quarter' : qIndex === 1 ? '2nd Quarter' : qIndex === 2 ? '3rd Quarter' : '4th Quarter';
                        timing = periods.find(p => p.name === expectedName && !p.isDisabled)?.timing || 'Early';
                    } else if (task.frequency === '6 Monthly') {
                        let diff = monthIndex - (task.startingMonth || 0);
                        if (diff < 0) diff += 12;
                        const hIndex = Math.floor(diff / 6);
                        const expectedName = hIndex === 0 ? '1st Half' : '2nd Half';
                        timing = periods.find(p => p.name === expectedName && !p.isDisabled)?.timing || 'Early';
                    } else if (task.frequency === 'Yearly' || task.frequency === 'Weekly') {
                        timing = periods[0]?.isDisabled ? 'Early' : (periods[0]?.timing || 'Early');
                    }
                }

                let targetDay = 10;
                if (timing === 'Mid') targetDay = 20;
                else if (timing === 'End') {
                    const lastDayDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    targetDay = lastDayDate.getDate();
                }

                const targetDate = new Date(today.getFullYear(), today.getMonth(), targetDay);
                // Calculate difference in days, ignore time
                const diffTime = targetDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays >= 0 && diffDays <= 2) {
                    upcoming.push({
                        task,
                        siteName: site ? site.siteName : 'Unknown Site',
                        targetDate,
                        daysLeft: diffDays,
                        timing
                    });
                }
            }
        });
        return upcoming;
    };

    const handleReleaseClick = (contractor) => {
        const balanceInfo = getTrainingBalance(contractor.id);
        setSelectedContractor({ ...contractor, balance: balanceInfo.balance });
        setReleaseAmount(balanceInfo.balance.toFixed(2));
    };

    const confirmRelease = () => {
        if (isSaving) return;
        const amount = parseFloat(releaseAmount);
        if (isNaN(amount) || amount <= 0 || amount > selectedContractor.balance) {
            alert('Invalid amount');
            return;
        }

        setIsSaving(true);

        const newRelease = {
            id: crypto.randomUUID(),
            contractorId: selectedContractor.id,
            contractorName: selectedContractor.name,
            amount: amount,
            date: new Date().toISOString(),
            releasedBy: 'Admin',
            period: new Date().toISOString().slice(0, 7)
        };

        const updatedReleases = [...(releases || []), newRelease];
        saveTrainingReleases(updatedReleases);
        logAction('RELEASE_TRAINING_PAY', {
            contractorName: selectedContractor.name,
            amount
        });

        setToastMessage(`Successfully released $${amount.toFixed(2)} for ${selectedContractor.name}`);
        setShowToast(true);
        setSelectedContractor(null);
        setIsSaving(false);
        loadAllData();
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-in-up">
            {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}

            {/* Release Modal */}
            {selectedContractor && (
                <div className="fixed inset-0 bg-notion-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-large p-8 w-full max-w-lg whisper-border shadow-notion-deep transform transition-all">
                        <h3 className="text-sub-heading text-notion-black mb-2">Release Training Escrow</h3>
                        <p className="text-notion-warm-gray-500 mb-6 text-sm">Transfer funds to <span className="text-notion-black font-semibold">{selectedContractor.name}</span></p>

                        <div className="bg-notion-badge-blue-bg p-5 rounded-comfortable mb-6 whisper-border">
                            <span className="block text-badge text-notion-badge-blue-text mb-1 uppercase tracking-widest">Available Balance</span>
                            <span className="text-display-secondary text-notion-blue tracking-notion-display underline underline-offset-8 decoration-notion-blue/20 decoration-2">${selectedContractor.balance.toFixed(2)}</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-badge text-notion-warm-gray-300 mb-2 uppercase">Amount to Release</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-notion-warm-gray-300 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={releaseAmount}
                                        onChange={(e) => setReleaseAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2.5 bg-notion-warm-white bg-opacity-50 whisper-border rounded-micro focus:bg-white focus:ring-1 focus:ring-notion-focus-blue outline-none font-bold text-notion-black transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setSelectedContractor(null)}
                                    className="flex-1 px-4 py-2 bg-notion-warm-white text-notion-warm-gray-500 rounded-micro font-semibold text-sm hover:bg-zinc-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRelease}
                                    className="flex-1 px-4 py-2 bg-notion-blue text-white rounded-micro font-semibold text-sm hover:bg-notion-blue-active transition shadow-notion-card"
                                >
                                    Confirm Transfer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Section: Budget Tracker */}
            <div>
                {/* Header for Section */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-6 px-1">
                    <div>
                        <h3 className="text-card-title text-notion-black tracking-notion-card">Project Performance</h3>
                        <p className="text-sm text-notion-warm-gray-500 mt-1">Real-time budget tracking across all active sites</p>
                    </div>
                    <div className="relative mt-4 md:mt-0">
                        <input
                            type="text"
                            placeholder="Filter sites..."
                            value={siteSearch}
                            onChange={(e) => setSiteSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white whisper-border rounded-micro text-sm focus:ring-1 focus:ring-notion-focus-blue outline-none w-64 transition-all text-notion-black placeholder-notion-warm-gray-300"
                        />
                        <svg className="w-4 h-4 text-notion-warm-gray-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                {/* Site Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(consolidatedSiteBudgets || []).filter(s => s?.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).slice(0, 6).map(site => {
                        const isOverBudget = !site?.status?.withinBudget;
                        return (
                            <div key={site.id} className={`group relative p-6 notion-card transition-all duration-300 ${isOverBudget ? 'bg-rose-50/30' : 'hover:border-notion-blue/30'}`}>
                                <div className="flex justify-between items-start mb-5">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className={`w-2 h-2 rounded-full ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-400'}`}></div>
                                            <span className="text-badge text-notion-warm-gray-300 uppercase tracking-widest">{site.payrollCycle || 'Standard'}</span>
                                        </div>
                                        <h4 className="text-body-semibold text-notion-black tracking-tight underline decoration-notion-warm-gray-300/20 underline-offset-4 decoration-2 truncate pr-4" title={site.siteName}>{site.siteName || 'Unnamed Site'}</h4>
                                    </div>
                                    {isOverBudget && (
                                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-micro text-[10px] font-bold uppercase tracking-tight">
                                            Over Budget
                                        </span>
                                    )}
                                </div>

                                {/* Metrics */}
                                <div className="space-y-4">
                                    {/* Hours Meter */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-caption font-medium text-notion-warm-gray-500">
                                            <span>Hours Usage</span>
                                            <span className={`font-bold tabular-nums ${site?.status?.hoursOver > 0 ? 'text-rose-600' : 'text-notion-black'}`}>
                                                {(site.totalHours || 0).toFixed(1)} <span className="text-notion-warm-gray-300 font-normal mx-0.5">/</span> {site.combinedBudgetHours || '0'}h
                                            </span>
                                        </div>
                                        <div className="h-1 bg-notion-warm-white rounded-pill overflow-hidden">
                                            <div
                                                className={`h-full rounded-pill transition-all duration-1000 ${site?.status?.hoursOver > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(((site.totalHours || 0) / (site.combinedBudgetHours || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Budget Meter */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-caption font-medium text-notion-warm-gray-500">
                                            <span>Budget Usage</span>
                                            <span className={`font-bold tabular-nums ${site?.status?.amountOver > 0 ? 'text-rose-600' : 'text-notion-black'}`}>
                                                ${(site.totalCost || 0).toLocaleString()} <span className="text-notion-warm-gray-300 font-normal mx-0.5">/</span> ${site.combinedBudgetAmount?.toLocaleString() || '0'}
                                            </span>
                                        </div>
                                        <div className="h-1 bg-notion-warm-white rounded-pill overflow-hidden">
                                            <div
                                                className={`h-full rounded-pill transition-all duration-1000 ${site?.status?.amountOver > 0 ? 'bg-rose-500' : 'bg-notion-blue'}`}
                                                style={{ width: `${Math.min(((site.totalCost || 0) / (site.combinedBudgetAmount || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Subsite Badges */}
                                {(site.subSitesData || []).length > 0 && (
                                    <div className="mt-5 pt-4 border-t border-notion-warm-white flex flex-wrap gap-1.5">
                                        {(site.subSitesData || []).map(ss => (
                                            <span key={ss.id} className="px-1.5 py-0.5 bg-notion-warm-white border border-black/[0.05] rounded-micro text-[9px] font-bold text-notion-warm-gray-500 uppercase tracking-tight">
                                                {ss.siteName}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                {(consolidatedSiteBudgets || []).filter(s => s?.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).length > 6 && (
                    <div className="mt-6 text-center">
                        <span className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                            Showing 6 of {(consolidatedSiteBudgets || []).filter(s => s?.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).length} active terminal nodes
                        </span>
                    </div>
                )}
            </div>

            {/* Dashboard Alerts */}
            {(contractors || []).some(c => getTrainingBalance(c.id).balance > 0) && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/60 rounded-lg backdrop-blur-sm border border-amber-100">
                            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-900">Training Releases Pending</h4>
                            <p className="text-sm text-amber-700/80">There are contractors eligible for escrow release.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upcoming Task Alerts */}
            {getUpcomingTasks().length > 0 && (
                <div className="bg-gradient-to-r from-notion-badge-blue-bg to-blue-50 border border-notion-blue/20 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/60 rounded-lg backdrop-blur-sm border border-notion-blue/20">
                            <svg className="w-6 h-6 text-notion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-bold text-notion-blue">Upcoming Periodical Tasks</h4>
                            <p className="text-sm text-notion-blue/80">These tasks are scheduled to be performed within the next 2 days.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {getUpcomingTasks().map((upcoming, idx) => (
                            <div key={idx} className="bg-white/80 p-3 rounded-comfortable whisper-border shadow-sm flex flex-col">
                                <span className="text-[10px] font-bold text-notion-warm-gray-400 uppercase tracking-widest">{upcoming.siteName}</span>
                                <span className="font-bold text-notion-black text-sm">{upcoming.task.taskName} ({upcoming.task.taskCode})</span>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-xs text-notion-warm-gray-500 font-medium">Timing: <span className="text-notion-black">{upcoming.timing}</span></span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-micro ${upcoming.daysLeft === 0 ? 'bg-rose-100 text-rose-700' : 'bg-notion-badge-blue-bg text-notion-blue'}`}>
                                        {upcoming.daysLeft === 0 ? 'Due Today' : `${upcoming.daysLeft} days left`}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-10">

                {/* Training Pay Oversight */}
                {(contractors || []).some(c => getTrainingBalance(c.id).balance > 0) ? (
                    <div className="notion-card overflow-hidden flex flex-col h-[500px]">
                        <div className="px-6 py-4 border-b border-notion-warm-white flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-body-semibold text-notion-black tracking-notion-card">Training Escrow Pool</h3>
                            </div>
                            <span className="flex h-1.5 w-1.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="min-w-full w-full border-separate border-spacing-0">
                                <thead className="bg-notion-warm-white bg-opacity-50 border-b whisper-border sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Contractor</th>
                                        <th className="px-6 py-2.5 text-center text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Balance</th>
                                        <th className="px-6 py-2.5 text-right text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y whisper-border">
                                    {(contractors || [])
                                        .filter(c => getTrainingBalance(c.id).balance > 0)
                                        .map(c => {
                                            const training = getTrainingBalance(c.id);
                                            return (
                                                <tr key={c.id} className="group hover:bg-notion-warm-white transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="text-body-semibold text-notion-black">{c.name}</div>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <div className="w-24 bg-notion-warm-white rounded-pill h-1.5">
                                                                <div className={`h-1.5 rounded-pill ${training.days >= 5 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min((training.days / 5) * 100, 100)}%` }}></div>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-tight">{training.days}/5 Days</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-block px-2.5 py-1 bg-notion-warm-white whisper-border text-notion-black rounded-micro font-bold text-sm">
                                                            ${training.balance.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleReleaseClick(c)}
                                                            className="text-badge font-bold text-notion-blue hover:text-notion-link-blue-active bg-notion-badge-blue-bg px-3 py-1.5 rounded-micro transition-colors whisper-border uppercase tracking-widest"
                                                        >
                                                            Release
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}

                {/* Contractor Earnings Overview */}
                <div className="notion-card overflow-hidden flex flex-col h-[500px]">
                    <div className="px-6 py-4 border-b border-notion-warm-white flex flex-col md:flex-row justify-between items-center bg-white gap-3 sticky top-0 z-10">
                        <h3 className="text-body-semibold text-notion-black tracking-notion-card">Period Earnings Preview</h3>
                        <div className="relative w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Search earnings..."
                                value={payrollSearch}
                                onChange={(e) => setPayrollSearch(e.target.value)}
                                className="pl-8 pr-3 py-1.5 whisper-border bg-notion-warm-white/30 rounded-micro text-xs focus:ring-1 focus:ring-notion-focus-blue outline-none w-full md:w-48 transition-all"
                            />
                            <svg className="w-3.5 h-3.5 text-notion-warm-gray-300 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="min-w-full w-full border-separate border-spacing-0">
                            <thead className="bg-notion-warm-white bg-opacity-50 border-b whisper-border sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-2.5 text-left text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Resource</th>
                                    <th className="px-6 py-2.5 text-center text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Utilization</th>
                                    <th className="px-6 py-2.5 text-right text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Payable Net</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y whisper-border">
                                {consolidatedPayroll
                                    .filter(p => p.name.toLowerCase().includes(payrollSearch.toLowerCase()))
                                    .map(p => (
                                        <tr key={p.id} className="group hover:bg-notion-warm-white transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-body-semibold text-notion-black group-hover:text-notion-blue transition-colors underline decoration-transparent group-hover:decoration-notion-blue/20 underline-offset-4">{p.name}</div>
                                                <div className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-tight mt-1">{p.sites}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-bold text-notion-black tabular-nums">{p.totalHours.toFixed(1)}h</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-2.5 py-1 bg-white whisper-border rounded-micro font-bold text-sm text-emerald-600 shadow-sm">
                                                    ${p.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                {consolidatedPayroll.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center py-20 text-notion-warm-gray-300 text-sm">
                                            No active timesheets found for this operational cycle
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Main Data Grid */}
            <div className="notion-card overflow-hidden shadow-notion-deep">
                <div className="px-6 py-5 border-b whisper-border flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-card-title text-notion-black tracking-notion-card">Contractor Directory</h3>
                        <p className="text-xs text-notion-warm-gray-500 mt-1">Full roster management and resource allocation</p>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filter roster..."
                            value={contractorSearch}
                            onChange={(e) => setContractorSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-notion-warm-white/30 whisper-border rounded-micro text-sm focus:ring-1 focus:ring-notion-focus-blue outline-none w-64 transition-all"
                        />
                        <svg className="w-4 h-4 text-notion-warm-gray-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-notion-warm-white bg-opacity-50 border-b whisper-border">
                                <th className="px-6 py-3 text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Reference ID</th>
                                <th className="px-6 py-3 text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Resource Name</th>
                                <th className="px-6 py-3 text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-3 text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Contact Identity</th>
                                <th className="px-6 py-3 text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Bank Node</th>
                                <th className="px-6 py-3 text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest text-right">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y whisper-border">
                            {(contractors || []).filter(c => c.name.toLowerCase().includes(contractorSearch.toLowerCase())).slice(0, 10).map(c => (
                                <tr key={c.id} className="hover:bg-notion-warm-white transition-colors group">
                                    <td className="px-6 py-3.5 text-xs font-bold text-notion-warm-gray-300 uppercase tracking-tighter">{c.contractorId}</td>
                                    <td className="px-6 py-3.5">
                                        <div className="text-body-semibold text-notion-black group-hover:text-notion-blue transition-colors underline decoration-transparent group-hover:decoration-notion-blue/20 underline-offset-4">{c.name}</div>
                                        <div className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-tight mt-0.5">{c.email}</div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold border whisper-border ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                            {c.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-notion-black font-semibold">{c.phone || '---'}</td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-tight">BSB: <span className="text-notion-black">***{(c.bsb || '').slice(-3) || '---'}</span></span>
                                            <span className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-tight">ACC: <span className="text-notion-black">****{(c.accountNumber || '').slice(-4) || '---'}</span></span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <span className="inline-block px-1.5 py-0.5 bg-notion-warm-white whisper-border text-notion-warm-gray-500 rounded-micro text-[10px] font-bold uppercase tracking-tight">
                                            {c.referralName || 'DIRECT'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Footer / Pagination hint */}
                <div className="px-6 py-3 border-t whisper-border bg-notion-warm-white bg-opacity-30 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                        {(contractors || []).filter(c => c.name.toLowerCase().includes(contractorSearch.toLowerCase())).length > 10 ? 'Apply filters for extended roster lookup' : 'Full roster visibility enabled'}
                    </span>
                    <span className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                        Node {Math.min(10, (contractors || []).filter(c => c.name.toLowerCase().includes(contractorSearch.toLowerCase())).length)} / {(contractors || []).length}
                    </span>
                </div>
            </div>

            {/* Data Archiving Section */}
            <div>
                <Archiver />
            </div>
        </div>
    );
};

export default Dashboard;
