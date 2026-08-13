import React, { useState, useEffect, useCallback } from 'react';
import { getStaffProductivityReports, saveStaffProductivityReports } from '../utils/storage';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STORAGE_KEY = 'staff_productivity_report';
const CURRENT_YEAR = new Date().getFullYear();

const defaultCostRow = () => ({
  id: crypto.randomUUID(),
  label: 'New Item',
  values: Array(12).fill(''),
});

const defaultRevenueRow = () => ({
  id: crypto.randomUUID(),
  label: 'New Item',
  values: Array(12).fill(''),
});

const defaultStaff = () => ({
  id: crypto.randomUUID(),
  name: 'New Staff Member',
  annualSalary: '',
  basicSalary: Array(12).fill(''),
  superannuation: Array(12).fill(''),
  costRows: [],          // ← extra cost rows (added to Total Cost)
  revenueEarned: Array(12).fill(''),
  serviceFeeRef: Array(12).fill(''),
  revenueRows: [],       // ← extra revenue-section rows (subtracted from Surplus)
  studentClosed: Array(12).fill(''),
});

const fmt = (val) => {
  const n = parseFloat(val);
  if (isNaN(n) || val === '') return '';
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 2 });
};
const num = (val) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };
const rowTotal = (arr) => arr.reduce((s, v) => s + num(v), 0);

// ── Cells ──────────────────────────────────────────────────────────────────────

const ReadCell = ({ value, highlight }) => {
  const n = parseFloat(value);
  const isNeg = !isNaN(n) && n < 0;
  return (
    <td className={`border border-zinc-200 px-2 py-1.5 text-right text-xs font-medium whitespace-nowrap
      ${isNeg ? 'text-red-600' : 'text-zinc-800'} ${highlight ? 'bg-blue-50' : ''}`}>
      {value === '' || value === undefined ? '' : fmt(value)}
    </td>
  );
};

const EditCell = ({ value, onChange, highlight }) => {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(value);
  useEffect(() => { if (!editing) setRaw(value); }, [value, editing]);
  return (
    <td className={`border border-zinc-200 px-0 py-0 text-right text-xs cursor-text relative
      ${highlight ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-zinc-50'}`}
      onClick={() => setEditing(true)}>
      {editing && (
        <input type="number" autoFocus value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={() => { setEditing(false); onChange(raw); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { setEditing(false); onChange(raw); } }}
          className={`absolute inset-0 w-full h-full px-2 text-right text-xs outline-none ring-2 ring-inset ring-notion-blue border-none z-10
            ${highlight ? 'bg-blue-100' : 'bg-yellow-50'}`} />
      )}
      <span className={`block px-2 py-1.5 min-w-[64px] ${editing ? 'opacity-0' : ''}`}>
        {value === '' ? <span className="text-zinc-300">—</span> : fmt(value)}
      </span>
    </td>
  );
};

const Cell = ({ value, onChange, highlight, editing }) =>
  editing
    ? <EditCell value={value} onChange={onChange} highlight={highlight} />
    : <ReadCell value={value} highlight={highlight} />;

// Plain count cells for Student Closed
const ReadCountCell = ({ value }) => (
  <td className="border border-amber-400 px-2 py-1.5 text-center text-xs font-bold text-zinc-900 bg-amber-400 whitespace-nowrap">
    {value === '' || value === undefined ? '' : value}
  </td>
);

const EditCountCell = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(value);
  useEffect(() => { if (!editing) setRaw(value); }, [value, editing]);
  return (
    <td className="border border-amber-400 px-0 py-0 text-center text-xs bg-amber-300 cursor-text hover:bg-amber-200 relative"
      onClick={() => setEditing(true)}>
      {editing && (
        <input type="number" autoFocus value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={() => { setEditing(false); onChange(raw); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { setEditing(false); onChange(raw); } }}
          className="absolute inset-0 w-full h-full px-2 text-center text-xs outline-none bg-yellow-100 ring-2 ring-inset ring-notion-blue border-none z-10" />
      )}
      <span className={`block px-2 py-1.5 font-bold min-w-[48px] text-zinc-900 ${editing ? 'opacity-0' : ''}`}>
        {value === '' ? <span className="text-amber-600 font-normal">—</span> : value}
      </span>
    </td>
  );
};

