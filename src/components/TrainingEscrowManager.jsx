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
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Training Pay Escrow</h2>

            {showToast && (
                <Toast
                    message={toastMessage}
                    type="success"
                    onClose={() => setShowToast(false)}
                />
            )}

            {selectedContractor && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Release Training Pay</h3>
                        <p className="mb-2">Contractor: <span className="font-medium">{selectedContractor.name}</span></p>
                        <p className="mb-4">Available Balance: <span className="font-bold text-green-600">${selectedContractor.currentBalance.toFixed(2)}</span></p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount to Release
                            </label>
                            <input
                                type="number"
                                value={releaseAmount}
                                onChange={(e) => setReleaseAmount(e.target.value)}
                                max={selectedContractor.currentBalance}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setSelectedContractor(null)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRelease}
                                className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 transition"
                            >
                                Confirm Release
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Contractor</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">Training Days</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">Total Training Hours</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">Due Release Date</th>
                            <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">Total Accumulated</th>
                            <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">Total Released</th>
                            <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">Current Balance</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {balances.map(contractor => (
                            <tr key={contractor.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-3">
                                    <div className="font-medium">{contractor.name}</div>
                                    <div className="text-xs text-gray-500">{contractor.contractorId}</div>
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-center">
                                    {contractor.totalTrainingDays} / 5
                                    {contractor.totalTrainingDays > 5 && (
                                        <span className="ml-1 text-red-500 text-xs">(Over limit)</span>
                                    )}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-700">
                                    {contractor.totalTrainingHours.toFixed(2)}h
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-center">
                                    {contractor.totalTrainingHours <= 0 ? (
                                        <span className="text-xs text-slate-400 italic">No Training Logged</span>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            <input
                                                type="date"
                                                value={contractor.dueDate || ''}
                                                onChange={(e) => handleUpdateDueDate(contractor.id, e.target.value)}
                                                className="text-xs border-none bg-transparent focus:ring-0 cursor-pointer hover:bg-slate-50 rounded px-1 font-bold text-slate-700"
                                            />
                                            {contractor.currentBalance <= 0 && contractor.totalAccumulated > 0 ? (
                                                <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-600">
                                                    No Due Left
                                                </span>
                                            ) : (
                                                contractor.dueDate && (
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${isAfter(new Date(), parseISO(contractor.dueDate))
                                                            ? 'text-red-500 animate-pulse'
                                                            : 'text-red-600'
                                                        }`}>
                                                        {isAfter(new Date(), parseISO(contractor.dueDate)) ? 'OVERDUE' : 'DUE SOON'}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-right text-gray-600">
                                    ${contractor.totalAccumulated.toFixed(2)}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-right text-gray-600">
                                    ${contractor.totalReleased.toFixed(2)}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-right font-bold text-amber-600">
                                    ${contractor.currentBalance.toFixed(2)}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-center">
                                    <button
                                        onClick={() => handleRelease(contractor.id)}
                                        disabled={contractor.currentBalance <= 0}
                                        className={`px-3 py-1 rounded text-sm font-medium transition ${contractor.currentBalance > 0
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        Release Pay
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {balances.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center py-4 text-gray-500">No contractors found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-12">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Training Pay Releases</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Contractor</th>
                                <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {releases.length > 0 ? (
                                [...releases].reverse().map(release => (
                                    <tr key={release.id} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">
                                            {new Date(release.date).toLocaleDateString()}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                                            {release.contractorName || 'Unknown'}
                                            <div className="text-xs text-gray-500 font-normal">ID: {release.contractorId}</div>
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-right text-sm font-bold text-green-600">
                                            ${release.amount.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleCancelRelease(release.id)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium transition"
                                            >
                                                Cancel Release
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-4 text-gray-500 italic">No releases recorded yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TrainingEscrowManager;
