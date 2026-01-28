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
        <div className="max-w-4xl mx-auto space-y-6">
            {showToast && <Toast message={toastMsg} onClose={() => setShowToast(false)} />}

            <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-violet-100 rounded-2xl text-violet-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Public Holiday Config</h2>
                        <p className="text-sm text-slate-400 font-medium">Define holidays to automatically apply PH rates in timesheets.</p>
                    </div>
                </div>

                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Holiday Date</label>
                        <input
                            type="date"
                            value={newHoliday.date}
                            onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                            required
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none font-medium text-slate-700 transition-shadow shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Holiday Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Christmas Day"
                            value={newHoliday.name}
                            onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                            required
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none font-medium text-slate-700 transition-shadow shadow-sm"
                        />
                    </div>
                    <div className="md:pt-5">
                        <button
                            type="submit"
                            className="w-full h-[46px] bg-violet-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-violet-700 transition shadow-lg shadow-violet-100 active:scale-95"
                        >
                            + Add Holiday
                        </button>
                    </div>
                </form>

                <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Configured Holidays ({holidays.length})</h3>
                    {holidays.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                            No public holidays configured yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {holidays.map(h => (
                                <div key={h.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-violet-200 transition group translate-y-0 hover:-translate-y-0.5">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center bg-violet-50 px-3 py-1.5 rounded-xl border border-violet-100 min-w-[70px]">
                                            <div className="text-[10px] font-black text-violet-600 uppercase leading-none">{format(parseISO(h.date), 'MMM')}</div>
                                            <div className="text-lg font-black text-violet-700 leading-tight">{format(parseISO(h.date), 'dd')}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{h.name}</div>
                                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{format(parseISO(h.date), 'EEEE, yyyy')}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(h.id)}
                                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
                <div className="text-amber-500 pt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-amber-800 uppercase tracking-tight">How this works</h4>
                    <p className="text-xs text-amber-700 leading-relaxed font-medium mt-1">
                        Any dates listed here will automatically be treated as Public Holidays across the entire system.
                        In the timesheet, work logged on these dates will automatically use the **Public Holiday rate** instead of the normal weekday/weekend rates.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PublicHolidayManager;
