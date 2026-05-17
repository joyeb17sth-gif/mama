import React, { useState } from 'react';
import Dropdown from './Dropdown';
import { format, addMonths, startOfYear } from 'date-fns';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TaskManagementModal = ({ site, tasks: initialTasks, onSave, onClose }) => {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const getInitialPeriods = (freq) => {
    if (freq === 'Quarterly') return [
      { name: '1st Quarter', hours: 0, pricing: 0, exactDate: '', scopeOfWork: '' },
      { name: '2nd Quarter', hours: 0, pricing: 0, exactDate: '', scopeOfWork: '' },
      { name: '3rd Quarter', hours: 0, pricing: 0, exactDate: '', scopeOfWork: '' },
      { name: '4th Quarter', hours: 0, pricing: 0, exactDate: '', scopeOfWork: '' }
    ];
    if (freq === 'Monthly') {
      return MONTHS.map(m => ({ name: m.substring(0, 3), hours: 0, pricing: 0, exactDate: '', scopeOfWork: '' }));
    }
    if (freq === '6 Monthly') return [
      { name: '1st Half', hours: 0, pricing: 0, exactDate: '', scopeOfWork: '' },
      { name: '2nd Half', hours: 0, pricing: 0, exactDate: '', scopeOfWork: '' }
    ];
    if (freq === 'Yearly') return [{ name: 'Annual', hours: 0, pricing: 0, exactDate: '', scopeOfWork: '' }];
    if (freq === 'Weekly') return [{ name: 'Weekly Average', hours: 0, pricing: 0, exactDate: '', scopeOfWork: '' }];
    return [];
  };

  const [newTask, setNewTask] = useState({
    taskCode: '',
    taskName: '',
    frequency: 'Monthly',
    contractType: 'AD/HOC',
    startingMonth: 0, // January = 0
    periods: getInitialPeriods('Monthly')
  });

  const handleTaskFrequencyChange = (val) => {
    setNewTask({
      ...newTask,
      frequency: val,
      startingMonth: 0,
      periods: getInitialPeriods(val)
    });
  };

  const handleTaskPeriodChange = (index, field, value) => {
    const updatedPeriods = [...newTask.periods];
    if (field === 'exactDate' || field === 'scopeOfWork') {
      updatedPeriods[index][field] = value;
    } else {
      updatedPeriods[index][field] = parseFloat(value) || 0;
    }
    setNewTask({ ...newTask, periods: updatedPeriods });
  };

  const calculateTaskTotals = (taskPeriods) => {
    const totalHours = taskPeriods.reduce((sum, p) => sum + (p.hours || 0), 0);
    const totalPrice = taskPeriods.reduce((sum, p) => sum + (p.pricing || 0), 0);
    return { totalHours, totalPrice };
  };

  const generateSchedules = (frequency, startingMonth = 0) => {
    let interval = 1;
    if (frequency === 'Weekly') interval = 1;
    if (frequency === 'Monthly') interval = 1;
    if (frequency === 'Quarterly') interval = 3;
    if (frequency === '6 Monthly') interval = 6;
    if (frequency === 'Yearly') interval = 12;

    const schedules = [];
    const currentYear = new Date().getFullYear();
    // Start from startingMonth, 2 years ago
    let currentDate = new Date(currentYear - 2, startingMonth, 1);

    const totalMonths = 12 * 7; // 7 years
    for (let i = 0; i < totalMonths; i += interval) {
      const targetPeriod = format(currentDate, 'yyyy-MM');
      schedules.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        targetPeriod,
        status: 'Scheduled'
      });
      currentDate = addMonths(currentDate, interval);
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
      startingMonth: taskToEdit.startingMonth || 0,
      periods: taskToEdit.periodBudgets || getInitialPeriods(taskToEdit.frequency || 'Monthly')
    });
    setEditingTaskId(taskId);
  };

  const handleAddTask = () => {
    if (!newTask.taskName || !newTask.taskCode) return;
    
    const { totalHours, totalPrice } = calculateTaskTotals(newTask.periods);
    
    if (editingTaskId) {
      const existingTask = tasks.find(t => t.id === editingTaskId);
      const freqChanged = existingTask.frequency !== newTask.frequency;
      const monthChanged = (existingTask.startingMonth || 0) !== newTask.startingMonth;
      const updatedTask = {
        ...existingTask,
        taskCode: newTask.taskCode.toUpperCase().trim(),
        taskName: newTask.taskName,
        frequency: newTask.frequency,
        startingMonth: newTask.startingMonth,
        budgetHours: totalHours,
        budgetPrice: totalPrice,
        periodBudgets: newTask.periods,
        contractType: newTask.contractType,
        schedules: (freqChanged || monthChanged)
          ? generateSchedules(newTask.frequency, newTask.startingMonth)
          : existingTask.schedules
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
        startingMonth: newTask.startingMonth,
        budgetHours: totalHours,
        budgetPrice: totalPrice,
        periodBudgets: newTask.periods,
        contractType: newTask.contractType,
        schedules: generateSchedules(newTask.frequency, newTask.startingMonth)
      };
      setTasks([...tasks, taskToAdd]);
    }

    setNewTask({
      taskCode: '',
      taskName: '',
      frequency: 'Monthly',
      contractType: 'AD/HOC',
      startingMonth: 0,
      periods: getInitialPeriods('Monthly')
    });
  };

  const removeTask = (taskId) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleSaveAll = () => {
    onSave(site.id, tasks);
  };

  const showStartingMonth = ['Quarterly', '6 Monthly', 'Yearly'].includes(newTask.frequency);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-notion-warm-gray-200 bg-notion-warm-white rounded-t-xl">
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
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Add/Edit Task Form */}
          <div className="bg-notion-warm-white/50 p-6 rounded-comfortable whisper-border shadow-sm">
            <h3 className="text-badge font-bold text-notion-black uppercase tracking-widest mb-4">
              {editingTaskId ? '✏️ Editing Task' : '➕ New Task'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-4">
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
                    { value: 'Yearly', label: 'Yearly' }
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

            {/* Starting Month Selector */}
            {showStartingMonth && (
              <div className="mb-4 p-3 bg-notion-badge-blue-bg/30 rounded-micro border border-notion-blue/20">
                <label className="text-badge font-bold text-notion-blue uppercase tracking-widest mb-2 block">Starting Month</label>
                <p className="text-[10px] text-notion-warm-gray-500 mb-2">
                  The schedule will begin from this month and repeat every {newTask.frequency === 'Quarterly' ? '3 months' : newTask.frequency === '6 Monthly' ? '6 months' : '12 months'}.
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {newTask.periods.map((period, index) => (
                  <div key={index} className="p-3 bg-white whisper-border rounded-micro shadow-sm">
                    <h5 className="font-bold text-[11px] text-notion-black mb-2 border-b border-notion-warm-gray-200 pb-1">{period.name}</h5>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">Exact Date</label>
                        <input
                          type="date"
                          value={period.exactDate || ''}
                          onChange={(e) => handleTaskPeriodChange(index, 'exactDate', e.target.value)}
                          className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold outline-none focus:border-notion-blue"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">Hours</label>
                        <input
                          type="number"
                          value={period.hours || ''}
                          onChange={(e) => handleTaskPeriodChange(index, 'hours', e.target.value)}
                          className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold tabular-nums outline-none focus:border-notion-blue"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">Pricing ($)</label>
                        <input
                          type="number"
                          value={period.pricing || ''}
                          onChange={(e) => handleTaskPeriodChange(index, 'pricing', e.target.value)}
                          className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold tabular-nums outline-none focus:border-notion-blue"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-notion-warm-gray-300 uppercase tracking-widest block mb-1">Scope of Work</label>
                        <textarea
                          value={period.scopeOfWork || ''}
                          onChange={(e) => handleTaskPeriodChange(index, 'scopeOfWork', e.target.value)}
                          placeholder="Describe scope..."
                          rows={2}
                          className="w-full px-2 py-1 bg-notion-warm-white whisper-border rounded text-[11px] font-bold outline-none focus:border-notion-blue resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-6 mt-4 p-3 bg-notion-badge-blue-bg/30 rounded-micro border border-notion-blue/20">
                <div className="text-sm">
                  <span className="font-bold text-notion-warm-gray-500 uppercase tracking-widest text-[10px] block">Total Hours</span>
                  <span className="font-bold text-notion-black">{calculateTaskTotals(newTask.periods).totalHours.toFixed(2)} hrs</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold text-notion-warm-gray-500 uppercase tracking-widest text-[10px] block">Total Price</span>
                  <span className="font-bold text-notion-black">${calculateTaskTotals(newTask.periods).totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handleAddTask}
                disabled={!newTask.taskCode.trim() || !newTask.taskName.trim()}
                className="px-8 py-2.5 bg-notion-blue text-white rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-blue-active transition shadow-notion-deep disabled:opacity-20 hover:-translate-y-0.5 active:translate-y-0"
              >
                {editingTaskId ? 'Update Task' : '+ Add Task'}
              </button>
              {editingTaskId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTaskId(null);
                    setNewTask({
                      taskCode: '', taskName: '', frequency: 'Monthly', contractType: 'AD/HOC', startingMonth: 0,
                      periods: getInitialPeriods('Monthly')
                    });
                  }}
                  className="px-6 py-2.5 bg-white text-notion-black whisper-border rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-warm-white transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {tasks.length > 0 && (
              <div className="grid grid-cols-7 gap-4 px-4 py-2 text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest">
                <div className="col-span-1">Code</div>
                <div className="col-span-2">Task Name</div>
                <div className="col-span-1">Frequency</div>
                <div className="col-span-1">Starts</div>
                <div className="col-span-1">Budget</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
            )}
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
                    {task.budgetHours?.toFixed(1)}h <span className="text-notion-blue ml-1">${task.budgetPrice?.toFixed(0)}</span>
                  </div>
                </div>
                <div className="col-span-1 text-right flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditTask(task.id)}
                    className="p-2 text-notion-blue hover:text-notion-blue-active hover:bg-notion-badge-blue-bg rounded-micro transition-all shadow-sm bg-white whisper-border"
                    title="Modify Task"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
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
            {tasks.length === 0 && (
              <div className="text-center py-12 whisper-border border-dashed rounded-comfortable bg-notion-warm-white/10">
                <div className="mb-3 text-3xl opacity-10">📋</div>
                <div className="text-notion-warm-gray-300 font-bold text-badge uppercase tracking-widest">No periodical tasks for this site</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-4 p-6 border-t border-notion-warm-gray-200 bg-notion-warm-white rounded-b-xl">
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
