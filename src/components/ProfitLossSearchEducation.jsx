import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ─── Constants ───────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 3 + i);

const INCOME_ROWS = [
  { key: 'tuitionFeeCommission', label: 'Tuition Fee Commission' },
  { key: 'serviceFee', label: 'Service Fee' },
  { key: 'oshcCommission', label: 'OSHC Commission' },
  { key: 'marketingBonus', label: 'Marketing Bonus' },
  { key: 'other', label: 'Other' },
];

const EXPENSE_ROWS = [
  { key: 'advertisingMarketing', label: 'Advertising & Marketing' },
  { key: 'salaryWages', label: 'Salary & Wages' },
  { key: 'operatingExpenses', label: 'Operating Expenses' },
  { key: 'superannuation', label: 'Superannuation Expenses' },
  { key: 'ssgExpenses', label: 'SSG Expenses' },
  { key: 'rent', label: 'Rent' },
  { key: 'subAgentPayment', label: 'Sub Agent Payment' },
  { key: 'cashBack', label: 'Cash back' },
  { key: 'consultantExpenses', label: 'Consultant Expenses' },
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
  income: {},
  expenses: {},
  addBacks: [
    { id: 'addback-1', label: 'Rakhee Wages', value: 0 },
    { id: 'addback-2', label: 'BK Wages', value: 0 },
  ],
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
const ProfitLossSearchEducation = ({ companyPeriods, onSave, isEditMode, view = 'table' }) => {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [allPeriods, setAllPeriods] = useState(companyPeriods || []);
  const [showAddBackModal, setShowAddBackModal] = useState(false);

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
    return INCOME_ROWS.reduce((sum, row) => sum + (currentPeriod.income?.[row.key] || 0), 0);
  }, [currentPeriod]);

  const totalExpenses = useMemo(() => {
    return EXPENSE_ROWS.reduce((sum, row) => sum + (currentPeriod.expenses?.[row.key] || 0), 0);
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
      const updated = typeof updater === 'function' ? updater(p) : updater;
      updated.updatedAt = new Date().toISOString();
      const idx = prev.findIndex(pp => pp.id === updated.id);
      const next = idx >= 0 ? prev.map(pp => pp.id === updated.id ? updated : pp) : [...prev, updated];
      // Auto-save
      onSave(next);
      return next;
    });
  }, [periodId, selectedYear, selectedMonth, onSave]);

  // Update income/expense fields
  const updateField = useCallback((group, key, value) => {
    updatePeriod((p) => {
      if (!p[group]) p[group] = {};
      p[group][key] = value;
      return p;
    });
  }, [updatePeriod]);

  // Add Back handlers
  const handleUpdateAddBack = useCallback((addBackId, field, value) => {
    updatePeriod((p) => {
      const ab = (p.addBacks || []).find(a => a.id === addBackId);
      if (ab) ab[field] = value;
      return p;
    });
  }, [updatePeriod]);

  const handleAddAddBack = useCallback((label) => {
    updatePeriod((p) => {
      if (!p.addBacks) p.addBacks = [];
      p.addBacks.push({ id: `addback-${crypto.randomUUID()}`, label, value: 0 });
      return p;
    });
    setShowAddBackModal(false);
  }, [updatePeriod]);

  const handleRemoveAddBack = useCallback((addBackId) => {
    if (!window.confirm('Remove this Add Back item?')) return;
    updatePeriod((p) => {
      p.addBacks = (p.addBacks || []).filter(a => a.id !== addBackId);
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
    EXPENSE_ROWS.forEach(r => { if (copied.expenses) copied.expenses[r.key] = 0; });
    if (copied.addBacks) copied.addBacks.forEach(ab => { ab.value = 0; });

    updatePeriod(copied);
  }, [selectedMonth, selectedYear, allPeriods, currentPeriod, periodId, updatePeriod]);

  // ─── Analytics & Range Data ──────────────────────────────────────────────
  const trendData = useMemo(() => {
    // Sort all periods chronologically
    const sorted = [...allPeriods].sort((a, b) => a.id.localeCompare(b.id));
    // Take last 6
    const recent = sorted.slice(-6);
    return recent.map(p => {
      const inc = INCOME_ROWS.reduce((sum, row) => sum + (p.income?.[row.key] || 0), 0);
      const exp = EXPENSE_ROWS.reduce((sum, row) => sum + (p.expenses?.[row.key] || 0), 0);
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
    return INCOME_ROWS.map(r => ({ name: r.label, value: currentPeriod.income?.[r.key] || 0 })).filter(d => d.value > 0);
  }, [currentPeriod]);

  const expensePieData = useMemo(() => {
    return EXPENSE_ROWS.map(r => ({ name: r.label, value: currentPeriod.expenses?.[r.key] || 0 })).filter(d => d.value > 0);
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
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-sm font-semibold text-notion-black bg-white focus:outline-none focus:ring-1 focus:ring-violet-500">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-sm font-semibold text-notion-black bg-white focus:outline-none focus:ring-1 focus:ring-violet-500">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={goNextMonth} className="p-1.5 hover:bg-notion-warm-white rounded-micro transition text-notion-warm-gray-500 hover:text-notion-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {view === 'table' && (
        <>
      {/* P&L Table */}
      <div className="notion-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-gradient-to-r from-violet-50 to-purple-50">
                <th className="text-left px-4 py-3 font-bold text-violet-600 text-[11px] uppercase tracking-widest border-b border-violet-100 w-[45%] min-w-[280px]">
                  Description
                </th>
                <th className="text-right px-4 py-3 font-bold text-notion-black text-[11px] uppercase tracking-widest border-b border-violet-100 w-[150px] pr-8">
                  Total
                </th>
                <th className="border-b border-violet-100 w-full"></th>
              </tr>
            </thead>
            <tbody>
              {/* ── Income ── */}
              <tr><td colSpan={3} className="h-1"></td></tr>
              <tr className="bg-violet-50/30">
                <td className="px-4 py-2 font-bold text-violet-700 text-[11px] uppercase tracking-widest border-b border-violet-100">Income</td>
                <td className="border-b border-violet-100"></td>
                <td className="border-b border-violet-100"></td>
              </tr>
              {INCOME_ROWS.map(row => {
                const val = currentPeriod.income?.[row.key] || 0;
                return (
                  <tr key={`inc-${row.key}`} className="hover:bg-violet-50/10 transition-colors">
                    <td className="px-4 py-0.5 text-notion-warm-gray-600 pl-8 border-b border-zinc-50">{row.label}</td>
                    <td className="px-1 py-0.5 border-b border-zinc-50 pr-6">
                      <EditableCell isEditable={isEditMode} value={val} onChange={v => updateField('income', row.key, v)} />
                    </td>
                    <td className="border-b border-zinc-50"></td>
                  </tr>
                );
              })}
              {/* Total Income */}
              <tr className="bg-violet-50/50 font-bold">
                <td className="px-4 py-2 text-violet-700 border-b border-violet-100"></td>
                <td className="px-2 py-2 text-right text-sm text-violet-700 border-b border-violet-100 font-bold pr-8">{fmt(totalIncome)}</td>
                <td className="border-b border-violet-100"></td>
              </tr>
 
              {/* ── Expenses ── */}
              <tr><td colSpan={3} className="h-2"></td></tr>
              <tr className="bg-rose-50/30">
                <td className="px-4 py-2 font-bold text-red-600 text-[11px] uppercase tracking-widest border-b border-red-100">Expenses</td>
                <td className="border-b border-red-100"></td>
                <td className="border-b border-red-100"></td>
              </tr>
              {EXPENSE_ROWS.map(row => {
                const val = currentPeriod.expenses?.[row.key] || 0;
                return (
                  <tr key={`exp-${row.key}`} className="hover:bg-rose-50/10 transition-colors">
                    <td className="px-4 py-0.5 text-notion-warm-gray-600 pl-8 border-b border-zinc-50">{row.label}</td>
                    <td className="px-1 py-0.5 border-b border-zinc-50 pr-6">
                      <EditableCell isEditable={isEditMode} value={val} onChange={v => updateField('expenses', row.key, v)} />
                    </td>
                    <td className="border-b border-zinc-50"></td>
                  </tr>
                );
              })}
              {/* Total Expenses */}
              <tr className="bg-rose-50/50 font-bold">
                <td className="px-4 py-2 text-red-700 border-b border-red-100">Total Expenses</td>
                <td className="px-2 py-2 text-right text-sm text-red-700 border-b border-red-100 font-bold pr-8">{fmt(totalExpenses)}</td>
                <td className="border-b border-red-100"></td>
              </tr>

              {/* ── Add Back ── */}
              <tr><td colSpan={3} className="h-3"></td></tr>
              <tr className="bg-amber-50/30">
                <td className="px-4 py-2 font-bold text-amber-700 text-[11px] uppercase tracking-widest border-b border-amber-100">
                  <div className="flex items-center justify-between">
                    <span>Add Back</span>
                    {isEditMode && (
                      <button
                        onClick={() => setShowAddBackModal(true)}
                        className="px-2 py-0.5 text-[10px] font-semibold text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors"
                      >
                        + Add Item
                      </button>
                    )}
                  </div>
                </td>
                <td className="border-b border-amber-100"></td>
                <td className="border-b border-amber-100"></td>
              </tr>
              {(currentPeriod.addBacks || []).map(ab => (
                <tr key={ab.id} className="hover:bg-amber-50/10 transition-colors group">
                  <td className="px-4 py-0.5 text-notion-warm-gray-600 pl-8 border-b border-zinc-50">
                    <div className="flex items-center gap-2">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={ab.label}
                          onChange={e => handleUpdateAddBack(ab.id, 'label', e.target.value)}
                          className="flex-1 px-1 py-0.5 text-xs bg-transparent border-b border-dashed border-zinc-200 focus:border-amber-400 focus:outline-none"
                        />
                      ) : (
                        <span>{ab.label}</span>
                      )}
                      {isEditMode && (
                        <button
                          onClick={() => handleRemoveAddBack(ab.id)}
                          className="w-4 h-4 rounded-full text-red-300 hover:text-red-600 hover:bg-red-50 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center flex-shrink-0"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-0.5 border-b border-zinc-50 pr-6">
                    <EditableCell isEditable={isEditMode} value={ab.value || 0} onChange={v => handleUpdateAddBack(ab.id, 'value', v)} />
                  </td>
                  <td className="border-b border-zinc-50"></td>
                </tr>
              ))}

              {/* ── Net Profit & Loss after Adjustment ── */}
              <tr><td colSpan={3} className="h-2 border-b-2 border-zinc-200"></td></tr>
              <tr className="font-bold text-sm" style={{ background: 'linear-gradient(90deg, #fef9c3 0%, #fef08a 50%, #fde68a 100%)' }}>
                <td className="px-4 py-3 font-bold text-zinc-800 border-b border-amber-300">Net Profit & Loss after Adjustment</td>
                <td className={`px-2 py-3 text-right text-sm font-bold border-b border-amber-300 pr-8 ${netProfitLossAfterAdjustment >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>
                  <span className="px-3 py-1 rounded" style={{ backgroundColor: '#ffff00' }}>
                    {fmt(netProfitLossAfterAdjustment)}
                  </span>
                </td>
                <td className="border-b border-amber-300"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
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

      {view === 'range' && (
        <div className="notion-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gradient-to-r from-violet-50 to-purple-50">
                  <th className="text-left px-4 py-3 font-bold text-violet-600 text-[11px] uppercase tracking-widest border-b border-violet-100 sticky left-0 z-10 bg-violet-50 min-w-[200px]">
                    Category
                  </th>
                  {trendData.map(p => (
                    <th key={p.name} className="text-right px-4 py-3 font-bold text-notion-black text-[11px] uppercase tracking-widest border-b border-violet-100 min-w-[100px]">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={trendData.length + 1} className="h-1"></td></tr>
                <tr className="bg-violet-50/30">
                  <td className="px-4 py-2 font-bold text-violet-700 text-[11px] uppercase tracking-widest border-b border-violet-100 sticky left-0 z-10 bg-violet-50/90">Income</td>
                  {trendData.map(p => <td key={p.name} className="border-b border-violet-100"></td>)}
                </tr>
                {INCOME_ROWS.map(row => (
                  <tr key={`rinc-${row.key}`} className="hover:bg-violet-50/10">
                    <td className="px-4 py-1 text-notion-warm-gray-600 pl-8 border-b border-zinc-50 sticky left-0 z-10 bg-white">{row.label}</td>
                    {trendData.map(p => {
                      const period = allPeriods.find(ap => ap.period === p.name);
                      return <td key={p.name} className="px-4 py-1 text-right text-notion-warm-gray-500 border-b border-zinc-50">{fmt(period?.income?.[row.key] || 0)}</td>
                    })}
                  </tr>
                ))}
                
                <tr><td colSpan={trendData.length + 1} className="h-2"></td></tr>
                <tr className="bg-rose-50/30">
                  <td className="px-4 py-2 font-bold text-red-600 text-[11px] uppercase tracking-widest border-b border-red-100 sticky left-0 z-10 bg-rose-50/90">Expenses</td>
                  {trendData.map(p => <td key={p.name} className="border-b border-red-100"></td>)}
                </tr>
                {EXPENSE_ROWS.map(row => (
                  <tr key={`rexp-${row.key}`} className="hover:bg-rose-50/10">
                    <td className="px-4 py-1 text-notion-warm-gray-600 pl-8 border-b border-zinc-50 sticky left-0 z-10 bg-white">{row.label}</td>
                    {trendData.map(p => {
                      const period = allPeriods.find(ap => ap.period === p.name);
                      return <td key={p.name} className="px-4 py-1 text-right text-notion-warm-gray-500 border-b border-zinc-50">{fmt(period?.expenses?.[row.key] || 0)}</td>
                    })}
                  </tr>
                ))}
                
                <tr><td colSpan={trendData.length + 1} className="h-2 border-b-2 border-zinc-200"></td></tr>
                <tr className="bg-emerald-50/60 font-bold text-sm">
                  <td className="px-4 py-2.5 font-bold border-b border-zinc-200 sticky left-0 z-10 bg-emerald-50 text-emerald-800">Net Profit & Loss</td>
                  {trendData.map(p => (
                    <td key={p.name} className="px-4 py-2.5 text-right border-b border-zinc-200 text-emerald-800">
                      {fmt(p['Net Profit'])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Back Modal */}
      {showAddBackModal && (
        <AddBackModal onAdd={handleAddAddBack} onClose={() => setShowAddBackModal(false)} />
      )}
    </div>
  );
};

// ─── Add Back Item Modal ─────────────────────────────────────────────────
const AddBackModal = ({ onAdd, onClose }) => {
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
        <h3 className="text-card-title text-notion-black mb-4">Add "Add Back" Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g., Owner Salary"
            className="w-full px-3 py-2 whisper-border rounded-micro text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm text-notion-warm-gray-500 hover:text-notion-black transition">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm bg-amber-500 text-white rounded-micro hover:bg-amber-600 transition font-semibold">Add Item</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfitLossSearchEducation;
