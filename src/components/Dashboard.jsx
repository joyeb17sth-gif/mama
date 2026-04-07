import { useState, useEffect } from 'react';
import {
    getSites, getTimesheets, getContractors,
    getTrainingReleases, saveTrainingReleases,
    getAuditLogs, logAction
} from '../utils/storage';
import { calculateTimesheetPay, checkBudgetStatus } from '../utils/payrollCalculations';
import { exportPaymentSummaryToCSV } from '../utils/exportUtils';
import Toast from './Toast';
import Archiver from './Archiver';

const Dashboard = () => {
    const [sites, setSites] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [timesheets, setTimesheets] = useState([]);
    const [releases, setReleases] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [releaseAmount, setReleaseAmount] = useState('');

    const [siteSearch, setSiteSearch] = useState('');
    const [contractorSearch, setContractorSearch] = useState('');
    const [payrollSearch, setPayrollSearch] = useState('');

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = () => {
        setSites(getSites());
        setContractors(getContractors());
        setTimesheets(getTimesheets());
        setReleases(getTrainingReleases());
    };

    // Helper: Get training balance for a contractor
    const getTrainingBalance = (contractorId) => {
        const contractorTimesheets = timesheets.flatMap(ts => ts.entries)
            .filter(entry => entry.contractorId === contractorId);

        const totalAccumulated = contractorTimesheets.reduce((sum, entry) => sum + (entry.trainingPay || 0), 0);
        const contractorReleases = releases.filter(r => r.contractorId === contractorId);
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
    const baseSiteStats = sites.map(s => {
        const siteTimesheets = timesheets.filter(ts => ts.siteId === s.id);
        const entriesForSite = timesheets.flatMap(ts => ts.entries || []).filter(e => e.siteId === s.id);

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
    const consolidatedPayroll = contractors.filter(c => c.status === 'active').map(contractor => {
        const contractorEntries = timesheets.flatMap(ts => ts.entries.map(e => ({ ...e, siteName: ts.siteName })))
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

    const handleReleaseClick = (contractor) => {
        const balanceInfo = getTrainingBalance(contractor.id);
        setSelectedContractor({ ...contractor, balance: balanceInfo.balance });
        setReleaseAmount(balanceInfo.balance.toFixed(2));
    };

    const confirmRelease = () => {
        const amount = parseFloat(releaseAmount);
        if (isNaN(amount) || amount <= 0 || amount > selectedContractor.balance) {
            alert('Invalid amount');
            return;
        }

        const newRelease = {
            id: Date.now().toString(),
            contractorId: selectedContractor.id,
            contractorName: selectedContractor.name,
            amount: amount,
            date: new Date().toISOString(),
            releasedBy: 'Admin',
            period: new Date().toISOString().slice(0, 7)
        };

        const updatedReleases = [...releases, newRelease];
        saveTrainingReleases(updatedReleases);
        logAction('RELEASE_TRAINING_PAY', {
            contractorName: selectedContractor.name,
            amount
        });

        setToastMessage(`Successfully released $${amount.toFixed(2)} for ${selectedContractor.name}`);
        setShowToast(true);
        setSelectedContractor(null);
        loadAllData();
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-in-up">
            {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}

            {/* Release Modal */}
            {selectedContractor && (
                <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 w-[400px] border border-zinc-100 transform transition-all">
                        <h3 className="text-h2 text-zinc-900 mb-2">Release Training Escrow</h3>
                        <p className="text-zinc-500 mb-6 text-sm">Transfer funds to <span className="text-zinc-900 font-semibold">{selectedContractor.name}</span></p>

                        <div className="bg-primary-50 p-5 rounded-xl mb-6 border border-primary-100">
                            <span className="block text-xs font-bold text-primary-600 mb-1">Available Balance</span>
                            <span className="text-3xl font-bold text-primary-700 tracking-tight">${selectedContractor.balance.toFixed(2)}</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 mb-2">Amount to Release</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={releaseAmount}
                                        onChange={(e) => setReleaseAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none font-bold text-zinc-900 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setSelectedContractor(null)}
                                    className="flex-1 px-4 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-semibold hover:bg-zinc-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRelease}
                                    className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition hover:-translate-y-0.5"
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
                <div className="flex flex-col md:flex-row justify-between items-end mb-4 px-1">
                    <div>
                        <h3 className="text-p1 text-zinc-900">Project Performance</h3>
                        <p className="text-sm text-zinc-500 mt-1">Real-time budget tracking across all active sites</p>
                    </div>
                    <div className="relative mt-4 md:mt-0">
                        <input
                            type="text"
                            placeholder="Filter sites..."
                            value={siteSearch}
                            onChange={(e) => setSiteSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-50 outline-none w-64 transition-all text-zinc-700 placeholder-zinc-400"
                        />
                        <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                {/* Site Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(consolidatedSiteBudgets || []).filter(s => s?.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).slice(0, 6).map(site => {
                        const isOverBudget = !site?.status?.withinBudget;
                        return (
                            <div key={site.id} className={`group relative p-6 rounded-xl border transition-all duration-300 ${isOverBudget ? 'border-rose-200 bg-rose-50/50' : 'border-zinc-200 bg-white hover:border-primary-300'}`}>
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-2 h-2 rounded-full ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-400'}`}></div>
                                            <span className="text-[10px] font-bold text-zinc-400">{site.payrollCycle || '---'}</span>
                                        </div>
                                        <h4 className="text-p1 text-zinc-900 tracking-tight truncate max-w-[200px]" title={site.siteName}>{site.siteName || 'Unnamed Site'}</h4>
                                    </div>
                                    {isOverBudget && (
                                        <span className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-white border border-rose-100 text-rose-600 rounded-md text-[10px] font-bold">
                                            Warning
                                        </span>
                                    )}
                                </div>

                                {/* Metrics */}
                                <div className="space-y-4">
                                    {/* Hours Meter */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-p3 font-medium text-zinc-500">
                                            <span>Hours Usage</span>
                                            <span className={`font-bold tabular-nums ${site?.status?.hoursOver > 0 ? 'text-rose-600' : 'text-zinc-900'}`}>
                                                {(site.totalHours || 0).toFixed(1)} <span className="text-zinc-300">/</span> {site.combinedBudgetHours || '0'}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${site?.status?.hoursOver > 0 ? 'bg-rose-500' : 'bg-zinc-800'}`}
                                                style={{ width: `${Math.min(((site.totalHours || 0) / (site.combinedBudgetHours || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Budget Meter */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-medium text-zinc-500">
                                            <span>Budget Usage</span>
                                            <span className={`font-bold tabular-nums ${site?.status?.amountOver > 0 ? 'text-rose-600' : 'text-zinc-900'}`}>
                                                ${(site.totalCost || 0).toLocaleString()} <span className="text-zinc-300">/</span> ${site.combinedBudgetAmount?.toLocaleString() || '0'}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${site?.status?.amountOver > 0 ? 'bg-rose-500' : 'bg-primary-600'}`}
                                                style={{ width: `${Math.min(((site.totalCost || 0) / (site.combinedBudgetAmount || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Subsite Badges */}
                                {(site.subSitesData || []).length > 0 && (
                                    <div className="mt-5 pt-4 border-t border-zinc-100/60 flex flex-wrap gap-1.5">
                                        {(site.subSitesData || []).map(ss => (
                                            <span key={ss.id} className="px-1.5 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-[9px] font-semibold text-zinc-500">
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
                    <div className="mt-4 text-center">
                        <span className="text-xs font-medium text-zinc-500">
                            Showing 6 of {(consolidatedSiteBudgets || []).filter(s => s?.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).length} sites. Use the filter above to find more.
                        </span>
                    </div>
                )}
            </div>

            {/* Dashboard Alerts */}
            {contractors.some(c => getTrainingBalance(c.id).balance > 0) && (
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

            <div className="grid grid-cols-1 gap-8">

                {/* Training Pay Oversight */}
                {contractors.some(c => getTrainingBalance(c.id).balance > 0) ? (
                    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col h-[500px]">
                        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-p2 text-zinc-900">Training Escrow</h3>
                            </div>
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="min-w-full w-full">
                                <thead className="bg-zinc-50 border-b border-zinc-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-p3 font-bold text-zinc-400">Contractor</th>
                                        <th className="px-6 py-3 text-center text-p3 font-bold text-zinc-400">Balance</th>
                                        <th className="px-6 py-3 text-right text-p3 font-bold text-zinc-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {contractors
                                        .filter(c => getTrainingBalance(c.id).balance > 0)
                                        .map(c => {
                                            const training = getTrainingBalance(c.id);
                                            return (
                                                <tr key={c.id} className="group hover:bg-zinc-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-sm text-zinc-900">{c.name}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="w-full bg-zinc-100 rounded-full h-1.5 w-16">
                                                                <div className={`h-1.5 rounded-full ${training.days >= 5 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.min((training.days / 5) * 100, 100)}%` }}></div>
                                                            </div>
                                                            <span className="text-[10px] font-medium text-zinc-400">{training.days}/5 Days</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md font-bold text-sm border border-amber-100">
                                                            ${training.balance.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleReleaseClick(c)}
                                                            className="text-p3 font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors border border-primary-100"
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
                <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col h-[500px]">
                    <div className="px-6 py-4 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-center bg-white gap-3 sticky top-0 z-10">
                        <h3 className="text-p2 text-zinc-900">Period Earnings</h3>
                        <div className="relative w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={payrollSearch}
                                onChange={(e) => setPayrollSearch(e.target.value)}
                                className="pl-8 pr-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none w-full md:w-48 transition-all"
                            />
                            <svg className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="min-w-full w-full">
                            <thead className="bg-zinc-50 border-b border-zinc-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-p3 font-bold text-zinc-400">Name</th>
                                    <th className="px-6 py-3 text-center text-p3 font-bold text-zinc-400">Hours</th>
                                    <th className="px-6 py-3 text-right text-p3 font-bold text-zinc-400">Payable</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {consolidatedPayroll
                                    .filter(p => p.name.toLowerCase().includes(payrollSearch.toLowerCase()))
                                    .map(p => (
                                        <tr key={p.id} className="group hover:bg-zinc-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-sm text-zinc-900 group-hover:text-primary-700 transition-colors">{p.name}</div>
                                                <div className="text-[10px] font-medium text-zinc-400 font-mono mt-0.5">{p.sites}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-medium text-zinc-600 tabular-nums">{p.totalHours.toFixed(1)}h</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-block font-mono font-bold text-sm text-emerald-600">
                                                    ${p.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                {consolidatedPayroll.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center py-20 text-zinc-400 text-sm">
                                            No active timesheets found for this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Main Data Grid */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-p2 text-zinc-900">Contractor Directory</h3>
                        <p className="text-xs text-zinc-500 mt-1">Full roster management</p>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filter roster..."
                            value={contractorSearch}
                            onChange={(e) => setContractorSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none w-64 transition-all"
                        />
                        <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-200">
                                <th className="px-6 py-3 text-p3 font-bold text-zinc-400">ID</th>
                                <th className="px-6 py-3 text-p3 font-bold text-zinc-400">Name</th>
                                <th className="px-6 py-3 text-p3 font-bold text-zinc-400">Status</th>
                                <th className="px-6 py-3 text-p3 font-bold text-zinc-400">Contact</th>
                                <th className="px-6 py-3 text-p3 font-bold text-zinc-400">Bank Details</th>
                                <th className="px-6 py-3 text-p3 font-bold text-zinc-400 text-right">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {contractors.filter(c => c.name.toLowerCase().includes(contractorSearch.toLowerCase())).slice(0, 10).map(c => (
                                <tr key={c.id} className="hover:bg-zinc-50/80 transition-colors group">
                                    <td className="px-6 py-3.5 text-xs font-mono text-zinc-400">{c.contractorId}</td>
                                    <td className="px-6 py-3.5">
                                        <div className="font-semibold text-sm text-zinc-900 group-hover:text-primary-600 transition-colors">{c.name}</div>
                                        <div className="text-[10px] text-zinc-400">{c.email}</div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-zinc-600 font-medium">{c.phone || '---'}</td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-zinc-400">BSB: <span className="text-zinc-600 font-mono">{c.bsb || '---'}</span></span>
                                            <span className="text-[10px] font-bold text-zinc-400">ACC: <span className="text-zinc-600 font-mono">{c.accountNumber || '---'}</span></span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <span className="inline-block px-2 py-1 bg-zinc-100 text-zinc-500 rounded text-[10px] font-semibold">
                                            {c.referralName || 'Direct'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Footer / Pagination hint */}
                <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
                    <span className="text-[10px] font-medium text-zinc-500">
                        {contractors.filter(c => c.name.toLowerCase().includes(contractorSearch.toLowerCase())).length > 10 ? 'Use the filter above to find more contractors.' : ''}
                    </span>
                    <span className="text-[10px] font-medium text-zinc-400">
                        Showing {Math.min(10, contractors.filter(c => c.name.toLowerCase().includes(contractorSearch.toLowerCase())).length)} of {contractors.length} records
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
