import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ─── Constants ───────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 3 + i);

const INCOME_ROWS = [
  { key: 'salesRevenue', label: 'Sales Revenue' },
  { key: 'otherIncome', label: 'Other Income' },
];

const EXPENSE_ROWS = [
  { key: 'advertisingMarketing', label: 'Advertising & Marketing' },
  { key: 'salaryWages', label: 'Salary & Wages' },
  { key: 'operatingExpenses', label: 'Operating Expenses' },
  { key: 'superannuation', label: 'Superannuation Expenses' },
  { key: 'rent', label: 'Rent' },
  { key: 'businessInsurance', label: 'Business Insurance' },
  { key: 'telephoneMobile', label: 'Telephone & Mobile' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'itSupport', label: 'IT support' },
  { key: 'internet', label: 'Internet' },
  { key: 'officeExpenses', label: 'Office Expenses' },
  { key: 'motorVehicle', label: 'Motor Vehicle Expenses' },
  { key: 'accountingBookkeeping', label: 'Accounting & Bookkeeping' },
  { key: 'businessTravelling', label: 'Business Travelling & Seminar' },
  { key: 'parkingToll', label: 'Parking & Toll' },
  { key: 'nepalStaffOverhead', label: 'Nepal staff overhead' },
  { key: 'otherExpense', label: 'Other Expense' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────
const createEmptyPeriod = (year, month) => ({
  id: `${year}-${String(month + 1).padStart(2, '0')}`,
  period: `${MONTHS[month]} ${year}`,
  year,
  month,
  incomeRows: [...INCOME_ROWS],
  expenseRows: [...EXPENSE_ROWS],
  income: {},
  cogs: 0,
  expenses: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const fmt = (v) => {
  if (v === 0 || v === undefined || v === null) return '$  -';
  const abs = Math.abs(v);
  const str = abs.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return v < 0 ? `($${str})` : `$${str}`;
};

const fmtPctIncome = (val, total) => {
  if (!total || total === 0 || !val) return '-';
  return ((val / total) * 100).toFixed(1) + '%';
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
        className="w-full h-full px-2 py-1 text-right text-xs border border-emerald-400 rounded-sm bg-emerald-50/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`w-full h-full px-2 py-1 text-right text-xs rounded-sm transition-colors select-none ${isEditable ? 'cursor-pointer hover:bg-emerald-50/30' : ''} ${className}`}
      title={isEditable ? "Click to edit" : undefined}
    >
      {fmt(value)}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const ProfitLossMedisafe = ({ companyPeriods, onSave, isEditMode, view = 'table' }) => {
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
    let p;
    if (found) p = JSON.parse(JSON.stringify(found));
    else p = createEmptyPeriod(selectedYear, selectedMonth);
    
    if (!p.incomeRows) p.incomeRows = [...INCOME_ROWS];
    if (!p.expenseRows) p.expenseRows = [...EXPENSE_ROWS];
    
    return p;
  }, [allPeriods, periodId, selectedYear, selectedMonth]);

  // Computed totals
  const totalIncome = useMemo(() => {
    return (currentPeriod.incomeRows || []).reduce((sum, row) => sum + (currentPeriod.income?.[row.key] || 0), 0);
  }, [currentPeriod]);

  const cogs = currentPeriod.cogs || 0;
  const grossProfit = totalIncome - cogs;

  const totalExpenses = useMemo(() => {
    return (currentPeriod.expenseRows || []).reduce((sum, row) => sum + (currentPeriod.expenses?.[row.key] || 0), 0);
  }, [currentPeriod]);

  const netProfit = grossProfit - totalExpenses;

  // Update period helper
  const updatePeriod = useCallback((updater) => {
    setAllPeriods(prev => {
      const found = prev.find(p => p.id === periodId) || createEmptyPeriod(selectedYear, selectedMonth);
      const p = JSON.parse(JSON.stringify(found));
      const updated = typeof updater === 'function' ? updater(p) : updater;
      updated.updatedAt = new Date().toISOString();
      const idx = prev.findIndex(pp => pp.id === updated.id);
      const next = idx >= 0 ? prev.map(pp => pp.id === updated.id ? updated : pp) : [...prev, updated];
      onSave(next);
      return next;
    });
  }, [periodId, selectedYear, selectedMonth, onSave]);

  // Dynamic Row Handlers
  const handleUpdateRowLabel = useCallback((type, key, label) => {
    updatePeriod((p) => {
      const rowsKey = type === 'income' ? 'incomeRows' : 'expenseRows';
      const row = p[rowsKey].find(r => r.key === key);
      if (row) row.label = label;
      return p;
    });
  }, [updatePeriod]);

  const handleAddRow = useCallback((label) => {
    updatePeriod((p) => {
      const type = showAddItemModal.type;
      const rowsKey = type === 'income' ? 'incomeRows' : 'expenseRows';
      const dataKey = type === 'income' ? 'income' : 'expenses';
      if (!p[rowsKey]) p[rowsKey] = type === 'income' ? [...INCOME_ROWS] : [...EXPENSE_ROWS];
      const newKey = `${type}-${crypto.randomUUID()}`;
      p[rowsKey].push({ key: newKey, label });
      if (!p[dataKey]) p[dataKey] = {};
      p[dataKey][newKey] = 0;
      return p;
    });
    setShowAddItemModal({ show: false, type: null });
  }, [updatePeriod, showAddItemModal]);

  const handleRemoveRow = useCallback((type, key) => {
    if (!window.confirm('Remove this item?')) return;
    updatePeriod((p) => {
      const rowsKey = type === 'income' ? 'incomeRows' : 'expenseRows';
      p[rowsKey] = p[rowsKey].filter(r => r.key !== key);
      return p;
    });
  }, [updatePeriod]);

  // Update fields
  const updateField = useCallback((group, key, value) => {
    updatePeriod((p) => {
      if (group === 'cogs') {
        p.cogs = value;
      } else {
        if (!p[group]) p[group] = {};
        p[group][key] = value;
      }
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
    if (Object.keys(currentPeriod.income || {}).length > 0 && !window.confirm('This will replace current period data. Continue?')) return;

    const copied = JSON.parse(JSON.stringify(prev));
    copied.id = periodId;
    copied.period = `${MONTHS[selectedMonth]} ${selectedYear}`;
    copied.year = selectedYear;
    copied.month = selectedMonth;
    copied.createdAt = new Date().toISOString();
    copied.updatedAt = new Date().toISOString();

    // Zero out values but keep structure
    INCOME_ROWS.forEach(r => { if (copied.income) copied.income[r.key] = 0; });
    copied.cogs = 0;
    EXPENSE_ROWS.forEach(r => { if (copied.expenses) copied.expenses[r.key] = 0; });

    updatePeriod(copied);
  }, [selectedMonth, selectedYear, allPeriods, currentPeriod, periodId, updatePeriod]);

  // ─── Analytics & Range Data ──────────────────────────────────────────────
  const trendData = useMemo(() => {
    const sorted = [...allPeriods].sort((a, b) => a.id.localeCompare(b.id));
    const recent = sorted.slice(-6);
    return recent.map(p => {
      const iRows = p.incomeRows || INCOME_ROWS;
      const eRows = p.expenseRows || EXPENSE_ROWS;
      const sales = iRows.reduce((sum, row) => sum + (p.income?.[row.key] || 0), 0);
      const cogs = p.cogs || 0;
      const exp = eRows.reduce((sum, row) => sum + (p.expenses?.[row.key] || 0), 0);
      return {
        name: p.period,
        Sales: sales,
        COGS: cogs,
        Expense: exp,
        'Net Profit': (sales - cogs) - exp
      };
    });
  }, [allPeriods]);

  const COLORS = ['#10b981', '#34d399', '#059669', '#047857', '#6ee7b7', '#a7f3d0'];
  const EXPENSE_COLORS = ['#f43f5e', '#fb7185', '#e11d48', '#be123c', '#fda4af', '#f43f5e'];
  
  const salesPieData = useMemo(() => {
    return (currentPeriod.incomeRows || []).map(r => ({ name: r.label, value: currentPeriod.income?.[r.key] || 0 })).filter(d => d.value > 0);
  }, [currentPeriod]);

  const expensePieData = useMemo(() => {
    return (currentPeriod.expenseRows || []).map(r => ({ name: r.label, value: currentPeriod.expenses?.[r.key] || 0 })).filter(d => d.value > 0);
  }, [currentPeriod]);

  // ═══════════════════════════════════════════════════════════════════════
  // ─── RENDER ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="notion-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={goPrevMonth} className="p-1.5 hover:bg-notion-warm-white rounded-micro transition text-notion-warm-gray-500 hover:text-notion-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-sm font-semibold text-notion-black bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-sm font-semibold text-notion-black bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={goNextMonth} className="p-1.5 hover:bg-notion-warm-white rounded-micro transition text-notion-warm-gray-500 hover:text-notion-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          {isEditMode && (
            <>
              <div className="h-5 w-px bg-notion-warm-gray-200 mx-1"></div>
              <button onClick={handleCopyPrevious} className="px-3 py-1.5 text-xs font-semibold text-notion-warm-gray-500 hover:text-emerald-600 whisper-border rounded-micro hover:bg-emerald-50/50 transition-all flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                Copy Previous Period
              </button>
            </>
          )}

          <span className="ml-auto text-badge text-notion-warm-gray-300">
            Last saved {currentPeriod.updatedAt ? new Date(currentPeriod.updatedAt).toLocaleTimeString() : 'never'}
          </span>
        </div>
      </div>

      {view === 'table' && (
        <>
      {/* P&L Table */}
      <div className="notion-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[500px]" id="medisafe-pnl-table">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50 to-teal-50">
                <th className="text-left px-4 py-3 font-bold text-emerald-700 text-[11px] uppercase tracking-widest border-b border-emerald-100 w-[45%] min-w-[280px]">
                  Description
                </th>
                <th className="text-right px-4 py-3 font-bold text-notion-black text-[11px] uppercase tracking-widest border-b border-emerald-100 w-[150px] pr-8">
                  Total
                </th>
                <th className="border-b border-emerald-100 w-full"></th>
              </tr>
            </thead>
            <tbody>
              {/* ── Income ── */}
              <tr><td colSpan={3} className="h-1"></td></tr>
              <tr className="bg-emerald-50/30">
                <td className="px-4 py-2 font-bold text-emerald-700 text-[11px] uppercase tracking-widest border-b border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span>Income</span>
                    {isEditMode && (
                      <button
                        onClick={() => setShowAddItemModal({ show: true, type: 'income' })}
                        className="px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-white/50 rounded transition-colors"
                      >
                        + Add Item
                      </button>
                    )}
                  </div>
                </td>
                <td className="border-b border-emerald-100"></td>
                <td className="border-b border-emerald-100"></td>
              </tr>
              {(currentPeriod.incomeRows || []).map(row => {
                const val = currentPeriod.income?.[row.key] || 0;
                return (
                  <tr key={`inc-${row.key}`} className="hover:bg-emerald-50/10 transition-colors group">
                    <td className="px-4 py-0.5 text-notion-warm-gray-600 pl-8 border-b border-zinc-50">
                      <div className="flex items-center gap-2">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.label}
                            onChange={e => handleUpdateRowLabel('income', row.key, e.target.value)}
                            className="flex-1 px-1 py-0.5 text-xs bg-transparent border-b border-dashed border-zinc-200 focus:border-emerald-400 focus:outline-none"
                          />
                        ) : (
                          <span>{row.label}</span>
                        )}
                        {isEditMode && (
                          <button
                            onClick={() => handleRemoveRow('income', row.key)}
                            className="w-4 h-4 rounded-full text-red-300 hover:text-red-600 hover:bg-red-50 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center flex-shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-0.5 border-b border-zinc-50 pr-6">
                      <EditableCell isEditable={isEditMode} value={val} onChange={v => updateField('income', row.key, v)} />
                    </td>
                    <td className="border-b border-zinc-50"></td>
                  </tr>
                );
              })}
              {/* Total Income */}
              <tr className="bg-emerald-50/40 font-bold">
                <td className="px-4 py-1.5 text-emerald-700 border-b border-emerald-100"></td>
                <td className="px-2 py-1.5 text-right text-xs text-emerald-700 border-b border-emerald-100 font-bold pr-8">{fmt(totalIncome)}</td>
                <td className="border-b border-emerald-100"></td>
              </tr>

              {/* ── Cost of Goods Sold ── */}
              <tr><td colSpan={3} className="h-2"></td></tr>
              <tr className="hover:bg-orange-50/10 transition-colors">
                <td className="px-4 py-1.5 font-bold text-orange-700 text-[11px] uppercase tracking-widest border-b border-orange-100">Cost of Good Sold</td>
                <td className="px-1 py-1 border-b border-orange-100 pr-6">
                  <EditableCell isEditable={isEditMode} value={cogs} onChange={v => updateField('cogs', null, v)} />
                </td>
                <td className="border-b border-orange-100"></td>
              </tr>

              {/* ── Gross Profit ── */}
              <tr><td colSpan={3} className="h-1 border-b border-zinc-100"></td></tr>
              <tr className={`font-bold text-sm ${grossProfit >= 0 ? 'bg-emerald-50/60' : 'bg-red-50/60'}`}>
                <td className="px-4 py-2 font-bold border-b border-zinc-200">Gross Profit</td>
                <td className={`px-2 py-2 text-right text-sm font-bold border-b border-zinc-200 pr-8 ${grossProfit >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>
                  {fmt(grossProfit)}
                </td>
                <td className="border-b border-zinc-200"></td>
              </tr>

              {/* ── Expenses ── */}
              <tr><td colSpan={3} className="h-2"></td></tr>
              <tr className="bg-rose-50/30">
                <td className="px-4 py-2 font-bold text-red-600 text-[11px] uppercase tracking-widest border-b border-red-100">
                  <div className="flex items-center justify-between">
                    <span>Expenses</span>
                    {isEditMode && (
                      <button
                        onClick={() => setShowAddItemModal({ show: true, type: 'expenses' })}
                        className="px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-white/50 rounded transition-colors"
                      >
                        + Add Item
                      </button>
                    )}
                  </div>
                </td>
                <td className="border-b border-red-100"></td>
                <td className="border-b border-red-100"></td>
              </tr>
              {(currentPeriod.expenseRows || []).map(row => {
                const val = currentPeriod.expenses?.[row.key] || 0;
                return (
                  <tr key={`exp-${row.key}`} className="hover:bg-rose-50/10 transition-colors group">
                    <td className="px-4 py-0.5 text-notion-warm-gray-600 pl-8 border-b border-zinc-50">
                      <div className="flex items-center gap-2">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.label}
                            onChange={e => handleUpdateRowLabel('expenses', row.key, e.target.value)}
                            className="flex-1 px-1 py-0.5 text-xs bg-transparent border-b border-dashed border-zinc-200 focus:border-red-400 focus:outline-none"
                          />
                        ) : (
                          <span>{row.label}</span>
                        )}
                        {isEditMode && (
                          <button
                            onClick={() => handleRemoveRow('expenses', row.key)}
                            className="w-4 h-4 rounded-full text-red-300 hover:text-red-600 hover:bg-red-50 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center flex-shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-0.5 border-b border-zinc-50 pr-6">
                      <EditableCell isEditable={isEditMode} value={val} onChange={v => updateField('expenses', row.key, v)} />
                    </td>
                    <td className="border-b border-zinc-50"></td>
                  </tr>
                );
              })}
              {/* Total Expenses */}
              <tr className="bg-rose-50/50 font-bold">
                <td className="px-4 py-2 text-red-600 border-b border-red-100">Total Expenses</td>
                <td className="px-2 py-2 text-right text-sm text-red-600 border-b border-red-100 font-bold pr-8">{fmt(totalExpenses)}</td>
                <td className="border-b border-red-100"></td>
              </tr>

              {/* ── Net Profit ── */}
              <tr><td colSpan={3} className="h-2 border-b-2 border-zinc-200"></td></tr>
              <tr className={`font-bold text-sm ${netProfit >= 0 ? 'bg-gradient-to-r from-emerald-50 to-teal-50' : 'bg-gradient-to-r from-red-50 to-rose-50'}`}>
                <td className="px-4 py-3 font-bold text-zinc-800 border-b border-zinc-200">Net Profit</td>
                <td className={`px-2 py-3 text-right text-sm font-bold border-b border-zinc-200 pr-8 ${netProfit >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>
                  {fmt(netProfit)}
                </td>
                <td className="border-b border-zinc-200"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Income', value: totalIncome, color: 'text-emerald-700', bg: 'bg-emerald-50/50' },
          { label: 'COGS', value: cogs, color: 'text-orange-600', bg: 'bg-orange-50/50' },
          { label: 'Gross Profit', value: grossProfit, color: grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600', bg: grossProfit >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50' },
          { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? 'text-emerald-700' : 'text-red-600', bg: netProfit >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50' },
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
            <h3 className="text-card-title text-notion-black mb-6">Sales vs COGS vs Expenses (Last 6 Periods)</h3>
            <div className="h-72 w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#787774' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#787774' }} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: '6px', border: '1px solid #e5e5e5', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Sales" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="COGS" fill="#f97316" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Expense" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Net Profit" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-notion-warm-gray-400 text-sm">No data available</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="notion-card p-6">
              <h3 className="text-card-title text-notion-black mb-6">Sales Breakdown ({MONTHS[selectedMonth]})</h3>
              <div className="h-64 w-full">
                {salesPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={salesPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {salesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: '6px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-notion-warm-gray-400 text-sm">No sales logged</div>
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
                          <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
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

      {view === 'range' && (
        <div className="notion-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-50 to-teal-50">
                  <th className="text-left px-4 py-3 font-bold text-emerald-700 text-[11px] uppercase tracking-widest border-b border-emerald-100 sticky left-0 z-10 bg-emerald-50 min-w-[200px]">
                    Category
                  </th>
                  {trendData.map(p => (
                    <th key={p.name} className="text-right px-4 py-3 font-bold text-notion-black text-[11px] uppercase tracking-widest border-b border-emerald-100 min-w-[100px]">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={trendData.length + 1} className="h-1"></td></tr>
                <tr className="bg-emerald-50/30">
                  <td className="px-4 py-2 font-bold text-emerald-700 text-[11px] uppercase tracking-widest border-b border-emerald-100 sticky left-0 z-10 bg-emerald-50/90">Sales Revenue</td>
                  {trendData.map(p => <td key={p.name} className="border-b border-emerald-100"></td>)}
                </tr>
                {(currentPeriod.incomeRows || []).map(row => (
                  <tr key={`rinc-${row.key}`} className="hover:bg-emerald-50/10">
                    <td className="px-4 py-1 text-notion-warm-gray-600 pl-8 border-b border-zinc-50 sticky left-0 z-10 bg-white">{row.label}</td>
                    {trendData.map(p => {
                      const period = allPeriods.find(ap => ap.period === p.name);
                      return <td key={p.name} className="px-4 py-1 text-right text-notion-warm-gray-500 border-b border-zinc-50">{fmt(period?.income?.[row.key] || 0)}</td>
                    })}
                  </tr>
                ))}
                
                <tr><td colSpan={trendData.length + 1} className="h-2"></td></tr>
                <tr className="bg-orange-50/30">
                  <td className="px-4 py-2 font-bold text-orange-700 text-[11px] uppercase tracking-widest border-b border-orange-100 sticky left-0 z-10 bg-orange-50/90">Cost of Goods Sold</td>
                  {trendData.map(p => {
                    const period = allPeriods.find(ap => ap.period === p.name);
                    return <td key={p.name} className="px-4 py-2 text-right font-semibold text-orange-600 border-b border-orange-100">{fmt(period?.cogs || 0)}</td>
                  })}
                </tr>

                <tr><td colSpan={trendData.length + 1} className="h-2"></td></tr>
                <tr className="bg-emerald-50/60 font-bold text-sm">
                  <td className="px-4 py-2.5 font-bold border-b border-zinc-200 sticky left-0 z-10 bg-emerald-50 text-emerald-800">Gross Profit</td>
                  {trendData.map(p => (
                    <td key={p.name} className="px-4 py-2.5 text-right border-b border-zinc-200 text-emerald-800">
                      {fmt(p['Sales'] - p['COGS'])}
                    </td>
                  ))}
                </tr>
                
                <tr><td colSpan={trendData.length + 1} className="h-2"></td></tr>
                <tr className="bg-rose-50/30">
                  <td className="px-4 py-2 font-bold text-red-600 text-[11px] uppercase tracking-widest border-b border-red-100 sticky left-0 z-10 bg-rose-50/90">Operating Expenses</td>
                  {trendData.map(p => <td key={p.name} className="border-b border-red-100"></td>)}
                </tr>
                {(currentPeriod.expenseRows || []).map(row => (
                  <tr key={`rexp-${row.key}`} className="hover:bg-rose-50/10">
                    <td className="px-4 py-1 text-notion-warm-gray-600 pl-8 border-b border-zinc-50 sticky left-0 z-10 bg-white">{row.label}</td>
                    {trendData.map(p => {
                      const period = allPeriods.find(ap => ap.period === p.name);
                      return <td key={p.name} className="px-4 py-1 text-right text-notion-warm-gray-500 border-b border-zinc-50">{fmt(period?.expenses?.[row.key] || 0)}</td>
                    })}
                  </tr>
                ))}
                
                <tr><td colSpan={trendData.length + 1} className="h-2 border-b-2 border-zinc-200"></td></tr>
                <tr className="bg-blue-50/60 font-bold text-sm">
                  <td className="px-4 py-2.5 font-bold border-b border-zinc-200 sticky left-0 z-10 bg-blue-50 text-blue-800">Net Profit</td>
                  {trendData.map(p => (
                    <td key={p.name} className="px-4 py-2.5 text-right border-b border-zinc-200 text-blue-800">
                      {fmt(p['Net Profit'])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showAddItemModal.show && (
        <AddItemModal 
          onAdd={handleAddRow} 
          onClose={() => setShowAddItemModal({ show: false, type: null })}
          title={`Add ${showAddItemModal.type === 'income' ? 'Income' : 'Expense'} Item`}
        />
      )}
    </div>
  );
};

// ─── Add Item Modal ─────────────────────────────────────────────────
const AddItemModal = ({ onAdd, onClose, title = "Add Item" }) => {
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
            placeholder="e.g., New Category"
            className="w-full px-3 py-2 whisper-border rounded-micro text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm text-notion-warm-gray-500 hover:text-notion-black transition">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-micro hover:bg-emerald-700 transition font-semibold">Add Item</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfitLossMedisafe;
