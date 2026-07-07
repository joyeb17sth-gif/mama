import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths, parseISO, startOfYear, endOfYear, eachMonthOfInterval, addDays, addWeeks, startOfDay, isBefore, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import Dropdown from './Dropdown';

const TaskMatrix = ({ sites, periodicalTasks, onToggleStatus, onUpdateScheduleOverrides, onManageTasks }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activePopup, setActivePopup] = useState(null); // { task, schedule, monthDisplay }
  const [popupScopeOfWork, setPopupScopeOfWork] = useState('');
  const [popupStatus, setPopupStatus] = useState('');
  const [popupHours, setPopupHours] = useState('');
  const [popupCompletionDate, setPopupCompletionDate] = useState('');
  const [upcomingFilter, setUpcomingFilter] = useState('1week');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('all');
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState('all');
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [showAggregatedWarning, setShowAggregatedWarning] = useState(false);
  const [editingScheduleOverride, setEditingScheduleOverride] = useState(null);

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
      if (selectedSiteFilter !== 'all' && task.siteId !== selectedSiteFilter) return;
      if (selectedFrequencyFilter !== 'all' && task.frequency !== selectedFrequencyFilter) return;

      if (!grouped[task.siteId]) {
        grouped[task.siteId] = {
          site: sites.find(s => s.id === task.siteId),
          tasks: []
        };
      }
      grouped[task.siteId].tasks.push(task);
    });

    Object.values(grouped).forEach(group => {
      group.tasks.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
    });

    return Object.values(grouped).sort((a, b) => {
      const maxIdA = Math.max(...a.tasks.map(t => parseInt(t.id) || 0));
      const maxIdB = Math.max(...b.tasks.map(t => parseInt(t.id) || 0));
      return maxIdB - maxIdA;
    });
  }, [periodicalTasks, sites, selectedSiteFilter, selectedFrequencyFilter]);

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
    const monthSchedules = task.schedules?.filter(s => {
      const sMonthDate = parseISO(`${s.targetPeriod}-01`);
      let exactDateStr;
      if (task.frequency === 'Weekly' || task.frequency === 'Custom Date') {
        exactDateStr = s.exactDate || getExactDateForMonth(task, sMonthDate);
      } else {
        exactDateStr = getExactDateForMonth(task, sMonthDate);
      }

      if (exactDateStr && exactDateStr !== 'Not Set') {
        const parts = exactDateStr.split('-');
        if (parts.length === 3) {
          let exactYear = parseInt(s.targetPeriod.split('-')[0], 10);
          const targetMonth = parseInt(s.targetPeriod.split('-')[1], 10);
          const exactMonth = parseInt(parts[1], 10);
          if (exactMonth < targetMonth && (targetMonth - exactMonth) >= 6) {
            exactYear += 1;
          } else if (exactMonth > targetMonth && (exactMonth - targetMonth) >= 6) {
            exactYear -= 1;
          }
          return exactYear === monthDate.getFullYear() && exactMonth === monthDate.getMonth() + 1;
        }
      }
      return s.targetPeriod === targetPeriod;
    });

    if (!monthSchedules || monthSchedules.length === 0) return undefined;
    if (monthSchedules.length === 1) return monthSchedules[0];

    // Aggregate status for multiple schedules (e.g. Weekly)
    const allCompleted = monthSchedules.every(s => s.status === 'Completed' || s.status === 'Completed Not Claimed');
    const allNotClaimed = monthSchedules.every(s => s.status === 'Completed Not Claimed');

    let overallStatus = 'Scheduled';
    if (allNotClaimed) overallStatus = 'Completed Not Claimed';
    else if (allCompleted) overallStatus = 'Completed';

    return { ...monthSchedules[0], status: overallStatus, isAggregated: true };
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
      const expectedName = qIndex === 0 ? '1st Quarter' : qIndex === 1 ? '2nd Quarter' : qIndex === 2 ? '3rd Quarter' : '4th Quarter';
      const period = periods.find(p => p.name === expectedName);
      if (period?.isDisabled) return 'Not Set';
      return period?.exactDate || 'Not Set';
    }
    if (task.frequency === '6 Monthly') {
      let diff = monthIndex - (task.startingMonth || 0);
      if (diff < 0) diff += 12;
      const hIndex = Math.floor(diff / 6);
      const expectedName = hIndex === 0 ? '1st Half' : '2nd Half';
      const period = periods.find(p => p.name === expectedName);
      if (period?.isDisabled) return 'Not Set';
      return period?.exactDate || 'Not Set';
    }
    if (task.frequency === 'Yearly' || task.frequency === 'Weekly') {
      return periods[0]?.exactDate || 'Not Set';
    }
    if (task.frequency === 'Custom Date') {
      return periods[0]?.customDate || 'Not Set';
    }
    return 'Not Set';
  };

  const getEndDateForMonth = (task, monthDate) => {
    if (!monthDate) return '';
    const monthIndex = monthDate.getMonth();
    const periods = task.periodBudgets || [];
    if (!periods.length) return '';

    if (task.frequency === 'Monthly') {
      const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
      return periods.find(p => p.name === monthName)?.endDate || '';
    }
    if (task.frequency === 'Quarterly') {
      let diff = monthIndex - (task.startingMonth || 0);
      if (diff < 0) diff += 12;
      const qIndex = Math.floor(diff / 3);
      const expectedName = qIndex === 0 ? '1st Quarter' : qIndex === 1 ? '2nd Quarter' : qIndex === 2 ? '3rd Quarter' : '4th Quarter';
      const period = periods.find(p => p.name === expectedName);
      if (period?.isDisabled) return '';
      return period?.endDate || '';
    }
    if (task.frequency === '6 Monthly') {
      let diff = monthIndex - (task.startingMonth || 0);
      if (diff < 0) diff += 12;
      const hIndex = Math.floor(diff / 6);
      const expectedName = hIndex === 0 ? '1st Half' : '2nd Half';
      const period = periods.find(p => p.name === expectedName);
      if (period?.isDisabled) return '';
      return period?.endDate || '';
    }
    if (task.frequency === 'Yearly' || task.frequency === 'Weekly' || task.frequency === 'Custom Date') {
      return periods[0]?.endDate || '';
    }
    return '';
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
      const expectedName = qIndex === 0 ? '1st Quarter' : qIndex === 1 ? '2nd Quarter' : qIndex === 2 ? '3rd Quarter' : '4th Quarter';
      const period = periods.find(p => p.name === expectedName);
      if (period?.isDisabled) return '';
      return period?.scopeOfWork || '';
    }
    if (task.frequency === '6 Monthly') {
      let diff = monthIndex - (task.startingMonth || 0);
      if (diff < 0) diff += 12;
      const hIndex = Math.floor(diff / 6);
      const expectedName = hIndex === 0 ? '1st Half' : '2nd Half';
      const period = periods.find(p => p.name === expectedName);
      if (period?.isDisabled) return '';
      return period?.scopeOfWork || '';
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
      const qIndex = Math.floor(diff / 3);
      const expectedName = qIndex === 0 ? '1st Quarter' : qIndex === 1 ? '2nd Quarter' : qIndex === 2 ? '3rd Quarter' : '4th Quarter';
      targetPeriod = periods.find(p => p.name === expectedName);
    } else if (task.frequency === '6 Monthly') {
      let diff = monthIndex - (task.startingMonth || 0);
      if (diff < 0) diff += 12;
      const hIndex = Math.floor(diff / 6);
      const expectedName = hIndex === 0 ? '1st Half' : '2nd Half';
      targetPeriod = periods.find(p => p.name === expectedName);
    } else if (task.frequency === 'Yearly' || task.frequency === 'Weekly' || task.frequency === 'Custom Date') {
      targetPeriod = periods[0];
    }

    if (targetPeriod && !targetPeriod.isDisabled && targetPeriod.scopeFileUrl) {
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
      if (selectedSiteFilter !== 'all' && task.siteId !== selectedSiteFilter) return;
      if (selectedFrequencyFilter !== 'all' && task.frequency !== selectedFrequencyFilter) return;

      const site = sites.find(s => s.id === task.siteId);
      if (!task.schedules) return;

      task.schedules.forEach(schedule => {
        // Removed the filter here to allow all statuses (Scheduled, Completed, etc.) to be processed.

        const monthDate = parseISO(`${schedule.targetPeriod}-01`);
        let exactDateStr = schedule.exactDate || getExactDateForMonth(task, monthDate);
        const endDateStr = schedule.endDateOverride || getEndDateForMonth(task, monthDate);
        let isPastDue = false;
        let scheduleDate = monthDate;
        let scheduleEndDate = monthDate;

        let displayExactDate = exactDateStr;
        if (exactDateStr && exactDateStr !== 'Not Set') {
          const parts = exactDateStr.split('-');
          if (parts.length === 3) {
            let exactYear = parseInt(schedule.targetPeriod.split('-')[0], 10);
            const targetMonth = parseInt(schedule.targetPeriod.split('-')[1], 10);
            const exactMonth = parseInt(parts[1], 10);
            if (exactMonth < targetMonth && (targetMonth - exactMonth) >= 6) {
              exactYear += 1;
            } else if (exactMonth > targetMonth && (exactMonth - targetMonth) >= 6) {
              exactYear -= 1;
            }
            displayExactDate = `${exactYear}-${parts[1]}-${parts[2]}`;
          }
          const parsed = parseISO(displayExactDate);
          if (!isNaN(parsed)) {
            scheduleDate = parsed;
            scheduleEndDate = parsed;
          }
          if (import.meta.env.DEV && task.taskName.includes('TESR')) {
            console.log('TaskMatrix upcomingSchedules TESR! ->', {
              targetPeriod: schedule.targetPeriod,
              exactDateStr,
              displayExactDate,
              parsed,
              scheduleDate
            });
          }
        }

        let displayEndDate = endDateStr;
        let parsedEnd = null;
        if (endDateStr && task.frequency !== 'Weekly') {
          const parts = endDateStr.split('-');
          if (parts.length === 3) {
            displayEndDate = endDateStr;
            parsedEnd = parseISO(displayEndDate);
          } else if (parts.length === 2) {
            let endYear = displayExactDate && displayExactDate !== 'Not Set'
              ? parseInt(displayExactDate.split('-')[0], 10)
              : parseInt(schedule.targetPeriod.split('-')[0], 10);
            const endMonth = parseInt(parts[0], 10);

            if (displayExactDate && displayExactDate !== 'Not Set') {
              const exactMonth = parseInt(displayExactDate.split('-')[1], 10);
              if (endMonth < exactMonth) {
                endYear += 1;
              }
            } else {
              const targetMonth = parseInt(schedule.targetPeriod.split('-')[1], 10);
              if (endMonth < targetMonth && (targetMonth - endMonth) >= 6) {
                endYear += 1;
              }
            }

            displayEndDate = `${endYear}-${parts[0]}-${parts[1]}`;
            parsedEnd = parseISO(displayEndDate);
          }
        } else if (task.frequency === 'Weekly') {
          displayEndDate = displayExactDate;
          parsedEnd = scheduleDate;
        }

        if (parsedEnd && !isNaN(parsedEnd)) {
          scheduleEndDate = parsedEnd;
        } else {
          scheduleEndDate = scheduleDate;
        }

        if (exactDateStr && exactDateStr !== 'Not Set') {
          if (isBefore(scheduleEndDate, today)) {
            isPastDue = true;
          }
        } else {
          if (schedule.targetPeriod < currentMonthStr) {
            isPastDue = true;
          }
        }

        list.push({
          task,
          site,
          schedule,
          monthDate,
          monthDisplay: displayExactDate && displayExactDate !== 'Not Set' ? format(parseISO(displayExactDate), 'MMM yyyy') : format(monthDate, 'MMM yyyy'),
          exactDate: displayExactDate,
          endDate: displayEndDate,
          scope: getDefaultScopeOfWorkForMonth(task, monthDate) || schedule.scopeOfWork || '',
          isPastDue,
          scheduleDate,
          scheduleEndDate
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
      return a.scheduleDate - b.scheduleDate;
    });



    return finalUpcoming;
  }, [periodicalTasks, sites, selectedSiteFilter, selectedFrequencyFilter]);

  const filteredUpcomingSchedules = useMemo(() => {
    // Only show Scheduled tasks in the Upcoming list view
    const onlyScheduled = upcomingSchedules.filter(item => item.schedule.status === 'Scheduled');

    if (upcomingFilter === 'all') return onlyScheduled;
    if (upcomingFilter === 'past_due') return onlyScheduled.filter(item => item.isPastDue);

    const today = startOfDay(new Date());
    let endDate;
    if (upcomingFilter === '1week') {
      endDate = addWeeks(today, 1);
    } else if (upcomingFilter === '15days') {
      endDate = addDays(today, 15);
    } else if (upcomingFilter === '1month') {
      endDate = addMonths(today, 1);
    }

    return onlyScheduled.filter(item => {
      // Do not include past due items in the upcoming timeframe filters
      if (item.isPastDue) return false;

      let itemDate = item.scheduleDate;
      return isBefore(itemDate, endDate) || itemDate.getTime() === endDate.getTime();
    });
  }, [upcomingSchedules, upcomingFilter]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [calendarDate]);

  const getTasksForDay = (day) => {
    return upcomingSchedules.filter(item => {
      const start = startOfDay(item.scheduleDate);
      const end = startOfDay(item.scheduleEndDate);
      const current = startOfDay(day);
      return (current.getTime() >= start.getTime() && current.getTime() <= end.getTime());
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-notion-card border border-notion-warm-gray-200">
      {/* Header Controls */}
      <div className="p-4 border-b border-notion-warm-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-notion-warm-white rounded-t-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h3 className="font-bold text-notion-black text-base md:text-lg">Periodical Task List</h3>
          <div className="grid grid-cols-3 sm:flex w-full sm:w-auto bg-white rounded-micro p-1 shadow-sm border border-notion-warm-gray-200 gap-1 sm:gap-0">
            <button
              className={`px-1 sm:px-3 py-1.5 sm:py-1 rounded-micro text-[10px] sm:text-xs font-bold transition-all text-center truncate ${viewMode === 'matrix' ? 'bg-notion-blue text-white shadow-sm' : 'text-notion-warm-gray-500 hover:text-notion-black'}`}
              onClick={() => setViewMode('matrix')}
            >Matrix</button>
            <button
              className={`px-1 sm:px-3 py-1.5 sm:py-1 rounded-micro text-[10px] sm:text-xs font-bold transition-all text-center truncate ${viewMode === 'upcoming' ? 'bg-notion-blue text-white shadow-sm' : 'text-notion-warm-gray-500 hover:text-notion-black'}`}
              onClick={() => setViewMode('upcoming')}
            >Upcoming</button>
            <button
              className={`px-1 sm:px-3 py-1.5 sm:py-1 rounded-micro text-[10px] sm:text-xs font-bold transition-all text-center truncate ${viewMode === 'calendar' ? 'bg-notion-blue text-white shadow-sm' : 'text-notion-warm-gray-500 hover:text-notion-black'}`}
              onClick={() => setViewMode('calendar')}
            >Calendar</button>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <div className="w-full">
              <Dropdown
                value={selectedSiteFilter}
                onChange={(val) => setSelectedSiteFilter(val)}
                options={[{ value: 'all', label: 'All Sites' }, ...sites.map(s => ({ value: s.id, label: s.siteName }))]}
              />
            </div>
            <div className="w-full">
              <Dropdown
                value={selectedFrequencyFilter}
                onChange={(val) => setSelectedFrequencyFilter(val)}
                options={[
                  { value: 'all', label: 'All Frequencies' },
                  { value: 'Weekly', label: 'Weekly' },
                  { value: 'Monthly', label: 'Monthly' },
                  { value: 'Quarterly', label: 'Quarterly' },
                  { value: '6 Monthly', label: '6 Monthly' },
                  { value: 'Yearly', label: 'Yearly' },
                  { value: 'Custom Date', label: 'Custom Date' }
                ]}
              />
            </div>
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

        {viewMode === 'calendar' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-white rounded-micro p-1 shadow-sm border border-notion-warm-gray-200 w-full sm:w-auto">
              <button
                onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                className="px-3 sm:px-2 py-2 sm:py-1 text-notion-warm-gray-500 hover:text-notion-black hover:bg-notion-warm-white rounded transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="px-3 py-1 text-xs font-bold text-notion-black min-w-[120px] text-center flex-1 sm:flex-none">
                {format(calendarDate, 'MMMM yyyy')}
              </div>
              <button
                onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                className="px-3 sm:px-2 py-2 sm:py-1 text-notion-warm-gray-500 hover:text-notion-black hover:bg-notion-warm-white rounded transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
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
              {groupedTasks.length === 0 && (
                <tr>
                  <td colSpan={5 + months.length} className="px-6 py-8 text-center text-notion-warm-gray-500">
                    No periodical tasks configured yet. Manage tasks within the Sites configuration.
                  </td>
                </tr>
              )}

              {groupedTasks.map(({ site, tasks }) => (
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
                      <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 text-center font-semibold bg-emerald-100 text-emerald-700 border-b border-white">
                        {Number(task.budgetHours || 0).toFixed(2)}
                      </td>

                      {/* Schedule Cells */}
                      {months.map(month => {
                        const schedule = getScheduleForMonth(task, month);
                        return (
                          <td
                            key={month.toISOString()}
                            onClick={() => {
                              if (schedule) {
                                if (schedule.isAggregated) {
                                  setShowAggregatedWarning(true);
                                  return;
                                }
                                const defaultScope = getDefaultScopeOfWorkForMonth(task, month);
                                setPopupScopeOfWork(schedule.scopeOfWork || defaultScope);
                                setPopupStatus(schedule.status);
                                setPopupHours(schedule.completedHours || '');
                                setPopupCompletionDate(schedule.completionDate || format(new Date(), 'yyyy-MM-dd'));
                                let popupScheduleDate = month;
                                const sMonthDate = parseISO(`${schedule.targetPeriod}-01`);
                                let exactDateStr;
                                if (task.frequency === 'Weekly' || task.frequency === 'Custom Date') {
                                  exactDateStr = schedule.exactDate || getExactDateForMonth(task, sMonthDate);
                                } else {
                                  exactDateStr = getExactDateForMonth(task, sMonthDate);
                                }
                                if (exactDateStr && exactDateStr !== 'Not Set') {
                                  const parts = exactDateStr.split('-');
                                  if (parts.length === 3) {
                                    let exactYear = parseInt(schedule.targetPeriod.split('-')[0], 10);
                                    const targetMonth = parseInt(schedule.targetPeriod.split('-')[1], 10);
                                    const exactMonth = parseInt(parts[1], 10);
                                    if (exactMonth < targetMonth && (targetMonth - exactMonth) >= 6) exactYear += 1;
                                    else if (exactMonth > targetMonth && (exactMonth - targetMonth) >= 6) exactYear -= 1;
                                    const parsed = parseISO(`${exactYear}-${parts[1]}-${parts[2]}`);
                                    if (!isNaN(parsed)) popupScheduleDate = parsed;
                                  }
                                }
                                setActivePopup({ task, schedule, monthDisplay: format(month, 'MMM yyyy'), monthDate: sMonthDate, scheduleDate: popupScheduleDate });
                              }
                            }}
                            className={`border-r border-white border-b text-center cursor-pointer hover:opacity-80 transition-opacity ${schedule ? getStatusColor(schedule.status) : 'bg-transparent border-r-notion-warm-gray-200'
                              }`}
                            title={schedule ? `${schedule.taskNameOverride || task.taskName}\nDate: ${schedule.exactDate || 'Default'}\nBudget: ${schedule.budgetHoursOverride !== undefined ? schedule.budgetHoursOverride : task.budgetHours} Hrs` : ''}
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
                          <span className="text-[10px] font-bold text-notion-warm-gray-400 uppercase tracking-widest">
                            {item.exactDate} {item.endDate ? ` - ${item.endDate}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-notion-black">
                      {item.site?.siteName || 'Unknown Site'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-notion-warm-white text-[10px] font-bold text-notion-warm-gray-500 uppercase tracking-widest rounded border whisper-border">
                          {item.schedule.taskCodeOverride || item.task.taskCode}
                        </span>
                        <span className="font-semibold text-notion-black">{item.schedule.taskNameOverride || item.task.taskName}</span>
                      </div>
                      <div className="text-[10px] text-notion-warm-gray-400 mt-1 uppercase tracking-widest">
                        {item.task.frequency} • {item.task.contractType}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {((item.schedule.assignedToOverride !== undefined ? item.schedule.assignedToOverride : item.task.assignedTo) && (item.schedule.assignedToOverride !== undefined ? item.schedule.assignedToOverride : item.task.assignedTo).length > 0) ? (
                        <div className="flex items-center -space-x-1.5">
                          {(Array.isArray(item.schedule.assignedToOverride !== undefined ? item.schedule.assignedToOverride : item.task.assignedTo) ? (item.schedule.assignedToOverride !== undefined ? item.schedule.assignedToOverride : item.task.assignedTo) : [item.schedule.assignedToOverride !== undefined ? item.schedule.assignedToOverride : item.task.assignedTo]).map((assignee, idx) => {
                            const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'];
                            const letter = (assignee || '?')[0].toUpperCase();
                            return (
                              <div key={idx} className="relative group/avatar">
                                <div className={`w-7 h-7 rounded-full ${colors[idx % colors.length]} flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white cursor-default`}>
                                  {letter}
                                </div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-notion-black text-white text-[10px] font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/avatar:opacity-100 transition-opacity duration-200 z-50">
                                  {assignee}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-notion-black rotate-45"></div>
                                </div>
                              </div>
                            );
                          })}
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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingScheduleOverride({
                              task: item.task,
                              schedule: item.schedule,
                              taskNameOverride: item.schedule.taskNameOverride || item.task.taskName,
                              taskCodeOverride: item.schedule.taskCodeOverride || item.task.taskCode,
                              budgetHoursOverride: item.schedule.budgetHoursOverride !== undefined ? item.schedule.budgetHoursOverride : item.task.budgetHours,
                              assignedToOverride: item.schedule.assignedToOverride !== undefined ? item.schedule.assignedToOverride : item.task.assignedTo,
                              exactDate: item.schedule.exactDate || getExactDateForMonth(item.task, item.monthDate),
                              endDateOverride: item.schedule.endDateOverride || getEndDateForMonth(item.task, item.monthDate)
                            });
                          }}
                          className="px-3 py-1.5 bg-white text-notion-warm-gray-600 text-xs font-bold border border-notion-warm-gray-200 rounded-micro hover:bg-notion-warm-white transition shadow-sm flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setPopupScopeOfWork(item.scope);
                            setPopupStatus(item.schedule.status);
                            setPopupHours(item.schedule.completedHours || '');
                            setPopupCompletionDate(item.schedule.completionDate || format(new Date(), 'yyyy-MM-dd'));
                            setActivePopup({
                              task: item.task,
                              schedule: item.schedule,
                              monthDisplay: item.monthDisplay,
                              monthDate: item.monthDate,
                              scheduleDate: item.scheduleDate
                            });
                          }}
                          className="px-3 py-1.5 bg-white text-notion-blue text-xs font-bold border border-notion-warm-gray-200 rounded-micro hover:bg-notion-badge-blue-bg transition shadow-sm"
                        >
                          Update Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="p-2 md:p-4 bg-white overflow-x-auto custom-scrollbar">
          <div className="grid grid-cols-7 gap-px bg-zinc-300 border border-zinc-300 rounded-lg overflow-hidden shadow-sm min-w-[700px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="bg-notion-warm-white py-2 text-center text-[10px] md:text-xs font-bold text-notion-warm-gray-500 uppercase tracking-widest">
                {day}
              </div>
            ))}
            {calendarDays.map((day, dayIdx) => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, calendarDate);
              const isTodayDate = isToday(day);
              const dayKey = day.toISOString();
              const isExpanded = expandedDays.has(dayKey);

              const visibleTasks = isExpanded ? dayTasks : dayTasks.slice(0, 3);
              const hiddenCount = dayTasks.length - 3;

              return (
                <div
                  key={day.toString()}
                  className={`min-h-[120px] p-1 md:p-2 flex flex-col gap-1 transition-colors ${isCurrentMonth ? 'bg-white' : 'bg-notion-warm-white/50 opacity-60'}`}
                >
                  <div className="flex justify-between items-start shrink-0">
                    <span className={`text-xs font-bold p-1 rounded-full w-6 h-6 flex items-center justify-center ${isTodayDate ? 'bg-notion-blue text-white' : 'text-notion-warm-gray-500'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mt-1 overflow-y-auto custom-scrollbar flex-1">
                    {visibleTasks.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setPopupScopeOfWork(item.scope);
                          setPopupStatus(item.schedule.status);
                          setPopupHours(item.schedule.completedHours || '');
                          setPopupCompletionDate(item.schedule.completionDate || format(new Date(), 'yyyy-MM-dd'));
                          setActivePopup({
                            task: item.task,
                            schedule: item.schedule,
                            monthDisplay: item.monthDisplay,
                            monthDate: item.monthDate,
                            scheduleDate: item.scheduleDate
                          });
                        }}
                        className={`shrink-0 text-[9px] md:text-[10px] font-bold px-1.5 py-1.5 rounded cursor-pointer truncate shadow-sm transition hover:opacity-80 border-l-2 ${item.schedule.status === 'Completed' ? 'bg-amber-50 text-amber-900 border-amber-400' :
                            item.schedule.status === 'Scheduled' ? 'bg-blue-50 text-notion-blue border-notion-blue' :
                              'bg-gray-100 text-gray-600 border-gray-400'
                          }`}
                        title={`${item.schedule.taskNameOverride || item.task.taskName} - ${item.site?.siteName}`}
                      >
                        {item.schedule.taskNameOverride || item.task.taskName}
                      </div>
                    ))}
                    {hiddenCount > 0 && !isExpanded && (
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedDays);
                          newExpanded.add(dayKey);
                          setExpandedDays(newExpanded);
                        }}
                        className="shrink-0 text-[10px] font-bold text-notion-warm-gray-500 hover:text-notion-black text-left pl-1 mt-0.5 hover:underline"
                      >
                        + {hiddenCount} more
                      </button>
                    )}
                    {isExpanded && hiddenCount > 0 && (
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedDays);
                          newExpanded.delete(dayKey);
                          setExpandedDays(newExpanded);
                        }}
                        className="shrink-0 text-[10px] font-bold text-notion-warm-gray-500 hover:text-notion-black text-left pl-1 mt-0.5 hover:underline"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Update Popup */}
      {activePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-white rounded-xl shadow-notion-card w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-notion-warm-gray-200 bg-notion-warm-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-notion-black text-sm">Update Task Status</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingScheduleOverride({
                      task: activePopup.task,
                      schedule: activePopup.schedule,
                      taskNameOverride: activePopup.schedule.taskNameOverride || activePopup.task.taskName,
                      taskCodeOverride: activePopup.schedule.taskCodeOverride || activePopup.task.taskCode,
                      budgetHoursOverride: activePopup.schedule.budgetHoursOverride !== undefined ? activePopup.schedule.budgetHoursOverride : activePopup.task.budgetHours,
                      assignedToOverride: activePopup.schedule.assignedToOverride !== undefined ? activePopup.schedule.assignedToOverride : activePopup.task.assignedTo,
                      exactDate: activePopup.schedule.exactDate || getExactDateForMonth(activePopup.task, activePopup.monthDate),
                      endDateOverride: activePopup.schedule.endDateOverride || getEndDateForMonth(activePopup.task, activePopup.monthDate)
                    });
                  }}
                  className="px-2 py-1 bg-white border border-notion-warm-gray-200 text-notion-warm-gray-600 hover:bg-notion-warm-white rounded-md text-xs font-semibold transition shadow-sm flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Instance
                </button>
                <button
                  onClick={() => setActivePopup(null)}
                  className="text-notion-warm-gray-500 hover:text-notion-black transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-1 text-sm">
                <p><span className="text-notion-warm-gray-500 font-medium">Task:</span> <span className="font-semibold text-notion-black">{activePopup.schedule.taskNameOverride || activePopup.task.taskName} ({activePopup.schedule.taskCodeOverride || activePopup.task.taskCode})</span></p>
                <p><span className="text-notion-warm-gray-500 font-medium">Budget:</span> <span className="font-semibold text-notion-black">{Number(activePopup.schedule.budgetHoursOverride !== undefined ? activePopup.schedule.budgetHoursOverride : (activePopup.task.budgetHours || 0)).toFixed(2)} Hrs</span></p>
                <p className="text-sm mb-1 text-notion-warm-gray-600">
                  <span className="text-notion-warm-gray-500 font-medium">Period:</span>
                  <span className="font-semibold text-notion-black">
                    {format(activePopup.scheduleDate || activePopup.monthDate, 'MMM yyyy')}
                  </span>
                </p>
                <p><span className="text-notion-warm-gray-500 font-medium">Date Range:</span> <span className="font-semibold text-notion-black">{activePopup.schedule.exactDate || getExactDateForMonth(activePopup.task, activePopup.monthDate)} {(activePopup.schedule.endDateOverride || getEndDateForMonth(activePopup.task, activePopup.monthDate)) ? ` - ${(activePopup.schedule.endDateOverride || getEndDateForMonth(activePopup.task, activePopup.monthDate))}` : ''}</span></p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-notion-warm-gray-500 font-medium shrink-0 text-sm">Assigned To:</span>
                  {((activePopup.schedule.assignedToOverride !== undefined ? activePopup.schedule.assignedToOverride : activePopup.task.assignedTo) && (activePopup.schedule.assignedToOverride !== undefined ? activePopup.schedule.assignedToOverride : activePopup.task.assignedTo).length > 0) ? (
                    <div className="flex items-center -space-x-1.5">
                      {(Array.isArray(activePopup.schedule.assignedToOverride !== undefined ? activePopup.schedule.assignedToOverride : activePopup.task.assignedTo) ? (activePopup.schedule.assignedToOverride !== undefined ? activePopup.schedule.assignedToOverride : activePopup.task.assignedTo) : [activePopup.schedule.assignedToOverride !== undefined ? activePopup.schedule.assignedToOverride : activePopup.task.assignedTo]).map((assignee, idx) => {
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'];
                        const letter = (assignee || '?')[0].toUpperCase();
                        return (
                          <div key={idx} className="relative group/avatar">
                            <div className={`w-7 h-7 rounded-full ${colors[idx % colors.length]} flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white cursor-default`}>
                              {letter}
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-notion-black text-white text-[10px] font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/avatar:opacity-100 transition-opacity duration-200 z-50">
                              {assignee}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-notion-black rotate-45"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-notion-warm-gray-300 text-xs italic">Unassigned</span>
                  )}
                </div>
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
                      className={`px-4 py-2 text-left rounded-md text-sm transition-all border ${popupStatus === status
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
                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300 grid grid-cols-[7fr_3fr] gap-6">
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

      {/* Aggregated Warning Popup */}
      {showAggregatedWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-white rounded-xl shadow-notion-card w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-notion-warm-gray-200 bg-amber-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-amber-900">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <h3 className="font-bold text-sm">Action Restricted</h3>
              </div>
              <button
                onClick={() => setShowAggregatedWarning(false)}
                className="text-amber-700 hover:text-amber-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm text-notion-black">
              <p>This month contains <strong>multiple weekly tasks</strong>.</p>
              <p className="text-notion-warm-gray-500">Please switch to the <strong className="text-notion-blue">Calendar</strong> or <strong className="text-notion-blue">Upcoming Tasks</strong> view to manage individual weekly visits.</p>
            </div>
            <div className="px-4 py-3 border-t border-notion-warm-gray-200 bg-notion-warm-white flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAggregatedWarning(false)}
                className="px-5 py-2 bg-notion-blue text-white hover:bg-blue-600 rounded-lg text-sm font-bold transition shadow-md"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule Instance Override Popup */}
      {editingScheduleOverride && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-white rounded-xl shadow-notion-card w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-notion-warm-gray-200 bg-notion-warm-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-notion-black text-base">Edit Instance Details</h3>
                <p className="text-xs text-notion-warm-gray-500 mt-0.5">Changes apply only to this specific visit.</p>
              </div>
              <button
                onClick={() => setEditingScheduleOverride(null)}
                className="text-notion-warm-gray-500 hover:text-notion-black transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-notion-warm-gray-500 uppercase tracking-widest mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={editingScheduleOverride.exactDate || ''}
                    onChange={(e) => setEditingScheduleOverride(prev => ({ ...prev, exactDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-notion-warm-gray-200 rounded-lg text-sm focus:border-notion-blue focus:ring-1 focus:ring-notion-blue outline-none text-notion-black transition-all"
                  />
                  <p className="text-[10px] text-notion-warm-gray-500 mt-1">Changing the start month moves the instance.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-notion-warm-gray-500 uppercase tracking-widest mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={editingScheduleOverride.endDateOverride || ''}
                    onChange={(e) => setEditingScheduleOverride(prev => ({ ...prev, endDateOverride: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-notion-warm-gray-200 rounded-lg text-sm focus:border-notion-blue focus:ring-1 focus:ring-notion-blue outline-none text-notion-black transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-notion-warm-gray-500 uppercase tracking-widest mb-1.5">Task Name</label>
                  <input
                    type="text"
                    value={editingScheduleOverride.taskNameOverride || ''}
                    onChange={(e) => setEditingScheduleOverride(prev => ({ ...prev, taskNameOverride: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-notion-warm-gray-200 rounded-lg text-sm focus:border-notion-blue focus:ring-1 focus:ring-notion-blue outline-none text-notion-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-notion-warm-gray-500 uppercase tracking-widest mb-1.5">Task Code</label>
                  <input
                    type="text"
                    value={editingScheduleOverride.taskCodeOverride || ''}
                    onChange={(e) => setEditingScheduleOverride(prev => ({ ...prev, taskCodeOverride: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-notion-warm-gray-200 rounded-lg text-sm focus:border-notion-blue focus:ring-1 focus:ring-notion-blue outline-none text-notion-black transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-notion-warm-gray-500 uppercase tracking-widest mb-1.5">Budget Hours</label>
                  <input
                    type="number"
                    step="0.25"
                    value={editingScheduleOverride.budgetHoursOverride !== undefined ? editingScheduleOverride.budgetHoursOverride : ''}
                    onChange={(e) => setEditingScheduleOverride(prev => ({ ...prev, budgetHoursOverride: e.target.value !== '' ? parseFloat(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 bg-white border border-notion-warm-gray-200 rounded-lg text-sm focus:border-notion-blue focus:ring-1 focus:ring-notion-blue outline-none text-notion-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-notion-warm-gray-500 uppercase tracking-widest mb-1.5">Assigned To (Emails)</label>
                  <input
                    type="text"
                    value={Array.isArray(editingScheduleOverride.assignedToOverride) ? editingScheduleOverride.assignedToOverride.join(', ') : (editingScheduleOverride.assignedToOverride || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      const arr = val.split(',').map(s => s.trim()).filter(Boolean);
                      setEditingScheduleOverride(prev => ({ ...prev, assignedToOverride: arr.length > 0 ? arr : undefined }));
                    }}
                    placeholder="email1, email2..."
                    className="w-full px-3 py-2 bg-white border border-notion-warm-gray-200 rounded-lg text-sm focus:border-notion-blue focus:ring-1 focus:ring-notion-blue outline-none text-notion-black transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-notion-warm-gray-200 bg-notion-warm-white flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingScheduleOverride(null)}
                className="px-4 py-2 bg-white whisper-border text-notion-warm-gray-500 hover:bg-notion-warm-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateScheduleOverrides) {
                    onUpdateScheduleOverrides(
                      editingScheduleOverride.task.id,
                      editingScheduleOverride.schedule.id,
                      {
                        taskNameOverride: editingScheduleOverride.taskNameOverride,
                        taskCodeOverride: editingScheduleOverride.taskCodeOverride,
                        budgetHoursOverride: editingScheduleOverride.budgetHoursOverride,
                        assignedToOverride: editingScheduleOverride.assignedToOverride,
                        exactDate: editingScheduleOverride.exactDate,
                        endDateOverride: editingScheduleOverride.endDateOverride
                      }
                    );
                  }
                  setEditingScheduleOverride(null);
                  setActivePopup(null); // Close the status popup too since it might be stale or moved
                }}
                className="px-5 py-2 bg-notion-blue text-white hover:bg-blue-600 rounded-lg text-sm font-bold transition shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskMatrix;