// ── Staff Card ─────────────────────────────────────────────────────────────────

const StaffCard = ({ staff, year, onUpdate, onDelete, editing }) => {
  const update = (field, value) => onUpdate({ ...staff, [field]: value });

  const updateMonth = (field, idx, value) => {
    const arr = [...staff[field]]; arr[idx] = value;
    onUpdate({ ...staff, [field]: arr });
  };

  const updateCostRow = (rowId, idx, value) => {
    const rows = (staff.costRows || []).map(r =>
      r.id === rowId ? { ...r, values: r.values.map((v, i) => i === idx ? value : v) } : r
    );
    onUpdate({ ...staff, costRows: rows });
  };

  const updateRevenueRow = (rowId, idx, value) => {
    const rows = (staff.revenueRows || []).map(r =>
      r.id === rowId ? { ...r, values: r.values.map((v, i) => i === idx ? value : v) } : r
    );
    onUpdate({ ...staff, revenueRows: rows });
  };

  const updateStudentClosed = (idx, value) => {
    const arr = [...(staff.studentClosed || Array(12).fill(''))]; arr[idx] = value;
    onUpdate({ ...staff, studentClosed: arr });
  };

  const addCostRow = () => onUpdate({ ...staff, costRows: [...(staff.costRows || []), defaultCostRow()] });
  const removeCostRow = (rowId) => onUpdate({ ...staff, costRows: (staff.costRows || []).filter(r => r.id !== rowId) });
  const updateCostRowLabel = (rowId, label) =>
    onUpdate({ ...staff, costRows: (staff.costRows || []).map(r => r.id === rowId ? { ...r, label } : r) });

  const addRevenueRow = () => onUpdate({ ...staff, revenueRows: [...(staff.revenueRows || []), defaultRevenueRow()] });
  const removeRevenueRow = (rowId) => onUpdate({ ...staff, revenueRows: (staff.revenueRows || []).filter(r => r.id !== rowId) });
  const updateRevenueRowLabel = (rowId, label) =>
    onUpdate({ ...staff, revenueRows: (staff.revenueRows || []).map(r => r.id === rowId ? { ...r, label } : r) });

  // ── Calculations ──
  const costRows = staff.costRows || [];
  const revenueRows = staff.revenueRows || [];

  const totalCost = MONTHS.map((_, i) =>
    num(staff.basicSalary[i]) +
    num(staff.superannuation[i]) +
    costRows.reduce((s, r) => s + num(r.values[i]), 0)
  );

  const totalRevenueEarnedLine = MONTHS.map((_, i) =>
    num(staff.revenueEarned[i]) +
    num(staff.serviceFeeRef[i]) +
    revenueRows.reduce((s, r) => s + num(r.values[i]), 0)
  );

  // Surplus: Positive means Green, Negative means Red
  const surplus = MONTHS.map((_, i) => totalRevenueEarnedLine[i] - totalCost[i]);

  const totalBasic = rowTotal(staff.basicSalary);
  const totalSuper = rowTotal(staff.superannuation);
  const totalCostRowsSum = costRows.reduce((s, r) => s + rowTotal(r.values), 0);
  const totalCostSum = totalBasic + totalSuper + totalCostRowsSum;
  
  const totalRev = rowTotal(staff.revenueEarned);
  const totalServiceFee = rowTotal(staff.serviceFeeRef);
  const totalRevenueRowsSum = revenueRows.reduce((s, r) => s + rowTotal(r.values), 0);
  const totalRevenueSum = totalRev + totalServiceFee + totalRevenueRowsSum;
  
  const totalSurplus = totalRevenueSum - totalCostSum;

  const studentClosed = staff.studentClosed || Array(12).fill('');
  const studentTotal = studentClosed.reduce((s, v) => s + (parseInt(v) || 0), 0);

  const COLS = editing ? 15 : 14;

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Staff Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-yellow-400">
        {editing ? (
          <input type="text" value={staff.name} onChange={e => update('name', e.target.value)}
            className="flex-1 bg-transparent font-bold text-sm text-zinc-900 outline-none border-b border-yellow-600 placeholder-zinc-600"
            placeholder="Staff Name" />
        ) : (
          <span className="flex-1 font-bold text-sm text-zinc-900">{staff.name}</span>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-700">Annual Salary: $</span>
          {editing ? (
            <input type="number" value={staff.annualSalary} onChange={e => update('annualSalary', e.target.value)}
              className="w-24 bg-yellow-300 text-xs font-bold text-zinc-800 rounded px-2 py-1 outline-none border border-yellow-600"
              placeholder="0" />
          ) : (
            <span className="text-xs font-bold text-zinc-800">{staff.annualSalary ? fmt(staff.annualSalary) : '—'}</span>
          )}
          {editing && (
            <button onClick={onDelete}
              className="ml-1 p-1.5 text-zinc-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
              title="Remove staff member">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border border-zinc-200 px-3 py-2 text-left font-bold text-zinc-600 min-w-[160px]">Employees</th>
              {MONTHS.map(m => (
                <th key={m} className="border border-zinc-200 px-2 py-2 text-center font-bold text-zinc-600 min-w-[72px]">
                  {m}-{String(year).slice(2)}
                </th>
              ))}
              <th className="border border-zinc-200 px-2 py-2 text-center font-bold text-zinc-600 min-w-[90px]">Total</th>
              {editing && <th className="border border-zinc-200 w-8" />}
            </tr>
          </thead>
          <tbody>

            {/* ── COST SECTION ── */}
            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600">Basic Salary</td>
              {staff.basicSalary.map((v, i) =>
                <Cell key={i} value={v} onChange={val => updateMonth('basicSalary', i, val)} editing={editing} />
              )}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-semibold bg-zinc-50">{totalBasic ? fmt(totalBasic) : ''}</td>
              {editing && <td className="border border-zinc-200" />}
            </tr>

            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600">Superannuation</td>
              {staff.superannuation.map((v, i) =>
                <Cell key={i} value={v} onChange={val => updateMonth('superannuation', i, val)} editing={editing} />
              )}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-semibold bg-zinc-50">{totalSuper ? fmt(totalSuper) : ''}</td>
              {editing && <td className="border border-zinc-200" />}
            </tr>

            {/* Extra cost rows (user-added) — included in Total Cost */}
            {costRows.map(row => (
              <tr key={row.id}>
                <td className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600">
                  {editing ? (
                    <input type="text" value={row.label}
                      onChange={e => updateCostRowLabel(row.id, e.target.value)}
                      className="w-full bg-transparent outline-none border-b border-zinc-300 focus:border-notion-blue text-xs"
                      placeholder="Row label" />
                  ) : row.label}
                </td>
                {row.values.map((v, i) =>
                  <Cell key={i} value={v} onChange={val => updateCostRow(row.id, i, val)} editing={editing} />
                )}
                <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-semibold bg-zinc-50">
                  {rowTotal(row.values) ? fmt(rowTotal(row.values)) : ''}
                </td>
                {editing && (
                  <td className="border border-zinc-200 text-center">
                    <button onClick={() => removeCostRow(row.id)}
                      className="p-1 text-zinc-300 hover:text-red-500 transition-colors" title="Remove row">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {/* + Add Row (before Total Cost) */}
            {editing && (
              <tr>
                <td colSpan={COLS} className="border border-zinc-200 px-3 py-1.5">
                  <button onClick={addCostRow}
                    className="flex items-center gap-1 text-xs text-notion-blue hover:text-blue-700 font-semibold transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Row
                  </button>
                </td>
              </tr>
            )}

            {/* Total Cost (auto-calculated — includes costRows) */}
            <tr className="bg-zinc-50">
              <td className="border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-800">Total Cost</td>
              {totalCost.map((v, i) => (
                <td key={i} className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold text-zinc-800">{v ? fmt(v) : ''}</td>
              ))}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold text-zinc-800">{totalCostSum ? fmt(totalCostSum) : ''}</td>
              {editing && <td className="border border-zinc-200" />}
            </tr>

            {/* Spacer */}
            <tr><td colSpan={COLS} className="py-0.5 bg-white border-x-0 border-zinc-100" /></tr>

            {/* ── REVENUE SECTION ── */}
            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50">Revenue Earned</td>
              {staff.revenueEarned.map((v, i) =>
                <Cell key={i} value={v} onChange={val => updateMonth('revenueEarned', i, val)} highlight editing={editing} />
              )}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold text-blue-700 bg-blue-50">{totalRev ? fmt(totalRev) : ''}</td>
              {editing && <td className="border border-zinc-200 bg-blue-50" />}
            </tr>

            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 bg-blue-50">Service Fee Ref</td>
              {staff.serviceFeeRef.map((v, i) =>
                <Cell key={i} value={v} onChange={val => updateMonth('serviceFeeRef', i, val)} highlight editing={editing} />
              )}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-semibold bg-blue-50 text-blue-700">
                {rowTotal(staff.serviceFeeRef) ? fmt(rowTotal(staff.serviceFeeRef)) : ''}
              </td>
              {editing && <td className="border border-zinc-200 bg-blue-50" />}
            </tr>

            {/* Extra revenue-section rows (subtracted from Surplus) */}
            {revenueRows.map(row => (
              <tr key={row.id} className="bg-blue-50">
                <td className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600">
                  {editing ? (
                    <input type="text" value={row.label}
                      onChange={e => updateRevenueRowLabel(row.id, e.target.value)}
                      className="w-full bg-transparent outline-none border-b border-zinc-300 focus:border-notion-blue text-xs"
                      placeholder="Row label" />
                  ) : row.label}
                </td>
                {row.values.map((v, i) =>
                  <Cell key={i} value={v} onChange={val => updateRevenueRow(row.id, i, val)} highlight editing={editing} />
                )}
                <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-semibold bg-blue-50 text-blue-700">
                  {rowTotal(row.values) ? fmt(rowTotal(row.values)) : ''}
                </td>
                {editing && (
                  <td className="border border-zinc-200 text-center">
                    <button onClick={() => removeRevenueRow(row.id)}
                      className="p-1 text-zinc-300 hover:text-red-500 transition-colors" title="Remove row">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {/* + Add Row in revenue section */}
            {editing && (
              <tr>
                <td colSpan={COLS} className="border border-zinc-200 bg-blue-50 px-3 py-1.5">
                  <button onClick={addRevenueRow}
                    className="flex items-center gap-1 text-xs text-notion-blue hover:text-blue-700 font-semibold transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Row
                  </button>
                </td>
              </tr>
            )}

            {/* Spacer */}
            <tr><td colSpan={COLS} className="py-0.5 bg-white border-x-0 border-zinc-100" /></tr>

            {/* Total Revenue Earned (auto-calculated) */}
            <tr className="bg-blue-50">
              <td className="border border-zinc-200 px-3 py-1.5 text-xs font-bold text-blue-800">Total Revenue Earned</td>
              {totalRevenueEarnedLine.map((v, i) => (
                <td key={i} className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold text-blue-800">{v ? fmt(v) : ''}</td>
              ))}
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold text-blue-800">{totalRevenueSum ? fmt(totalRevenueSum) : ''}</td>
              {editing && <td className="border border-zinc-200 bg-blue-50" />}
            </tr>

            {/* Spacer */}
            <tr><td colSpan={COLS} className="py-0.5 bg-white border-x-0 border-zinc-100" /></tr>

            {/* ── SURPLUS / DEFICIT (fully correct now) ── */}
            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-800">Surplus/(deficit)</td>
              {surplus.map((v, i) => {
                const hasData = num(staff.revenueEarned[i]) || totalCost[i];
                return (
                  <td key={i} className={`border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold whitespace-nowrap ${v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                    {hasData ? fmt(v) : ''}
                  </td>
                );
              })}
              <td className={`border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold ${totalSurplus > 0 ? 'text-green-600' : totalSurplus < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                {(totalRevenueSum || totalCostSum) ? fmt(totalSurplus) : ''}
              </td>
              {editing && <td className="border border-zinc-200" />}
            </tr>

            {/* ── STUDENT CLOSED (always visible, amber) ── */}
            <tr>
              <td className="border border-amber-400 px-3 py-2 text-xs font-black text-zinc-900 bg-amber-400 uppercase tracking-widest">
                Student Closed
              </td>
              {studentClosed.map((v, i) =>
                editing
                  ? <EditCountCell key={i} value={v} onChange={val => updateStudentClosed(i, val)} />
                  : <ReadCountCell key={i} value={v} />
              )}
              <td className="border border-amber-400 px-2 py-2 text-center text-xs font-black text-zinc-900 bg-amber-400">
                {studentTotal || ''}
              </td>
              {editing && <td className="border border-amber-400 bg-amber-400" />}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Company Summary Card ───────────────────────────────────────────────────────

const CompanySummaryCard = ({ staffList, year }) => {
  if (!staffList || staffList.length === 0) return null;

  const aggCost = Array(12).fill(0);
  const aggRevenueEarned = Array(12).fill(0);
  const aggServiceFee = Array(12).fill(0);
  const aggTotalRevenueEarnedLine = Array(12).fill(0);
  const aggSurplus = Array(12).fill(0);
  const aggStudentClosed = Array(12).fill(0);

  staffList.forEach(staff => {
    const costRows = staff.costRows || [];
    const revenueRows = staff.revenueRows || [];

    const totalCost = MONTHS.map((_, i) =>
      num(staff.basicSalary[i]) +
      num(staff.superannuation[i]) +
      costRows.reduce((s, r) => s + num(r.values[i]), 0)
    );

    const totalRevenueEarnedLine = MONTHS.map((_, i) =>
      num(staff.revenueEarned[i]) +
      num(staff.serviceFeeRef[i]) +
      revenueRows.reduce((s, r) => s + num(r.values[i]), 0)
    );

    const surplus = MONTHS.map((_, i) => totalRevenueEarnedLine[i] - totalCost[i]);
    const studentClosed = staff.studentClosed || Array(12).fill('');

    for (let i = 0; i < 12; i++) {
      aggCost[i] += totalCost[i];
      aggRevenueEarned[i] += num(staff.revenueEarned[i]);
      aggServiceFee[i] += num(staff.serviceFeeRef[i]);
      aggTotalRevenueEarnedLine[i] += totalRevenueEarnedLine[i];
      aggSurplus[i] += surplus[i];
      aggStudentClosed[i] += (parseInt(studentClosed[i]) || 0);
    }
  });

  const totalCostSum = rowTotal(aggCost);
  const totalRevenueEarnedSum = rowTotal(aggRevenueEarned);
  const totalServiceFeeSum = rowTotal(aggServiceFee);
  const grandRevenueSum = rowTotal(aggTotalRevenueEarnedLine);
  const grandSurplusSum = grandRevenueSum - totalCostSum;
  const studentTotal = aggStudentClosed.reduce((s, v) => s + v, 0);

  const COLS = 14;

  return (
    <div className="mb-8 rounded-xl bg-white border border-zinc-200 overflow-hidden shadow-sm">
      
      {/* Premium Header */}
      <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-zinc-200">
            <svg className="w-5 h-5 text-notion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div>
            <h3 className="font-bold tracking-wide text-[15px] text-notion-black">Company Grand Totals</h3>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mt-0.5">Real-Time Aggregation</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full custom-scrollbar pb-6 pt-2 px-2">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr>
              <th className="px-3 py-3 text-xs font-black text-[#1E40AF] uppercase tracking-wider w-48 border-b-2 border-blue-100">Metric</th>
              {MONTHS.map((m, i) => (
                <th key={m} className="px-2 py-3 text-center text-[11px] font-black text-[#1E3A8A] uppercase tracking-wider w-24 border-b-2 border-blue-100">
                  {m}-{year.toString().slice(-2)}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-black text-[#1E40AF] uppercase tracking-wider w-28 border-b-2 border-blue-100">Grand Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50/50">
            
            {/* Total Cost */}
            <tr className="hover:bg-blue-50/40 transition-colors duration-300">
              <td className="px-3 py-2.5 text-[13px] font-bold text-slate-700">Total Cost Per Month</td>
              {aggCost.map((v, i) => (
                <td key={i} className="px-2 py-2.5 text-right text-xs font-semibold text-slate-600 tabular-nums">{fmt(v)}</td>
              ))}
              <td className="px-3 py-2.5 text-right text-[13px] font-black text-slate-700 tabular-nums">{fmt(totalCostSum)}</td>
            </tr>

            {/* Revenues */}
            <tr className="hover:bg-blue-50/40 transition-colors duration-300">
              <td className="px-3 py-2 text-xs font-semibold text-[#3B82F6]">Revenue Earned</td>
              {aggRevenueEarned.map((v, i) => (
                <td key={i} className="px-2 py-2 text-right text-xs font-medium text-[#3B82F6] tabular-nums">{fmt(v)}</td>
              ))}
              <td className="px-3 py-2 text-right text-xs font-bold text-[#3B82F6] tabular-nums">{fmt(totalRevenueEarnedSum)}</td>
            </tr>
            <tr className="hover:bg-blue-50/40 transition-colors duration-300">
              <td className="px-3 py-1.5 text-[11px] italic font-medium text-slate-500">Service Fee</td>
              {aggServiceFee.map((v, i) => (
                <td key={i} className="px-2 py-1.5 text-right text-[11px] font-medium text-slate-500 tabular-nums">{fmt(v)}</td>
              ))}
              <td className="px-3 py-1.5 text-right text-[11px] italic font-semibold text-slate-500 tabular-nums">{fmt(totalServiceFeeSum)}</td>
            </tr>

            {/* Total Revenue */}
            <tr className="bg-blue-50/50 hover:bg-blue-100/50 transition-colors duration-300 border-y border-blue-100">
              <td className="px-3 py-3 text-[13px] font-black text-[#1E40AF]">Total Revenue Earned</td>
              {aggTotalRevenueEarnedLine.map((v, i) => (
                <td key={i} className="px-2 py-3 text-right text-xs font-bold text-[#1E40AF] tabular-nums">{fmt(v)}</td>
              ))}
              <td className="px-3 py-3 text-right text-[13px] font-black text-[#1E40AF] tabular-nums" style={{ textShadow: '0 0 10px rgba(30,64,175,0.2)' }}>
                {fmt(grandRevenueSum)}
              </td>
            </tr>

            {/* Empty Spacer */}
            <tr><td colSpan={COLS} className="py-2" /></tr>

            {/* Profit / Loss */}
            <tr className="bg-white hover:bg-emerald-50/30 transition-colors duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-lg relative z-10 border border-emerald-100/50">
              <td className="px-3 py-3.5 text-sm font-black text-emerald-700 rounded-l-lg border-l-4 border-emerald-500">
                Profit / (Loss)
              </td>
              {aggSurplus.map((v, i) => (
                <td key={i} className={`px-2 py-3.5 text-right text-xs font-bold tabular-nums ${v < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {fmt(v)}
                </td>
              ))}
              <td className={`px-3 py-3.5 text-right text-sm font-black tabular-nums rounded-r-lg ${grandSurplusSum < 0 ? 'text-rose-600' : 'text-emerald-700'}`} 
                  style={{ textShadow: grandSurplusSum < 0 ? '0 0 12px rgba(225,29,72,0.3)' : '0 0 12px rgba(16,185,129,0.3)' }}>
                {fmt(grandSurplusSum)}
              </td>
            </tr>

            {/* Empty Spacer */}
            <tr><td colSpan={COLS} className="py-2" /></tr>

            {/* Students Closed */}
            <tr className="bg-white hover:bg-amber-50/30 transition-colors duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-lg relative z-10 border border-amber-100/50">
              <td className="px-3 py-3 text-[13px] font-black text-[#D97706] rounded-l-lg border-l-4 border-amber-400">
                Total Student Closed
              </td>
              {aggStudentClosed.map((v, i) => (
                <td key={i} className="px-2 py-3 text-center text-xs font-bold text-[#D97706] tabular-nums">
                  {v || 0}
                </td>
              ))}
              <td className="px-3 py-3 text-center text-[13px] font-black text-[#D97706] tabular-nums rounded-r-lg"
                  style={{ textShadow: '0 0 12px rgba(217,119,6,0.3)' }}>
                {studentTotal || 0}
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

const StaffProductivityReport = () => {
  const [activeTab, setActiveTab] = useState('staff');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [editing, setEditing] = useState(false);
  const [staffList, setStaffList] = useState(() => {
    // 1. Check cloud cache first
    const cloudData = getStaffProductivityReports();
    if (cloudData && cloudData.length > 0) return cloudData;

    // 2. Migration fallback: check old local storage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          // Push to cloud and clean up localStorage immediately
          saveStaffProductivityReports(parsed);
          localStorage.removeItem(STORAGE_KEY);
          return parsed;
        }
      }
    } catch { }

    return [];
  });

  // Sync to cloud when data changes
  useEffect(() => {
    if (staffList.length > 0 || getStaffProductivityReports()?.length > 0) {
      saveStaffProductivityReports(staffList);
    }
  }, [staffList]);

  const addStaff = () => setStaffList(prev => [...prev, defaultStaff()]);
  const updateStaff = useCallback((id, updated) => setStaffList(prev => prev.map(s => s.id === id ? updated : s)), []);
  const deleteStaff = useCallback((id) => {
    if (window.confirm('Remove this staff member and all their data?')) {
      setStaffList(prev => prev.filter(s => s.id !== id));
    }
  }, []);

  const generateSampleData = () => {
    if (staffList.length > 0) {
      if (!window.confirm('This will replace your current data. Are you sure?')) return;
    }
    const sample1 = {
      id: crypto.randomUUID(),
      name: 'Alice Johnson (Senior Agent)',
      annualSalary: '85000',
      basicSalary: ['7083.33', '7083.33', '7083.33', '7083.33', '7083.33', '7083.33', '7083.33', '7083.33', '7083.33', '7083.33', '7083.33', '7083.33'],
      superannuation: ['779.16', '779.16', '779.16', '779.16', '779.16', '779.16', '779.16', '779.16', '779.16', '779.16', '779.16', '779.16'],
      costRows: [
        { id: crypto.randomUUID(), label: 'Software Licenses', values: ['150', '150', '150', '150', '150', '150', '150', '150', '150', '150', '150', '150'] },
        { id: crypto.randomUUID(), label: 'Travel Allowance', values: ['0', '300', '0', '0', '450', '0', '0', '200', '0', '0', '0', '0'] }
      ],
      revenueEarned: ['12500', '14200', '11800', '15600', '13400', '16200', '14100', '12900', '15500', '17100', '16800', '19500'],
      serviceFeeRef: ['500', '500', '500', '500', '500', '500', '500', '500', '500', '500', '500', '500'],
      revenueRows: [
        { id: crypto.randomUUID(), label: 'Bonus Revenue', values: ['0', '0', '2000', '0', '0', '2500', '0', '0', '0', '1000', '0', '3500'] }
      ],
      studentClosed: ['3', '4', '2', '5', '4', '6', '4', '3', '5', '6', '5', '7']
    };

    const sample2 = {
      id: crypto.randomUUID(),
      name: 'Bob Smith (Junior Agent)',
      annualSalary: '55000',
      basicSalary: ['4583.33', '4583.33', '4583.33', '4583.33', '4583.33', '4583.33', '4583.33', '4583.33', '4583.33', '4583.33', '4583.33', '4583.33'],
      superannuation: ['504.16', '504.16', '504.16', '504.16', '504.16', '504.16', '504.16', '504.16', '504.16', '504.16', '504.16', '504.16'],
      costRows: [
        { id: crypto.randomUUID(), label: 'Training Course', values: ['500', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'] }
      ],
      revenueEarned: ['6500', '7200', '6800', '8100', '7900', '9200', '8500', '8900', '9500', '9100', '10500', '11200'],
      serviceFeeRef: ['250', '250', '250', '250', '250', '250', '250', '250', '250', '250', '250', '250'],
      revenueRows: [],
      studentClosed: ['1', '2', '1', '2', '2', '3', '2', '2', '3', '2', '3', '4']
    };
    
    setStaffList([sample1, sample2]);
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-display-secondary text-notion-black tracking-notion-display">Staff Productivity Report</h2>
          <p className="text-xs text-zinc-400 mt-1">Admin only · Synced to Cloud</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-transparent text-sm font-bold text-zinc-800 outline-none">
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button
            onClick={() => setEditing(e => !e)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm
              ${editing ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
            {editing ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                Done Editing
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit Data
              </>
            )}
          </button>

          {editing && (
            <>
              <button onClick={generateSampleData}
                title="Generate Sample Data"
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-bold shadow-sm transition-colors border border-indigo-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                <span className="hidden sm:inline">Sample Data</span>
              </button>
              <button onClick={addStaff}
                className="flex items-center gap-2 px-4 py-2 bg-notion-blue text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Add Staff
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Edit mode is active. Click any cell to enter a value. Use <strong>&nbsp;Add Row&nbsp;</strong> inside each card to add extra cost items (they are included in Total Cost). Click <strong>&nbsp;Done Editing&nbsp;</strong> when finished.
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 mb-6 mt-2">
        <button
          className={`px-6 py-2.5 font-bold text-sm transition-colors ${activeTab === 'staff' ? 'border-b-2 border-notion-blue text-notion-blue bg-notion-blue/5' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
          onClick={() => setActiveTab('staff')}
        >
          Staff Details
        </button>
        <button
          className={`px-6 py-2.5 font-bold text-sm transition-colors ${activeTab === 'company' ? 'border-b-2 border-notion-blue text-notion-blue bg-notion-blue/5' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
          onClick={() => setActiveTab('company')}
        >
          Company Grand Totals
        </button>
      </div>

      {activeTab === 'staff' && (
        <div className="animate-fade-in-up">
          {staffList.map(staff => (
            <StaffCard
              key={staff.id}
              staff={staff}
              year={year}
              editing={editing}
              onUpdate={updated => updateStaff(staff.id, updated)}
              onDelete={() => deleteStaff(staff.id)}
            />
          ))}
          {staffList.length === 0 && (
            <div className="text-center py-12 bg-zinc-50 border border-zinc-200 rounded-xl">
              <p className="text-sm text-zinc-500 font-medium">No staff added yet.</p>
              {editing && (
                <button onClick={addStaff} className="mt-3 px-4 py-2 bg-notion-blue text-white rounded-lg text-sm font-bold">
                  Add First Staff
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'company' && (
        <div className="animate-fade-in-up">
          <CompanySummaryCard staffList={staffList} year={year} />
        </div>
      )}
    </div>
  );
};

export default StaffProductivityReport;
