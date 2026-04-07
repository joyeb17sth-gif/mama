import React, { useState, useEffect } from 'react';
import { getAvailableArchiveYears, getArchiveStatsForYear, downloadArchiveJSON, purgeArchiveYear } from '../utils/archiveUtils';

const Archiver = () => {
    const [years, setYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [stats, setStats] = useState(null);
    const [isExported, setIsExported] = useState(false);
    const [isPurging, setIsPurging] = useState(false);

    useEffect(() => {
        const availableYears = getAvailableArchiveYears();
        setYears(availableYears);
        if (availableYears.length > 0) {
            handleYearChange(availableYears[0]);
        }
    }, []);

    const handleYearChange = (year) => {
        setSelectedYear(year);
        setStats(getArchiveStatsForYear(year));
        setIsExported(false);
    };

    const handleExport = () => {
        if (!selectedYear) return;
        const success = downloadArchiveJSON(selectedYear);
        if (success) {
            setIsExported(true);
        }
    };

    const handlePurge = async () => {
        if (!selectedYear) return;
        
        const confirmMessage = `WARNING: Are you absolutely sure you want to permanently delete all ${stats.recordCount} records from the year ${selectedYear}? \n\nYou can NOT undo this action!`;
        if (window.confirm(confirmMessage)) {
            setIsPurging(true);
            
            await purgeArchiveYear(selectedYear);
            
            // Refresh state
            const availableYears = getAvailableArchiveYears();
            setYears(availableYears);
            if (availableYears.length > 0) {
                handleYearChange(availableYears[0]);
            } else {
                setSelectedYear('');
                setStats(null);
            }
            setIsExported(false);
            setIsPurging(false);
            alert(`Archived data for ${selectedYear} has been successfully purged.`);
        }
    };

    if (years.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </div>
                <h4 className="text-p2 font-bold mb-1 text-zinc-900">No Data to Archive</h4>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto">There are currently no timesheets available in the system to archive or purge.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </div>
                <div>
                    <h3 className="text-p2 text-zinc-900">Data Archiver</h3>
                    <p className="text-xs text-zinc-500">Free up system storage securely</p>
                </div>
            </div>

            <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Column: Selection */}
                    <div className="w-full md:w-1/3">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Select Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-semibold text-zinc-900"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y} Data</option>
                            ))}
                        </select>
                        
                        {stats && (
                            <div className="mt-4 p-4 bg-zinc-50/80 rounded-xl border border-zinc-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-zinc-500 font-medium">Record Count</span>
                                    <span className="text-sm font-bold text-zinc-900">{stats.recordCount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-zinc-500 font-medium">Approx. Size</span>
                                    <span className="text-sm font-bold text-zinc-900">{stats.sizeKB} KB</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Actions */}
                    <div className="w-full md:w-2/3 flex flex-col justify-end gap-3">
                        <div className="flex items-start gap-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div>
                                <p className="text-sm font-semibold text-amber-900 mb-1">Archiving Protocol</p>
                                <p className="text-xs text-amber-700/80 leading-relaxed">
                                    You must first download the JSON backup of the selected year before the system will allow you to purge the active data. Keep this backup safe.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-2">
                            <button
                                onClick={handleExport}
                                className="flex-1 flex justify-center items-center gap-2 px-6 py-3 bg-white border-2 border-indigo-100 text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition shadow-sm"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Export Backup
                            </button>
                            
                            <button
                                onClick={handlePurge}
                                disabled={!isExported || isPurging}
                                className={`flex-1 flex justify-center items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-sm ${isExported && !isPurging ? 'bg-rose-600 text-white hover:bg-rose-700 hover:shadow-md' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'}`}
                            >
                                {isPurging ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                        Purging...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Purge Data
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Archiver;
