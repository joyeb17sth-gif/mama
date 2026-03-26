import { useState, useEffect } from 'react';
import { getTimesheets, getSites, getContractors, saveTimesheets, logAction } from '../utils/storage';
import { formatDateDisplay } from '../utils/dateUtils';
import Dropdown from './Dropdown';

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
      <div className="text-center py-20 bg-zinc-50/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200">
        <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center text-zinc-300 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-zinc-500 font-bold text-p1">Empty Record Set</p>
        <p className="text-zinc-400 text-sm mt-1">Initialize your first deployment tracking log above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Summary */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search manifests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all text-zinc-900 font-medium"
          />
          <svg className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-sm font-bold text-zinc-400 flex items-center gap-2">
          {searchQuery ? (
            <>
              Found <span className="text-primary-600 px-2 py-0.5 bg-primary-50 rounded-lg">{filteredTimesheets.length}</span> results
            </>
          ) : (
            <>
              Manifest Count: <span className="text-zinc-900">{timesheets.length}</span>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-zinc-100">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-zinc-900">
              <th className="px-6 py-5 text-left text-p3 font-bold text-zinc-400 border-b border-zinc-800 rounded-tl-[2rem]">
                Deployment Node
              </th>
              <th className="px-6 py-5 text-left text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                Timeline
              </th>
              <th className="px-6 py-5 text-left text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                Personnel
              </th>
              <th className="px-6 py-5 text-center text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                Utilization
              </th>
              <th className="px-6 py-5 text-right text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                Valuation
              </th>
              <th className="px-6 py-5 text-center text-p3 font-bold text-zinc-400 border-b border-zinc-800">
                Protocol
              </th>
              <th className="px-6 py-5 text-center text-p3 font-bold text-zinc-400 border-b border-zinc-800 rounded-tr-[2rem]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filteredTimesheets.map((timesheet) => {
              const totalHours = timesheet.entries?.reduce((sum, e) => sum + (e.totalHours || 0), 0) || 0;
              const totalPay = timesheet.entries?.reduce((sum, e) => sum + (e.totalPay || 0), 0) || 0;
              const contractorNames = timesheet.entries?.map(e => {
                const contractor = contractors.find(c => c.id === e.contractorId);
                return contractor?.name;
              }).filter(Boolean).join(', ') || 'None';

              const isDone = timesheet.status === 'done';

              return (
                <tr key={timesheet.id} className="hover:bg-zinc-50/50 transition-colors group/row">
                  <td className="px-6 py-5">
                    <div className="text-p3 font-bold text-zinc-900 tracking-tight group-hover/row:text-primary-600 transition-colors">
                      {timesheet.siteName}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 whitespace-nowrap">
                      <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {timesheet.periodStart}
                    </div>
                  </td>
                  <td className="px-6 py-5 max-w-[200px]">
                    <div className="text-p3 font-bold text-zinc-500 truncate" title={contractorNames}>
                      {contractorNames}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 bg-zinc-50 text-zinc-900 rounded-lg text-xs font-bold border border-zinc-100 group-hover/row:bg-white transition-colors">
                      {totalHours.toFixed(1)}h
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right font-bold text-sm text-emerald-600">
                    ${totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <Dropdown
                      value={timesheet.status || 'draft'}
                      onChange={(val) => handleStatusChange(timesheet.id, val)}
                      options={[
                        { value: 'draft', label: 'Draft Protocol' },
                        { value: 'done', label: 'Deployment Finalized' }
                      ]}
                      variant="compact"
                      buttonClassName={`flex items-center justify-between pl-4 pr-3 py-2 text-[10px] font-bold rounded-xl border focus:outline-none transition-all cursor-pointer ${isDone
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                        }`}
                      className="inline-block"
                    />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(timesheet)}
                        className="w-9 h-9 flex items-center justify-center bg-zinc-50 text-zinc-500 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all border border-zinc-100"
                        title="Edit log"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(timesheet.id)}
                        className="w-9 h-9 flex items-center justify-center bg-zinc-50 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all border border-zinc-100"
                        title="Purge record"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
        <div className="text-center py-12 text-zinc-400 font-medium italic">
          No manifests match protocol search: "<span className="text-zinc-900">{searchQuery}</span>"
        </div>
      )}
    </div>
  );
};

export default TimesheetList;
