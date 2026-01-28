import { useState, useEffect } from 'react';
import {
    getSites, getTimesheets, getContractors,
    getTrainingReleases, saveTrainingReleases,
    getAuditLogs, logAction
} from '../utils/storage';
import { calculateTimesheetPay, checkBudgetStatus } from '../utils/payrollCalculations';
import { exportPaymentSummaryToCSV } from '../utils/exportUtils';
import Toast from './Toast';

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

    const handleExportPayroll = () => {
        // Re-calculating breakdown format for the export tool
        const exportData = consolidatedPayroll.map(p => ({
            contractorId: p.id,
            totalHours: p.totalHours,
            totalPay: p.totalPay,
            siteBreakdown: [{ siteName: p.sites, hours: p.totalHours, pay: p.totalPay }] // Simplified breakdown
        }));
        exportPaymentSummaryToCSV(exportData, contractors);
    };

    return (
        <div className="space-y-8 pb-12">
            {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}

            {/* Release Modal */}
            {selectedContractor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-8 w-[400px] shadow-2xl transform transition-all">
                        <h3 className="text-xl font-medium text-gray-900 mb-2">Release Training Pay</h3>
                        <p className="text-gray-500 mb-6 font-medium">Contractor: <span className="text-gray-900">{selectedContractor.name}</span></p>
                        <div className="bg-blue-50 p-4 rounded-xl mb-6">
                            <span className="block text-sm font-medium text-blue-600 uppercase tracking-widest mb-1">Available Balance</span>
                            <span className="text-2xl font-semibold text-blue-700">${selectedContractor.balance.toFixed(2)}</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 uppercase tracking-widest mb-2">Amount to Release</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                                    <input
                                        type="number"
                                        value={releaseAmount}
                                        onChange={(e) => setReleaseAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none font-medium text-gray-900"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setSelectedContractor(null)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRelease}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Section: Budget Tracker */}
            <div className="grid grid-cols-1 gap-8">
                {/* Site-Level Budget Tracker (Visual Warnings) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 className="text-xl font-medium text-gray-900">Site Budget Control</h3>
                            <p className="text-sm text-gray-500 font-medium">Visual warnings for hour and payable limits</p>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Quick Filter Sites..."
                                value={siteSearch}
                                onChange={(e) => setSiteSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-inner"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(consolidatedSiteBudgets || []).filter(s => s?.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).map(site => {
                                const isOverBudget = !site?.status?.withinBudget;
                                return (
                                    <div key={site.id} className={`p-5 rounded-2xl border-2 transition-all duration-300 ${isOverBudget ? 'border-red-100 bg-red-50/30' : 'border-slate-100 bg-white hover:border-blue-100 hover:shadow-md'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-lg leading-tight uppercase tracking-tighter">🏢 {site.siteName || 'Unnamed Site'}</h4>
                                                <div className="flex gap-2 mt-0.5">
                                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">{site.payrollCycle || '---'} Cycle</span>
                                                    <span className="text-xs font-black uppercase tracking-widest text-blue-400">• PROJECT GROUP</span>
                                                </div>
                                            </div>
                                            {isOverBudget && (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-bold uppercase animate-pulse shadow-lg shadow-rose-100">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                    LIMIT BREACHED
                                                </span>
                                            )}
                                        </div>

                                        {/* Nested Sub-sites List */}
                                        {(site.subSitesData || []).length > 0 && (
                                            <div className="mb-4 bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Connected Sites</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    <div className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 shadow-sm flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                                                        Primary
                                                    </div>
                                                    {(site.subSitesData || []).map(ss => (
                                                        <div key={ss.id} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-500 shadow-sm flex items-center gap-1">
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                            {ss.siteName || 'Subsite'}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4 pt-1">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <span>Consolidated Hours</span>
                                                    <span className={site?.status?.hoursOver > 0 ? 'text-rose-600' : 'text-slate-900'}>
                                                        {(site.totalHours || 0).toFixed(1)} / {site.combinedBudgetHours || '0'}h
                                                    </span>
                                                </div>
                                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${site?.status?.hoursOver > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${Math.min(((site.totalHours || 0) / (site.combinedBudgetHours || 1)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <span>Consolidated Budget</span>
                                                    <span className={site?.status?.amountOver > 0 ? 'text-rose-600' : 'text-slate-900'}>
                                                        ${(site.totalCost || 0).toLocaleString()} / ${site.combinedBudgetAmount?.toLocaleString() || '0'}
                                                    </span>
                                                </div>
                                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${site?.status?.amountOver > 0 ? 'bg-rose-600 shadow-lg' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(((site.totalCost || 0) / (site.combinedBudgetAmount || 1)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Alerts */}
            {contractors.some(c => getTrainingBalance(c.id).balance > 0) && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl mb-8 flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg mt-1">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-800">Pending Training Release</p>
                        <div className="mt-1 space-y-1">
                            {contractors
                                .filter(c => getTrainingBalance(c.id).balance > 0)
                                .map(c => (
                                    <div key={c.id} className="text-xs text-amber-700 flex justify-between max-w-sm">
                                        <span>• {c.name}</span>
                                        <span className="font-bold">${getTrainingBalance(c.id).balance.toFixed(2)}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Training Pay & Payroll Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Training Pay Oversight */}
                {contractors.some(c => getTrainingBalance(c.id).balance > 0) ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-medium text-gray-900">Training Oversight</h3>
                                <p className="text-sm text-gray-500 font-medium">Manage pending escrow balances</p>
                            </div>
                            <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-semibold uppercase tracking-widest">
                                Action Required
                            </div>
                        </div>
                        <div className="overflow-x-auto h-[400px] custom-scrollbar">
                            <table className="min-w-full">
                                <thead className="bg-gray-50/50 text-[10px] font-semibold uppercase tracking-widest text-gray-400 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Contractor</th>
                                        <th className="px-6 py-4 text-center">Tenure (Days)</th>
                                        <th className="px-6 py-4 text-right">Balance</th>
                                        <th className="px-6 py-4 text-center">Management</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {contractors
                                        .filter(c => getTrainingBalance(c.id).balance > 0)
                                        .map(c => {
                                            const training = getTrainingBalance(c.id);
                                            return (
                                                <tr key={c.id} className="group hover:bg-gray-50/50 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900">{c.name}</div>
                                                        <div className="text-[10px] font-medium text-gray-400">ID: {c.contractorId}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${training.days >= 5 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {training.days} / 5
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-semibold text-amber-600">
                                                        ${training.balance.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleReleaseClick(c)}
                                                            className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition bg-blue-600 text-white shadow-lg shadow-blue-100 hover:scale-105 active:scale-95"
                                                        >
                                                            Manual Release
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 gap-4">
                        <div>
                            <h3 className="text-xl font-medium text-gray-900">Contractor Earnings</h3>
                            <p className="text-sm text-gray-500 font-medium">Total earnings per person overview</p>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Contractors..."
                                value={payrollSearch}
                                onChange={(e) => setPayrollSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-inner"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div className="overflow-x-auto h-[400px] custom-scrollbar">
                        <table className="min-w-full">
                            <thead className="bg-gray-50/50 text-[10px] font-semibold uppercase tracking-widest text-gray-400 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left">Contractor Name</th>
                                    <th className="px-6 py-4 text-center">Total Hours</th>
                                    <th className="px-6 py-4 text-right">Total Earnings</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {consolidatedPayroll
                                    .filter(p => p.name.toLowerCase().includes(payrollSearch.toLowerCase()))
                                    .map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 text-base">{p.name}</div>
                                                <div className="text-xs font-medium text-gray-400 font-mono">{p.contractorId}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-gray-700">{p.totalHours.toFixed(1)}h</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-md font-bold text-sm">
                                                    ${p.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-wider">
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                {consolidatedPayroll.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center py-20 text-gray-400 font-medium">No earnings data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Excel-style Management Interface */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-medium text-gray-900">Quick-Entry Management Grid</h3>
                        <p className="text-sm text-gray-500 font-medium">Fast filtering & high-density data list</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Contractors..."
                                value={contractorSearch}
                                onChange={(e) => setContractorSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-100 bg-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-80 font-medium shadow-inner"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100/50 border-b border-gray-200 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                                <th className="px-4 py-2 border-r border-gray-200">ID</th>
                                <th className="px-4 py-2 border-r border-gray-200">Name</th>
                                <th className="px-4 py-2 border-r border-gray-200">Status</th>
                                <th className="px-4 py-2 border-r border-gray-200">BSB</th>
                                <th className="px-4 py-2 border-r border-gray-200">Account</th>
                                <th className="px-4 py-2 border-r border-gray-200">Primary Phone</th>
                                <th className="px-4 py-2 border-r border-gray-200">Referred By</th>
                                <th className="px-4 py-2">Email Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {contractors.filter(c => c.name.toLowerCase().includes(contractorSearch.toLowerCase())).map(c => (
                                <tr key={c.id} className="text-xs hover:bg-blue-50/30 group transition-colors">
                                    <td className="px-4 py-2 border-r border-gray-100 font-mono font-medium text-gray-500">{c.contractorId}</td>
                                    <td className="px-4 py-2 border-r border-gray-100 font-semibold text-gray-900 group-hover:text-blue-600">{c.name}</td>
                                    <td className="px-4 py-2 border-r border-gray-100">
                                        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[9px] ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-r border-gray-100 text-gray-600 font-medium">{c.bsb || '---'}</td>
                                    <td className="px-4 py-2 border-r border-gray-100 text-gray-600 font-medium font-mono">{c.accountNumber || '---'}</td>
                                    <td className="px-4 py-2 border-r border-gray-100 text-gray-600 font-medium">{c.phone || '---'}</td>
                                    <td className="px-4 py-2 border-r border-gray-100 text-gray-700 font-medium bg-blue-50/50">{c.referralName || '---'}</td>
                                    <td className="px-4 py-2 text-gray-400 font-medium truncate max-w-[150px] italic">{c.email || 'no-email@system'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
