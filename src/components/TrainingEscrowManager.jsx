import React, { useState, useEffect } from 'react';
import { format, addDays, parseISO, isAfter } from 'date-fns';
import { getTimesheets, getContractors, getTrainingReleases, saveTrainingReleases, logAction } from '../utils/storage';
import Toast from './Toast';

const TrainingEscrowManager = () => {
    const [contractors, setContractors] = useState([]);
    const [balances, setBalances] = useState([]);
    const [releases, setReleases] = useState([]);
    const [manualDueDates, setManualDueDates] = useState(() => {
        const stored = localStorage.getItem('trainingManualDueDates');
        return stored ? JSON.parse(stored) : {};
    });
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [releaseAmount, setReleaseAmount] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        localStorage.setItem('trainingManualDueDates', JSON.stringify(manualDueDates));
    }, [manualDueDates]);

    const handleUpdateDueDate = (contractorId, newDate) => {
        setManualDueDates(prev => ({
            ...prev,
            [contractorId]: newDate
        }));
        setToastMessage('Due date updated successfully');
        setShowToast(true);
        // We need to re-load balances to show the change
        setTimeout(loadData, 0);
    };

    const loadData = () => {
        const allContractors = getContractors();
        const allTimesheets = getTimesheets();
        const allReleases = getTrainingReleases();
        setReleases(allReleases);

        const contractorBalances = allContractors.map(contractor => {
            // 1. Calculate Total Accumulated and find training dates
            const contractorEntries = allTimesheets.flatMap(ts => ts.entries)
                .filter(entry => entry.contractorId === contractor.id);

            const totalAccumulated = contractorEntries.reduce((sum, entry) => {
                return sum + (entry.trainingPay || 0);
            }, 0);

            // Collect all training dates
            const trainingDates = [];
            contractorEntries.forEach(entry => {
                entry.dailyHours?.forEach(d => {
                    if (d.isTraining && d.hours > 0) {
                        trainingDates.push(d.date);
                    }
                });
            });

            // Sort dates to find the reference point
            const sortedDates = [...new Set(trainingDates)].sort();
            const totalTrainingDays = sortedDates.length;

            let completionDate = null;
            let dueDate = null;
            let isComplete = totalTrainingDays >= 5;

            // Default to 4 weeks after the FIRST training day, or 5th day if completed
            if (totalTrainingDays > 0) {
                // If they completed 5 days, use the 5th day as reference, otherwise use the 1st day
                const referenceDate = isComplete ? sortedDates[4] : sortedDates[0];
                completionDate = referenceDate;
                dueDate = format(addDays(parseISO(referenceDate), 28), 'yyyy-MM-dd');
            }

            // Apply manual override if exists
            const manualDate = manualDueDates[contractor.id];
            if (manualDate) {
                dueDate = manualDate;
            }

            const totalTrainingHours = contractorEntries.reduce((sum, entry) => {
                const hours = entry.dailyHours?.filter(d => d.isTraining).reduce((hSum, d) => hSum + (d.hours || 0), 0) || 0;
                return sum + hours;
            }, 0);

            // 2. Calculate Total Released
            const contractorReleases = allReleases.filter(r => r.contractorId === contractor.id);
            const totalReleased = contractorReleases.reduce((sum, r) => sum + r.amount, 0);

            // 3. Current Balance
            const currentBalance = totalAccumulated - totalReleased;

            return {
                ...contractor,
                totalAccumulated,
                totalReleased,
                currentBalance,
                totalTrainingDays,
                totalTrainingHours,
                completionDate,
                dueDate,
                isComplete
            };
        });

        setContractors(allContractors);
        setBalances(contractorBalances);
    };

    const handleRelease = (contractorId) => {
        const contractor = balances.find(c => c.id === contractorId);
        if (!contractor) return;

        setSelectedContractor(contractor);
        setReleaseAmount(contractor.currentBalance.toFixed(2));
    };

    const handleCancelRelease = (releaseId) => {
        if (!window.confirm('Are you sure you want to cancel this pay release? The amount will be returned to the contractor\'s training balance.')) {
            return;
        }

        const allReleases = getTrainingReleases();
        const filteredReleases = allReleases.filter(r => r.id !== releaseId);
        saveTrainingReleases(filteredReleases);

        logAction('CANCEL_TRAINING_RELEASE', { releaseId });

        setToastMessage('Release cancelled successfully');
        setShowToast(true);
        loadData();
    };

    const confirmRelease = () => {
        if (!selectedContractor || !releaseAmount) return;

        const amount = parseFloat(releaseAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        if (amount > selectedContractor.currentBalance) {
            alert('Cannot release more than the current balance');
            return;
        }

        const newRelease = {
            id: Date.now().toString(),
            contractorId: selectedContractor.id,
            contractorName: selectedContractor.name, // Added for easier display in history
            amount: amount,
            hours: selectedContractor.totalTrainingHours, // Added for payslip display
            date: new Date().toISOString(),
            releasedBy: 'Admin',
            period: new Date().toISOString().slice(0, 7)
        };

        const allReleases = getTrainingReleases();
        const updatedReleases = [...allReleases, newRelease];
        saveTrainingReleases(updatedReleases);

        logAction('RELEASE_TRAINING_PAY', {
            contractorId: selectedContractor.id,
            contractorName: selectedContractor.name,
            amount: amount,
            period: newRelease.period
        });

        setToastMessage(`Released $${amount.toFixed(2)} for ${selectedContractor.name}`);
        setShowToast(true);
        setSelectedContractor(null);
        setReleaseAmount('');
        loadData();
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-h1 font-bold text-zinc-900 tracking-tight">Training Pay Escrow</h2>
                <p className="text-p3 text-zinc-500 font-medium">Manage and distribute contractor training fund reserves.</p>
            </div>

            {showToast && (
                <Toast
                    message={toastMessage}
                    type="success"
                    onClose={() => setShowToast(false)}
                />
            )}

            {/* Main Escrow Card */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-100">
                        <thead className="bg-zinc-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">Contractor</th>
                                <th className="px-6 py-4 text-center text-p3 font-bold text-zinc-400 uppercase tracking-widest">Progress</th>
                                <th className="px-6 py-4 text-center text-p3 font-bold text-zinc-400 uppercase tracking-widest">Hours</th>
                                <th className="px-6 py-4 text-center text-p3 font-bold text-zinc-400 uppercase tracking-widest">Due Date</th>
                                <th className="px-6 py-4 text-right text-p3 font-bold text-zinc-400 uppercase tracking-widest">Balance</th>
                                <th className="px-6 py-4 text-right text-p3 font-bold text-zinc-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {balances.map(contractor => (
                                <tr key={contractor.id} className="group hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                                                {contractor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-p3 font-bold text-zinc-900">{contractor.name}</div>
                                                <div className="text-xs text-zinc-500 font-medium uppercase tracking-tighter opacity-70">
                                                    ID: {contractor.id.slice(-6)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className={`text-p3 font-bold ${contractor.totalTrainingDays >= 5 ? 'text-emerald-600' : 'text-zinc-900'}`}>
                                                {contractor.totalTrainingDays} / 5
                                            </span>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Days Complete</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-center">
                                        <div className="text-p3 font-bold text-zinc-900 font-mono tracking-tighter">
                                            {contractor.totalTrainingHours.toFixed(1)}h
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-center">
                                        {contractor.totalTrainingHours <= 0 ? (
                                            <span className="text-[10px] font-bold text-zinc-300 uppercase italic">No Logs</span>
                                        ) : (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <input
                                                    type="date"
                                                    value={contractor.dueDate || ''}
                                                    onChange={(e) => handleUpdateDueDate(contractor.id, e.target.value)}
                                                    className="text-p3 border-none bg-transparent focus:ring-0 cursor-pointer hover:bg-white rounded px-2 font-bold text-zinc-900 transition-colors p-0"
                                                />
                                                {contractor.currentBalance <= 0 && contractor.totalAccumulated > 0 ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">Released</span>
                                                ) : (
                                                    contractor.dueDate && (
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isAfter(new Date(), parseISO(contractor.dueDate))
                                                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                                                            }`}>
                                                            {isAfter(new Date(), parseISO(contractor.dueDate)) ? 'OVERDUE' : 'PENDING'}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-right">
                                        <div className="text-p3 font-bold text-zinc-900 font-mono tracking-widest">
                                            ${contractor.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase">Available</div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => handleRelease(contractor.id)}
                                            disabled={contractor.currentBalance <= 0}
                                            className={`px-4 py-1.5 rounded-xl text-p3 font-bold transition-all ${contractor.currentBalance > 0
                                                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                                                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
                                                }`}
                                        >
                                            Release Pay
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* History Section */}
            <div className="pt-4">
                <h3 className="text-h2 font-bold text-zinc-900 tracking-tight mb-4">Recent Training Pay Releases</h3>
                <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-100">
                            <thead className="bg-zinc-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">Contractor</th>
                                    <th className="px-6 py-4 text-right text-p3 font-bold text-zinc-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-right text-p3 font-bold text-zinc-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {releases.length > 0 ? (
                                    [...releases].reverse().map(release => (
                                        <tr key={release.id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="px-6 py-5 whitespace-nowrap text-p2 font-bold text-zinc-500">
                                                {format(new Date(release.date), 'dd MMM yyyy')}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-p3 font-bold text-zinc-900">{release.contractorName || 'Unknown'}</div>
                                                <div className="text-xs text-zinc-500 font-medium">ID: {release.contractorId.slice(-6).toUpperCase()}</div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-emerald-600 font-mono tracking-widest">
                                                ${release.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleCancelRelease(release.id)}
                                                    className="px-3 py-1.5 rounded-lg text-p3 font-bold text-rose-500 hover:bg-rose-50 transition-colors"
                                                >
                                                    Cancel Release
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-p3 font-bold text-zinc-400 italic">No releases recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modern Release Modal */}
            {selectedContractor && (
                <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden border border-zinc-100 shadow-2xl">
                        <div className="p-8 border-b border-zinc-50 bg-gradient-to-br from-zinc-50 to-white">
                            <h3 className="text-h2 font-bold text-zinc-900 tracking-tight mb-1">Confirm Release</h3>
                            <p className="text-p3 text-zinc-500 font-medium">Authorizing escrow payment for {selectedContractor.name}.</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                                <div className="text-[10px] font-bold text-zinc-400 uppercase mb-2 pl-1">Available Balance</div>
                                <div className="text-3xl font-bold text-zinc-900 tracking-tighter">
                                    ${selectedContractor.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-p3 font-bold text-zinc-400 uppercase pl-1">
                                    Release Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-p1 font-bold text-zinc-400">$</span>
                                    <input
                                        type="number"
                                        value={releaseAmount}
                                        onChange={(e) => setReleaseAmount(e.target.value)}
                                        max={selectedContractor.currentBalance}
                                        className="w-full pl-10 pr-5 py-4 bg-zinc-50 border border-transparent rounded-[1.5rem] focus:bg-white focus:border-zinc-900 outline-none font-bold text-zinc-900 transition-all text-p1"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex gap-3">
                            <button
                                onClick={() => setSelectedContractor(null)}
                                className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-500 rounded-2xl font-bold text-p3 hover:bg-zinc-100 transition-all uppercase tracking-widest"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={confirmRelease}
                                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold text-p3 hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-[0.98] uppercase tracking-widest"
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainingEscrowManager;
