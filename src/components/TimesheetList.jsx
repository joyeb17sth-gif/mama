import { useState, useEffect } from 'react';
import { getTimesheets, getSites, getContractors, saveTimesheets, logAction } from '../utils/storage';
import { formatDateDisplay } from '../utils/dateUtils';

const TimesheetList = ({ onEdit }) => {
  const [timesheets, setTimesheets] = useState([]);
  const [sites, setSites] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTimesheets(getTimesheets());
    setSites(getSites());
    setContractors(getContractors());
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this timesheet? This action cannot be undone.')) {
      const updated = timesheets.filter(t => t.id !== id);
      setTimesheets(updated);
      saveTimesheets(updated);
      logAction('DELETE_TIMESHEET', { id });
    }
  };

  const filteredTimesheets = timesheets.filter(ts =>
    ts.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ts.periodStart.includes(searchQuery) ||
    ts.periodEnd.includes(searchQuery)
  );

  const handleStatusChange = (id, newStatus) => {
    const updated = timesheets.map(ts =>
      ts.id === id ? { ...ts, status: newStatus, updatedAt: new Date().toISOString() } : ts
    );
    setTimesheets(updated);
    saveTimesheets(updated);
    logAction('UPDATE_TIMESHEET_STATUS', { id, status: newStatus });
  };

  if (timesheets.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 font-medium">No timesheets created yet.</p>
        <p className="text-gray-400 text-sm mt-1">Create your first timesheet to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Summary */}
      <div className="flex justify-between items-center">
        <div className="relative w-80">
          <input
            type="text"
            placeholder="Search by site or period..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-base text-gray-600">
          {searchQuery ? (
            <span>Showing <span className="font-semibold text-blue-600">{filteredTimesheets.length}</span> of {timesheets.length} timesheets</span>
          ) : (
            <span>Total: <span className="font-semibold text-gray-900">{timesheets.length}</span> timesheet{timesheets.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Site Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Contractors
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Total Payable
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Escrowed
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredTimesheets.map((timesheet) => {
              const totalHours = timesheet.entries?.reduce((sum, e) => sum + (e.totalHours || 0), 0) || 0;
              const totalPay = timesheet.entries?.reduce((sum, e) => sum + (e.totalPay || 0), 0) || 0;
              const contractorNames = timesheet.entries?.map(e => {
                const contractor = contractors.find(c => c.id === e.contractorId);
                return contractor?.name;
              }).filter(Boolean).join(', ') || 'N/A';

              return (
                <tr key={timesheet.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {timesheet.siteName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{timesheet.periodStart} to {timesheet.periodEnd}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                    <div className="truncate" title={contractorNames}>
                      {contractorNames}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                    {totalHours.toFixed(2)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-emerald-600">
                    ${totalPay.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-amber-600">
                    ${timesheet.entries?.reduce((sum, e) => sum + (e.trainingPay || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <select
                      value={timesheet.status || 'draft'}
                      onChange={(e) => handleStatusChange(timesheet.id, e.target.value)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full border focus:outline-none transition-colors cursor-pointer appearance-none text-center ${timesheet.status === 'done'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }`}
                    >
                      <option value="draft">draft</option>
                      <option value="done">done</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(timesheet.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(timesheet)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit timesheet"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(timesheet.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete timesheet"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredTimesheets.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-500">
          <p>No timesheets found matching "<span className="font-semibold">{searchQuery}</span>"</p>
        </div>
      )}
    </div>
  );
};
export default TimesheetList;
