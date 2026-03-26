import React, { useState, useEffect } from 'react';
import { getPublicHolidays, savePublicHolidays, logAction } from '../utils/storage';
import { format, parseISO } from 'date-fns';
import Toast from './Toast';

const PublicHolidayManager = () => {
    const [holidays, setHolidays] = useState([]);
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        setHolidays(getPublicHolidays());
    }, []);

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newHoliday.date || !newHoliday.name) return;

        // Check if date already exists
        if (holidays.some(h => h.date === newHoliday.date)) {
            setToastMsg('This date is already marked as a holiday.');
            setShowToast(true);
            return;
        }

        const updated = [...holidays, { ...newHoliday, id: Date.now().toString() }].sort((a, b) => a.date.localeCompare(b.date));
        setHolidays(updated);
        savePublicHolidays(updated);
        logAction('ADD_PUBLIC_HOLIDAY', { date: newHoliday.date, name: newHoliday.name });

        setNewHoliday({ date: '', name: '' });
        setToastMsg(`Holiday "${newHoliday.name}" added successfully.`);
        setShowToast(true);
    };

    const handleRemove = (id) => {
        const holiday = holidays.find(h => h.id === id);
        const updated = holidays.filter(h => h.id !== id);
        setHolidays(updated);
        savePublicHolidays(updated);
        logAction('REMOVE_PUBLIC_HOLIDAY', { date: holiday?.date, name: holiday?.name });

        setToastMsg('Holiday removed.');
        setShowToast(true);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            {showToast && <Toast message={toastMsg} onClose={() => setShowToast(false)} />}

            <div className="bg-white rounded-[2.5rem] p-10 border border-zinc-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-40"></div>

                <div className="flex items-center gap-5 mb-10 relative z-10">
                    <div className="p-4 bg-zinc-900 rounded-2xl text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-h1 text-zinc-900 tracking-tight">Holiday Orchestration</h2>
                        <p className="text-p3 text-zinc-500 font-medium">Define global protocol for automated holiday rate deployment.</p>
                    </div>
                </div>

                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-zinc-50/50 p-8 rounded-[2rem] border border-zinc-100 mb-10 relative z-10">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-zinc-400 ml-1">Calendar Date</label>
                        <input
                            type="date"
                            value={newHoliday.date}
                            onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                            required
                            className="w-full px-5 py-4 bg-white border border-transparent rounded-2xl focus:border-zinc-900 outline-none font-bold text-zinc-900 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-zinc-400 ml-1">Event Identifier</label>
                        <input
                            type="text"
                            placeholder="e.g. Christmas Day"
                            value={newHoliday.name}
                            onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                            required
                            className="w-full px-5 py-4 bg-white border border-transparent rounded-2xl focus:border-zinc-900 outline-none font-bold text-zinc-900 transition-all"
                        />
                    </div>
                    <div className="md:pt-6">
                        <button
                            type="submit"
                            className="w-full h-[58px] bg-zinc-900 text-white rounded-2xl font-bold text-xs hover:bg-black transition-all hover:-translate-y-1 active:scale-95 active:translate-y-0"
                        >
                            Authorize Holiday
                        </button>
                    </div>
                </form>

                <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-p3 font-bold text-zinc-400 tracking-widest">Active Manifest ({holidays.length})</h3>
                    </div>

                    {holidays.length === 0 ? (
                        <div className="text-center py-20 bg-zinc-50/30 rounded-[2rem] border border-dashed border-zinc-200 text-zinc-300 font-bold text-sm">
                            Manifest Empty: No protocols defined.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {holidays.map(h => (
                                <div key={h.id} className="group flex items-center justify-between p-5 bg-white border border-zinc-100 rounded-2xl hover:border-zinc-900 transition-all translate-y-0 hover:-translate-y-1">
                                    <div className="flex items-center gap-5">
                                        <div className="text-center bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800 min-w-[80px]">
                                            <div className="text-[10px] font-bold text-zinc-400 leading-none mb-1">{format(parseISO(h.date), 'MMM').toUpperCase()}</div>
                                            <div className="text-xl font-bold text-white leading-tight">{format(parseISO(h.date), 'dd')}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-900 mb-0.5">{h.name}</div>
                                            <div className="text-[10px] font-bold text-zinc-400">{format(parseISO(h.date), 'EEEE, yyyy')}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(h.id)}
                                        className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                        title="Revoke Protocol"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-primary-600 bg-gradient-to-br from-primary-600 to-primary-700 rounded-[2rem] p-8 text-white relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mb-32 -mr-32 opacity-20"></div>
                <div className="flex gap-5 items-start relative z-10">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-p1 font-bold tracking-tight">Protocol Logic</h4>
                        <p className="text-p3 text-primary-50/80 leading-relaxed font-medium">
                            Configured dates trigger automatic <strong className="text-white">Holiday Rate Protocols</strong> system-wide.
                            Terminal deployments on these nodes will bypass standard coefficients in favor of global holiday parameters.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicHolidayManager;
