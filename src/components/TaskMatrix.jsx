import React, { useState, useMemo } from 'react';
import { format, addMonths, parseISO, startOfYear, endOfYear, eachMonthOfInterval, addDays, addWeeks, startOfDay, isBefore } from 'date-fns';
import Dropdown from './Dropdown';

const TaskMatrix = ({ sites, periodicalTasks, onToggleStatus, onManageTasks }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activePopup, setActivePopup] = useState(null); // { task, schedule, monthDisplay }
  const [popupScopeOfWork, setPopupScopeOfWork] = useState('');
  const [popupStatus, setPopupStatus] = useState('');
  const [popupHours, setPopupHours] = useState('');
  const [popupCompletionDate, setPopupCompletionDate] = useState('');
  const [upcomingFilter, setUpcomingFilter] = useState('1week');

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
      case 'Completed': return 'bg-[#ffc000] text-amber-900'; // Yellow
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
       const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
       return periods.find(p => p.name === monthName)?.exactDate || 'Not Set';
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

  const getDefaultScopeOfWorkForMonth = (task, monthDate) => {
    if (!monthDate) return '';
    const monthIndex = monthDate.getMonth();
    const periods = task.periodBudgets || [];
    if (!periods.length) return '';
    
    if (task.frequency === 'Monthly') {
       const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
       return periods.find(p => p.name === monthName)?.scopeOfWork || '';
    }
    if (task.frequency === 'Quarterly') {
       let diff = monthIndex - (task.startingMonth || 0);
       if (diff < 0) diff += 12;
       const qIndex = Math.floor(diff / 3);
       return periods[qIndex]?.scopeOfWork || '';
    }
    if (task.frequency === '6 Monthly') {
       let diff = monthIndex - (task.startingMonth || 0);
       if (diff < 0) diff += 12;
       const hIndex = Math.floor(diff / 6);
       return periods[hIndex]?.scopeOfWork || '';
    }
    if (task.frequency === 'Yearly' || task.frequency === 'Weekly' || task.frequency === 'Custom Date') {
       return periods[0]?.scopeOfWork || '';
    }
    return '';
  };

  const getDefaultScopeFileForMonth = (task, monthDate) => {
    if (!monthDate) return null;
    const monthIndex = monthDate.getMonth();
    const periods = task.periodBudgets || [];
    if (!periods.length) return null;
    
    let targetPeriod = null;
    if (task.frequency === 'Monthly') {
       const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
       targetPeriod = periods.find(p => p.name === monthName);
    } else if (task.frequency === 'Quarterly') {
       let diff = monthIndex - (task.startingMonth || 0);
       if (diff < 0) diff += 12;
       targetPeriod = periods[Math.floor(diff / 3)];
    } else if (task.frequency === '6 Monthly') {
       let diff = monthIndex - (task.startingMonth || 0);
       if (diff < 0) diff += 12;
       targetPeriod = periods[Math.floor(diff / 6)];
    } else if (task.frequency === 'Yearly' || task.frequency === 'Weekly' || task.frequency === 'Custom Date') {
       targetPeriod = periods[0];
    }
    
    if (targetPeriod && targetPeriod.scopeFileUrl) {
       return { url: targetPeriod.scopeFileUrl, name: targetPeriod.scopeFileName };
    }
    return null;
  };

  const [viewMode, setViewMode] = useState('matrix');

  const upcomingSchedules = useMemo(() => {
    const today = startOfDay(new Date());
    const currentMonthStr = format(today, 'yyyy-MM');
    const list = [];

    periodicalTasks.forEach(task => {
      const site = sites.find(s => s.id === task.siteId);
      if (!task.schedules) return;

      task.schedules.forEach(schedule => {
        if (schedule.status !== 'Scheduled') return;

        const monthDate = parseISO(`${schedule.targetPeriod}-01`);
        const exactDateStr = getExactDateForMonth(task, monthDate);
        let isPastDue = false;
        let scheduleDate = monthDate;

        let displayExactDate = exactDateStr;
        if (exactDateStr && exactDateStr !== 'Not Set') {
          const parts = exactDateStr.split('-');
          if (parts.length === 3) {
            displayExactDate = `${schedule.targetPeriod}-${parts[2]}`;
          }
          const parsed = parseISO(displayExactDate);
          if (!isNaN(parsed)) {
            scheduleDate = parsed;
            if (isBefore(parsed, today)) {
              isPastDue = true;
            }
          }
        } else {
          // No exact date: past due if targetPeriod is before the current month
          if (schedule.targetPeriod < currentMonthStr) {
            isPastDue = true;
          }
        }

        list.push({
          task,
          site,
          schedule,
          monthDate,
          monthDisplay: format(monthDate, 'MMM yyyy'),
          exactDate: displayExactDate,
          scope: getDefaultScopeOfWorkForMonth(task, monthDate) || schedule.scopeOfWork || '',
          isPastDue,
          scheduleDate
        });
      });
    });

    const taskGroups = {};
    list.forEach(item => {
      const taskId = item.task.id;
      if (!taskGroups[taskId]) {
        taskGroups[taskId] = [];
      }
      taskGroups[taskId].push(item);
    });

    const finalUpcoming = [];
    Object.values(taskGroups).forEach(items => {
      items.sort((a, b) => a.schedule.targetPeriod.localeCompare(b.schedule.targetPeriod));

      items.forEach(item => {
        finalUpcoming.push(item);
      });
    });

    finalUpcoming.sort((a, b) => {
      if (a.isPastDue && !b.isPastDue) return -1;
      if (!a.isPastDue && b.isPastDue) return 1;
      const cmp = a.schedule.targetPeriod.localeCompare(b.schedule.targetPeriod);
      if (cmp !== 0) return cmp;
      return a.scheduleDate - b.scheduleDate;
    });

    return finalUpcoming;
  }, [periodicalTasks, sites]);

  const filteredUpcomingSchedules = useMemo(() => {
    if (upcomingFilter === 'all') return upcomingSchedules;
    if (upcomingFilter === 'past_due') return upcomingSchedules.filter(item => item.isPastDue);
    
    const today = startOfDay(new Date());
    let endDate;
    if (upcomingFilter === '1week') {
      endDate = addWeeks(today, 1);
    } else if (upcomingFilter === '15days') {
      endDate = addDays(today, 15);
    } else if (upcomingFilter === '1month') {
      endDate = addMonths(today, 1);
    }

    return upcomingSchedules.filter(item => {
      // Do not include past due items in the upcoming timeframe filters
      if (item.isPastDue) return false;

      let itemDate = item.scheduleDate;
      return isBefore(itemDate, endDate) || itemDate.getTime() === endDate.getTime();
    });
  }, [upcomingSchedules, upcomingFilter]);

  return (
    <div className="bg-white rounded-xl shadow-notion-card border border-notion-warm-gray-200">
      {/* Header Controls */}
      <div className="p-4 border-b border-notion-warm-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-notion-warm-white rounded-t-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h3 className="font-bold text-notion-black text-base md:text-lg">Periodical Task List</h3>
          <div className="flex bg-white rounded-micro p-1 shadow-sm border border-notion-warm-gray-200">
            <button 
               className={`px-3 py-1 rounded-micro text-xs font-bold transition-all ${viewMode === 'matrix' ? 'bg-notion-blue text-white shadow-sm' : 'text-notion-warm-gray-500 hover:text-notion-black'}`}
               onClick={() => setViewMode('matrix')}
            >Matrix View</button>
            <button 
               className={`px-3 py-1 rounded-micro text-xs font-bold transition-all ${viewMode === 'upcoming' ? 'bg-notion-blue text-white shadow-sm' : 'text-notion-warm-gray-500 hover:text-notion-black'}`}
               onClick={() => setViewMode('upcoming')}
            >Upcoming Tasks</button>
          </div>
        </div>
        
        {viewMode === 'upcoming' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
            <div className="w-full sm:w-40">
              <Dropdown
                value={upcomingFilter}
                onChange={(val) => setUpcomingFilter(val)}
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'past_due', label: 'Past Due' },
                  { value: '1week', label: 'Next 1 Week' },
                  { value: '15days', label: 'Next 15 Days' },
                  { value: '1month', label: 'Next 1 Month' }
                ]}
              />
            </div>
          </div>
        )}

        {viewMode === 'matrix' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#00A2E8]"></div> Scheduled</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#ffc000]"></div> Completed</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-400"></div> Completed, Not Claimed</div>
            </div>
            <div className="w-full sm:w-32">
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
        )}
      </div>

      {viewMode === 'matrix' && (
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-xs md:text-sm text-left whitespace-nowrap min-w-max border-collapse">
            <thead>
              <tr className="bg-notion-warm-white border-b border-notion-warm-gray-200 text-[10px] md:text-xs text-notion-warm-gray-500 font-semibold tracking-wider">
                <th className="px-3 py-2 border-r border-notion-warm-gray-200 w-16">#</th>
                <th className="px-3 py-2 border-r border-notion-warm-gray-200 w-64">Location / Task</th>
                <th className="px-3 py-2 border-r border-notion-warm-gray-200">Frequency</th>
                <th className="px-3 py-2 border-r border-notion-warm-gray-200">Contracted</th>
                <th className="px-3 py-2 border-r border-notion-warm-gray-200">Budget Hrs</th>
                {months.map(month => (
                  <th key={month.toISOString()} className="px-3 py-2 border-r border-notion-warm-gray-200 text-center w-16">
                    {format(month, 'MMM')}
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
                  <tr className="bg-[#a8d08d] text-notion-black border-b border-notion-warm-gray-200 text-xs md:text-sm">
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
                      <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 font-mono text-[10px] md:text-xs text-notion-warm-gray-500">
                        {task.taskCode}
                      </td>
                      <td className="px-3 py-1.5 border-r border-notion-warm-gray-200">
                        {task.taskName}
                      </td>
                      <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 text-[10px] md:text-xs">
                        {task.frequency}
                      </td>
                      <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 text-[10px] md:text-xs">
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
                                const defaultScope = getDefaultScopeOfWorkForMonth(task, month);
                                setPopupScopeOfWork(schedule.scopeOfWork || defaultScope);
                                setPopupStatus(schedule.status);
                                setPopupHours(schedule.completedHours || '');
                                setPopupCompletionDate(schedule.completionDate || format(new Date(), 'yyyy-MM-dd'));
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
      )}

      {/* Upcoming Tasks Table */}
      {viewMode === 'upcoming' && (
        <div className="overflow-x-auto w-full custom-scrollbar p-1">
          {filteredUpcomingSchedules.length === 0 ? (
             <div className="py-12 text-center text-notion-warm-gray-500 bg-white">
               No upcoming scheduled tasks found.
             </div>
          ) : (
            <table className="w-full text-xs md:text-sm text-left whitespace-nowrap min-w-max border-collapse shadow-sm">
              <thead>
                <tr className="bg-notion-warm-white border-b border-notion-warm-gray-200 text-[10px] md:text-xs text-notion-warm-gray-500 font-semibold tracking-wider">
                  <th className="px-4 py-3">Scheduled Period</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Task Details</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Scope of Work</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUpcomingSchedules.map((item, index) => (
                  <tr key={`${item.task.id}-${index}`} className="border-b border-notion-warm-gray-100 hover:bg-blue-50/30 transition-colors bg-white">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-notion-blue">{item.monthDisplay}</span>
                          {item.isPastDue && (
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[9px] font-extrabold uppercase tracking-wider rounded border border-red-200 animate-pulse">
                              Past Due
                            </span>
                          )}
                        </div>
                        {item.exactDate && item.exactDate !== 'Not Set' && (
                           <span className="text-[10px] font-bold text-notion-warm-gray-400 uppercase tracking-widest">{item.exactDate}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-notion-black">
                      {item.site?.siteName || 'Unknown Site'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-notion-warm-white text-[10px] font-bold text-notion-warm-gray-500 uppercase tracking-widest rounded border whisper-border">
                          {item.task.taskCode}
                        </span>
                        <span className="font-semibold text-notion-black">{item.task.taskName}</span>
                      </div>
                      <div className="text-[10px] text-notion-warm-gray-400 mt-1 uppercase tracking-widest">
                        {item.task.frequency} • {item.task.contractType}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(item.task.assignedTo && item.task.assignedTo.length > 0) ? (
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(item.task.assignedTo) ? item.task.assignedTo : [item.task.assignedTo]).map((assignee, idx) => (
                            <span key={idx} className="px-2 py-1 bg-notion-badge-blue-bg text-notion-blue text-[10px] font-bold rounded-micro border border-notion-blue/20">
                              {assignee}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-notion-warm-gray-300 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-notion-warm-gray-500" title={item.scope}>
                      {getDefaultScopeFileForMonth(item.task, item.monthDate) ? (
                        <a href={getDefaultScopeFileForMonth(item.task, item.monthDate).url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-notion-blue hover:underline text-xs font-bold">
                           {getDefaultScopeFileForMonth(item.task, item.monthDate).name || 'View Document'}
                        </a>
                      ) : (
                        <span>{item.scope || 'No scope defined'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setPopupScopeOfWork(item.scope);
                          setPopupStatus(item.schedule.status);
                          setPopupHours(item.schedule.completedHours || '');
                          setPopupCompletionDate(item.schedule.completionDate || format(new Date(), 'yyyy-MM-dd'));
                          setActivePopup({ task: item.task, schedule: item.schedule, monthDisplay: item.monthDisplay, monthDate: item.monthDate });
                        }}
                        className="px-3 py-1.5 bg-white text-notion-blue text-xs font-bold border border-notion-warm-gray-200 rounded-micro hover:bg-notion-badge-blue-bg transition shadow-sm"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Status Update Popup */}
      {activePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-white rounded-xl shadow-notion-card w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-notion-warm-gray-200 bg-notion-warm-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-notion-black text-sm">Update Task Status</h3>
              <button 
                onClick={() => setActivePopup(null)}
                className="text-notion-warm-gray-500 hover:text-notion-black transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-1 text-sm">
                <p><span className="text-notion-warm-gray-500 font-medium">Task:</span> <span className="font-semibold text-notion-black">{activePopup.task.taskName} ({activePopup.task.taskCode})</span></p>
                <p><span className="text-notion-warm-gray-500 font-medium">Period:</span> <span className="font-semibold text-notion-black">{activePopup.monthDisplay}</span></p>
                <p><span className="text-notion-warm-gray-500 font-medium">Exact Date:</span> <span className="font-semibold text-notion-black">{getExactDateForMonth(activePopup.task, activePopup.monthDate)}</span></p>
                <p className="flex flex-wrap gap-1"><span className="text-notion-warm-gray-500 font-medium shrink-0">Assigned To:</span> <span className={`font-semibold break-words ${(activePopup.task.assignedTo && activePopup.task.assignedTo.length > 0) ? 'text-notion-blue' : 'text-notion-warm-gray-300'}`}>{(activePopup.task.assignedTo && activePopup.task.assignedTo.length > 0) ? (Array.isArray(activePopup.task.assignedTo) ? activePopup.task.assignedTo.join(', ') : activePopup.task.assignedTo) : 'Unassigned'}</span></p>
                <p><span className="text-notion-warm-gray-500 font-medium">Current Status:</span> <span className="font-semibold text-notion-black">{activePopup.schedule.status}</span></p>
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-notion-warm-gray-500">Scope of Work</label>
                  {getDefaultScopeFileForMonth(activePopup.task, activePopup.monthDate) && (
                    <a 
                      href={getDefaultScopeFileForMonth(activePopup.task, activePopup.monthDate).url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-notion-blue bg-notion-badge-blue-bg px-2 py-1 rounded-micro hover:bg-notion-blue hover:text-white transition-colors"
                    >
                      View Document
                    </a>
                  )}
                </div>
                <textarea
                  value={popupScopeOfWork || ''}
                  onChange={(e) => setPopupScopeOfWork(e.target.value)}
                  placeholder="Describe scope of work..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-notion-warm-gray-200 rounded-lg text-sm focus:border-notion-blue focus:ring-1 focus:ring-notion-blue outline-none text-notion-black transition-all"
                />
              </div>
              <div className="pt-2">
                <label className="block text-sm font-medium text-notion-warm-gray-500 mb-2">Change Status To:</label>
                <div className="flex flex-col gap-2">
                  {['Scheduled', 'Completed', 'Completed Not Claimed'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setPopupStatus(status)}
                      className={`px-4 py-2 text-left rounded-md text-sm transition-all border ${
                        popupStatus === status 
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
              {popupStatus === 'Completed' && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300 grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-notion-warm-gray-500 uppercase tracking-widest mb-1 truncate">Completion Date</label>
                    <input
                      type="date"
                      value={popupCompletionDate}
                      onChange={(e) => setPopupCompletionDate(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-notion-warm-gray-200 rounded-lg text-sm focus:border-notion-blue focus:ring-1 focus:ring-notion-blue outline-none text-notion-black transition-all"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-notion-warm-gray-500 uppercase tracking-widest mb-1 truncate">Total Hrs</label>
                    <input
                      type="number"
                      value={popupHours}
                      onChange={(e) => setPopupHours(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-2 bg-white border border-notion-warm-gray-200 rounded-lg text-sm focus:border-notion-blue focus:ring-1 focus:ring-notion-blue outline-none text-notion-black transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-notion-warm-gray-200 bg-notion-warm-white flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActivePopup(null)}
                className="px-4 py-2 bg-white whisper-border text-notion-warm-gray-500 hover:bg-notion-warm-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleStatus(activePopup.task, activePopup.schedule, popupStatus, popupScopeOfWork, popupHours ? parseFloat(popupHours) : undefined, popupCompletionDate);
                  setActivePopup(null);
                }}
                disabled={popupStatus === 'Completed' && (!popupCompletionDate || !popupHours)}
                className="px-5 py-2 bg-notion-blue text-white hover:bg-blue-600 rounded-lg text-sm font-bold transition shadow-md disabled:opacity-30"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskMatrix;
