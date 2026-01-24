import React, { useState, useEffect } from 'react';
import { getTimesheets, getContractors, getTrainingReleases, saveTrainingReleases, logAction } from '../utils/storage';
import Toast from './Toast';

const TrainingEscrowManager = () => {
    const [contractors, setContractors] = useState([]);
    const [balances, setBalances] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [releaseAmount, setReleaseAmount] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const allContractors = getContractors();
        const allTimesheets = getTimesheets();
        const allReleases = getTrainingReleases();

        const contractorBalances = allContractors.map(contractor => {
            // 1. Calculate Total Accumulated
            const contractorTimesheets = allTimesheets.flatMap(ts => ts.entries)
                .filter(entry => entry.contractorId === contractor.id);

            const totalAccumulated = contractorTimesheets.reduce((sum, entry) => {
                return sum + (entry.trainingPay || 0);
            }, 0);

            const totalTrainingDays = contractorTimesheets.reduce((sum, entry) => {
                // Count days with training
                // entry.dailyHours is array of {date, hours, isTraining}
                const days = entry.dailyHours?.filter(d => d.isTraining && d.hours > 0).length || 0;
                return sum + days;
            }, 0);

            const totalTrainingHours = contractorTimesheets.reduce((sum, entry) => {
                // Count hours marked as training
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
                totalTrainingHours
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
            amount: amount,
            date: new Date().toISOString(),
            releasedBy: 'Admin', // Placeholder user
            period: new Date().toISOString().slice(0, 7) // Store strictly as YYYY-MM for simpler grouping if needed
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
        </div>
    );
};

export default TrainingEscrowManager;
