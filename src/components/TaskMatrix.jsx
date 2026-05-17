import React, { useState, useMemo } from 'react';
import { format, addMonths, parseISO, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import Dropdown from './Dropdown';

const TaskMatrix = ({ sites, periodicalTasks, onToggleStatus, onManageTasks }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activePopup, setActivePopup] = useState(null); // { task, schedule, monthDisplay }
  const [popupScopeOfWork, setPopupScopeOfWork] = useState('');

  // Generate 12 months for the selected year
  const months = useMemo(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 0, 1));
    return eachMonthOfInterval({ start, end });
  }, [selectedYear]);

  // Group tasks by site
  const groupedTasks = useMemo(() => {
    const grouped = {};
    periodicalTasks.forEach(task => {
      if (!grouped[task.siteId]) {
        grouped[task.siteId] = {
          site: sites.find(s => s.id === task.siteId),
          tasks: []
        };
      }
      grouped[task.siteId].tasks.push(task);
    });
    return grouped;
  }, [periodicalTasks, sites]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-[#00A2E8] text-white'; // Light blue from excel
      case 'Completed': return 'bg-[#156082] text-white'; // Dark blue from excel
      case 'Completed Not Claimed': return 'bg-gray-400 text-white'; // Grey
      default: return 'bg-transparent';
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Scheduled': return 'S';
      case 'Completed': return 'C';
      case 'Completed Not Claimed': return 'CN';
      default: return '';
    }
  };

  const getScheduleForMonth = (task, monthDate) => {
    const targetPeriod = format(monthDate, 'yyyy-MM');
    return task.schedules?.find(s => s.targetPeriod === targetPeriod);
  };

  const getExactDateForMonth = (task, monthDate) => {
    if (!monthDate) return 'Not Set';
    const monthIndex = monthDate.getMonth();
    const periods = task.periodBudgets || [];
    if (!periods.length) return 'Not Set';
    
    if (task.frequency === 'Monthly') {
       return periods[monthIndex]?.exactDate || 'Not Set';
    }
    if (task.frequency === 'Quarterly') {
       let diff = monthIndex - (task.startingMonth || 0);
       if (diff < 0) diff += 12;
       const qIndex = Math.floor(diff / 3);
       return periods[qIndex]?.exactDate || 'Not Set';
    }
    if (task.frequency === '6 Monthly') {
       let diff = monthIndex - (task.startingMonth || 0);
       if (diff < 0) diff += 12;
       const hIndex = Math.floor(diff / 6);
       return periods[hIndex]?.exactDate || 'Not Set';
    }
    if (task.frequency === 'Yearly' || task.frequency === 'Weekly') {
       return periods[0]?.exactDate || 'Not Set';
    }
    if (task.frequency === 'Custom Date') {
       return periods[0]?.customDate || 'Not Set';
    }
    return 'Not Set';
  };

  return (
    <div className="bg-white rounded-xl shadow-notion-card border border-notion-warm-gray-200">
      {/* Header Controls */}
      <div className="p-4 border-b border-notion-warm-gray-200 flex justify-between items-center bg-notion-warm-white rounded-t-xl">
        <h3 className="font-bold text-notion-black text-lg">Periodical Task List</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#00A2E8]"></div> Scheduled</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#156082]"></div> Completed</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-400"></div> Completed, Not Claimed</div>
          </div>
          <div className="w-32">
            <Dropdown
              value={selectedYear}
              onChange={(val) => setSelectedYear(parseInt(val))}
              options={[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return { value: year, label: year.toString() };
              })}
            />
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-sm text-left whitespace-nowrap min-w-max border-collapse">
          <thead>
            <tr className="bg-notion-warm-white border-b border-notion-warm-gray-200 text-xs text-notion-warm-gray-500 font-semibold tracking-wider">
              <th className="px-3 py-2 border-r border-notion-warm-gray-200 w-16">#</th>
              <th className="px-3 py-2 border-r border-notion-warm-gray-200 w-64">Location / Task</th>
              <th className="px-3 py-2 border-r border-notion-warm-gray-200">Frequency</th>
              <th className="px-3 py-2 border-r border-notion-warm-gray-200">Contracted</th>
              <th className="px-3 py-2 border-r border-notion-warm-gray-200">Budget Hrs</th>
              {months.map(month => (
                <th key={month.toISOString()} className="px-3 py-2 border-r border-notion-warm-gray-200 text-center w-16">
                  {format(month, 'MMM-yy')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.values(groupedTasks).length === 0 && (
              <tr>
                <td colSpan={5 + months.length} className="px-6 py-8 text-center text-notion-warm-gray-500">
                  No periodical tasks configured yet. Manage tasks within the Sites configuration.
                </td>
              </tr>
            )}
            
            {Object.values(groupedTasks).map(({ site, tasks }) => (
              <React.Fragment key={site?.id || 'unknown'}>
                {/* Site Header Row */}
                <tr className="bg-[#a8d08d] text-notion-black border-b border-notion-warm-gray-200">
                  <td className="px-3 py-1 font-bold border-r border-notion-warm-gray-200"></td>
                  <td colSpan={3 + months.length} className="px-3 py-1 font-bold">
                    {site?.siteName || 'Unknown Site'}
                  </td>
                  <td className="px-3 py-1 text-right">
                    {onManageTasks && site && (
                      <button
                        onClick={() => onManageTasks(site)}
                        className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-white text-notion-blue whisper-border rounded-micro hover:bg-notion-badge-blue-bg transition-all shadow-sm"
                      >
                        ✏️ Manage
                      </button>
                    )}
                  </td>
                </tr>
                
                {/* Task Rows */}
                {tasks.map(task => (
                  <tr key={task.id} className="border-b border-notion-warm-gray-200 hover:bg-notion-warm-white transition-colors">
                    <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 font-mono text-xs text-notion-warm-gray-500">
                      {task.taskCode}
                    </td>
                    <td className="px-3 py-1.5 border-r border-notion-warm-gray-200">
                      {task.taskName}
                    </td>
                    <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 text-xs">
                      {task.frequency}
                    </td>
                    <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 text-xs">
                      {task.contractType}
                    </td>
                    <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 text-center font-semibold bg-[#ffc000] text-amber-900 border-b border-white">
                      {task.budgetHours}
                    </td>
                    
                    {/* Schedule Cells */}
                    {months.map(month => {
                      const schedule = getScheduleForMonth(task, month);
                      return (
                        <td 
                          key={month.toISOString()} 
                          onClick={() => {
                            if (schedule) {
                              setPopupScopeOfWork(schedule.scopeOfWork || '');
                              setActivePopup({ task, schedule, monthDisplay: format(month, 'MMM yyyy'), monthDate: month });
                            }
                          }}
                          className={`border-r border-white border-b text-center cursor-pointer hover:opacity-80 transition-opacity ${
                            schedule ? getStatusColor(schedule.status) : 'bg-transparent border-r-notion-warm-gray-200'
                          }`}
                        >
                           <span className="text-[10px] font-bold">
                             {schedule ? getStatusDisplay(schedule.status) : ''}
                           </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Update Popup */}
      {activePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-notion-card w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-notion-warm-gray-200 bg-notion-warm-white flex justify-between items-center">
              <h3 className="font-bold text-notion-black">Update Task Status</h3>
              <button 
                onClick={() => setActivePopup(null)}
                className="text-notion-warm-gray-500 hover:text-notion-black transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1 text-sm">
                <p><span className="text-notion-warm-gray-500 font-medium">Task:</span> <span className="font-semibold text-notion-black">{activePopup.task.taskName} ({activePopup.task.taskCode})</span></p>
                <p><span className="text-notion-warm-gray-500 font-medium">Period:</span> <span className="font-semibold text-notion-black">{activePopup.monthDisplay}</span></p>
                <p><span className="text-notion-warm-gray-500 font-medium">Exact Date:</span> <span className="font-semibold text-notion-black">{getExactDateForMonth(activePopup.task, activePopup.monthDate)}</span></p>
                <p><span className="text-notion-warm-gray-500 font-medium">Current Status:</span> <span className="font-semibold text-notion-black">{activePopup.schedule.status}</span></p>
              </div>
              <div className="pt-2">
                <label className="block text-sm font-medium text-notion-warm-gray-500 mb-2">Scope of Work</label>
                <textarea
                  value={popupScopeOfWork}
                  onChange={(e) => setPopupScopeOfWork(e.target.value)}
                  placeholder="Describe the scope of work for this period..."
                  rows={3}
                  className="w-full px-3 py-2 border border-notion-warm-gray-200 rounded-lg text-sm outline-none focus:border-notion-blue transition resize-none"
                />
              </div>
              <div className="pt-2">
                <label className="block text-sm font-medium text-notion-warm-gray-500 mb-2">Change Status To:</label>
                <div className="flex flex-col gap-2">
                  {['Scheduled', 'Completed', 'Completed Not Claimed'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        onToggleStatus(activePopup.task, activePopup.schedule, status, popupScopeOfWork);
                        setActivePopup(null);
                      }}
                      className={`px-4 py-2 text-left rounded-md text-sm transition-all border ${
                        activePopup.schedule.status === status 
                          ? 'border-notion-blue bg-blue-50 text-notion-blue font-semibold shadow-sm'
                          : 'border-notion-warm-gray-200 hover:bg-notion-warm-white hover:border-notion-warm-gray-300 text-notion-black'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status).split(' ')[0]}`}></div>
                        {status}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskMatrix;
