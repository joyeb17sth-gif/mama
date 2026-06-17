import React, { useState, useEffect } from 'react';
import { format, addDays, parseISO, isAfter } from 'date-fns';
import { getTimesheets, getContractors, getTrainingReleases, saveTrainingReleases, logAction } from '../utils/storage';
import { encryptData, decryptData } from '../utils/encryptionUtils';
import localforage from 'localforage';
import Toast from './Toast';

const TrainingEscrowManager = () => {
    const [contractors, setContractors] = useState([]);
    const [balances, setBalances] = useState([]);
    const [releases, setReleases] = useState([]);
    const [manualDueDates, setManualDueDates] = useState({});
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [releaseAmount, setReleaseAmount] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Load encrypted due dates from localforage
        localforage.getItem('trainingManualDueDates').then(stored => {
            if (stored) {
                const decrypted = decryptData(stored);
                if (decrypted) setManualDueDates(decrypted);
            }
        });
        loadData();
    }, []);

    useEffect(() => {
        localforage.setItem('trainingManualDueDates', encryptData(manualDueDates));
    }, [manualDueDates]);

    const handleUpdateDueDate = (contractorId, newDate) => {
        setManualDueDates(prev => ({
            ...prev,
            [contractorId]: newDate
        }));
        setToastMessage('Target date synchronized.');
        setShowToast(true);
        setTimeout(loadData, 0);
    };

    const loadData = () => {
        const allContractors = getContractors();
        const allTimesheets = getTimesheets();
        const allReleases = getTrainingReleases();
        setReleases(allReleases);

        const contractorBalances = allContractors.map(contractor => {
            const contractorEntries = allTimesheets.flatMap(ts => ts.entries)
                .filter(entry => entry.contractorId === contractor.id);

            const totalAccumulated = contractorEntries.reduce((sum, entry) => {
                return sum + (entry.trainingPay || 0);
            }, 0);

            const trainingDates = [];
            contractorEntries.forEach(entry => {
                entry.dailyHours?.forEach(d => {
                    if (d.isTraining && d.hours > 0) {
                        trainingDates.push(d.date);
                    }
                });
            });

            const sortedDates = [...new Set(trainingDates)].sort();
            const totalTrainingDays = sortedDates.length;

            let completionDate = null;
            let dueDate = null;
            let isComplete = totalTrainingDays >= 5;

            if (totalTrainingDays > 0) {
                const referenceDate = isComplete ? sortedDates[4] : sortedDates[0];
                completionDate = referenceDate;
                dueDate = format(addDays(parseISO(referenceDate), 28), 'yyyy-MM-dd');
            }

            const manualDate = manualDueDates[contractor.id];
            if (manualDate) {
                dueDate = manualDate;
            }

            const totalTrainingHours = contractorEntries.reduce((sum, entry) => {
                const hours = entry.dailyHours?.filter(d => d.isTraining).reduce((hSum, d) => hSum + (d.hours || 0), 0) || 0;
                return sum + hours;
            }, 0);

            const contractorReleases = allReleases.filter(r => r.contractorId === contractor.id);
            const totalReleased = contractorReleases.reduce((sum, r) => sum + r.amount, 0);
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

        setBalances(contractorBalances);
    };

    const handleRelease = (contractorId) => {
        const contractor = balances.find(c => c.id === contractorId);
        if (!contractor) return;

        setSelectedContractor(contractor);
        setReleaseAmount(contractor.currentBalance.toFixed(2));
    };

    const handleCancelRelease = (releaseId) => {
        if (!window.confirm('Are you sure you want to cancel this pay release? The amount will be returned to the escrow balance.')) {
            return;
        }

        const allReleases = getTrainingReleases();
        const filteredReleases = allReleases.filter(r => r.id !== releaseId);
        saveTrainingReleases(filteredReleases);

        logAction('CANCEL_TRAINING_RELEASE', { releaseId });

        setToastMessage('Release retracted.');
        setShowToast(true);
        loadData();
    };

    const confirmRelease = () => {
        if (isSaving || !selectedContractor || !releaseAmount) return;

        const amount = parseFloat(releaseAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Invalid amount identification.');
            return;
        }

        if (amount > selectedContractor.currentBalance) {
            alert('Limit exceeded.');
            return;
        }

        setIsSaving(true);

        const newRelease = {
            id: crypto.randomUUID(),
            contractorId: selectedContractor.id,
            contractorName: selectedContractor.name,
            amount: amount,
            hours: selectedContractor.totalTrainingHours,
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

        setToastMessage(`Dispatched $${amount.toFixed(2)} for ${selectedContractor.name}`);
        setShowToast(true);
        setSelectedContractor(null);
        setReleaseAmount('');
        setIsSaving(false);
        loadData();
    };

    return (
        <div className="space-y-10 animate-fade-in-up">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-2">
                <div className="space-y-1">
                    <h2 className="text-display-secondary text-notion-black tracking-notion-display">Training Escrow Ledger</h2>
                    <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest">Orchestrate and verify personnel training fund distributions.</p>
                </div>
            </div>

            {showToast && (
                <Toast
                    message={toastMessage}
                    type="success"
                    onClose={() => setShowToast(false)}
                />
            )}

            {/* Main Escrow Card */}
            <div className="notion-card overflow-hidden shadow-notion-deep">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y whisper-border">
                        <thead className="bg-notion-warm-white">
                            <tr>
                                <th className="px-6 py-4 text-left text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Resource</th>
                                <th className="px-6 py-4 text-center text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Synthesis Progress</th>
                                <th className="px-6 py-4 text-center text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Units</th>
                                <th className="px-6 py-4 text-center text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Maturity Date</th>
                                <th className="px-6 py-4 text-right text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Hold Balance</th>
                                <th className="px-6 py-4 text-right text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Protocol</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y whisper-border">
                            {balances.map(contractor => (
                                <tr key={contractor.id} className="group transition-all hover:bg-zinc-50/30">
                                    <td className="px-6 py-6 whitespace-nowrap">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-micro bg-notion-black text-notion-blue flex items-center justify-center font-bold text-xs shadow-notion-card">
                                                {contractor.name[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-body-semibold text-notion-black tracking-tight">{contractor.name}</div>
                                                <div className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mt-0.5">
                                                    ID: {contractor.id.slice(-6)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap text-center">
                                        <div className="inline-flex flex-col items-center gap-1">
                                            <span className={`text-badge font-bold uppercase tracking-widest px-2.5 py-1 rounded-micro whisper-border shadow-sm bg-white ${contractor.totalTrainingDays >= 5 ? 'text-emerald-600' : 'text-notion-blue'}`}>
                                                {contractor.totalTrainingDays} / 5 Units
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap text-center">
                                        <div className="text-body-semibold text-notion-black tabular-nums">
                                            {contractor.totalTrainingHours.toFixed(1)} <span className="text-[10px] text-notion-warm-gray-100 font-bold uppercase tracking-widest ml-0.5">h</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap text-center">
                                        {contractor.totalTrainingHours <= 0 ? (
                                            <span className="text-badge font-bold text-notion-warm-gray-100 uppercase tracking-widest italic opacity-50">Zero Load</span>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <input
                                                    type="date"
                                                    value={contractor.dueDate || ''}
                                                    onChange={(e) => handleUpdateDueDate(contractor.id, e.target.value)}
                                                    className="text-badge bg-notion-warm-white bg-notion-warm-white whisper-border rounded-micro px-3 py-1.5 font-bold text-notion-black transition-all outline-none focus:shadow-notion-card tracking-widest uppercase"
                                                />
                                                {contractor.currentBalance <= 0 && contractor.totalAccumulated > 0 ? (
                                                    <span className="px-2.5 py-1 rounded-micro text-badge font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 whisper-border shadow-sm">Synthesis Done</span>
                                                ) : (
                                                    contractor.dueDate && (
                                                        <span className={`px-2.5 py-1 rounded-micro text-badge font-bold uppercase tracking-widest shadow-sm whisper-border ${isAfter(new Date(), parseISO(contractor.dueDate))
                                                            ? 'bg-notion-badge-rose-bg text-rose-600'
                                                            : 'bg-white text-notion-warm-gray-300'
                                                            }`}>
                                                            {isAfter(new Date(), parseISO(contractor.dueDate)) ? 'Overdue' : 'Escrowed'}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap text-right">
                                        <div className="text-lg font-bold text-notion-black tabular-nums tracking-tighter">
                                            ${contractor.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mt-0.5">Hold Value</div>
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => handleRelease(contractor.id)}
                                            disabled={contractor.currentBalance <= 0}
                                            className={`px-5 py-2 rounded-micro text-badge font-bold uppercase tracking-widest shadow-sm transition-all ${contractor.currentBalance > 0
                                                ? 'bg-notion-blue text-white hover:bg-notion-blue-active'
                                                : 'bg-notion-warm-white text-notion-warm-gray-100 whisper-border cursor-not-allowed opacity-30 shadow-none'
                                                }`}
                                        >
                                            Authorize Release
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* History Section */}
            <div className="pt-6 space-y-6">
                <h3 className="text-display-secondary text-notion-black tracking-notion-display">Recent Synthesis Logs</h3>
                <div className="notion-card overflow-hidden shadow-notion-deep">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y whisper-border">
                            <thead className="bg-notion-warm-white">
                                <tr>
                                    <th className="px-6 py-4 text-left text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Timestamp</th>
                                    <th className="px-6 py-4 text-left text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Resource Entity</th>
                                    <th className="px-6 py-4 text-right text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Settlement Value</th>
                                    <th className="px-6 py-4 text-right text-caption font-bold text-notion-warm-gray-300 uppercase tracking-widest">Operation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y whisper-border">
                                {releases.length > 0 ? (
                                    [...releases].reverse().map(release => (
                                        <tr key={release.id} className="transition-all hover:bg-zinc-50/30">
                                            <td className="px-6 py-6 whitespace-nowrap text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                                                {format(new Date(release.date), 'dd MMM yyyy')}
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <div className="text-body-semibold text-notion-black tracking-tight">{release.contractorName || 'Anonymous'}</div>
                                                <div className="text-badge font-bold text-notion-warm-gray-100 uppercase tracking-widest mt-0.5">ID: {release.contractorId.slice(-6).toUpperCase()}</div>
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap text-right font-bold text-emerald-600 tabular-nums text-lg tracking-tight">
                                                ${release.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-6 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleCancelRelease(release.id)}
                                                    className="px-4 py-2 rounded-micro text-badge font-bold text-rose-500 hover:bg-notion-badge-rose-bg whisper-border transition-all uppercase tracking-widest shadow-sm bg-white"
                                                >
                                                    Retract Release
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="text-4xl opacity-10 mb-4">📜</div>
                                                <div className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">Zero synthesis events recorded</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modern Release Modal */}
            {selectedContractor && (
                <div className="fixed inset-0 bg-notion-black/40 backdrop-blur-sm flex items-center justify-center z-[5000] p-4 animate-fade-in">
                    <div className="bg-white rounded-comfortable w-full max-w-md overflow-hidden border whisper-border shadow-notion-deep animate-scale-in">
                        <div className="p-10 bg-notion-warm-white border-b whisper-border">
                            <h3 className="text-display-secondary text-notion-black tracking-notion-display mb-2">Authorize Release</h3>
                            <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest">Synthesizing escrow payout for {selectedContractor.name}.</p>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="bg-notion-badge-blue-bg/20 rounded-micro p-6 whisper-border shadow-sm">
                                <div className="text-badge font-bold text-notion-blue uppercase tracking-widest mb-3">Accessible Reserve</div>
                                <div className="text-4xl font-bold text-notion-black tracking-notion-display tabular-nums">
                                    ${selectedContractor.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-1 block">
                                    Release Allocation Value
                                </label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-notion-warm-gray-100 font-bold text-lg">$</span>
                                    <input
                                        type="number"
                                        value={releaseAmount}
                                        onChange={(e) => setReleaseAmount(e.target.value)}
                                        max={selectedContractor.currentBalance}
                                        className="w-full pl-12 pr-5 py-4 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black text-xl tabular-nums transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-notion-warm-white border-t whisper-border flex gap-4">
                            <button
                                onClick={() => setSelectedContractor(null)}
                                className="flex-1 py-4 bg-white whisper-border text-notion-black rounded-micro font-bold text-badge tracking-widest uppercase hover:bg-zinc-100 transition shadow-sm"
                            >
                                ABORT
                            </button>
                            <button
                                onClick={confirmRelease}
                                className="flex-1 py-4 bg-notion-black text-white rounded-micro font-bold text-badge tracking-widest uppercase hover:bg-black transition shadow-notion-deep"
                            >
                                CONFIRM DISPATCH
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainingEscrowManager;
