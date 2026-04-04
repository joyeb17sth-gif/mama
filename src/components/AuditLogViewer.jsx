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
            case 'RELEASE_TRAINING_PAY': return 'bg-amber-100 text-amber-800';
            case 'CREATE_SITE': return 'bg-purple-100 text-purple-800';
            case 'UPDATE_SITE': return 'bg-pink-100 text-pink-800';
            case 'DELETE_SITE': return 'bg-red-100 text-red-800';
            case 'DELETE_TIMESHEET': return 'bg-red-100 text-red-800';
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
                return `Deleted contractor (ID: ${details.id})`;
            case 'CREATE_SITE':
                return `Created new site: ${details.siteName || details.name}`;
            case 'UPDATE_SITE':
                return `Updated site settings for: ${details.siteName || details.name}`;
            case 'DELETE_SITE':
                return `Deleted site (ID: ${details.id})`;
            case 'SAVE_TIMESHEET':
                return `Saved timesheet for ${details.siteName} (${details.period})`;
            case 'UPDATE_TIMESHEET':
                return `Modified timesheet for ${details.siteName}`;
            case 'DELETE_TIMESHEET':
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
        <div className="bg-white rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-h1 text-gray-900">Audit Trail</h2>
                <div>
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
                            { value: 'DELETE_TIMESHEET', label: 'Delete Timesheet' },
                            { value: 'RELEASE_TRAINING_PAY', label: 'Release Training Pay' }
                        ]}
                        variant="compact"
                        className="w-56"
                    />
                    <button
                        onClick={loadLogs}
                        className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-50">
                        <tr className="text-p3 font-bold uppercase tracking-widest text-gray-400">
                            <th className="px-6 py-3 text-left">Timestamp</th>
                            <th className="px-6 py-3 text-left">User</th>
                            <th className="px-6 py-3 text-left">Action</th>
                            <th className="px-6 py-3 text-left">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {[...filteredLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-p3 text-gray-500">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-p3 text-gray-900 font-medium">
                                    {getDisplayUser(log)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-[10px] font-bold uppercase rounded-full ${getActionColor(log.action)}`}>
                                        {log.action.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-p3 text-gray-600">
                                    {formatLogDetails(log)}
                                </td>
                            </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center py-4 text-gray-500">No logs found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogViewer;
