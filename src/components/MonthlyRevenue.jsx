import React, { useState, useEffect, useCallback } from 'react';

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
    <td className={`border border-zinc-200 px-0 py-0 text-right text-xs cursor-text
      ${highlight ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-zinc-50'}`}
      onClick={() => setEditing(true)}>
      {editing ? (
        <input type="number" autoFocus value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={() => { setEditing(false); onChange(raw); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { setEditing(false); onChange(raw); } }}
          className={`w-full px-2 py-1.5 text-right text-xs outline-none border-2 border-notion-blue
            ${highlight ? 'bg-blue-100' : 'bg-yellow-50'}`} />
      ) : (
        <span className="block px-2 py-1.5 min-w-[64px]">
          {value === '' ? <span className="text-zinc-300">—</span> : fmt(value)}
        </span>
      )}
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
    <td className="border border-amber-400 px-0 py-0 text-center text-xs bg-amber-300 cursor-text hover:bg-amber-200"
      onClick={() => setEditing(true)}>
      {editing ? (
        <input type="number" autoFocus value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={() => { setEditing(false); onChange(raw); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { setEditing(false); onChange(raw); } }}
          className="w-full px-2 py-1.5 text-center text-xs outline-none bg-yellow-100 border-2 border-notion-blue" />
      ) : (
        <span className="block px-2 py-1.5 font-bold min-w-[48px] text-zinc-900">
          {value === '' ? <span className="text-amber-600 font-normal">—</span> : value}
        </span>
      )}
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

  // revenueRows are SUBTRACTED from surplus (deductions)
  const surplus = MONTHS.map((_, i) =>
    num(staff.revenueEarned[i]) -
    totalCost[i] -
    revenueRows.reduce((s, r) => s + num(r.values[i]), 0)
  );

  const totalBasic = rowTotal(staff.basicSalary);
  const totalSuper = rowTotal(staff.superannuation);
  const totalCostRowsSum = costRows.reduce((s, r) => s + rowTotal(r.values), 0);
  const totalCostSum = totalBasic + totalSuper + totalCostRowsSum;
  const totalRevenue = rowTotal(staff.revenueEarned);
  const totalRevenueRowsDeduction = revenueRows.reduce((s, r) => s + rowTotal(r.values), 0);
  const totalSurplus = totalRevenue - totalCostSum - totalRevenueRowsDeduction;

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
              <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-bold text-blue-700 bg-blue-50">{totalRevenue ? fmt(totalRevenue) : ''}</td>
              {editing && <td className="border border-zinc-200 bg-blue-50" />}
            </tr>

            <tr>
              <td className="border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 bg-blue-50">Service Fee Ref</td>
              {staff.serviceFeeRef.map((v, i) =>
                <Cell key={i} value={v} onChange={val => updateMonth('serviceFeeRef', i, val)} highlight editing={editing} />
              )}
              <td className="border border-zinc-200 px-2 py-1.5 bg-blue-50" />
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
                <td className="border border-zinc-200 px-2 py-1.5 text-right text-xs font-semibold bg-blue-50 text-red-600">
                  {rowTotal(row.values) ? `−${fmt(rowTotal(row.values))}` : ''}
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

            {/* ── SURPLUS / DEFICIT (fully correct now) ── */}
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

// ── Main Page ──────────────────────────────────────────────────────────────────

const StaffProductivityReport = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [editing, setEditing] = useState(false);
  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList)); }, [staffList]);

  const addStaff = () => setStaffList(prev => [...prev, defaultStaff()]);
  const updateStaff = useCallback((id, updated) => setStaffList(prev => prev.map(s => s.id === id ? updated : s)), []);
  const deleteStaff = useCallback((id) => {
    if (window.confirm('Remove this staff member and all their data?')) {
      setStaffList(prev => prev.filter(s => s.id !== id));
    }
  }, []);

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-display-secondary text-notion-black tracking-notion-display">Staff Productivity Report</h2>
          <p className="text-xs text-zinc-400 mt-1">Admin only · Data saved locally</p>
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
            <button onClick={addStaff}
              className="flex items-center gap-2 px-4 py-2 bg-notion-blue text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Add Staff
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Edit mode is active. Click any cell to enter a value. Use <strong>&nbsp;Add Row&nbsp;</strong> inside each card to add extra cost items (they are included in Total Cost). Click <strong>&nbsp;Done Editing&nbsp;</strong> when finished.
        </div>
      )}

      {staffList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-zinc-500 font-medium mb-1">No staff members yet</p>
          <p className="text-zinc-400 text-xs mb-4">Click "Edit Data" then "Add Staff" to get started</p>
          <button onClick={() => { setEditing(true); addStaff(); }}
            className="px-4 py-2 bg-notion-blue text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
            Add First Staff Member
          </button>
        </div>
      )}

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
    </div>
  );
};

export default StaffProductivityReport;
