import React, { useState, useEffect, useCallback } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STORAGE_KEY = 'staff_productivity_report';
const CURRENT_YEAR = new Date().getFullYear();

const defaultStaff = () => ({
  id: crypto.randomUUID(),
  name: 'New Staff Member',
  annualSalary: 0,
  basicSalary: Array(12).fill(''),
  superannuation: Array(12).fill(''),
  revenueEarned: Array(12).fill(''),
  serviceFeeRef: Array(12).fill(''),
  notes: '',
  showStudentClosed: false,
});

const fmt = (val) => {
  const n = parseFloat(val);
  if (isNaN(n) || val === '') return '';
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const num = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

const rowTotal = (arr) => arr.reduce((s, v) => s + num(v), 0);

const CurrencyCell = ({ value, onChange, highlight, readOnly, className = '' }) => {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(value);

  useEffect(() => { if (!editing) setRaw(value); }, [value, editing]);

  if (readOnly) {
    const n = parseFloat(value);
    const isNeg = !isNaN(n) && n < 0;
    return (
      <td className={`border border-zinc-200 px-2 py-1.5 text-right text-xs font-semibold whitespace-nowrap ${isNeg ? 'text-red-600' : 'text-notion-black'} ${highlight ? 'bg-blue-50' : ''} ${className}`}>
        {value === '' ? '' : fmt(value)}
      </td>
    );
  }

  return (
    <td
      className={`border border-zinc-200 px-0 py-0 text-right text-xs ${highlight ? 'bg-blue-50' : 'bg-white'} ${className}`}
      onClick={() => setEditing(true)}
    >
      {editing ? (
        <input
          type="number"
          autoFocus
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={() => { setEditing(false); onChange(raw); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { setEditing(false); onChange(raw); } }}
          className={`w-full h-full px-2 py-1.5 text-right text-xs outline-none ${highlight ? 'bg-blue-100' : 'bg-yellow-50'} border-2 border-notion-blue`}
        />
      ) : (
        <span className="block px-2 py-1.5 cursor-text min-w-[64px]">
          {value === '' ? <span className="text-zinc-300">—</span> : fmt(value)}
        </span>
      )}
    </td>
  );
};

const StaffCard = ({ staff, year, onUpdate, onDelete }) => {
  const update = (field, value) => onUpdate({ ...staff, [field]: value });
  const updateMonth = (field, idx, value) => {
    const arr = [...staff[field]];
    arr[idx] = value;
    onUpdate({ ...staff, [field]: arr });
  };

  const totalCost = MONTHS.map((_, i) => num(staff.basicSalary[i]) + num(staff.superannuation[i]));
  const surplus = MONTHS.map((_, i) => num(staff.revenueEarned[i]) - totalCost[i]);

  const totalBasic = rowTotal(staff.basicSalary);
  const totalSuper = rowTotal(staff.superannuation);
  const totalCostSum = totalBasic + totalSuper;
  const totalRevenue = rowTotal(staff.revenueEarned);
  const totalSurplus = totalRevenue - totalCostSum;

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Staff Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-yellow-400">
        <input
          type="text"
          value={staff.name}
          onChange={e => update('name', e.target.value)}
          className="flex-1 bg-transparent font-bold text-sm text-zinc-900 outline-none border-b border-transparent focus:border-zinc-700 placeholder-zinc-600"
          placeholder="Staff Name"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-700 normal-case tracking-normal">Annual Salary: $</label>
          <input
            type="number"
            value={staff.annualSalary || ''}
            onChange={e => update('annualSalary', e.target.value)}
            className="w-24 bg-yellow-300 text-xs font-bold text-zinc-800 rounded px-2 py-1 outline-none border border-yellow-500 focus:border-zinc-700"
            placeholder="0"
          />
          <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 normal-case tracking-normal cursor-pointer ml-2">
            <input type="checkbox" checked={staff.showStudentClosed} onChange={e => update('showStudentClosed', e.target.checked)} className="accent-zinc-700" />
            Student Closed
          </label>
          <button
            onClick={onDelete}
            className="ml-2 p-1.5 text-zinc-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove staff member"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border border-zinc-200 px-3 py-2 text-left font-bold text-zinc-600 min-w-[140px]">Employees</th>
              {MONTHS.map(m => (
                <th key={m} className="border border-zinc-200 px-2 py-2 text-center font-bold text-zinc-600 min-w-[72px]">
                  {m}-{String(year).slice(2)}
                </th>
              ))}
              <th className="border border-zinc-200 px-2 py-2 text-center font-bold text-zinc-600 min-w-[90px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Basic Salary */}
            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600">Basic Salary</td>
              {staff.basicSalary.map((v, i) => (
                <CurrencyCell key={i} value={v} onChange={val => updateMonth('basicSalary', i, val)} />
              ))}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-semibold bg-zinc-50">{totalBasic ? fmt(totalBasic) : ''}</td>
            </tr>

            {/* Superannuation */}
            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600">Superannuation</td>
              {staff.superannuation.map((v, i) => (
                <CurrencyCell key={i} value={v} onChange={val => updateMonth('superannuation', i, val)} />
              ))}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-semibold bg-zinc-50">{totalSuper ? fmt(totalSuper) : ''}</td>
            </tr>

            {/* Total Cost */}
            <tr className="bg-zinc-50 font-bold">
              <td className="border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-800">Total Cost</td>
              {totalCost.map((v, i) => (
                <td key={i} className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold text-zinc-800">
                  {v ? fmt(v) : ''}
                </td>
              ))}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold text-zinc-800">{totalCostSum ? fmt(totalCostSum) : ''}</td>
            </tr>

            {/* Spacer */}
            <tr><td colSpan={14} className="py-0.5 bg-white border-0" /></tr>

            {/* Revenue Earned */}
            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50">Revenue Earned</td>
              {staff.revenueEarned.map((v, i) => (
                <CurrencyCell key={i} value={v} onChange={val => updateMonth('revenueEarned', i, val)} highlight />
              ))}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold text-blue-700 bg-blue-50">{totalRevenue ? fmt(totalRevenue) : ''}</td>
            </tr>

            {/* Service Fee Ref */}
            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 bg-blue-50">Service Fee Ref</td>
              {staff.serviceFeeRef.map((v, i) => (
                <CurrencyCell key={i} value={v} onChange={val => updateMonth('serviceFeeRef', i, val)} highlight />
              ))}
              <td className="border border-zinc-200 px-2 py-1.5 bg-blue-50" />
            </tr>

            {/* Spacer */}
            <tr><td colSpan={14} className="py-0.5 bg-white border-0" /></tr>

            {/* Surplus/Deficit */}
            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-800">Surplus/(deficit)</td>
              {surplus.map((v, i) => {
                const hasData = num(staff.revenueEarned[i]) || totalCost[i];
                return (
                  <td key={i} className={`border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold whitespace-nowrap ${v < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                    {hasData ? fmt(v) : ''}
                  </td>
                );
              })}
              <td className={`border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold ${totalSurplus < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                {(totalRevenue || totalCostSum) ? fmt(totalSurplus) : ''}
              </td>
            </tr>

            {/* Student Closed (optional) */}
            {staff.showStudentClosed && (
              <tr className="bg-yellow-100">
                <td className="border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-yellow-800" colSpan={14}>
                  Student Closed
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StaffProductivityReport = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList));
  }, [staffList]);

  const addStaff = () => setStaffList(prev => [...prev, defaultStaff()]);

  const updateStaff = useCallback((id, updated) => {
    setStaffList(prev => prev.map(s => s.id === id ? updated : s));
  }, []);

  const deleteStaff = useCallback((id) => {
    if (window.confirm('Remove this staff member and all their data?')) {
      setStaffList(prev => prev.filter(s => s.id !== id));
    }
  }, []);

  return (
    <div className="p-6 max-w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-display-secondary text-notion-black tracking-notion-display">Staff Productivity Report</h2>
          <p className="text-xs text-zinc-400 mt-1">Manual entry · Admin only · Data saved locally</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest normal-case">Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-zinc-800 outline-none"
            >
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addStaff}
            className="flex items-center gap-2 px-4 py-2 bg-notion-blue text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Staff
          </button>
        </div>
      </div>

      {/* Empty State */}
      {staffList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-zinc-500 font-medium mb-1">No staff members yet</p>
          <p className="text-zinc-400 text-xs mb-4">Click "Add Staff" to get started</p>
          <button onClick={addStaff} className="px-4 py-2 bg-notion-blue text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
            Add First Staff Member
          </button>
        </div>
      )}

      {/* Staff Cards */}
      {staffList.map(staff => (
        <StaffCard
          key={staff.id}
          staff={staff}
          year={year}
          onUpdate={updated => updateStaff(staff.id, updated)}
          onDelete={() => deleteStaff(staff.id)}
        />
      ))}
    </div>
  );
};

export default StaffProductivityReport;
