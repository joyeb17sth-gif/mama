import React, { useState, useEffect } from 'react';
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

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Audit Trail</h2>
                <div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Actions</option>
                        <option value="CREATE_CONTRACTOR">Create Contractor</option>
                        <option value="UPDATE_CONTRACTOR">Update Contractor</option>
                        <option value="DELETE_CONTRACTOR">Delete Contractor</option>
                        <option value="CREATE_SITE">Create Site</option>
                        <option value="UPDATE_SITE">Update Site</option>
                        <option value="DELETE_SITE">Delete Site</option>
                        <option value="SAVE_TIMESHEET">Save Timesheet</option>
                        <option value="UPDATE_TIMESHEET">Update Timesheet</option>
                        <option value="DELETE_TIMESHEET">Delete Timesheet</option>
                        <option value="RELEASE_TRAINING_PAY">Release Training Pay</option>
                    </select>
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
                        <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <th className="px-6 py-3 text-left">Timestamp</th>
                            <th className="px-6 py-3 text-left">User</th>
                            <th className="px-6 py-3 text-left">Action</th>
                            <th className="px-6 py-3 text-left">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLogs.reverse().map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {log.user}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-[10px] font-bold uppercase rounded-full ${getActionColor(log.action)}`}>
                                        {log.action.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
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
