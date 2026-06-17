import React, { useState } from 'react';

const Layout = ({
    children,
    activeTab,
    setActiveTab,
    onLogout,
    isSyncing,
    syncData,
    onForceSync,
    userProfile = { name: 'Admin User', role: 'Staff Admin' },
    isAdmin = false
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Navigation Items Configuration
    const navItems = [
        {
            id: 'dashboard', label: 'Dashboard', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            )
        },
        {
            id: 'lead-manager', label: 'Lead Manager', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            )
        },
        {
            id: 'contractors', label: 'Contractors', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            )
        },
        {
            id: 'sites', label: 'Sites', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            )
        },
        {
            id: 'task-matrix', label: 'Task Matrix', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            )
        },
        {
            id: 'allocation', label: 'Allocation', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            )
        },

        {
            id: 'timesheets', label: 'Timesheets', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            )
        },
        {
            id: 'training', label: 'Training Pay', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            )
        },
        {
            id: 'payments', label: 'Payment Summary', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            )
        },
        {
            id: 'profit-loss', label: 'Profit & Loss', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )
        },
        {
            id: 'holidays', label: 'Public Holidays', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            )
        },
        {
            id: 'settings', label: 'Global Rates', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            )
        },
    ];

    const adminItems = [
        {
            id: 'users', label: 'User Management', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            )
        },
    ];

    // Filter Navigation Items based on Role
    const getFilteredNavItems = () => {
        const role = userProfile.role?.toLowerCase() || 'user';
        if (role === 'admin') return navItems;

        if (role === 'supervisor' || role === 'manager') {
            return navItems.filter(item => ['task-matrix', 'sites', 'lead-manager'].includes(item.id));
        }

        if (role === 'payslip_management') {
            return navItems.filter(item => !['task-matrix', 'profit-loss', 'settings'].includes(item.id));
        }

        return navItems;
    };

    const filteredNavItems = getFilteredNavItems();

    const filteredAdminItems = adminItems.filter(item => {
        const role = userProfile.role?.toLowerCase() || 'user';
        return role === 'admin';
    });

    const activeNavItem = [...filteredNavItems, ...filteredAdminItems].find(item => item.id === activeTab) || filteredNavItems[0] || navItems[0];

    return (
        <div className="flex h-screen bg-notion-warm-white font-sans text-notion-black overflow-hidden selection:bg-notion-blue/20">

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-notion-black/20 z-[100] lg:hidden transition-opacity backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Sidebar Navigation */}
            <aside
                className={`fixed inset-y-0 left-0 z-[110] w-64 bg-white whisper-border transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0 lg:static lg:inset-0 lg:z-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Brand Logo area */}
                    <div className="flex items-center mx-6 h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-micro bg-notion-blue flex items-center justify-center text-white font-bold text-sm">
                                S
                            </div>
                            <h1 className="text-body-semibold tracking-tight text-notion-black">
                                SitalPayslip
                            </h1>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 custom-scrollbar">
                        <div className="text-[11px] font-bold text-notion-warm-gray-300 px-3 mb-2 mt-2 uppercase tracking-widest">
                            Overview
                        </div>
                        {filteredNavItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center px-3 py-1.5 text-nav-button rounded-micro transition-all duration-200 group relative
                   ${activeTab === item.id
                                        ? 'bg-notion-blue/5 text-notion-blue'
                                        : 'text-notion-warm-gray-500 hover:bg-notion-warm-white hover:text-notion-black'
                                    }`}
                            >
                                <span className={`mr-2.5 transition-colors ${activeTab === item.id ? 'text-notion-blue' : 'text-notion-warm-gray-300 group-hover:text-notion-warm-gray-500'}`}>
                                    {item.icon}
                                </span>
                                {item.label}
                                {activeTab === item.id && (
                                    <div className="absolute left-0 w-0.5 h-4 bg-notion-blue rounded-r-full"></div>
                                )}
                            </button>
                        ))}

                        {isAdmin && (
                            <>
                                <div className="text-[11px] font-bold text-notion-warm-gray-300 px-3 mb-2 mt-6 uppercase tracking-widest">
                                    Management
                                </div>
                                {filteredAdminItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center px-3 py-1.5 text-nav-button rounded-micro transition-all duration-200 group relative
                                            ${activeTab === item.id
                                                ? 'bg-notion-blue/5 text-notion-blue'
                                                : 'text-notion-warm-gray-500 hover:bg-notion-warm-white hover:text-notion-black'
                                            }`}
                                    >
                                        <span className={`mr-2.5 transition-colors ${activeTab === item.id ? 'text-notion-blue' : 'text-notion-warm-gray-300 group-hover:text-notion-warm-gray-500'}`}>
                                            {item.icon}
                                        </span>
                                        {item.label}
                                        {activeTab === item.id && (
                                            <div className="absolute left-0 w-0.5 h-4 bg-notion-blue rounded-r-full"></div>
                                        )}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>

                    {/* User Profile / Bottom Actions */}
                    <div className="p-4 border-t border-zinc-100 bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-notion-warm-white flex items-center justify-center text-notion-warm-gray-500 font-bold text-xs">
                                {userProfile.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-notion-black truncate">{userProfile.name}</p>
                                <p className="text-[10px] text-notion-warm-gray-500 truncate">{userProfile.role}</p>
                            </div>
                            <button
                                onClick={onLogout}
                                className="p-1.5 text-notion-warm-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-micro transition-all"
                                title="Logout"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                {/* Top Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-zinc-100 h-14 flex items-center justify-between px-6 sticky top-0 z-10 transition-all">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-1.5 text-notion-warm-gray-500 hover:bg-notion-warm-white rounded-micro"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>

                        {/* Breadcrumb / Title */}
                        <div>
                            <h2 className="text-body-semibold text-notion-black tracking-tight">
                                {activeNavItem.label}
                            </h2>
                        </div>
                    </div>

                    {/* Right Header Controls */}
                    <div className="flex items-center gap-3">
                        {isSyncing ? (
                            <div className="flex items-center gap-2 px-2.5 py-1 bg-notion-badge-blue-bg text-notion-badge-blue-text rounded-pill text-[11px] font-semibold whisper-border animate-pulse">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Syncing...</span>
                            </div>
                        ) : (
                            <div 
                                onClick={onForceSync}
                                title="Click to force sync from cloud"
                                className="flex items-center gap-2 px-2.5 py-1 text-emerald-600 bg-emerald-50 rounded-pill text-[11px] font-semibold border border-emerald-100 group cursor-pointer hover:bg-emerald-100 active:scale-95 transition-all select-none"
                            >
                                <span className="relative flex h-1.5 w-1.5 mr-0.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span className="hidden sm:inline">Live Mode</span>
                            </div>
                        )}
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto focus:outline-none p-6 scroll-smooth">
                    <div className="w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
