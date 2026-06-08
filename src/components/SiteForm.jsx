import React, { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import { getSites, getContractors } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import { SiteSchema, validateData } from '../utils/validation';
import { format, addMonths, startOfYear, eachDayOfInterval, parseISO, isBefore } from 'date-fns';

const SiteForm = ({ site, periodicalTasks = [], onSave, onCancel, isAdmin = true, availableSites = [] }) => {
  const [allSites, setAllSites] = useState([]);
  const [formData, setFormData] = useState({
    siteName: site?.siteName || '',
    clientName: site?.clientName || '',
    cleaningType: site?.cleaningType || 'housekeeping',
    payrollCycle: site?.payrollCycle || 'weekly',
    budgetedHours: site?.budgetedHours || 0,
    budgetedAmount: site?.budgetedAmount || 0,
    isTrainingSite: site?.isTrainingSite || false,
    isSubSite: site?.isSubSite || false,
    parentSiteId: site?.parentSiteId || '',
    codeRates: site?.codeRates || [],
    allocatedContractors: site?.allocatedContractors || []
  });

  const [newRateCode, setNewRateCode] = useState('');
  const [newRates, setNewRates] = useState({ weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 });
  const [validationError, setValidationError] = useState('');

  // Periodical Tasks State
  const [tasks, setTasks] = useState(periodicalTasks);
  const [profileUsers, setProfileUsers] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState({});


  useEffect(() => {
    // Load all sites to populate parent site dropdown
    const sites = (availableSites.length > 0 ? availableSites : getSites()).filter(s => s.id !== site?.id && !s.isSubSite);
    setAllSites(sites);

    // Load user profiles for task assignment
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

    // If site prop changes (e.g. clicking + Sub-Site while form is open), update local state
    if (site) {
      setFormData({
        siteName: site.siteName || '',
        clientName: site.clientName || '',
        cleaningType: site.cleaningType || 'housekeeping',
        payrollCycle: site.payrollCycle || 'weekly',
        budgetedHours: site.budgetedHours || 0,
        budgetedAmount: site.budgetedAmount || 0,
        isTrainingSite: site.isTrainingSite || false,
        isSubSite: site.isSubSite || false,
        parentSiteId: site.parentSiteId || '',
        codeRates: site.codeRates || [],
        allocatedContractors: site.allocatedContractors || []
      });
    }
  }, [site]);

  const handleAddCodeRate = () => {
    if (!newRateCode.trim()) return;
    const updatedRates = [...(formData.codeRates || []), {
      code: newRateCode.toUpperCase().trim(),
      ...newRates
    }];
    setFormData({ ...formData, codeRates: updatedRates });
    setNewRateCode('');
    setNewRates({ weekday: 0, saturday: 0, sunday: 0, publicHoliday: 0 });
  };

  const removeCodeRate = (codeToRemove) => {
    setFormData({
      ...formData,
      codeRates: (formData.codeRates || []).filter(r => r.code !== codeToRemove)
    });
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const name = e.target.name;

    // If parent site is being selected, inherit its cleaning type
    if (name === 'parentSiteId' && value) {
      const parentSite = allSites.find(s => s.id === value);
      if (parentSite) {
        setFormData({
          ...formData,
          [name]: value,
          cleaningType: parentSite.cleaningType || 'housekeeping',
          clientName: parentSite.clientName || formData.clientName,
          // Uncheck training if parent is not housekeeping
          isTrainingSite: parentSite.cleaningType === 'housekeeping' ? formData.isTrainingSite : false,
        });
        return;
      }
    }

    // If cleaning type changes to non-housekeeping, uncheck training site
    if (name === 'cleaningType' && value !== 'housekeeping') {
      setFormData({
        ...formData,
        [name]: value,
        isTrainingSite: false,
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Periodical Tasks State

  const getInitialPeriods = (freq) => {
    if (freq === 'Quarterly') return [
      { name: '1st Quarter', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' },
      { name: '2nd Quarter', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' },
      { name: '3rd Quarter', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' },
      { name: '4th Quarter', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }
    ];
    if (freq === 'Monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map(m => ({ name: m, hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }));
    }
    if (freq === '6 Monthly') return [
      { name: '1st Half', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' },
      { name: '2nd Half', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }
    ];
    if (freq === 'Yearly') return [{ name: 'Annual', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }];
    if (freq === 'Weekly') return [{ name: 'Weekly Average', hours: 0, pricing: 0, exactDate: '', endDate: '', scopeOfWork: '' }];
    if (freq === 'Custom Date') return [{ name: 'Custom Schedule', hours: 0, pricing: 0, customDate: '', endDate: '', scopeOfWork: '' }];
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

  const [editingTaskId, setEditingTaskId] = useState(null);

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

  const [newTask, setNewTask] = useState({
    taskCode: '',
    taskName: '',
    frequency: 'Custom Date',
    contractType: 'AD/HOC',
    assignedTo: [],
    startingMonth: 0,
    periods: getInitialPeriods('Custom Date'),
    weeklyDays: []
  });

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const handleTaskFrequencyChange = (val) => {
    setNewTask({
      ...newTask,
      frequency: val,
      startingMonth: 0,
      periods: getInitialPeriods(val),
      weeklyDays: val === 'Weekly' ? ['Mon'] : [] // default to Mon
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



  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    // Strict Input Validation
    const validationResult = validateData(SiteSchema, formData);
    if (!validationResult.success) {
      setValidationError(validationResult.error);
      return;
    }

    onSave(validationResult.data, tasks);
  };

  const generateSchedules = (frequency, startingMonth = 0, periods = [], existingSchedules = [], weeklyDays = []) => {
    if (frequency === 'Custom Date') {
      const schedules = [];
      const customDate = periods[0]?.customDate;
      if (customDate) {
        const targetPeriod = customDate.substring(0, 7); // yyyy-MM
        schedules.push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 9), targetPeriod, exactDate: customDate, status: 'Scheduled' });
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
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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
      frequency: taskToEdit.frequency || 'Custom Date',
      contractType: taskToEdit.contractType || 'AD/HOC',
      assignedTo: Array.isArray(taskToEdit.assignedTo) ? taskToEdit.assignedTo : (taskToEdit.assignedTo ? [taskToEdit.assignedTo] : []),
      startingMonth: taskToEdit.startingMonth || 0,
      periods: mergePeriods(taskToEdit.periodBudgets, taskToEdit.frequency || 'Custom Date'),
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
        id: Date.now().toString(),
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

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in-up">
      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-bold shadow-sm animate-fade-in">
          {validationError}
        </div>
      )}
      {isAdmin && (
        <React.Fragment>
          <div className="notion-card p-6 md:p-10">
        <h3 className="text-display-secondary text-notion-black tracking-notion-display mb-8">Infrastructure Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Site Designation <span className="text-notion-blue">*</span>
            </label>
            <input
              type="text"
              name="siteName"
              value={formData.siteName}
              onChange={handleChange}
              required
              placeholder="e.g. City Hotel Terminal"
              className="w-full px-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 transition-all"
            />
          </div>

          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Client Principal
            </label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              placeholder="Client Entity Name"
              className="w-full px-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black placeholder:text-notion-warm-gray-100 transition-all"
            />
          </div>

          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Payroll Protocol <span className="text-notion-blue">*</span>
            </label>
            <Dropdown
              value={formData.payrollCycle}
              onChange={(val) => setFormData({ ...formData, payrollCycle: val })}
              options={[
                { value: 'weekly', label: 'Cycle: Weekly' },
                { value: 'fortnightly', label: 'Cycle: Fortnightly' },
                { value: 'custom', label: 'Protocol: Custom' }
              ]}
            />
          </div>

          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Operational Domain <span className="text-notion-blue">*</span>
            </label>
            <Dropdown
              value={formData.cleaningType}
              onChange={(val) => {
                const e = { target: { name: 'cleaningType', value: val } };
                handleChange(e);
              }}
              options={[
                { value: 'housekeeping', label: 'Housekeeping Domain' },
                { value: 'cleaning', label: 'Commercial Domain' }
              ]}
            />
          </div>

          {!formData.isSubSite && (
            <div className="md:col-span-2 mt-4">
              <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
                Management Access Allocation
              </label>
              <Dropdown
                isMulti={true}
                value={formData.allocatedContractors || []}
                onChange={(val) => setFormData({ ...formData, allocatedContractors: val })}
                options={profileUsers.map(u => ({ value: u.id, label: `${u.name || u.email} (${u.role})` }))}
                placeholder="Select Managers/Supervisors"
              />
              <p className="text-[10px] text-notion-warm-gray-300 font-bold uppercase tracking-tight mt-2 pl-1">
                Selected personnel will automatically receive access to this primary site and all its nested sub-sites.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="notion-card p-10 relative">
        <h3 className="text-display-secondary text-notion-black tracking-notion-display mb-8">Capacity & Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Cycle Hourly Threshold
            </label>
            <div className="relative group/input">
              <input
                type="number"
                name="budgetedHours"
                value={formData.budgetedHours}
                onChange={handleChange}
                min="0"
                step="0.5"
                className="w-full pl-4 pr-14 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black tabular-nums"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-notion-warm-gray-100 font-bold text-badge uppercase tracking-widest pointer-events-none">Units</span>
            </div>
          </div>

          <div>
            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-2 block">
              Financial Ceiling
            </label>
            <div className="relative group/input">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-notion-warm-gray-100 font-bold group-focus-within/input:text-notion-blue transition-colors pointer-events-none">$</span>
              <input
                type="number"
                name="budgetedAmount"
                value={formData.budgetedAmount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full pl-9 pr-4 py-3 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black tabular-nums"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-4">
          <div className="flex items-center p-4 bg-notion-warm-white/50 whisper-border rounded-micro hover:bg-zinc-200 transition-all cursor-pointer group shadow-sm">
            <input
              type="checkbox"
              name="isTrainingSite"
              id="isTrainingSite"
              checked={formData.isTrainingSite}
              onChange={handleChange}
              disabled={formData.cleaningType !== 'housekeeping'}
              className="h-4 w-4 text-notion-blue focus:ring-0 border-notion-warm-gray-300 rounded-micro transition-all cursor-pointer"
            />
            <div className="ml-4">
              <label htmlFor="isTrainingSite" className={`block text-badge font-bold uppercase tracking-widest ${formData.cleaningType !== 'housekeeping' ? 'text-notion-warm-gray-100' : 'text-notion-black'} cursor-pointer`}>
                Activate Training Hub
              </label>
              <p className="text-[10px] text-notion-warm-gray-300 font-bold uppercase tracking-tight mt-0.5">Automates training escrow synthesis (LODGING ONLY)</p>
            </div>
          </div>

          <div className={`p-6 rounded-micro border transition-all duration-300 shadow-sm ${formData.isSubSite ? 'bg-notion-badge-blue-bg border-notion-blue' : 'bg-notion-warm-white/50 whisper-border'}`}>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isSubSite"
                id="isSubSite"
                checked={formData.isSubSite}
                onChange={handleChange}
                className="h-4 w-4 text-notion-blue focus:ring-0 border-notion-warm-gray-300 rounded-micro transition-all cursor-pointer"
              />
              <label htmlFor="isSubSite" className="ml-4 block text-badge font-bold text-notion-black uppercase tracking-widest cursor-pointer select-none">
                Define as Sub-Terminal (Nested)
              </label>
            </div>

            {formData.isSubSite && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300 pl-8">
                <label className="text-badge font-bold text-notion-blue uppercase tracking-widest mb-3 block">
                  Assign Master Terminal <span className="text-notion-blue">*</span>
                </label>
                <Dropdown
                  value={formData.parentSiteId}
                  onChange={(val) => {
                    const e = { target: { name: 'parentSiteId', value: val } };
                    handleChange(e);
                  }}
                  options={allSites.map(s => ({ value: s.id, label: `Master: ${s.siteName}` }))}
                  placeholder="-- Identify Parent Infrastructure --"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="notion-card p-6 md:p-10 relative">
        <h3 className="text-display-secondary text-notion-black tracking-notion-display mb-2">Role Allocation Matrix</h3>
        <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mb-10">Define fixed payroll rates for specific personnel role codes on this site.</p>

        {/* Add Entry Card */}
        <div className="bg-notion-warm-white/50 p-4 sm:p-8 rounded-comfortable whisper-border mb-10 relative z-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
            <div className="lg:col-span-1">
              <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-3 block">Role Designation</label>
              <input
                type="text"
                value={newRateCode}
                onChange={(e) => setNewRateCode(e.target.value)}
                placeholder="e.g. PTE-A"
                className="w-full px-4 py-2.5 bg-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all uppercase tracking-widest text-badge"
              />
            </div>
            {['weekday', 'saturday', 'sunday', 'publicHoliday'].map(type => (
              <div key={type}>
                <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-3 block truncate">{type === 'publicHoliday' ? 'P. Holiday' : type}</label>
                <div className="relative group/input">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-warm-gray-100 font-bold group-focus-within/input:text-notion-blue transition-colors">$</span>
                  <input
                    type="number"
                    value={newRates[type]}
                    onChange={(e) => setNewRates({ ...newRates, [type]: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2.5 bg-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all tabular-nums"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddCodeRate}
            disabled={!newRateCode.trim()}
            className="mt-8 w-full lg:w-auto px-10 py-3 bg-notion-black text-white rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-black transition shadow-notion-deep disabled:opacity-20 hover:-translate-y-0.5 active:translate-y-0"
          >
            + Register Role Rate
          </button>
        </div>

        {/* List of overrides */}
        <div className="space-y-4 relative z-10">
          {(formData.codeRates || []).length > 0 && (
            <div className="hidden md:grid grid-cols-5 gap-6 px-6 py-2 text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
              <div className="col-span-1">Designation Code</div>
              <div className="col-span-3 grid grid-cols-4 gap-6 text-center">
                <span>W.Day</span>
                <span>Sat</span>
                <span>Sun</span>
                <span>P.H</span>
              </div>
              <div className="col-span-1 text-right">Operation</div>
            </div>
          )}
          {(formData.codeRates || []).map(rate => (
            <div key={rate.code} className="flex flex-col md:grid md:grid-cols-5 gap-4 md:gap-6 items-start md:items-center p-4 md:p-6 bg-notion-warm-white/30 whisper-border rounded-comfortable hover:shadow-notion-card transition-all group">
              <div className="w-full md:col-span-1 flex justify-between items-center">
                <div className="text-body-semibold text-notion-black uppercase tracking-widest truncate">{rate.code}</div>
                {/* On mobile, show the delete button here next to the designation code */}
                <div className="md:hidden">
                  <button
                    type="button"
                    onClick={() => removeCodeRate(rate.code)}
                    className="p-2 text-notion-warm-gray-100 hover:text-rose-600 hover:bg-notion-badge-rose-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                    title="Purge Rate"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="w-full md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-1 md:hidden">W.Day</span>
                  <div className="text-center font-bold text-notion-black tabular-nums bg-white whisper-border px-3 py-1.5 rounded-micro shadow-sm w-full">${rate.weekday.toFixed(2)}</div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-1 md:hidden">Sat</span>
                  <div className="text-center font-bold text-notion-black tabular-nums bg-white whisper-border px-3 py-1.5 rounded-micro shadow-sm w-full">${rate.saturday.toFixed(2)}</div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-1 md:hidden">Sun</span>
                  <div className="text-center font-bold text-notion-black tabular-nums bg-white whisper-border px-3 py-1.5 rounded-micro shadow-sm w-full">${rate.sunday.toFixed(2)}</div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-1 md:hidden">P.H</span>
                  <div className="text-center font-bold text-notion-black tabular-nums bg-white whisper-border px-3 py-1.5 rounded-micro shadow-sm w-full">${rate.publicHoliday.toFixed(2)}</div>
                </div>
              </div>

              {/* On desktop, show the delete button in the last grid column */}
              <div className="hidden md:block md:col-span-1 text-right w-full">
                <button
                  type="button"
                  onClick={() => removeCodeRate(rate.code)}
                  className="p-2.5 text-notion-warm-gray-100 hover:text-rose-600 hover:bg-notion-badge-rose-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                  title="Purge Rate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {(formData.codeRates || []).length === 0 && (
            <div className="text-center py-16 whisper-border border-dashed rounded-comfortable bg-notion-warm-white/10">
              <div className="mb-4 text-4xl opacity-10">🏷️</div>
              <div className="text-notion-warm-gray-300 font-bold text-badge uppercase tracking-widest">No code-based rates identified</div>
              <div className="text-notion-warm-gray-100 text-badge font-bold uppercase tracking-widest mt-2">Initialize role codes to enable automated payroll synthesis</div>
            </div>
          )}
        </div>
      </div>
      </React.Fragment>
      )}

      <div className="notion-card p-6 md:p-10 relative">
        <h3 className="text-display-secondary text-notion-black tracking-notion-display mb-2">Periodical Tasks</h3>
        <p className="text-caption text-notion-warm-gray-300 font-medium mb-10">Define maintenance routines, cleaning schedules, and their period budgets for this site.</p>

        {/* Add Task Card */}
        <div className="bg-notion-warm-white/50 p-4 sm:p-8 rounded-comfortable whisper-border mb-10 relative z-10 shadow-sm">
          <button 
            type="button" 
            className="w-full flex items-center justify-between outline-none mb-2"
            onClick={() => setIsNewTaskOpen(!isNewTaskOpen)}
          >
            <h4 className="text-badge font-bold text-notion-black uppercase tracking-widest text-left">
              {editingTaskId ? '✏️ Editing Task' : '➕ New Periodical Task'}
            </h4>
            <svg className={`w-5 h-5 text-notion-warm-gray-400 transition-transform ${isNewTaskOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </button>
          
          {isNewTaskOpen && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div>
              <label className="text-badge font-bold text-notion-warm-gray-400 mb-3 block">Task Code</label>
              <input
                type="text"
                value={newTask.taskCode}
                onChange={(e) => setNewTask({ ...newTask, taskCode: e.target.value })}
                placeholder="e.g. RWC001"
                className="w-full px-4 py-2.5 bg-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all uppercase tracking-widest text-badge"
              />
            </div>
            <div>
              <label className="text-badge font-bold text-notion-warm-gray-400 mb-3 block">Task Name</label>
              <input
                type="text"
                value={newTask.taskName}
                onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                placeholder="Shampoo Carpets"
                className="w-full px-4 py-2.5 bg-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all text-badge"
              />
            </div>
            <div>
              <label className="text-badge font-bold text-notion-warm-gray-400 mb-3 block">Frequency</label>
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
              <label className="text-badge font-bold text-notion-warm-gray-400 mb-3 block">Contract Type</label>
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
            <div className="md:col-span-2">
              <label className="text-badge font-bold text-notion-warm-gray-400 mb-3 block">Assign To</label>
              <Dropdown
                value={newTask.assignedTo}
                onChange={(val) => setNewTask({ ...newTask, assignedTo: val })}
                options={[
                  { value: 'joyeb5730@gmail.com', label: 'Admin Supervisor' },
                  { value: 'saching@seetalgroup.com', label: 'saching (Manager)' },
                  ...profileUsers.map(u => ({ value: u.email, label: `${u.name || u.email} (${u.role})` }))
                ]}
                placeholder="Select assignees..."
                isMulti={true}
              />
            </div>
          </div>

          {/* Starting Month Selector */}
          {newTask.frequency === 'Monthly' && (
            <div className="mb-4 p-4 bg-notion-badge-blue-bg/30 rounded-micro border border-notion-blue/20">
              <div>
                <label className="text-badge font-bold text-notion-blue mb-2 block">Starting Month</label>
              </div>
              <p className="text-[10px] text-notion-warm-gray-500 mb-2">
                The schedule will begin from this month and repeat based on the selected frequency.
              </p>
              <div className="w-48">
                <Dropdown
                  value={newTask.startingMonth}
                  onChange={(val) => setNewTask({ ...newTask, startingMonth: parseInt(val) })}
                  options={[
                    { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
                    { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
                    { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
                    { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' }
                  ]}
                />
              </div>
            </div>
          )}

          {/* Dynamic Period Inputs for Task */}
          <div className="border-t border-notion-warm-gray-200 pt-6 mt-6">
            <h4 className="text-badge font-bold text-notion-blue uppercase tracking-widest mb-4">Period Budget Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                  <div className={`transition-all ${period.isDisabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>

                  {newTask.frequency === 'Weekly' && (
                    <div className="mb-3">
                      <label className="text-[9px] font-bold text-notion-warm-gray-400 block mb-1">Select Days <span className="text-notion-blue">*</span></label>
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
                  {newTask.frequency === 'Custom Date' ? (
                    <div className="flex flex-col gap-2 mb-2">
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-400 block mb-1">Start Date <span className="text-notion-blue">*</span></label>
                        <input
                          type="date"
                          value={period.customDate || ''}
                          onChange={(e) => handleTaskPeriodChange(arrayIndex, 'customDate', e.target.value)}
                          className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold outline-none focus:border-notion-blue"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-400 block mb-1">End Date</label>
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
                    <div className="flex flex-col gap-2 mb-2">
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-400 block mb-1">Start Date</label>
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
                        <label className="text-[9px] font-bold text-notion-warm-gray-400 block mb-1">End Date</label>
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
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] font-bold text-notion-warm-gray-400 block mb-1">
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
                      <label className="text-[9px] font-bold text-notion-warm-gray-400 block mb-1">
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
                      <label className="text-[9px] font-bold text-notion-warm-gray-400 block mb-1">Scope of Work</label>
                      <textarea
                        value={period.scopeOfWork || ''}
                        onChange={(e) => handleTaskPeriodChange(arrayIndex, 'scopeOfWork', e.target.value)}
                        placeholder="Describe scope..."
                        rows={2}
                        className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold outline-none focus:border-notion-blue resize-none"
                      />
                    </div>
                    <div className="mt-2">
                      <label className="text-[9px] font-bold text-notion-warm-gray-400 uppercase tracking-widest block mb-1">Attached Document</label>
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
            
            <div className="flex items-center gap-6 mt-6 p-4 bg-notion-badge-blue-bg/30 rounded-micro border border-notion-blue/20">
               <div className="text-sm">
                  <span className="font-bold text-notion-warm-gray-500 uppercase tracking-widest text-[10px] block">Total Hours Per Annum</span>
                  <span className="font-bold text-notion-black">{calculateTaskTotals(newTask.periods, newTask.frequency, newTask.weeklyDays).totalHours.toFixed(2)} hrs</span>
               </div>
               <div className="text-sm">
                  <span className="font-bold text-notion-warm-gray-500 uppercase tracking-widest text-[10px] block">Total Price Per Annum</span>
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
                {editingTaskId ? 'Update Task' : '+ Register Task'}
              </button>
            </div>
        </div>
        )}
        </div>

        {/* List of Tasks */}
        <div className="space-y-4 relative z-10">
          {tasks.length > 0 && (
            <div className="hidden md:grid grid-cols-6 gap-6 px-6 py-2 text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
              <div className="col-span-1">Code</div>
              <div className="col-span-2">Task Name</div>
              <div className="col-span-1">Frequency</div>
              <div className="col-span-1">Budget</div>
              <div className="col-span-1 text-right">Operation</div>
            </div>
          )}
          {tasks.map(task => (
            <div key={task.id} className="flex flex-col md:grid md:grid-cols-6 gap-4 md:gap-6 items-start md:items-center p-4 md:p-6 bg-notion-warm-white/30 whisper-border rounded-comfortable hover:shadow-notion-card transition-all group">
              <div className="w-full md:col-span-1 flex justify-between items-center">
                <div className="text-body-semibold text-notion-black uppercase tracking-widest truncate">{task.taskCode}</div>
                {/* On mobile, show operations here next to the code */}
                <div className="md:hidden flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                        handleEditTask(task.id);
                        setIsNewTaskOpen(true);
                    }}
                    className="p-2 text-notion-blue hover:text-notion-blue-active hover:bg-notion-badge-blue-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                    title="Modify Task"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    className="p-2 text-notion-warm-gray-100 hover:text-rose-600 hover:bg-notion-badge-rose-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                    title="Purge Task"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="w-full md:col-span-2">
                <div className="text-body-semibold text-notion-black">{task.taskName}</div>
                <div className="text-[10px] text-notion-warm-gray-300 uppercase tracking-widest mt-1">
                  Contract: <span className="text-zinc-600">{task.contractType}</span>
                </div>
              </div>
              
              <div className="w-full md:col-span-1 flex items-center justify-between md:block">
                <span className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest md:hidden">Frequency</span>
                <div className="text-badge font-bold text-notion-warm-gray-500 uppercase tracking-widest">{task.frequency}</div>
              </div>
              
              <div className="w-full md:col-span-1 flex items-center justify-between md:block">
                <span className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest md:hidden">Budget</span>
                <div className="text-center font-bold text-amber-900 tabular-nums bg-amber-100 whisper-border px-3 py-1.5 rounded-micro shadow-sm inline-block whitespace-nowrap">
                  {task.budgetHours?.toFixed(2)} hrs <span className="text-notion-blue ml-1">${task.budgetPrice?.toFixed(2)}</span>
                </div>
              </div>

              {/* On desktop, show operations here */}
              <div className="hidden md:flex md:col-span-1 text-right justify-end gap-2 w-full">
                <button
                  type="button"
                  onClick={() => handleEditTask(task.id)}
                  className="p-2.5 text-notion-blue hover:text-notion-blue-active hover:bg-notion-badge-blue-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                  title="Modify Task"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeTask(task.id)}
                  className="p-2.5 text-notion-warm-gray-100 hover:text-rose-600 hover:bg-notion-badge-rose-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                  title="Purge Task"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-16 whisper-border border-dashed rounded-comfortable bg-notion-warm-white/10">
              <div className="mb-4 text-4xl opacity-10">📋</div>
              <div className="text-notion-warm-gray-300 font-bold text-badge uppercase tracking-widest">No periodical tasks identified</div>
              <div className="text-notion-warm-gray-100 text-badge font-bold uppercase tracking-widest mt-2">Initialize tasks to display on the Task Matrix</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none px-8 py-4 text-notion-black bg-white whisper-border rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-warm-white transition shadow-sm text-center"
        >
          Discard
        </button>
        <button
          type="submit"
          className="flex-1 sm:flex-none px-8 py-4 bg-notion-blue text-white rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-blue-active transition shadow-notion-deep text-center"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default SiteForm;
