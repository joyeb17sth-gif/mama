import { useState, useEffect, useMemo } from 'react';
import { getSites, getPeriodicalTasks } from '../utils/storage';

const Dashboard = ({
  syncVersion,
  periodicalTasks: propPeriodicalTasks,
  userRole = 'user',
  leads = [],
  leadReports = [],
  counselors = [],
  navigateTo
}) => {
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

    const role = (userRole || 'user').toLowerCase();

    // ─── Computed Data ───────────────────────────────────────────────────

    const getUpcomingTasks = () => {
        const upcoming = [];
        const today = new Date();

        (periodicalTasks || []).forEach(task => {
            if (task.status !== 'completed' && task.scheduleOverrides && task.scheduleOverrides.length > 0) {
                const nextOverride = task.scheduleOverrides.find(o => new Date(o.date) >= today);
                if (nextOverride) {
                    const targetDate = new Date(nextOverride.date);
                    const diffTime = Math.abs(targetDate - today);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 7) {
                        const site = sites.find(s => s.id === task.siteId);
                        let timing = 'Scheduled';
                        if (task.taskCode === 'P01') timing = '8:00 AM – 12:00 PM';
                        else if (task.taskCode === 'P02') timing = '1:00 PM – 5:00 PM';
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
        return upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
    };

    const totalBudget = useMemo(() =>
        (sites || []).filter(s => !s.isSubSite).reduce((sum, s) => sum + (parseFloat(s.budgetedAmount) || 0), 0)
    , [sites]);

    const overdueTasks = useMemo(() =>
        getUpcomingTasks().filter(t => t.daysLeft === 0).length
    , [periodicalTasks, sites]);

    const upcomingTasksList = useMemo(() => getUpcomingTasks(), [periodicalTasks, sites]);

    const leadStats = useMemo(() => {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthReports = (leadReports || []).filter(r => r.month === thisMonth);

        let totalLeads = 0, converted = 0, pending = 0;
        monthReports.forEach(r => {
            totalLeads += (r.totalLeads || 0);
            converted += (r.convYes || 0);
            pending += (r.convDNA || 0);
        });

        const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
        return { totalLeads, converted, pending, conversionRate, monthReports };
    }, [leadReports]);

    // ─── Shared Components ───────────────────────────────────────────────

    const StatCard = ({ icon, label, value, sub, color = 'blue', onClick }) => {
        const colors = {
            blue: 'bg-blue-50 text-blue-600 border-blue-100',
            emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            amber: 'bg-amber-50 text-amber-600 border-amber-100',
            rose: 'bg-rose-50 text-rose-600 border-rose-100',
            violet: 'bg-violet-50 text-violet-600 border-violet-100',
            indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        };
        return (
            <button
                onClick={onClick}
                disabled={!onClick}
                className={`notion-card p-5 flex items-start gap-4 group transition-all duration-300 text-left w-full ${onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : 'cursor-default'}`}
            >
                <div className={`p-2.5 rounded-xl border ${colors[color]} flex-shrink-0`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">{label}</p>
                    <p className="text-2xl font-bold text-notion-black mt-0.5 tabular-nums">{value}</p>
                    {sub && <p className="text-xs text-notion-warm-gray-500 mt-0.5">{sub}</p>}
                </div>
            </button>
        );
    };

    const SectionHeader = ({ title, subtitle, action }) => (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-5 px-1 gap-2">
            <div>
                <h3 className="text-card-title text-notion-black tracking-notion-card">{title}</h3>
                {subtitle && <p className="text-sm text-notion-warm-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
    );

    const EmptyState = ({ icon, title, description }) => (
        <div className="notion-card p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-notion-warm-white flex items-center justify-center text-notion-warm-gray-300">
                {icon}
            </div>
            <h4 className="font-semibold text-notion-black mb-1">{title}</h4>
            <p className="text-sm text-notion-warm-gray-500 max-w-xs mx-auto">{description}</p>
        </div>
    );

    // ─── Role-Specific Dashboards ─────────────────────────────────────────

    // ── ADMIN DASHBOARD ──
    const renderAdminDashboard = () => (
        <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>}
                    label="Active Sites"
                    value={(sites || []).filter(s => !s.isSubSite).length}
                    sub={`$${totalBudget.toLocaleString()} total budget`}
                    color="blue"
                    onClick={() => navigateTo?.('sites')}
                />
                <StatCard
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>}
                    label="Tasks This Week"
                    value={upcomingTasksList.length}
                    sub={overdueTasks > 0 ? `${overdueTasks} due today` : 'All on track'}
                    color={overdueTasks > 0 ? 'rose' : 'emerald'}
                    onClick={() => navigateTo?.('task-matrix')}
                />
                <StatCard
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
                    label="Leads This Month"
                    value={leadStats.totalLeads}
                    sub={`${leadStats.conversionRate}% conversion rate`}
                    color="violet"
                    onClick={() => navigateTo?.('lead-manager')}
                />
                <StatCard
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                    label="Converted"
                    value={leadStats.converted}
                    sub={`${leadStats.pending} still pending`}
                    color="emerald"
                    onClick={() => navigateTo?.('lead-manager')}
                />
            </div>

            {/* Sites Overview */}
            <div>
                <SectionHeader
                    title="Sites Overview"
                    subtitle="Quick view of your active sites and budgets"
                    action={
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Filter sites..."
                                value={siteSearch}
                                onChange={(e) => setSiteSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white whisper-border rounded-micro text-sm focus:ring-1 focus:ring-notion-focus-blue outline-none w-64 transition-all text-notion-black placeholder-notion-warm-gray-300"
                            />
                            <svg className="w-4 h-4 text-notion-warm-gray-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    }
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(sites || []).filter(s => !s.isSubSite && s.siteName?.toLowerCase().includes(siteSearch.toLowerCase())).slice(0, 6).map(site => {
                        const budgetAmount = parseFloat(site.budgetedAmount) || 0;
                        return (
                            <div key={site.id} className="notion-card p-5 flex flex-col group hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" onClick={() => navigateTo?.('sites')}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="text-body-semibold text-notion-black group-hover:text-notion-blue transition-colors">{site.siteName}</h4>
                                        <span className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest mt-1">{site.address || 'No Address'}</span>
                                    </div>
                                </div>
                                <div className="bg-notion-warm-white bg-opacity-50 p-3 rounded-comfortable border whisper-border">
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
                    <div className="mt-4 text-center">
                        <button onClick={() => navigateTo?.('sites')} className="text-xs font-bold text-notion-blue hover:underline underline-offset-4 uppercase tracking-widest">
                            View all {(sites || []).filter(s => !s.isSubSite).length} sites →
                        </button>
                    </div>
                )}
            </div>

            {/* Upcoming Tasks */}
            {renderUpcomingTasks()}
        </>
    );

    // ── LEADS TEAM DASHBOARD ──
    const renderLeadsDashboard = () => {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

        // Per-counselor breakdown
        const counselorBreakdown = (counselors || []).map(c => {
            const reports = (leadReports || []).filter(r => r.counselorId === c.id && r.month === thisMonth);
            let total = 0, conv = 0;
            reports.forEach(r => { total += (r.totalLeads || 0); conv += (r.convYes || 0); });
            return { ...c, total, conv, rate: total > 0 ? Math.round((conv / total) * 100) : 0 };
        }).sort((a, b) => b.total - a.total);

        return (
            <>
                {/* Lead KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
                        label={`New Leads · ${monthName}`}
                        value={leadStats.totalLeads}
                        sub={`${(counselors || []).length} active counselors`}
                        color="violet"
                        onClick={() => navigateTo?.('lead-manager')}
                    />
                    <StatCard
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                        label="Converted"
                        value={leadStats.converted}
                        color="emerald"
                        onClick={() => navigateTo?.('lead-manager')}
                    />
                    <StatCard
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                        label="Pending Follow-up"
                        value={leadStats.pending}
                        sub="Did not attend"
                        color="amber"
                        onClick={() => navigateTo?.('lead-manager')}
                    />
                </div>

                {/* Conversion Rate Ring */}
                <div className="notion-card p-6">
                    <SectionHeader title="Conversion Rate" subtitle={monthName} />
                    <div className="flex items-center justify-center gap-10 py-4">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={leadStats.conversionRate >= 50 ? '#10b981' : leadStats.conversionRate >= 25 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="3"
                                    strokeDasharray={`${leadStats.conversionRate}, 100`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-notion-black tabular-nums">{leadStats.conversionRate}%</span>
                                <span className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">Rate</span>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                <span className="text-notion-warm-gray-500">Converted:</span>
                                <span className="font-bold text-notion-black">{leadStats.converted}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                                <span className="text-notion-warm-gray-500">Pending:</span>
                                <span className="font-bold text-notion-black">{leadStats.pending}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0"></span>
                                <span className="text-notion-warm-gray-500">Total:</span>
                                <span className="font-bold text-notion-black">{leadStats.totalLeads}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Counselor Leaderboard */}
                {counselorBreakdown.length > 0 && (
                    <div className="notion-card p-6">
                        <SectionHeader title="Counselor Leaderboard" subtitle={monthName} />
                        <div className="space-y-2">
                            {counselorBreakdown.map((c, idx) => (
                                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-notion-warm-white transition-colors">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-notion-warm-white text-notion-warm-gray-400'}`}>
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-notion-black truncate">{c.name}</p>
                                        {c.branch && <p className="text-[10px] text-notion-warm-gray-400 uppercase tracking-wider">{c.branch}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-notion-black tabular-nums">{c.total} leads</p>
                                        <p className="text-[10px] text-notion-warm-gray-400">{c.rate}% conv.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {leadStats.totalLeads === 0 && counselorBreakdown.length === 0 && (
                    <EmptyState
                        icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
                        title="No lead data yet"
                        description="Head over to the Lead Manager to start logging your leads for this month."
                    />
                )}
            </>
        );
    };

    // ── SUPERVISOR / MANAGER DASHBOARD ──
    const renderOpsDashboard = () => (
        <>
            {/* Ops KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>}
                    label="My Sites"
                    value={(sites || []).filter(s => !s.isSubSite).length}
                    color="blue"
                    onClick={() => navigateTo?.('sites')}
                />
                <StatCard
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                    label="Due Today"
                    value={overdueTasks}
                    sub={overdueTasks > 0 ? 'Requires immediate attention' : 'Nothing urgent'}
                    color={overdueTasks > 0 ? 'rose' : 'emerald'}
                    onClick={() => navigateTo?.('task-matrix')}
                />
                <StatCard
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>}
                    label="This Week"
                    value={upcomingTasksList.length}
                    sub="Scheduled tasks"
                    color="indigo"
                    onClick={() => navigateTo?.('task-matrix')}
                />
            </div>

            {/* Task Timeline */}
            {renderUpcomingTasks()}

            {/* Site Health Grid */}
            <div>
                <SectionHeader title="Site Health" subtitle="Budget status of your assigned sites" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(sites || []).filter(s => !s.isSubSite).slice(0, 9).map(site => {
                        const budget = parseFloat(site.budgetedAmount) || 0;
                        const siteTasks = (periodicalTasks || []).filter(t => t.siteId === site.id);
                        const pendingCount = siteTasks.filter(t => t.status !== 'completed').length;
                        return (
                            <div key={site.id} className="notion-card p-4 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" onClick={() => navigateTo?.('sites')}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pendingCount > 3 ? 'bg-rose-500' : pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                    <h4 className="text-sm font-semibold text-notion-black truncate">{site.siteName}</h4>
                                </div>
                                <div className="flex justify-between text-xs text-notion-warm-gray-500">
                                    <span>${budget.toLocaleString()}/mo</span>
                                    <span className={pendingCount > 3 ? 'text-rose-600 font-semibold' : ''}>{pendingCount} pending</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );

    // ── DEFAULT USER DASHBOARD ──
    const renderDefaultDashboard = () => (
        <EmptyState
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>}
            title="Welcome to Seetal Management"
            description="Your account doesn't have a specific role assigned yet. Please contact your administrator to get access to the relevant modules."
        />
    );

    // ── SHARED: Upcoming Tasks Section ──
    const renderUpcomingTasks = () => {
        if (upcomingTasksList.length === 0) return null;
        return (
            <div>
                <SectionHeader title="Upcoming Tasks" subtitle="Scheduled within the next 7 days" />
                <div className="space-y-2">
                    {upcomingTasksList.slice(0, 8).map((upcoming, idx) => (
                        <div key={idx} className="notion-card p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" onClick={() => navigateTo?.('task-matrix')}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                upcoming.daysLeft === 0 ? 'bg-rose-100 text-rose-700' :
                                upcoming.daysLeft === 1 ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-50 text-blue-600'
                            }`}>
                                {upcoming.daysLeft === 0 ? '!' : `${upcoming.daysLeft}d`}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-notion-black truncate">{upcoming.task.taskName} <span className="text-notion-warm-gray-400 font-normal">({upcoming.task.taskCode})</span></p>
                                <p className="text-xs text-notion-warm-gray-500">{upcoming.siteName} · {upcoming.timing}</p>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0 ${
                                upcoming.daysLeft === 0 ? 'bg-rose-100 text-rose-700' :
                                upcoming.daysLeft === 1 ? 'bg-amber-100 text-amber-700' :
                                'bg-notion-badge-blue-bg text-notion-blue'
                            }`}>
                                {upcoming.daysLeft === 0 ? 'Due Today' : upcoming.daysLeft === 1 ? 'Tomorrow' : `${upcoming.daysLeft} days`}
                            </span>
                        </div>
                    ))}
                </div>
                {upcomingTasksList.length > 8 && (
                    <div className="mt-3 text-center">
                        <button onClick={() => navigateTo?.('task-matrix')} className="text-xs font-bold text-notion-blue hover:underline underline-offset-4 uppercase tracking-widest">
                            View all {upcomingTasksList.length} tasks →
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // ─── RENDER ──────────────────────────────────────────────────────────

    const getRoleGreeting = () => {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const roleLabels = {
            admin: 'Admin Overview',
            leads_team: 'Lead Pipeline',
            supervisor: 'Operations Hub',
            manager: 'Operations Hub',
        };
        return { greeting, label: roleLabels[role] || 'Dashboard' };
    };

    const { greeting, label } = getRoleGreeting();

    return (
        <div className="space-y-8 pb-12 animate-fade-in-up">
            {/* Greeting Header */}
            <div className="px-1">
                <p className="text-sm text-notion-warm-gray-400 font-medium">{greeting}</p>
                <h2 className="text-2xl font-bold text-notion-black tracking-tight mt-0.5">{label}</h2>
            </div>

            {role === 'admin' && renderAdminDashboard()}
            {role === 'leads_team' && renderLeadsDashboard()}
            {(role === 'supervisor' || role === 'manager') && renderOpsDashboard()}
            {!['admin', 'leads_team', 'supervisor', 'manager'].includes(role) && renderDefaultDashboard()}
        </div>
    );
};

export default Dashboard;
