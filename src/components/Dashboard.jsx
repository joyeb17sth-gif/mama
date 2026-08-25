import { useState, useEffect } from 'react';
import { getSites, getPeriodicalTasks } from '../utils/storage';
import LeadCumulativeData from './LeadCumulativeData';

const Dashboard = ({ syncVersion, periodicalTasks: propPeriodicalTasks }) => {
    const [sites, setSites] = useState([]);
    const [periodicalTasks, setPeriodicalTasks] = useState([]);
    const [siteSearch, setSiteSearch] = useState('');

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
        if (!propPeriodicalTasks) {
            setPeriodicalTasks(getPeriodicalTasks());
        }
    };

    const getUpcomingTasks = () => {
        const upcoming = [];
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);

        (periodicalTasks || []).forEach(task => {
            if (task.status !== 'completed' && task.scheduleOverrides && task.scheduleOverrides.length > 0) {
                const nextOverride = task.scheduleOverrides.find(o => new Date(o.date) >= today);
                if (nextOverride) {
                    const targetDate = new Date(nextOverride.date);
                    const diffTime = Math.abs(targetDate - today);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 2) {
                        const site = sites.find(s => s.id === task.siteId);
                        let timing = 'Unknown';
                        if (task.taskCode === 'P01') timing = '8:00 AM - 12:00 PM';
                        else if (task.taskCode === 'P02') timing = '1:00 PM - 5:00 PM';
                        else if (task.taskCode === 'P03') timing = 'Full Day';
                        
                        upcoming.push({
                            task,
                            siteName: site ? site.siteName : 'Unknown Site',
                            targetDate,
                            daysLeft: diffDays,
                            timing
                        });
                    }
                }
            }
        });
        return upcoming;
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-in-up">
            {/* Top Section: Budget Tracker (Simplified for Sites overview) */}
            <div>
                <div className="flex flex-col md:flex-row justify-between items-end mb-6 px-1">
                    <div>
                        <h3 className="text-card-title text-notion-black tracking-notion-card">Sites Overview</h3>
                        <p className="text-sm text-notion-warm-gray-500 mt-1">Overview of all active sites and their budgets</p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(sites || []).filter(s => !s.isSubSite && s.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).slice(0, 6).map(site => {
                        const budgetAmount = parseFloat(site.budgetedAmount) || 0;
                        return (
                            <div key={site.id} className="notion-card p-6 flex flex-col group hover:-translate-y-0.5 transition-all duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-body-semibold text-notion-black group-hover:text-notion-blue transition-colors underline decoration-transparent group-hover:decoration-notion-blue/20 underline-offset-4">{site.siteName}</h4>
                                        <span className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest mt-1">{site.address || 'No Address'}</span>
                                    </div>
                                </div>
                                <div className="bg-notion-warm-white bg-opacity-50 p-3 rounded-comfortable mb-4 border whisper-border">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-notion-warm-gray-500 font-medium">Monthly Budget</span>
                                        <span className="text-sm font-bold text-notion-black">${budgetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {(sites || []).filter(s => !s.isSubSite && s.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).length > 6 && (
                    <div className="mt-6 text-center">
                        <span className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                            Showing 6 of {(sites || []).filter(s => !s.isSubSite && s.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).length} active terminal nodes
                        </span>
                    </div>
                )}
            </div>

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

        </div>
    );
};

export default Dashboard;
