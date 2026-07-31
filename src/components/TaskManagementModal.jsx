import React, { useState, useEffect, useMemo } from 'react';
import Dropdown from './Dropdown';
import { getContractors } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import { format, addMonths, startOfYear, eachDayOfInterval, parseISO, isBefore } from '../utils/dateUtils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TaskManagementModal = ({ site, tasks: initialTasks, onSave, onClose }) => {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [profileUsers, setProfileUsers] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState({});

  useEffect(() => {
    const loadProfiles = () => {
      try {
        const contractors = getContractors() || [];
        const filtered = contractors.filter(u => {
          const role = u.role?.toLowerCase() || '';
          return role.includes('manager') || role.includes('supervisor') || role.includes('mod');
        });
        setProfileUsers(filtered);
      } catch (e) { /* ignore */ }
    };
    loadProfiles();
  }, []);

  const getInitialPeriods = (freq) => {
    if (freq === 'Custom Date') return [{ name: 'Custom Schedule', hours: 0, pricing: 0, customDate: '', endDate: '', scopeOfWork: '' }];
    if (freq === 'Quarterly') return [
      { name: '1st Quarter', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' },
      { name: '2nd Quarter', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' },
      { name: '3rd Quarter', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' },
      { name: '4th Quarter', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }
    ];
    if (freq === 'Monthly') {
      return MONTHS.map(m => ({ name: m.substring(0, 3), hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }));
    }
    if (freq === '6 Monthly') return [
      { name: '1st Half', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' },
      { name: '2nd Half', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }
    ];
    if (freq === 'Yearly') return [{ name: 'Annual', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }];
    if (freq === 'Weekly') return [{ name: 'Weekly Average', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }];
    return [];
  };

  const mergePeriods = (existingPeriods, frequency) => {
    const initial = getInitialPeriods(frequency);
    if (!existingPeriods || existingPeriods.length === 0) return initial;
    
    if (['Monthly', 'Quarterly', '6 Monthly', 'Yearly'].includes(frequency)) {
       return initial.map(initPeriod => {
          const existing = existingPeriods.find(p => p.name === initPeriod.name);
          if (existing) return existing;
          return { ...initPeriod, isDisabled: true };
       });
    }
    return existingPeriods;
  };

  const [newTask, setNewTask] = useState({
    taskCode: '',
    taskName: '',
    frequency: 'Custom Date',
    contractType: 'AD/HOC',
    assignedTo: [],
    startingMonth: 0, // January = 0
    periods: getInitialPeriods('Custom Date'),
    weeklyDays: []
  });

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const handleFileUpload = async (e, arrayIndex, isEditingTask = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!supabase) {
      alert("Supabase is not configured!");
      return;
    }

    setUploadingFiles(prev => ({ ...prev, [arrayIndex]: true }));
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('scope_files')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('scope_files')
        .getPublicUrl(filePath);

      if (isEditingTask) {
        const newPeriods = [...editingTask.periods];
        newPeriods[arrayIndex] = { ...newPeriods[arrayIndex], scopeFileUrl: data.publicUrl, scopeFileName: file.name };
        setEditingTask({ ...editingTask, periods: newPeriods });
      } else {
        handleTaskPeriodChange(arrayIndex, 'scopeFileUrl', data.publicUrl);
        handleTaskPeriodChange(arrayIndex, 'scopeFileName', file.name);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file: " + error.message);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [arrayIndex]: false }));
    }
  };

  const handleTaskFrequencyChange = (val) => {
    setNewTask({
      ...newTask,
      frequency: val,
      startingMonth: 0,
      periods: getInitialPeriods(val),
      weeklyDays: val === 'Weekly' ? ['Mon'] : []
    });
  };

  const handleTaskPeriodChange = (index, field, value) => {
    const updatedPeriods = [...newTask.periods];
    if (field === 'customDate' || field === 'exactDate' || field === 'endDate' || field === 'scopeOfWork' || field === 'scopeFileUrl' || field === 'scopeFileName') {
      updatedPeriods[index][field] = value;
    } else {
      updatedPeriods[index][field] = parseFloat(value) || 0;
    }
    setNewTask({ ...newTask, periods: updatedPeriods });
  };

  const calculateTaskTotals = (taskPeriods, frequency, weeklyDays) => {
    const activePeriods = taskPeriods.filter(p => !p.isDisabled);
    let totalHours = activePeriods.reduce((sum, p) => sum + (p.hours || 0), 0);
    let totalPrice = activePeriods.reduce((sum, p) => sum + (p.pricing || 0), 0);
    if (frequency === 'Weekly') {
      const occurrencesPerYear = (weeklyDays?.length || 0) * 52;
      totalHours *= occurrencesPerYear;
      totalPrice *= occurrencesPerYear;
    }
    return { totalHours, totalPrice };
  };

  const generateSchedules = (frequency, startingMonth = 0, periods = [], existingSchedules = [], weeklyDays = []) => {
    if (frequency === 'Custom Date') {
      const schedules = [];
      const customDate = periods[0]?.customDate;
      if (customDate) {
        const targetPeriod = customDate.substring(0, 7); // yyyy-MM
        schedules.push({ id: crypto.randomUUID(), targetPeriod, exactDate: customDate, status: 'Scheduled' });
      }
      return schedules;
    }

    if (frequency === 'Weekly') {
      const schedules = [];
      
      const customStartDateStr = periods[0]?.exactDate;
      const customEndDateStr = periods[0]?.endDate;

      const currentYear = new Date().getFullYear();
      let currentDate = new Date(currentYear, startingMonth, 1);
      
      if (customStartDateStr) {
        const parsedStart = parseISO(customStartDateStr);
        if (!isNaN(parsedStart)) currentDate = parsedStart;
      }
      
      let endDate = addMonths(new Date(currentYear, startingMonth, 1), 36);
      if (customEndDateStr) {
        const parsedEnd = parseISO(customEndDateStr);
        if (!isNaN(parsedEnd) && isBefore(parsedEnd, endDate)) {
          endDate = parsedEnd;
        }
      }

      const days = eachDayOfInterval({ start: currentDate, end: endDate });
      days.forEach(day => {
        const dayName = format(day, 'EEE'); // 'Mon', 'Tue', etc.
        if (weeklyDays.includes(dayName)) {
          const targetPeriod = format(day, 'yyyy-MM');
          const exactDate = format(day, 'yyyy-MM-dd');
          const existing = existingSchedules.find(s => s.exactDate === exactDate);
          if (existing) {
            schedules.push(existing);
          } else {
            schedules.push({
              id: crypto.randomUUID(),
              targetPeriod,
              exactDate,
              status: 'Scheduled'
            });
          }
        }
      });
      return schedules;
    }

    let interval = 1;
    if (frequency === 'Monthly') interval = 1;
    if (frequency === 'Quarterly') interval = 3;
    if (frequency === '6 Monthly') interval = 6;
    if (frequency === 'Yearly') interval = 12;

    const schedules = [];
    const currentYear = new Date().getFullYear();
    // Start from startingMonth of current year
    let currentDate = new Date(currentYear, startingMonth, 1);

    const totalMonths = 36; // Generate for 3 years
    const allPeriods = getInitialPeriods(frequency);
    let iteration = 0;

    for (let i = 0; i < totalMonths; i += interval) {
      let expectedName = '';
      if (frequency === 'Monthly') {
        expectedName = allPeriods[currentDate.getMonth()]?.name;
      } else if (allPeriods.length > 0) {
        expectedName = allPeriods[iteration % allPeriods.length]?.name;
      }

      const isActive = expectedName ? periods.some(p => p.name === expectedName && !p.isDisabled) : true;

      if (isActive) {
        const targetPeriod = format(currentDate, 'yyyy-MM');
        const existing = existingSchedules.find(s => s.targetPeriod === targetPeriod);
        if (existing) {
          schedules.push(existing);
        } else {
          schedules.push({
            id: crypto.randomUUID(),
            targetPeriod,
            status: 'Scheduled'
          });
        }
      }
      currentDate = addMonths(currentDate, interval);
      iteration++;
    }
    return schedules;
  };

  const handleEditTask = (taskId) => {
    const taskToEdit = tasks.find(t => t.id === taskId);
    if (!taskToEdit) return;
    setNewTask({
      taskCode: taskToEdit.taskCode || '',
      taskName: taskToEdit.taskName || '',
      frequency: taskToEdit.frequency || 'Monthly',
      contractType: taskToEdit.contractType || 'AD/HOC',
      assignedTo: Array.isArray(taskToEdit.assignedTo) ? taskToEdit.assignedTo : (taskToEdit.assignedTo ? [taskToEdit.assignedTo] : []),
      startingMonth: taskToEdit.startingMonth || 0,
      periods: mergePeriods(taskToEdit.periodBudgets, taskToEdit.frequency || 'Monthly'),
      weeklyDays: taskToEdit.weeklyDays || (taskToEdit.frequency === 'Weekly' ? ['Mon'] : [])
    });
    setEditingTaskId(taskId);
    setIsNewTaskOpen(true);
  };

  const handleAddTask = () => {
    if (!newTask.taskName || !newTask.taskCode) return;
    
    const { totalHours, totalPrice } = calculateTaskTotals(newTask.periods, newTask.frequency, newTask.weeklyDays);
    let finalStartingMonth = newTask.startingMonth;
    if (newTask.frequency !== 'Monthly') {
      const firstExactDate = newTask.periods?.[0]?.exactDate;
      if (firstExactDate) {
        finalStartingMonth = parseInt(firstExactDate.split('-')[1], 10) - 1;
      } else {
        finalStartingMonth = 0;
      }
    }
    
    if (editingTaskId) {
      const existingTask = tasks.find(t => t.id === editingTaskId);
      const freqChanged = existingTask.frequency !== newTask.frequency;
      const monthChanged = (existingTask.startingMonth || 0) !== newTask.startingMonth;
      const updatedTask = {
        ...existingTask,
        taskCode: newTask.taskCode.toUpperCase().trim(),
        taskName: newTask.taskName,
        frequency: newTask.frequency,
        startingMonth: finalStartingMonth,
        budgetHours: totalHours,
        budgetPrice: totalPrice,
        periodBudgets: newTask.periods,
        contractType: newTask.contractType,
        assignedTo: newTask.assignedTo,
        weeklyDays: newTask.frequency === 'Weekly' ? newTask.weeklyDays : [],
        schedules: generateSchedules(newTask.frequency, finalStartingMonth, newTask.periods, existingTask.schedules || [], newTask.weeklyDays)
      };
      setTasks(tasks.map(t => t.id === editingTaskId ? updatedTask : t));
      setEditingTaskId(null);
    } else {
      const taskToAdd = {
        id: crypto.randomUUID(),
        siteId: site?.id || '',
        taskCode: newTask.taskCode.toUpperCase().trim(),
        taskName: newTask.taskName,
        frequency: newTask.frequency,
        startingMonth: finalStartingMonth,
        budgetHours: totalHours,
        budgetPrice: totalPrice,
        periodBudgets: newTask.periods,
        contractType: newTask.contractType,
        assignedTo: newTask.assignedTo,
        weeklyDays: newTask.frequency === 'Weekly' ? newTask.weeklyDays : [],
        schedules: generateSchedules(newTask.frequency, finalStartingMonth, newTask.periods, [], newTask.weeklyDays)
      };
      setTasks([...tasks, taskToAdd]);
    }

    setNewTask({
      taskCode: '',
      taskName: '',
      frequency: 'Custom Date',
      contractType: 'AD/HOC',
      assignedTo: [],
      startingMonth: 0,
      periods: getInitialPeriods('Custom Date'),
      weeklyDays: []
    });
    setIsNewTaskOpen(false);
  };

  const removeTask = (taskId) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleSaveAll = () => {
    if (isNewTaskOpen && newTask.taskName && newTask.taskCode) {
      if (!window.confirm('You have an unsaved task in the form. Are you sure you want to discard it and close?')) {
        return;
      }
    }
    onSave(site.id, tasks);
  };

  const showStartingMonth = newTask.frequency === 'Monthly';

  const supervisorOptions = useMemo(() => {
    return profileUsers
      .filter(u => String(u.role || '').toLowerCase().includes('supervisor'))
      .map(u => ({ value: u.email, label: `${u.name || u.email} (${u.role})` }));
  }, [profileUsers]);

  const managerOptions = useMemo(() => {
    return profileUsers
      .filter(u => String(u.role || '').toLowerCase().includes('manager'))
      .map(u => ({ value: u.email, label: `${u.name || u.email} (${u.role})` }));
  }, [profileUsers]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-xl shadow-2xl animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-notion-warm-gray-200 bg-notion-warm-white rounded-t-xl shrink-0">
          <div>
            <h2 className="text-lg font-bold text-notion-black">Manage Periodical Tasks</h2>
            <p className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mt-1">{site?.siteName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-notion-warm-white rounded-micro transition-all text-notion-warm-gray-300 hover:text-notion-black"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {/* Add/Edit Task Form */}
          <div className="bg-notion-warm-white/50 p-4 sm:p-6 rounded-comfortable whisper-border shadow-sm">
            <button 
              type="button" 
              className="w-full flex items-center justify-between outline-none"
              onClick={() => setIsNewTaskOpen(!isNewTaskOpen)}
            >
              <h3 className="text-badge font-bold text-notion-black uppercase tracking-widest text-left">
                {editingTaskId ? '✏️ Editing Task' : '➕ New Task'}
              </h3>
              <svg className={`w-5 h-5 text-notion-warm-gray-400 transition-transform ${isNewTaskOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {isNewTaskOpen && (
              <div className="mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-4">
                  <div>
                    <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-2 block">Task Code</label>
                    <input
                      type="text"
                      value={newTask.taskCode}
                      onChange={(e) => setNewTask({ ...newTask, taskCode: e.target.value })}
                      placeholder="e.g. RWC001"
                      className="w-full px-3 py-2 bg-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all uppercase tracking-widest text-badge"
                    />
                  </div>
                  <div>
                    <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-2 block">Task Name</label>
                    <input
                      type="text"
                      value={newTask.taskName}
                      onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                      placeholder="Shampoo Carpets"
                      className="w-full px-3 py-2 bg-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all text-badge"
                    />
                  </div>
                  <div>
                    <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-2 block">Frequency</label>
                    <Dropdown
                      value={newTask.frequency}
                      onChange={handleTaskFrequencyChange}
                      options={[
                        { value: 'Weekly', label: 'Weekly' },
                        { value: 'Monthly', label: 'Monthly' },
                        { value: 'Quarterly', label: 'Quarterly' },
                        { value: '6 Monthly', label: '6 Monthly' },
                        { value: 'Yearly', label: 'Yearly' },
                        { value: 'Custom Date', label: 'Custom Date' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-2 block">Contract Type</label>
                    <Dropdown
                      value={newTask.contractType}
                      onChange={(val) => setNewTask({ ...newTask, contractType: val })}
                      options={[
                        { value: 'AD/HOC', label: 'AD/HOC' },
                        { value: 'On Request', label: 'On Request' },
                        { value: 'Scheduled', label: 'Scheduled' }
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {(() => {
                    const assignedToArray = Array.isArray(newTask.assignedTo) ? newTask.assignedTo : (newTask.assignedTo ? [newTask.assignedTo] : []);
                    return (
                      <>
                        <div>
                          <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-2 block">Assign Supervisors</label>
                          <Dropdown
                            value={assignedToArray.filter(val => supervisorOptions.some(o => o.value === val))}
                            onChange={(val) => {
                              const others = assignedToArray.filter(v => !supervisorOptions.some(o => o.value === v));
                              setNewTask({ ...newTask, assignedTo: [...others, ...val] });
                            }}
                            options={supervisorOptions}
                            placeholder="Select supervisors..."
                            isMulti={true}
                          />
                        </div>
                        <div>
                          <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-2 block">Assign Managers</label>
                          <Dropdown
                            value={assignedToArray.filter(val => managerOptions.some(o => o.value === val))}
                            onChange={(val) => {
                              const others = assignedToArray.filter(v => !managerOptions.some(o => o.value === v));
                              setNewTask({ ...newTask, assignedTo: [...others, ...val] });
                            }}
                            options={managerOptions}
                            placeholder="Select managers..."
                            isMulti={true}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>

            {/* Starting Month Selector */}
            {showStartingMonth && (
              <div className="mb-4 p-3 bg-notion-badge-blue-bg/30 rounded-micro border border-notion-blue/20">
                <label className="text-badge font-bold text-notion-blue uppercase tracking-widest mb-2 block">Starting Month</label>
                <p className="text-[10px] text-notion-warm-gray-500 mb-2">
                  The schedule will begin from this month and repeat every {newTask.frequency === 'Monthly' ? '1 month' : newTask.frequency === 'Quarterly' ? '3 months' : newTask.frequency === '6 Monthly' ? '6 months' : '12 months'}.
                </p>
                <div className="w-48">
                  <Dropdown
                    value={newTask.startingMonth}
                    onChange={(val) => setNewTask({ ...newTask, startingMonth: parseInt(val) })}
                    options={MONTHS.map((m, i) => ({ value: i, label: m }))}
                  />
                </div>
              </div>
            )}

            {/* Period Budget Breakdown */}
            <div className="border-t border-notion-warm-gray-200 pt-4 mt-4">
              <h4 className="text-badge font-bold text-notion-blue uppercase tracking-widest mb-3">Period Budget Breakdown</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {newTask.periods
                  .map((period, arrayIndex) => {
                    const trueMonthIndex = newTask.frequency === 'Monthly'
                      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(period.name)
                      : arrayIndex;
                    return { period, trueMonthIndex, arrayIndex };
                  })
                  .sort((a, b) => {
                    if (newTask.frequency !== 'Monthly') return 0;
                    const aRel = (a.trueMonthIndex - (newTask.startingMonth || 0) + 12) % 12;
                    const bRel = (b.trueMonthIndex - (newTask.startingMonth || 0) + 12) % 12;
                    return aRel - bRel;
                  })
                  .map(({ period, trueMonthIndex, arrayIndex }) => {
                    let minDate = '';
                    let maxDate = '';
                    if (newTask.frequency === 'Monthly') {
                      const year = new Date().getFullYear() + (trueMonthIndex < (newTask.startingMonth || 0) ? 1 : 0);
                      const paddedMonth = String(trueMonthIndex + 1).padStart(2, '0');
                      minDate = `${year}-${paddedMonth}-01`;
                      const lastDay = new Date(year, trueMonthIndex + 1, 0).getDate();
                      maxDate = `${year}-${paddedMonth}-${lastDay}`;
                    }
                    return (
                  <div key={arrayIndex} className="p-3 bg-white whisper-border rounded-micro shadow-sm relative group">
                    <button
                      type="button"
                      onClick={() => {
                        const newPeriods = [...newTask.periods];
                        newPeriods[arrayIndex] = { ...newPeriods[arrayIndex], isDisabled: !period.isDisabled };
                        setNewTask({ ...newTask, periods: newPeriods });
                      }}
                      className={`absolute top-2 right-2 p-1 rounded transition-all ${period.isDisabled ? 'text-notion-blue hover:bg-notion-badge-blue-bg opacity-100' : 'text-notion-warm-gray-200 hover:text-rose-600 hover:bg-notion-badge-rose-bg opacity-0 group-hover:opacity-100'}`}
                      title={period.isDisabled ? "Activate Period" : "Disable Period"}
                    >
                      {period.isDisabled ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      )}
                    </button>
                    <h5 className={`font-bold text-[11px] text-notion-black mb-2 border-b border-notion-warm-gray-200 pb-1 pr-6 ${period.isDisabled ? 'line-through text-notion-warm-gray-400' : ''}`}>
                      {newTask.frequency === 'Monthly' ? `${period.name} ${new Date().getFullYear() + (trueMonthIndex < (newTask.startingMonth || 0) ? 1 : 0)}` : period.name}
                      {period.isDisabled && <span className="text-[9px] text-notion-warm-gray-300 ml-2 uppercase tracking-widest bg-notion-warm-white px-1 py-0.5 rounded-micro no-underline">Disabled</span>}
                    </h5>
                    <div className={`space-y-2 transition-all ${period.isDisabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>

                    {newTask.frequency === 'Weekly' && (
                      <div className="mb-3">
                        <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">Select Days <span className="text-notion-blue">*</span></label>
                        <div className="flex flex-wrap gap-1">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
                            const isSelected = newTask.weeklyDays.includes(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  const newDays = isSelected 
                                    ? newTask.weeklyDays.filter(day => day !== d)
                                    : [...newTask.weeklyDays, d];
                                  setNewTask({ ...newTask, weeklyDays: newDays });
                                }}
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-micro border transition-colors ${isSelected ? 'bg-notion-blue text-white border-notion-blue' : 'bg-white text-notion-warm-gray-500 border-notion-warm-gray-200 hover:bg-notion-warm-white'}`}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {newTask.frequency === 'Custom Date' ? (
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">Start Date <span className="text-notion-blue">*</span></label>
                            <input
                              type="date"
                              value={period.customDate || ''}
                              onChange={(e) => handleTaskPeriodChange(arrayIndex, 'customDate', e.target.value)}
                              className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold outline-none focus:border-notion-blue"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">End Date</label>
                            <input
                              type="date"
                              value={period.endDate || ''}
                              min={period.customDate || undefined}
                              onChange={(e) => handleTaskPeriodChange(arrayIndex, 'endDate', e.target.value)}
                              className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold outline-none focus:border-notion-blue"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">Start Date</label>
                            <input
                              type="date"
                              value={period.exactDate || ''}
                              min={minDate || undefined}
                              max={maxDate || undefined}
                              onChange={(e) => handleTaskPeriodChange(arrayIndex, 'exactDate', e.target.value)}
                              className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold outline-none focus:border-notion-blue"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">End Date</label>
                            <input
                              type="date"
                              value={period.endDate || ''}
                              min={period.exactDate || minDate || undefined}
                              max={maxDate || undefined}
                              onChange={(e) => handleTaskPeriodChange(arrayIndex, 'endDate', e.target.value)}
                              className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold outline-none focus:border-notion-blue"
                            />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">
                          {newTask.frequency === 'Weekly' ? 'Hours / visit' : 'Hours'}
                        </label>
                        <input
                          type="number"
                          value={period.hours || ''}
                          onChange={(e) => handleTaskPeriodChange(arrayIndex, 'hours', e.target.value)}
                          className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold tabular-nums outline-none focus:border-notion-blue"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">
                          {newTask.frequency === 'Weekly' ? 'Pricing / visit ($)' : 'Pricing ($)'}
                        </label>
                        <input
                          type="number"
                          value={period.pricing || ''}
                          onChange={(e) => handleTaskPeriodChange(arrayIndex, 'pricing', e.target.value)}
                          className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold tabular-nums outline-none focus:border-notion-blue"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">Scope of Work</label>
                        <textarea
                          value={period.scopeOfWork || ''}
                          onChange={(e) => handleTaskPeriodChange(arrayIndex, 'scopeOfWork', e.target.value)}
                          placeholder="Describe scope..."
                          rows={2}
                          className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold outline-none focus:border-notion-blue resize-none"
                        />
                      </div>
                      <div className="mt-2">
                        <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">Attached Document</label>
                        {period.scopeFileUrl ? (
                          <div className="flex items-center justify-between bg-notion-badge-blue-bg/50 px-2 py-1 rounded-micro border border-notion-blue/20">
                            <a href={period.scopeFileUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-notion-blue truncate w-24" title={period.scopeFileName || "View File"}>
                              {period.scopeFileName || "Document"}
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                  handleTaskPeriodChange(arrayIndex, 'scopeFileUrl', null);
                                  handleTaskPeriodChange(arrayIndex, 'scopeFileName', null);
                              }}
                              className="text-notion-warm-gray-400 hover:text-rose-600 ml-1"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : (
                          <div className="relative inline-block">
                            <input
                              type="file"
                              onChange={(e) => handleFileUpload(e, arrayIndex, false)}
                              disabled={uploadingFiles[arrayIndex]}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                              title="Upload Document"
                            />
                            <div className={`w-6 h-6 flex items-center justify-center bg-notion-warm-white hover:bg-notion-warm-gray-100 whisper-border rounded text-notion-warm-gray-500 transition-colors ${uploadingFiles[arrayIndex] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                              {uploadingFiles[arrayIndex] ? (
                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-6 mt-4 p-3 bg-notion-badge-blue-bg/30 rounded-micro border border-notion-blue/20">
                <div className="text-sm">
                  <span className="font-bold text-notion-warm-gray-500 uppercase tracking-widest text-[10px] block">Total Hours</span>
                  <span className="font-bold text-notion-black">{calculateTaskTotals(newTask.periods, newTask.frequency, newTask.weeklyDays).totalHours.toFixed(2)} hrs</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold text-notion-black-500 uppercase tracking-widest text-[10px] block">Total Price</span>
                  <span className="font-bold text-notion-black">${calculateTaskTotals(newTask.periods, newTask.frequency, newTask.weeklyDays).totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

              <div className="flex justify-end gap-3 mt-8">
                {editingTaskId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTaskId(null);
                      setNewTask({
                        taskCode: '',
                        taskName: '',
                        frequency: 'Custom Date',
                        contractType: 'AD/HOC',
                        assignedTo: [],
                        startingMonth: 0,
                        periods: getInitialPeriods('Custom Date')
                      });
                      setIsNewTaskOpen(false);
                    }}
                    className="px-6 py-2.5 bg-notion-warm-white hover:bg-notion-warm-gray-100 whisper-border rounded-micro text-[11px] font-bold text-notion-black tracking-widest uppercase transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                      handleAddTask();
                      setIsNewTaskOpen(false);
                  }}
                  className={`px-8 py-2.5 rounded-micro text-[11px] font-bold tracking-widest uppercase shadow-sm transition-all ${
                    (!newTask.taskName || !newTask.taskCode) 
                      ? 'bg-notion-warm-gray-100 text-notion-warm-gray-300 cursor-not-allowed'
                      : 'bg-notion-blue text-white hover:bg-blue-600 hover:shadow-md'
                  }`}
                  disabled={!newTask.taskName || !newTask.taskCode}
                >
                  {editingTaskId ? 'Update Task' : 'Add Task'}
                </button>
              </div>
            </div>
            )}
          </div>

          {/* Task List Section */}
          <div className="space-y-3">
            {/* Desktop Task List */}
            {tasks.length > 0 && (
              <div className="hidden md:block space-y-3">
                <div className="grid grid-cols-7 gap-4 px-4 py-2 text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                  <div className="col-span-1">Code</div>
                  <div className="col-span-2">Task Name</div>
                  <div className="col-span-1">Frequency</div>
                  <div className="col-span-1">Starts</div>
                  <div className="col-span-1">Budget</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
                {tasks.map(task => (
                  <div key={task.id} className={`grid grid-cols-7 gap-4 items-center p-4 whisper-border rounded-comfortable hover:shadow-notion-card transition-all group ${editingTaskId === task.id ? 'bg-notion-badge-blue-bg border-notion-blue' : 'bg-notion-warm-white/30'}`}>
                    <div className="col-span-1">
                      <div className="text-body-semibold text-notion-black uppercase tracking-widest truncate text-sm">{task.taskCode}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-body-semibold text-notion-black text-sm">{task.taskName}</div>
                      <div className="text-[10px] text-notion-warm-gray-300 uppercase tracking-widest mt-0.5">{task.contractType}</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-badge font-bold text-notion-warm-gray-500 uppercase tracking-widest">{task.frequency}</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-badge font-bold text-notion-warm-gray-500">{MONTHS[task.startingMonth || 0]?.substring(0, 3)}</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-center font-bold text-amber-900 tabular-nums bg-amber-100 whisper-border px-2 py-1 rounded-micro shadow-sm inline-block whitespace-nowrap text-xs">
                        {calculateTaskTotals(task.periodBudgets || [], task.frequency, task.weeklyDays || []).totalHours.toFixed(1)}h <span className="text-notion-blue ml-1">${calculateTaskTotals(task.periodBudgets || [], task.frequency, task.weeklyDays || []).totalPrice.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="col-span-1 text-right flex justify-end gap-2">
                      <button
                      onClick={() => {
                          handleEditTask(task.id);
                          setIsNewTaskOpen(true);
                      }}
                      className="text-notion-warm-gray-300 hover:text-notion-blue transition-colors px-2 py-1 bg-white hover:bg-notion-badge-blue-bg/50 whisper-border rounded-micro"
                      title="Edit Task"
                    >
                      ✏️ Edit
                    </button>
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className="p-2 text-notion-warm-gray-100 hover:text-rose-600 hover:bg-notion-badge-rose-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                        title="Delete Task"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Mobile Task List */}
            {tasks.length > 0 && (
              <div className="block md:hidden space-y-3">
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`p-4 whisper-border rounded-comfortable hover:shadow-notion-card transition-all ${
                      editingTaskId === task.id ? 'bg-notion-badge-blue-bg border-notion-blue' : 'bg-notion-warm-white/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="px-2 py-0.5 bg-white whisper-border rounded text-[10px] font-bold text-notion-black uppercase tracking-widest mr-2">
                          {task.taskCode}
                        </span>
                        <span className="font-bold text-notion-black text-sm">{task.taskName}</span>
                      </div>
                      <span className="text-[10px] text-notion-warm-gray-300 font-bold uppercase tracking-widest">
                        {task.contractType}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-notion-warm-gray-100/50 py-2 my-2">
                      <div>
                        <span className="text-[10px] font-semibold text-notion-warm-gray-400 block uppercase tracking-wider">Frequency</span>
                        <span className="font-semibold text-notion-warm-gray-600">{task.frequency}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-notion-warm-gray-400 block uppercase tracking-wider">Starts</span>
                        <span className="font-semibold text-notion-warm-gray-600">{MONTHS[task.startingMonth || 0]}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-1">
                      <div>
                        <span className="text-[10px] font-semibold text-notion-warm-gray-400 block uppercase tracking-wider">Budget Allocation</span>
                        <span className="font-bold text-amber-950 text-xs bg-amber-100 px-2 py-0.5 rounded border border-amber-200/50">
                          {calculateTaskTotals(task.periodBudgets || [], task.frequency, task.weeklyDays || []).totalHours.toFixed(1)}h <span className="text-notion-blue ml-1">${calculateTaskTotals(task.periodBudgets || [], task.frequency, task.weeklyDays || []).totalPrice.toFixed(0)}</span>
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                              handleEditTask(task.id);
                              setIsNewTaskOpen(true);
                          }}
                          className="p-2 text-notion-blue hover:bg-notion-badge-blue-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                          title="Modify Task"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTask(task.id)}
                          className="p-2 text-notion-warm-gray-100 hover:text-rose-600 hover:bg-notion-badge-rose-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                          title="Delete Task"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-12 whisper-border border-dashed rounded-comfortable bg-notion-warm-white/10">
                <div className="mb-3 text-3xl opacity-10">📋</div>
                <div className="text-notion-warm-gray-300 font-bold text-badge uppercase tracking-widest">No periodical tasks for this site</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 p-4 sm:p-6 border-t border-notion-warm-gray-200 bg-notion-warm-white sm:rounded-b-xl shrink-0 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-notion-black bg-white whisper-border rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-warm-white transition shadow-sm"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-10 py-2.5 text-white bg-notion-blue rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-blue-active transition-all shadow-notion-card hover:-translate-y-0.5 active:translate-y-0"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskManagementModal;
