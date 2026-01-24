import { useState, useEffect } from 'react';
import { getTimesheets, getSites, getContractors, saveTimesheets, logAction } from '../utils/storage';
import { formatDateDisplay } from '../utils/dateUtils';

const TimesheetList = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [sites, setSites] = useState([]);
  const [contractors, setContractors] = useState([]);

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

  if (timesheets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No timesheets created yet. Create your first timesheet in the Timesheets tab.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Site Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Period
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contractors
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Hours
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Payable
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Escrowed
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {timesheets.map((timesheet) => {
            const totalHours = timesheet.entries?.reduce((sum, e) => sum + (e.totalHours || 0), 0) || 0;
            const totalPay = timesheet.entries?.reduce((sum, e) => sum + (e.totalPay || 0), 0) || 0;
            const contractorNames = timesheet.entries?.map(e => {
              const contractor = contractors.find(c => c.id === e.contractorId);
              return contractor?.name;
            }).filter(Boolean).join(', ') || 'N/A';

            return (
              <tr key={timesheet.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {timesheet.siteName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {timesheet.periodStart} to {timesheet.periodEnd}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                  <div className="truncate" title={contractorNames}>
                    {contractorNames}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {totalHours.toFixed(2)} hrs
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                  ${totalPay.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-600">
                  {/* Calculate total escrowed for this timesheet */}
                  ${timesheet.entries?.reduce((sum, e) => sum + (e.trainingPay || 0), 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${timesheet.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                      }`}
                  >
                    {timesheet.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(timesheet.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDelete(timesheet.id)}
                    className="text-red-600 hover:text-red-900 ml-4"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
export default TimesheetList;
