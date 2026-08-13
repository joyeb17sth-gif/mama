import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ─── Constants ───────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 3 + i);

// ─── Helpers ─────────────────────────────────────────────────────────────
const createEmptyPeriod = (year, month) => ({
  id: `${year}-${String(month + 1).padStart(2, '0')}`,
  period: `${MONTHS[month]} ${year}`,
  year,
  month,
  income: [],
  expenses: [],
  addBacks: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const fmt = (v) => {
  if (v === 0 || v === undefined || v === null) return '$  -';
  const abs = Math.abs(v);
  const str = abs.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return v < 0 ? `($${str})` : `$${str}`;
};

// ─── Editable Cell ───────────────────────────────────────────────────────
const EditableCell = ({ value, onChange, className = '', isEditable = true }) => {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  const handleStartEdit = () => {
    if (!isEditable) return;
    setEditing(true);
    setInputVal(value === 0 ? '' : String(value));
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleCommit = () => {
    setEditing(false);
    const parsed = parseFloat(inputVal);
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="1"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCommit();
          if (e.key === 'Escape') setEditing(false);
          if (e.key === 'Tab') { e.preventDefault(); handleCommit(); }
        }}
        className="w-full h-full px-2 py-1 text-right text-xs border border-violet-400 rounded-sm bg-violet-50/50 focus:outline-none focus:ring-1 focus:ring-violet-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`w-full h-full px-2 py-1 text-right text-xs rounded-sm transition-colors select-none ${isEditable ? 'cursor-pointer hover:bg-violet-50/30' : ''} ${className}`}
      title={isEditable ? "Click to edit" : undefined}
    >
      {fmt(value)}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const ProfitLossAstra = ({ companyPeriods, onSave, isEditMode, view = 'table' }) => {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [allPeriods, setAllPeriods] = useState(companyPeriods || []);
  const [showAddItemModal, setShowAddItemModal] = useState({ show: false, type: null });

  useEffect(() => {
    setAllPeriods(companyPeriods || []);
  }, [companyPeriods]);

  // Current period
  const periodId = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const currentPeriod = useMemo(() => {
    const found = allPeriods.find(p => p.id === periodId);
    if (found) return JSON.parse(JSON.stringify(found));
    return createEmptyPeriod(selectedYear, selectedMonth);
  }, [allPeriods, periodId, selectedYear, selectedMonth]);

  // Computed totals
  const totalIncome = useMemo(() => {
    return (currentPeriod.income || []).reduce((sum, item) => sum + (item.value || 0), 0);
  }, [currentPeriod]);

  const totalExpenses = useMemo(() => {
    return (currentPeriod.expenses || []).reduce((sum, item) => sum + (item.value || 0), 0);
  }, [currentPeriod]);

  const netProfitLoss = totalIncome - totalExpenses;

  const totalAddBack = useMemo(() => {
    return (currentPeriod.addBacks || []).reduce((sum, ab) => sum + (ab.value || 0), 0);
  }, [currentPeriod]);

  const netProfitLossAfterAdjustment = netProfitLoss + totalAddBack;

  // Update period helper
  const updatePeriod = useCallback((updater) => {
    setAllPeriods(prev => {
      const found = prev.find(p => p.id === periodId) || createEmptyPeriod(selectedYear, selectedMonth);
      const p = JSON.parse(JSON.stringify(found));
      // Migrate old formats if necessary
      if (!Array.isArray(p.income)) p.income = [];
      if (!Array.isArray(p.expenses)) p.expenses = [];
      if (!Array.isArray(p.addBacks)) p.addBacks = [];
      
      const updated = typeof updater === 'function' ? updater(p) : updater;
      updated.updatedAt = new Date().toISOString();
      const idx = prev.findIndex(pp => pp.id === updated.id);
      const next = idx >= 0 ? prev.map(pp => pp.id === updated.id ? updated : pp) : [...prev, updated];
      
      onSave(next);
      return next;
    });
  }, [periodId, selectedYear, selectedMonth, onSave]);

  // Dynamic Array Handlers
  const handleUpdateItem = useCallback((type, id, field, value) => {
    updatePeriod((p) => {
      const list = p[type] || [];
      const item = list.find(a => a.id === id);
      if (item) item[field] = value;
      return p;
    });
  }, [updatePeriod]);

  const handleAddItem = useCallback((label) => {
    updatePeriod((p) => {
      const type = showAddItemModal.type;
      if (!p[type]) p[type] = [];
      p[type].push({ id: `${type}-${crypto.randomUUID()}`, label, value: 0 });
      return p;
    });
    setShowAddItemModal({ show: false, type: null });
  }, [updatePeriod, showAddItemModal]);

  const handleRemoveItem = useCallback((type, id) => {
    if (!window.confirm('Remove this item?')) return;
    updatePeriod((p) => {
      p[type] = (p[type] || []).filter(a => a.id !== id);
      return p;
    });
  }, [updatePeriod]);

  // Navigate periods
  const goNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };
  const goPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };

  // Copy from previous period
  const handleCopyPrevious = useCallback(() => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear--; }
    const prevId = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    const prev = allPeriods.find(p => p.id === prevId);
    if (!prev) { alert('No data found for the previous period.'); return; }
    if ((currentPeriod.income?.length > 0 || currentPeriod.expenses?.length > 0) && !window.confirm('This will replace current period data. Continue?')) return;

    const copied = JSON.parse(JSON.stringify(prev));
    copied.id = periodId;
    copied.period = `${MONTHS[selectedMonth]} ${selectedYear}`;
    copied.year = selectedYear;
    copied.month = selectedMonth;
    copied.createdAt = new Date().toISOString();
    copied.updatedAt = new Date().toISOString();

    // Zero out values but keep structure
    if (Array.isArray(copied.income)) copied.income.forEach(ab => { ab.value = 0; });
    if (Array.isArray(copied.expenses)) copied.expenses.forEach(ab => { ab.value = 0; });
    if (Array.isArray(copied.addBacks)) copied.addBacks.forEach(ab => { ab.value = 0; });

    updatePeriod(copied);
  }, [selectedMonth, selectedYear, allPeriods, currentPeriod, periodId, updatePeriod]);

  // ─── Analytics & Range Data ──────────────────────────────────────────────
  const trendData = useMemo(() => {
    const sorted = [...allPeriods].sort((a, b) => a.id.localeCompare(b.id));
    const recent = sorted.slice(-6);
    return recent.map(p => {
      const inc = (p.income || []).reduce((sum, item) => sum + (item.value || 0), 0);
      const exp = (p.expenses || []).reduce((sum, item) => sum + (item.value || 0), 0);
      const ab = (p.addBacks || []).reduce((sum, a) => sum + (a.value || 0), 0);
      return {
        name: p.period,
        Income: inc,
        Expense: exp,
        'Net Profit': (inc - exp) + ab
      };
    });
  }, [allPeriods]);

  const COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'];
  
  const incomePieData = useMemo(() => {
    return (currentPeriod.income || []).map(r => ({ name: r.label, value: r.value })).filter(d => d.value > 0);
  }, [currentPeriod]);

  const expensePieData = useMemo(() => {
    return (currentPeriod.expenses || []).map(r => ({ name: r.label, value: r.value })).filter(d => d.value > 0);
  }, [currentPeriod]);

  // Dynamic items renderer
  const renderDynamicList = (type, listData, titleColorClass, headerBgClass, rowHoverClass, inputFocusClass, totalVal, totalLabel) => {
    return (
      <>
        <tr><td colSpan={3} className="h-3 border-b border-zinc-100"></td></tr>
        <tr className={headerBgClass}>
          <td className={`px-4 py-2 font-bold ${titleColorClass} text-[11px] uppercase tracking-widest border-b border-zinc-100 mt-2`}>
            <div className="flex items-center justify-between">
              <span>{type === 'income' ? 'Income' : type === 'expenses' ? 'Expenses' : 'Add Back'}</span>
              {isEditMode && (
                <button
                  onClick={() => setShowAddItemModal({ show: true, type })}
                  className={`px-2 py-0.5 text-[10px] font-semibold ${titleColorClass} hover:bg-white/50 rounded transition-colors opacity-0 group-hover:opacity-100`}
                >
                  + Add Item
                </button>
              )}
            </div>
          </td>
          <td className="border-b border-zinc-100"></td>
          <td className="border-b border-zinc-100"></td>
        </tr>
        {(listData || []).map(ab => (
          <tr key={ab.id} className={`${rowHoverClass} transition-colors group`}>
            <td className="px-4 py-1 pl-8 border-b border-zinc-50 text-notion-warm-gray-500 italic text-[13px]">
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <input
                    type="text"
                    value={ab.label}
                    onChange={e => handleUpdateItem(type, ab.id, 'label', e.target.value)}
                    className={`flex-1 px-1 py-0.5 text-sm bg-transparent border-b border-dashed border-zinc-200 focus:outline-none not-italic ${inputFocusClass}`}
                  />
                ) : (
                  <span>{ab.label}</span>
                )}
                {isEditMode && (
                  <button
                    onClick={() => handleRemoveItem(type, ab.id)}
                    className="w-5 h-5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </td>
            <td className="px-1 py-1 border-b border-zinc-50 pr-6 text-notion-black font-semibold">
              <EditableCell isEditable={isEditMode} value={ab.value || 0} onChange={v => handleUpdateItem(type, ab.id, 'value', v)} className="py-1" />
            </td>
            <td className="border-b border-zinc-50"></td>
          </tr>
        ))}
        {/* Total */}
        <tr className={`${headerBgClass.replace('30', '50')} font-bold`}>
          <td className={`px-4 py-2 ${titleColorClass} border-b border-zinc-100`}>{totalLabel}</td>
          <td className={`px-2 py-2 text-right text-sm ${titleColorClass} border-b border-zinc-100 font-bold pr-8`}>{fmt(totalVal)}</td>
          <td className="border-b border-zinc-100"></td>
        </tr>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="notion-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={goPrevMonth} className="p-1.5 hover:bg-notion-warm-white rounded-micro transition text-notion-warm-gray-500 hover:text-notion-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-sm font-semibold text-notion-black bg-white focus:outline-none focus:ring-1 focus:ring-violet-500">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-sm font-semibold text-notion-black bg-white focus:outline-none focus:ring-1 focus:ring-violet-500">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={goNextMonth} className="p-1.5 hover:bg-notion-warm-white rounded-micro transition text-notion-warm-gray-500 hover:text-notion-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          {isEditMode && (
            <button onClick={handleCopyPrevious} className="ml-auto px-3 py-1.5 text-xs font-semibold text-notion-warm-gray-500 hover:text-notion-blue whisper-border rounded-micro hover:bg-blue-50/50 transition-all flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
              Copy Previous Period
            </button>
          )}
        </div>
      </div>

      {view === 'table' && (
        <>
      <div className="notion-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-zinc-200 bg-white">
                <th className="text-left px-4 py-3 font-bold text-notion-warm-gray-500 text-[11px] uppercase tracking-widest w-[45%] min-w-[280px]">
                  Description
                </th>
                <th className="text-right px-4 py-3 font-bold text-notion-warm-gray-500 text-[11px] uppercase tracking-widest w-[150px] pr-8">
                  Total
                </th>
                <th className="w-full"></th>
              </tr>
            </thead>
            <tbody className="text-zinc-700">
              {renderDynamicList('income', currentPeriod.income, 'text-blue-500', 'bg-blue-50/30 group', 'hover:bg-blue-50/10', 'focus:border-blue-400', totalIncome, 'Total Income')}
              {renderDynamicList('expenses', currentPeriod.expenses, 'text-red-500', 'bg-rose-50/30 group', 'hover:bg-rose-50/10', 'focus:border-red-400', totalExpenses, 'Total Expenses')}
              {renderDynamicList('addBacks', currentPeriod.addBacks, 'text-amber-700', 'bg-amber-50/30 group', 'hover:bg-amber-50/10', 'focus:border-amber-400', totalAddBack, 'Total Add Backs')}

              <tr><td colSpan={3} className="h-1 border-b border-zinc-100"></td></tr>
              
              <tr className="bg-emerald-50/60 font-bold text-sm">
                <td className="px-4 py-3 text-emerald-700 border-b border-zinc-200">Net Profit & Loss after Adjustment</td>
                <td className={`px-2 py-3 text-right text-sm font-bold border-b border-zinc-200 pr-8 ${netProfitLossAfterAdjustment >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {fmt(netProfitLossAfterAdjustment)}
                </td>
                <td className="border-b border-zinc-200"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Income', value: totalIncome, color: 'text-violet-700', bg: 'bg-violet-50/50' },
          { label: 'Total Expenses', value: totalExpenses, color: 'text-red-500', bg: 'bg-rose-50/50' },
          { label: 'Net P&L', value: netProfitLoss, color: netProfitLoss >= 0 ? 'text-emerald-700' : 'text-red-600', bg: netProfitLoss >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50' },
          { label: 'After Adjustment', value: netProfitLossAfterAdjustment, color: netProfitLossAfterAdjustment >= 0 ? 'text-emerald-700' : 'text-red-600', bg: 'bg-amber-50/50' },
        ].map(card => (
          <div key={card.label} className={`notion-card p-4 ${card.bg}`}>
            <p className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-1">{card.label}</p>
            <p className={`text-sub-heading ${card.color}`}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>
        </>
      )}

      {view === 'analytics' && (
        <div className="space-y-6">
          <div className="notion-card p-6">
            <h3 className="text-card-title text-notion-black mb-6">Income vs Expenses (Last 6 Periods)</h3>
            <div className="h-72 w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#787774' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#787774' }} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: '6px', border: '1px solid #e5e5e5', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Income" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Expense" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Net Profit" fill="#10b981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-notion-warm-gray-400 text-sm">No data available</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="notion-card p-6">
              <h3 className="text-card-title text-notion-black mb-6">Income Breakdown ({MONTHS[selectedMonth]})</h3>
              <div className="h-64 w-full">
                {incomePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={incomePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {incomePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: '6px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-notion-warm-gray-400 text-sm">No income logged</div>
                )}
              </div>
            </div>
            
            <div className="notion-card p-6">
              <h3 className="text-card-title text-notion-black mb-6">Expense Breakdown ({MONTHS[selectedMonth]})</h3>
              <div className="h-64 w-full">
                {expensePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: '6px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-notion-warm-gray-400 text-sm">No expenses logged</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddItemModal.show && (
        <AddBackModal 
          onAdd={handleAddItem} 
          onClose={() => setShowAddItemModal({ show: false, type: null })}
          title={`Add ${showAddItemModal.type === 'income' ? 'Income' : showAddItemModal.type === 'expenses' ? 'Expense' : 'Add Back'} Item`}
        />
      )}
    </div>
  );
};

// ─── Add Item Modal ─────────────────────────────────────────────────
const AddBackModal = ({ onAdd, onClose, title = "Add Item" }) => {
  const [label, setLabel] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-standard shadow-notion-deep p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-card-title text-notion-black mb-4">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g., Owner Salary"
            className="w-full px-3 py-2 whisper-border rounded-micro text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm text-notion-warm-gray-500 hover:text-notion-black transition">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm bg-violet-600 text-white rounded-micro hover:bg-violet-700 transition font-semibold">Add Item</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfitLossAstra;
