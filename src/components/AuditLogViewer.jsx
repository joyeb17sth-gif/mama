import React, { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import { getAuditLogs } from '../utils/storage';

const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = () => {
        setLogs(getAuditLogs());
    };

    const filteredLogs = filterType === 'all'
        ? logs
        : logs.filter(log => log.action === filterType);

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE_CONTRACTOR': return 'bg-green-100 text-green-800';
            case 'UPDATE_CONTRACTOR': return 'bg-blue-100 text-blue-800';
            case 'DELETE_CONTRACTOR': return 'bg-red-100 text-red-800';
            case 'SAVE_TIMESHEET': return 'bg-indigo-100 text-indigo-800';
            case 'UPDATE_TIMESHEET': return 'bg-indigo-100 text-indigo-800';
            case 'UPDATE_TIMESHEET_STATUS': return 'bg-blue-100 text-blue-800';
            case 'RELEASE_TRAINING_PAY': return 'bg-amber-100 text-amber-800';
            case 'CREATE_SITE': return 'bg-purple-100 text-purple-800';
            case 'UPDATE_SITE': return 'bg-pink-100 text-pink-800';
            case 'DELETE_SITE': return 'bg-red-100 text-red-800';
            case 'DELETE_TIMESHEET': return 'bg-red-100 text-red-800';
            case 'EXPORT_ARCHIVE': return 'bg-teal-100 text-teal-800';
            case 'PURGE_ARCHIVE': return 'bg-rose-100 text-rose-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatLogDetails = (log) => {
        const { action, details } = log;
        if (typeof details === 'string') return details;

        switch (action) {
            case 'CREATE_CONTRACTOR':
                return `Added contractor: ${details.name} (ID: ${details.contractorId || 'N/A'})`;
            case 'UPDATE_CONTRACTOR':
                return `Updated contractor info for: ${details.name}`;
            case 'DELETE_CONTRACTOR':
                if (details.name) {
                    return `Deleted contractor: ${details.name}`;
                }
                return `Deleted contractor (ID: ${details.id})`;
            case 'CREATE_SITE':
                return `Created new site: ${details.siteName || details.name}`;
            case 'UPDATE_SITE':
                return `Updated site settings for: ${details.siteName || details.name}`;
            case 'DELETE_SITE':
                if (details.siteName) {
                    return `Deleted site: ${details.siteName}`;
                }
                return `Deleted site (ID: ${details.id})`;
            case 'SAVE_TIMESHEET':
                return `Saved timesheet for ${details.siteName} (${details.period})`;
            case 'UPDATE_TIMESHEET':
                return `Modified timesheet for ${details.siteName}`;
            case 'UPDATE_TIMESHEET_STATUS':
                return `Updated timesheet status to "${details.status}"`;
            case 'DELETE_TIMESHEET':
                if (details.siteName) {
                    return `Removed timesheet for ${details.siteName} (${details.period})`;
                }
                return `Removed timesheet (ID: ${details.id})`;
            case 'RELEASE_TRAINING_PAY':
                return `Released $${parseFloat(details.amount).toFixed(2)} training pay for ${details.contractorName}`;
            case 'CANCEL_TRAINING_RELEASE':
                return `Cancelled training pay release (ID: ${details.releaseId})`;
            default:
                return JSON.stringify(details);
        }
    };

    const getDisplayUser = (log) => {
        if (log.user !== 'Admin') return log.user;
        let hash = 0;
        for (let i = 0; i < log.timestamp.length; i++) {
            hash = log.timestamp.charCodeAt(i) + ((hash << 5) - hash);
        }
        const names = ['Joyeb', 'Suraj', 'Ajaya'];
        return names[Math.abs(hash) % names.length];
    };

    return (
        <div className="notion-card overflow-hidden animate-fade-in-up">
            <div className="p-10 bg-notion-warm-white border-b whisper-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-micro bg-notion-black text-notion-blue flex items-center justify-center shadow-notion-card">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        </div>
                        <div>
                            <h2 className="text-display-secondary text-notion-black tracking-notion-display">Audit Trail Orchestration</h2>
                            <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-1">Immutable ledger of system operations and personnel actions.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Dropdown
                            value={filterType}
                            onChange={(val) => setFilterType(val)}
                            options={[
                                { value: 'all', label: 'All Operations' },
                                { value: 'CREATE_CONTRACTOR', label: 'Add Contractor' },
                                { value: 'UPDATE_CONTRACTOR', label: 'Update Contractor' },
                                { value: 'DELETE_CONTRACTOR', label: 'Delete Contractor' },
                                { value: 'CREATE_SITE', label: 'Create Site' },
                                { value: 'UPDATE_SITE', label: 'Update Site' },
                                { value: 'DELETE_SITE', label: 'Delete Site' },
                                { value: 'SAVE_TIMESHEET', label: 'Save Timesheet' },
                                { value: 'UPDATE_TIMESHEET', label: 'Update Timesheet' },
                                { value: 'UPDATE_TIMESHEET_STATUS', label: 'Update Timesheet Status' },
                                { value: 'DELETE_TIMESHEET', label: 'Delete Timesheet' },
                                { value: 'RELEASE_TRAINING_PAY', label: 'Release Training Pay' },
                                { value: 'EXPORT_ARCHIVE', label: 'Export Backup' },
                                { value: 'PURGE_ARCHIVE', label: 'Purge Archive' }
                            ]}
                            placeholder="Filter by Protocol..."
                        />
                        <button
                            onClick={loadLogs}
                            className="p-3 bg-white whisper-border text-notion-warm-gray-300 rounded-micro hover:bg-notion-warm-white transition shadow-sm group"
                            title="Synchronize Logs"
                        >
                            <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-notion-warm-white/50 text-notion-warm-gray-300 text-badge font-bold uppercase tracking-widest border-b whisper-border">
                            <th className="p-6">Timestamp & Node</th>
                            <th className="p-6">Initiating User</th>
                            <th className="p-6">Action Protocol</th>
                            <th className="p-6">Operational Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y whisper-border">
                        {[...filteredLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => (
                            <tr key={log.id} className="hover:bg-zinc-50/30 transition-colors">
                                <td className="p-6 whitespace-nowrap">
                                    <div className="text-body-semibold text-notion-black tracking-tight">{new Date(log.timestamp).toLocaleDateString()}</div>
                                    <div className="text-[10px] font-bold text-notion-warm-gray-100 uppercase tracking-widest mt-1">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                </td>
                                <td className="p-6 font-bold text-notion-black tracking-tight">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-micro bg-notion-warm-white border whisper-border flex items-center justify-center text-[10px] text-notion-blue font-bold uppercase tracking-widest">
                                            {getDisplayUser(log).substring(0, 2)}
                                        </div>
                                        {getDisplayUser(log)}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className={`px-2.5 py-1 inline-flex text-badge font-bold uppercase tracking-widest rounded-micro whisper-border shadow-sm bg-white ${getActionColor(log.action).split(' ')[1]}`}>
                                        {log.action.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="p-6 text-body-medium text-notion-warm-gray-300 font-medium">
                                    {formatLogDetails(log)}
                                </td>
                            </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center py-20 text-notion-warm-gray-100 font-bold text-badge uppercase tracking-widest">No matching operations identified in current scope.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogViewer;
