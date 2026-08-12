import { useState, useEffect } from 'react';
import { getSites, getPeriodicalTasks } from '../utils/storage';
import Archiver from './Archiver';

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
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 px-1">
                    <div>
                        <h3 className="text-xl font-bold text-dashboard-primary tracking-tight">Sites Overview</h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">Overview of all active sites and their budgets</p>
                    </div>
                    <div className="relative mt-4 md:mt-0">
                        <input
                            type="text"
                            placeholder="Filter sites..."
                            value={siteSearch}
                            onChange={(e) => setSiteSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-dashboard-secondary/20 focus:border-dashboard-secondary outline-none w-64 transition-all text-dashboard-foreground placeholder-slate-400 shadow-sm"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(sites || []).filter(s => !s.isSubSite && s.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).slice(0, 6).map(site => {
                        const budgetAmount = parseFloat(site.budgetedAmount) || 0;
                        return (
                            <div key={site.id} className="bg-white rounded-2xl border border-blue-100 shadow-[0_4px_20px_rgb(30,64,175,0.04)] hover:shadow-[0_8px_30px_rgb(30,64,175,0.12)] p-6 flex flex-col group hover:-translate-y-1 transition-all duration-300">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h4 className="text-[17px] font-bold text-dashboard-primary group-hover:text-dashboard-secondary transition-colors underline decoration-transparent group-hover:decoration-dashboard-secondary/30 underline-offset-4">{site.siteName}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">{site.address || 'No Address'}</span>
                                    </div>
                                </div>
                                <div className="bg-dashboard-bg p-4 rounded-xl mb-4 border border-blue-50 group-hover:border-blue-100/50 transition-colors">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 font-medium">Monthly Budget</span>
                                        <span className="text-[15px] font-black text-dashboard-primary tabular-nums">${budgetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                <div className="bg-gradient-to-r from-blue-900 to-dashboard-primary border border-dashboard-primary/50 p-6 rounded-2xl space-y-4 shadow-lg mt-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <svg className="w-6 h-6 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-lg tracking-wide shadow-[0_0_10px_rgba(255,255,255,0.2)]">Upcoming Periodical Tasks</h4>
                            <p className="text-sm text-blue-200 font-medium">These tasks are scheduled to be performed within the next 2 days.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {getUpcomingTasks().map((upcoming, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{upcoming.siteName}</span>
                                <span className="font-bold text-dashboard-primary text-[15px] mt-0.5">{upcoming.task.taskName} ({upcoming.task.taskCode})</span>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 font-medium">Timing: <span className="text-dashboard-foreground font-semibold">{upcoming.timing}</span></span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${upcoming.daysLeft === 0 ? 'bg-rose-100 text-rose-700 shadow-[0_0_10px_rgba(225,29,72,0.2)]' : 'bg-dashboard-bg text-dashboard-primary'}`}>
                                        {upcoming.daysLeft === 0 ? 'Due Today' : `${upcoming.daysLeft} days left`}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Data Archiving Section */}
            <div>
                <Archiver />
            </div>
        </div>
    );
};

export default Dashboard;
