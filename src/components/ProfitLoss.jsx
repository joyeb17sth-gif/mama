import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { saveProfitLoss, getProfitLoss } from '../utils/storage';

// ─── Constants ───────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 3 + i);

const REVENUE_ROWS = [
  { key: 'regular', label: 'Regular' },
  { key: 'extraWork', label: 'Extra Work' },
  { key: 'supervisorAllowance', label: 'Supervisor Allowance' },
  { key: 'other', label: 'Other' },
];
const COST_ROWS = [
  { key: 'regular', label: 'Regular' },
  { key: 'extraWork', label: 'Extra Work' },
  { key: 'motorVehicle', label: 'Motor Vehicle Expenses' },
  { key: 'other', label: 'Other' },
];
const OVERHEAD_ROWS = [
  { key: 'managerSalary', label: 'Manager Salary' },
  { key: 'chemical', label: 'Chemical' },
  { key: 'motorVehicle', label: 'Motor Vehicle Expenses' },
  { key: 'other', label: 'Other' },
];

// ─── Helper: create empty site data ──────────────────────────────────────
const createEmptySiteData = (name) => ({
  name,
  revenue: { regular: 0, extraWork: 0, supervisorAllowance: 0, other: 0 },
  directCost: { regular: 0, extraWork: 0, motorVehicle: 0, other: 0 },
  vehicleAllowanceIncome: 0,
  overhead: { managerSalary: 0, chemical: 0, motorVehicle: 0, other: 0 },
  managerAllocations: {},
});

// ─── Helper: create empty period ─────────────────────────────────────────
const createEmptyPeriod = (year, month) => ({
  id: `${year}-${String(month + 1).padStart(2, '0')}`,
  period: `${MONTHS[month]} ${year}`,
  year,
  month,
  sites: [],
  managers: [],
  overheadTotals: { chemicalTotal: 0, motorVehicleTotal: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ─── Helper: recalculate all manager salaries for a period ───────────────
const recalculateManagerSalaries = (period) => {
  period.sites.forEach(site => {
    let totalMgrSalary = 0;
    if (period.managers) {
      period.managers.forEach(mgr => {
        const pct = site.managerAllocations?.[mgr.id] || 0;
        totalMgrSalary += (pct / 100) * (mgr.totalSalary || 0);
      });
    }
    site.overhead.managerSalary = Math.round(totalMgrSalary);
  });
  return period;
};

// ─── Helper: compute derived values for a site ───────────────────────────
const computeSite = (site) => {
  const totalRevenue = (site.revenue?.regular || 0) + (site.revenue?.extraWork || 0) + (site.revenue?.supervisorAllowance || 0) + (site.revenue?.other || 0);
  const totalCost = (site.directCost?.regular || 0) + (site.directCost?.extraWork || 0) + (site.directCost?.motorVehicle || 0) + (site.directCost?.other || 0);
  const grossProfit = totalRevenue - totalCost;
  const gpMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalOverhead = (site.overhead?.managerSalary || 0) + (site.overhead?.chemical || 0) + (site.overhead?.motorVehicle || 0) + (site.overhead?.other || 0);
  const netProfit = grossProfit + (site.vehicleAllowanceIncome || 0) - totalOverhead;
  return { totalRevenue, totalCost, grossProfit, gpMargin, totalOverhead, netProfit };
};

// ─── Currency formatter ──────────────────────────────────────────────────
const fmt = (v) => {
  if (v === 0) return '$  -';
  const abs = Math.abs(v);
  const str = abs.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return v < 0 ? `($${str})` : `$${str}`;
};
const fmtPct = (v) => `${v.toFixed(0)}%`;

// ─── SVG Mini Bar Chart ──────────────────────────────────────────────────
const MiniBarChart = ({ data, width = 400, height = 260, isNetProfit = false }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => Math.max(Math.abs(d.value1 || 0), Math.abs(d.value2 || 0))), 1);
  const barGroupWidth = Math.min(60, (width - 40) / data.length);
  const barWidth = (barGroupWidth - 8) / (isNetProfit ? 1 : 2);
  const chartHeight = height - 85;

  return (
    <div className="relative overflow-visible" style={{ width: '100%' }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Y-axis gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <g key={pct}>
            <line x1="35" y1={10 + chartHeight * (1 - pct)} x2={width - 5} y2={10 + chartHeight * (1 - pct)} stroke="#e5e5e5" strokeWidth="0.5" />
            <text x="30" y={14 + chartHeight * (1 - pct)} textAnchor="end" fill="#a39e98" fontSize="8" fontFamily="Inter">{fmt(maxVal * pct)}</text>
          </g>
        ))}
        {/* Bars */}
        {data.map((d, i) => {
          const x = 40 + i * barGroupWidth;
          const h1 = (Math.abs(d.value1 || 0) / maxVal) * chartHeight;
          const h2 = (Math.abs(d.value2 || 0) / maxVal) * chartHeight;
          
          return (
            <g key={i} 
               onMouseEnter={() => setHoveredIndex(i)} 
               onMouseLeave={() => setHoveredIndex(null)}
               className="cursor-pointer transition-opacity"
               opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.4 : 1}>
              {hoveredIndex === i && (
                <rect x={x - 2} y={10} width={barGroupWidth - 4} height={chartHeight} fill="#f3f4f6" rx="4" opacity="0.5" />
              )}
              {isNetProfit ? (
                <rect x={x + (barGroupWidth - barWidth)/2 - 4} y={10 + chartHeight - h1} width={barWidth} height={h1} rx="2" fill={(d.value1 || 0) >= 0 ? '#1aae39' : '#ef4444'} opacity="0.85" />
              ) : (
                <>
                  <rect x={x} y={10 + chartHeight - h1} width={barWidth} height={h1} rx="2" fill="#0075de" opacity="0.85" />
                  <rect x={x + barWidth + 2} y={10 + chartHeight - h2} width={barWidth} height={h2} rx="2" fill="#1aae39" opacity="0.85" />
                </>
              )}
              <text x={x + barGroupWidth / 2 - 4} y={height - 65} textAnchor="end" fill={hoveredIndex === i ? "#111827" : "#615d59"} fontSize="8" fontWeight={hoveredIndex === i ? "bold" : "normal"} fontFamily="Inter" transform={`rotate(-45, ${x + barGroupWidth / 2 - 4}, ${height - 65})`}>
                {d.label?.length > 15 ? d.label.slice(0, 15) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {/* HTML Tooltip Overlay */}
      {hoveredIndex !== null && (
        <div 
          className="absolute z-50 bg-white border border-zinc-200 shadow-xl rounded-md p-3 text-xs pointer-events-none"
          style={{
            left: `${Math.min(100, Math.max(0, ((40 + hoveredIndex * barGroupWidth + barGroupWidth / 2) / width) * 100))}%`,
            top: '-10px',
            transform: 'translateX(-50%)',
            minWidth: '160px'
          }}
        >
          <div className="font-bold text-notion-black mb-1.5 border-b border-zinc-100 pb-1">{data[hoveredIndex].label}</div>
          {isNetProfit ? (
            <div className="flex justify-between items-center gap-3">
              <span className="text-notion-warm-gray-500 font-semibold">Net Profit:</span>
              <span className={`font-bold ${data[hoveredIndex].value1 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(data[hoveredIndex].value1)}</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between items-center gap-3">
                <span className="flex items-center gap-1.5 font-semibold text-notion-warm-gray-500"><span className="w-2 h-2 rounded-[2px] bg-[#0075de]"></span> Revenue:</span>
                <span className="font-bold text-notion-black">{fmt(data[hoveredIndex].value1)}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="flex items-center gap-1.5 font-semibold text-notion-warm-gray-500"><span className="w-2 h-2 rounded-[2px] bg-[#1aae39]"></span> Cost:</span>
                <span className="font-bold text-notion-black">{fmt(data[hoveredIndex].value2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── SVG GP% Gauge ───────────────────────────────────────────────────────
const GpGauge = ({ percent, label }) => {
  const clampedPct = Math.max(0, Math.min(100, percent));
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedPct / 100) * circumference;
  const color = clampedPct >= 25 ? '#1aae39' : clampedPct >= 12 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#f1f0ee" strokeWidth="6" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <text x="40" y="43" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="Inter">
          {fmtPct(percent)}
        </text>
      </svg>
      <span className="text-[10px] font-semibold text-notion-warm-gray-500 text-center leading-tight max-w-[80px] truncate" title={label}>{label}</span>
    </div>
  );
};

// ─── Editable Cell ───────────────────────────────────────────────────────
const EditableCell = ({ value, onChange, isPct = false, isEditable = true, className = '' }) => {
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
        step={isPct ? '0.5' : '1'}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCommit();
          if (e.key === 'Escape') { setEditing(false); }
          if (e.key === 'Tab') { e.preventDefault(); handleCommit(); }
        }}
        className="w-full h-full px-1.5 py-0.5 text-right text-xs border border-notion-blue rounded-sm bg-blue-50/50 focus:outline-none focus:ring-1 focus:ring-notion-blue [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`w-full h-full px-1.5 py-1 text-right text-xs rounded-sm select-none ${className} ${isEditable ? 'cursor-pointer hover:bg-notion-blue/5 transition-colors' : 'cursor-default'}`}
      title={isEditable ? "Click to edit" : ""}
    >
      {isPct ? (value ? fmtPct(value) : '-') : fmt(value)}
    </div>
  );
};

// ─── Add Site Modal ──────────────────────────────────────────────────────
const AddSiteModal = ({ onAdd, onClose, existingNames, historicalSites = [] }) => {
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.includes(trimmed)) {
      alert('A site with this name already exists in this period.');
      return;
    }
    onAdd(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-standard shadow-notion-deep p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-card-title text-notion-black mb-4">Add P&L Site Column</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Solo Shoalhaven"
              list="historical-sites"
              className="w-full px-3 py-2 whisper-border rounded-micro text-sm focus:outline-none focus:ring-1 focus:ring-notion-blue"
            />
            {historicalSites.length > 0 && (
              <datalist id="historical-sites">
                {historicalSites.map((site, i) => (
                  <option key={i} value={site} />
                ))}
              </datalist>
            )}
          </div>
          {historicalSites.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-bold text-notion-warm-gray-400 uppercase tracking-widest mb-1.5">Previous Sites</p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {historicalSites.map((site, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setName(site)}
                    className="px-2 py-1 bg-notion-warm-white text-notion-warm-gray-600 hover:bg-zinc-200 text-[11px] rounded-sm transition-colors border border-zinc-200"
                  >
                    {site}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm text-notion-warm-gray-500 hover:text-notion-black transition">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm bg-notion-blue text-white rounded-micro hover:bg-notion-blue-active transition font-semibold">Add Site</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const ProfitLoss = ({ syncVersion }) => {
  const [view, setView] = useState('table'); // 'table' | 'analytics' | 'overhead' | 'range'
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [allPeriods, setAllPeriods] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [backupPeriods, setBackupPeriods] = useState([]);
  const [showAddSite, setShowAddSite] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareYear, setCompareYear] = useState(CURRENT_YEAR);
  const [compareMonth, setCompareMonth] = useState(new Date().getMonth() > 0 ? new Date().getMonth() - 1 : 11);
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [rangeEnd, setRangeEnd] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  });
  const saveTimerRef = useRef(null);

  // Load data from cache
  useEffect(() => {
    const cached = getProfitLoss();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      // Automatically clean up any existing sample data
      const hasSampleData = cached.some(p => p.id === '2025-09' || p.id === '2025-10');
      if (hasSampleData) {
        const organicOnly = cached.filter(p => p.id !== '2025-09' && p.id !== '2025-10');
        setAllPeriods(organicOnly);
        // Fire save asynchronously so it updates local and cloud
        setTimeout(() => saveProfitLoss(organicOnly), 100);
      } else {
        setAllPeriods(cached);
      }
    }
  }, [syncVersion]);

  // Current period
  const periodId = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const currentPeriod = useMemo(() => {
    const found = allPeriods.find(p => p.id === periodId) || createEmptyPeriod(selectedYear, selectedMonth);
    const p = JSON.parse(JSON.stringify(found));

    // Migration: managers array
    if (!p.managers) {
      p.managers = [];
      if (p.overheadTotals?.managerSalaryTotal) {
        p.managers.push({
          id: 'mgr-legacy',
          name: 'Manager 1',
          totalSalary: p.overheadTotals.managerSalaryTotal
        });
      }
    }

    // Migration: managerAllocations
    p.sites.forEach(site => {
      if (!site.managerAllocations) {
        site.managerAllocations = {};
        if (site.overhead?.managerSalaryPct !== undefined && p.managers.length > 0) {
          site.managerAllocations['mgr-legacy'] = site.overhead.managerSalaryPct;
        }
      }
    });

    return recalculateManagerSalaries(p);
  }, [allPeriods, periodId, selectedYear, selectedMonth]);

  // Compare period
  const comparePeriodId = `${compareYear}-${String(compareMonth + 1).padStart(2, '0')}`;
  const comparePeriod = useMemo(() => {
    if (!compareMode) return null;
    return allPeriods.find(p => p.id === comparePeriodId) || null;
  }, [allPeriods, comparePeriodId, compareMode, compareYear, compareMonth]);

  // Debounced save
  const saveData = useCallback((updatedPeriods) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProfitLoss(updatedPeriods);
    }, 500);
  }, []);

  // Update a period in allPeriods
  const updatePeriod = useCallback((updater) => {
    setAllPeriods(prev => {
      let updatedPeriod;
      
      if (typeof updater === 'function') {
        const found = prev.find(p => p.id === periodId) || createEmptyPeriod(selectedYear, selectedMonth);
        const p = JSON.parse(JSON.stringify(found));

        // Migration: managers array
        if (!p.managers) {
          p.managers = [];
          if (p.overheadTotals?.managerSalaryTotal) {
            p.managers.push({
              id: 'mgr-legacy',
              name: 'Manager 1',
              totalSalary: p.overheadTotals.managerSalaryTotal
            });
          }
        }

        // Migration: managerAllocations
        p.sites.forEach(site => {
          if (!site.managerAllocations) {
            site.managerAllocations = {};
            if (site.overhead?.managerSalaryPct !== undefined && p.managers.length > 0) {
              site.managerAllocations['mgr-legacy'] = site.overhead.managerSalaryPct;
            }
          }
        });

        const migrated = recalculateManagerSalaries(p);
        updatedPeriod = updater(migrated);
      } else {
        updatedPeriod = updater;
      }

      updatedPeriod.updatedAt = new Date().toISOString();
      const idx = prev.findIndex(p => p.id === updatedPeriod.id);
      const next = idx >= 0 ? prev.map(p => p.id === updatedPeriod.id ? updatedPeriod : p) : [...prev, updatedPeriod];
      
      return next;
    });
  }, [periodId, selectedYear, selectedMonth]);

  // Update a specific site field
  const updateSiteField = useCallback((siteIndex, group, key, value) => {
    updatePeriod((updated) => {
      if (group === 'vehicleAllowanceIncome') {
        updated.sites[siteIndex].vehicleAllowanceIncome = value;
      } else {
        updated.sites[siteIndex][group][key] = value;
      }
      return updated;
    });
  }, [updatePeriod]);

  // ─── Manager Handlers ──────────────────────────────────────────────────
  const handleAddManager = useCallback(() => {
    updatePeriod((updated) => {
      updated.managers.push({
        id: `mgr-${crypto.randomUUID()}`,
        name: 'New Manager',
        totalSalary: 0
      });
      return updated;
    });
  }, [updatePeriod]);

  const handleUpdateManager = useCallback((mgrId, field, value) => {
    updatePeriod((updated) => {
      const mgr = updated.managers.find(m => m.id === mgrId);
      if (mgr) {
        mgr[field] = value;
        return recalculateManagerSalaries(updated);
      }
      return updated;
    });
  }, [updatePeriod]);

  const handleRemoveManager = useCallback((mgrId) => {
    if (!window.confirm("Remove this manager?")) return;
    updatePeriod((updated) => {
      updated.managers = updated.managers.filter(m => m.id !== mgrId);
      updated.sites.forEach(site => {
        if (site.managerAllocations) delete site.managerAllocations[mgrId];
      });
      return recalculateManagerSalaries(updated);
    });
  }, [updatePeriod]);

  const handleUpdateManagerAllocation = useCallback((siteIndex, mgrId, pct) => {
    updatePeriod((updated) => {
      if (!updated.sites[siteIndex].managerAllocations) {
        updated.sites[siteIndex].managerAllocations = {};
      }
      updated.sites[siteIndex].managerAllocations[mgrId] = pct;
      return recalculateManagerSalaries(updated);
    });
  }, [updatePeriod]);

  // Add new site column
  const handleAddSite = useCallback((name) => {
    updatePeriod((updated) => {
      updated.sites.push(createEmptySiteData(name));
      return updated;
    });
    setShowAddSite(false);
  }, [updatePeriod]);

  // Remove site column
  const handleRemoveSite = useCallback((siteIndex) => {
    if (!window.confirm(`Remove "${currentPeriod.sites[siteIndex]?.name}" from this period?`)) return;
    updatePeriod((updated) => {
      updated.sites.splice(siteIndex, 1);
      return updated;
    });
  }, [currentPeriod, updatePeriod]);

  // Copy from previous period
  const handleCopyPrevious = useCallback(() => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear--; }
    const prevId = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    const prev = allPeriods.find(p => p.id === prevId);
    if (!prev) { alert('No data found for the previous period.'); return; }
    if (currentPeriod.sites.length > 0 && !window.confirm('This will replace current period data. Continue?')) return;

    const copied = JSON.parse(JSON.stringify(prev));
    copied.id = periodId;
    copied.period = `${MONTHS[selectedMonth]} ${selectedYear}`;
    copied.year = selectedYear;
    copied.month = selectedMonth;
    copied.createdAt = new Date().toISOString();
    copied.updatedAt = new Date().toISOString();

    // Zero out all values but keep site structure and overhead %
    copied.sites = copied.sites.map(s => ({
      ...createEmptySiteData(s.name),
      overhead: { ...createEmptySiteData(s.name).overhead, managerSalaryPct: s.overhead?.managerSalaryPct || 0 },
    }));
    copied.overheadTotals = prev.overheadTotals ? { ...prev.overheadTotals } : { managerSalaryTotal: 0, chemicalTotal: 0, motorVehicleTotal: 0 };

    updatePeriod(copied);
  }, [selectedMonth, selectedYear, allPeriods, currentPeriod, periodId, updatePeriod]);

  // Navigate periods
  const goNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };
  const goPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };

  // Update overhead totals
  const updateOverheadTotal = useCallback((key, value) => {
    updatePeriod((updated) => {
      updated.overheadTotals[key] = value;

      // Recalculate manager salary for all sites based on their %
      if (key === 'managerSalaryTotal') {
        updated.sites.forEach(s => {
          s.overhead.managerSalary = Math.round(((s.overhead.managerSalaryPct || 0) / 100) * value);
        });
      }

      return updated;
    });
  }, [updatePeriod]);

  // Computed totals across all sites
  const siteTotals = useMemo(() => {
    return currentPeriod.sites.map(site => computeSite(site));
  }, [currentPeriod]);

  const grandTotals = useMemo(() => {
    const gt = {
      revenue: { regular: 0, extraWork: 0, supervisorAllowance: 0, other: 0 },
      directCost: { regular: 0, extraWork: 0, motorVehicle: 0, other: 0 },
      totalRevenue: 0, totalCost: 0, grossProfit: 0,
      vehicleAllowanceIncome: 0,
      overhead: { managerSalaryPct: 0, managerSalary: 0, chemical: 0, motorVehicle: 0, other: 0 },
      totalOverhead: 0, netProfit: 0,
    };
    currentPeriod.sites.forEach((site, i) => {
      REVENUE_ROWS.forEach(r => { gt.revenue[r.key] = (gt.revenue[r.key] || 0) + (site.revenue?.[r.key] || 0); });
      COST_ROWS.forEach(r => { gt.directCost[r.key] = (gt.directCost[r.key] || 0) + (site.directCost?.[r.key] || 0); });
      gt.vehicleAllowanceIncome += site.vehicleAllowanceIncome || 0;
      gt.overhead.managerSalaryPct += site.overhead?.managerSalaryPct || 0;
      gt.overhead.managerSalary += site.overhead?.managerSalary || 0;
      gt.overhead.chemical += site.overhead?.chemical || 0;
      gt.overhead.motorVehicle += site.overhead?.motorVehicle || 0;
      gt.overhead.other += site.overhead?.other || 0;

      const computed = siteTotals[i];
      gt.totalRevenue += computed.totalRevenue;
      gt.totalCost += computed.totalCost;
      gt.grossProfit += computed.grossProfit;
      gt.totalOverhead += computed.totalOverhead;
      gt.netProfit += computed.netProfit;
    });
    gt.gpMargin = gt.totalRevenue > 0 ? (gt.grossProfit / gt.totalRevenue) * 100 : 0;
    return gt;
  }, [currentPeriod, siteTotals]);

  // ─── Multi-Period Range Data ────────────────────────────────────────────
  const rangeData = useMemo(() => {
    if (view !== 'range' || allPeriods.length === 0 || !rangeStart || !rangeEnd) return null;

    const includedPeriods = [];
    let [startYr, startMo] = rangeStart.split('-').map(Number);
    let [endYr, endMo] = rangeEnd.split('-').map(Number);

    let startD = new Date(startYr, startMo - 1);
    let endD = new Date(endYr, endMo - 1);

    if (startD > endD) {
      const temp = startD;
      startD = endD;
      endD = temp;
    }

    let curr = new Date(endD);
    while (curr >= startD) {
      const yr = curr.getFullYear();
      const mo = curr.getMonth();
      const id = `${yr}-${String(mo + 1).padStart(2, '0')}`;
      const found = allPeriods.find(p => p.id === id);
      if (found) includedPeriods.push(found);
      curr.setMonth(curr.getMonth() - 1);
    }

    if (includedPeriods.length === 0) return null;

    // Aggregate by site name
    const siteMap = {};
    includedPeriods.forEach(period => {
      (period.sites || []).forEach(site => {
        if (!siteMap[site.name]) {
          siteMap[site.name] = {
            name: site.name,
            revenue: { regular: 0, extraWork: 0, supervisorAllowance: 0, other: 0 },
            directCost: { regular: 0, extraWork: 0, motorVehicle: 0, other: 0 },
            vehicleAllowanceIncome: 0,
            overhead: { managerSalary: 0, chemical: 0, motorVehicle: 0, other: 0 },
            managerAllocations: {},
          };
        }
        const agg = siteMap[site.name];
        REVENUE_ROWS.forEach(r => { agg.revenue[r.key] = (agg.revenue[r.key] || 0) + (site.revenue?.[r.key] || 0); });
        COST_ROWS.forEach(r => { agg.directCost[r.key] = (agg.directCost[r.key] || 0) + (site.directCost?.[r.key] || 0); });
        agg.vehicleAllowanceIncome += site.vehicleAllowanceIncome || 0;
        OVERHEAD_ROWS.forEach(r => { agg.overhead[r.key] = (agg.overhead[r.key] || 0) + (site.overhead?.[r.key] || 0); });
      });
    });

    const sites = Object.values(siteMap);
    const rSiteTotals = sites.map(site => computeSite(site));

    // Grand totals
    const gt = {
      revenue: { regular: 0, extraWork: 0, supervisorAllowance: 0, other: 0 },
      directCost: { regular: 0, extraWork: 0, motorVehicle: 0, other: 0 },
      totalRevenue: 0, totalCost: 0, grossProfit: 0,
      vehicleAllowanceIncome: 0,
      overhead: { managerSalary: 0, chemical: 0, motorVehicle: 0, other: 0 },
      totalOverhead: 0, netProfit: 0,
    };
    sites.forEach((site, i) => {
      REVENUE_ROWS.forEach(r => { gt.revenue[r.key] = (gt.revenue[r.key] || 0) + (site.revenue?.[r.key] || 0); });
      COST_ROWS.forEach(r => { gt.directCost[r.key] = (gt.directCost[r.key] || 0) + (site.directCost?.[r.key] || 0); });
      gt.vehicleAllowanceIncome += site.vehicleAllowanceIncome || 0;
      OVERHEAD_ROWS.forEach(r => { gt.overhead[r.key] = (gt.overhead[r.key] || 0) + (site.overhead?.[r.key] || 0); });
      const c = rSiteTotals[i];
      gt.totalRevenue += c.totalRevenue;
      gt.totalCost += c.totalCost;
      gt.grossProfit += c.grossProfit;
      gt.totalOverhead += c.totalOverhead;
      gt.netProfit += c.netProfit;
    });
    gt.gpMargin = gt.totalRevenue > 0 ? (gt.grossProfit / gt.totalRevenue) * 100 : 0;

    return { sites, siteTotals: rSiteTotals, grandTotals: gt, periods: [...includedPeriods].reverse().map(p => p.period), periodCount: includedPeriods.length };
  }, [view, allPeriods, rangeStart, rangeEnd]);

  // ═══════════════════════════════════════════════════════════════════════
  // ─── RENDER ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5" id="profit-loss-module">

      {/* ─── Header Bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-display-secondary text-notion-black tracking-notion-display">Profit & Loss</h2>
          <p className="text-caption text-notion-warm-gray-500 mt-0.5">SSG Management Services Pty Ltd</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher */}
          <div className="flex bg-notion-warm-white rounded-micro p-0.5 whisper-border">
            {[
              { id: 'table', label: 'Data Entry', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
              { id: 'analytics', label: 'Analytics', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
              { id: 'range', label: 'Multi-Period', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg> },
              { id: 'overhead', label: 'Overhead Settings', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-micro transition-all ${view === v.id ? 'bg-white text-notion-blue shadow-sm' : 'text-notion-warm-gray-500 hover:text-notion-black'}`}
              >
                <span>{v.icon}</span>{v.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ─── Period Selector ──────────────────────────────────────────── */}
      <div className="notion-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={goPrevMonth} className="p-1.5 hover:bg-notion-warm-white rounded-micro transition text-notion-warm-gray-500 hover:text-notion-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>

          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-sm font-semibold text-notion-black bg-white focus:outline-none focus:ring-1 focus:ring-notion-blue">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-sm font-semibold text-notion-black bg-white focus:outline-none focus:ring-1 focus:ring-notion-blue">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <button onClick={goNextMonth} className="p-1.5 hover:bg-notion-warm-white rounded-micro transition text-notion-warm-gray-500 hover:text-notion-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="h-5 w-px bg-notion-warm-gray-200 mx-1"></div>

          {!isEditMode ? (
            <button onClick={() => { setBackupPeriods(JSON.parse(JSON.stringify(allPeriods))); setIsEditMode(true); }} className="px-3 py-1.5 text-xs font-semibold text-white bg-notion-blue hover:bg-notion-blue-active rounded-micro transition-all shadow-sm">
              Edit Data
            </button>
          ) : (
            <>
              <button onClick={() => { setAllPeriods(backupPeriods); setBackupPeriods([]); setIsEditMode(false); }} className="px-3 py-1.5 text-xs font-semibold text-notion-warm-gray-500 hover:text-notion-black whisper-border rounded-micro transition-all">
                Cancel
              </button>
              <button onClick={() => { saveProfitLoss(allPeriods); setBackupPeriods([]); setIsEditMode(false); }} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-micro transition-all shadow-sm">
                Save Changes
              </button>
            </>
          )}

          {isEditMode && (
            <>
              <div className="h-5 w-px bg-notion-warm-gray-200 mx-1"></div>
              <button onClick={handleCopyPrevious} className="px-3 py-1.5 text-xs font-semibold text-notion-warm-gray-500 hover:text-notion-blue whisper-border rounded-micro hover:bg-blue-50/50 transition-all flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                Copy Previous Period
              </button>

              <button onClick={() => setShowAddSite(true)} className="px-3 py-1.5 text-xs font-semibold text-white bg-notion-blue hover:bg-notion-blue-active rounded-micro transition-all flex items-center gap-1.5 shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Add Site
              </button>
            </>
          )}

          {view === 'analytics' && (
            <>
              <div className="h-5 w-px bg-notion-warm-gray-200 mx-1"></div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-notion-warm-gray-500 cursor-pointer">
                <input type="checkbox" checked={compareMode} onChange={e => setCompareMode(e.target.checked)} className="rounded accent-notion-blue" />
                Compare
              </label>
              {compareMode && (
                <>
                  <select value={compareMonth} onChange={e => setCompareMonth(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-xs font-semibold bg-white focus:outline-none">
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={compareYear} onChange={e => setCompareYear(parseInt(e.target.value))} className="px-2 py-1 whisper-border rounded-micro text-xs font-semibold bg-white focus:outline-none">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </>
              )}
            </>
          )}

          {view === 'range' && (
            <>
              <div className="h-5 w-px bg-notion-warm-gray-200 mx-1"></div>
              <span className="text-xs font-semibold text-notion-warm-gray-500">From:</span>
              <input
                type="date"
                value={rangeStart}
                onChange={e => setRangeStart(e.target.value)}
                className="px-2 py-1 whisper-border rounded-micro text-xs font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-notion-blue uppercase tabular-nums"
              />
              <span className="text-xs font-semibold text-notion-warm-gray-500 ml-1">To:</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={e => setRangeEnd(e.target.value)}
                className="px-2 py-1 whisper-border rounded-micro text-xs font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-notion-blue uppercase tabular-nums"
              />
            </>
          )}

          {currentPeriod.sites.length > 0 && (
            <span className="ml-auto text-badge text-notion-warm-gray-300">
              {currentPeriod.sites.length} site{currentPeriod.sites.length !== 1 ? 's' : ''} • Last saved {currentPeriod.updatedAt ? new Date(currentPeriod.updatedAt).toLocaleTimeString() : 'never'}
            </span>
          )}
        </div>
      </div>

      {/* ─── VIEW: DATA ENTRY TABLE ───────────────────────────────────── */}
      {view === 'table' && (
        <div className="space-y-4">
          <div className="notion-card overflow-hidden">
          {currentPeriod.sites.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-notion-warm-white flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-notion-warm-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-card-title text-notion-black mb-1">No sites configured for {MONTHS[selectedMonth]} {selectedYear}</h3>
              <p className="text-caption text-notion-warm-gray-500 mb-4">Add site columns or copy from a previous period to get started.</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {!isEditMode ? (
                  <button onClick={() => { setBackupPeriods(JSON.parse(JSON.stringify(allPeriods))); setIsEditMode(true); }} className="px-4 py-2 text-sm bg-notion-blue text-white rounded-micro hover:bg-notion-blue-active transition font-semibold shadow-sm">
                    Edit Data
                  </button>
                ) : (
                  <>
                    <button onClick={() => setShowAddSite(true)} className="px-4 py-2 text-sm bg-notion-blue text-white rounded-micro hover:bg-notion-blue-active transition font-semibold shadow-sm">
                      + Add Site
                    </button>
                    <button onClick={handleCopyPrevious} className="px-4 py-2 text-sm whisper-border text-notion-warm-gray-500 rounded-micro hover:bg-notion-warm-white transition font-semibold">
                      Copy Previous Period
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[800px]" id="pnl-table">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-zinc-50">
                    <th className="text-left px-3 py-2.5 font-bold text-notion-warm-gray-500 text-[11px] uppercase tracking-widest border-b border-r border-zinc-100 sticky left-0 bg-gradient-to-r from-slate-50 to-zinc-50 z-10 min-w-[180px]">
                      Description
                    </th>
                    {currentPeriod.sites.map((site, i) => (
                      <th key={i} className="text-center px-2 py-2.5 font-bold text-notion-black text-[11px] border-b border-r border-zinc-100 min-w-[110px] relative group">
                        <span>{site.name}</span>
                        {isEditMode && (
                          <button
                            onClick={() => handleRemoveSite(i)}
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 text-[9px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            title="Remove site"
                          >×</button>
                        )}
                      </th>
                    ))}
                    <th className="text-center px-2 py-2.5 font-bold text-notion-black text-[11px] border-b border-zinc-100 min-w-[100px] bg-emerald-50/50">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* ── Revenue ── */}
                  <tr className="bg-blue-50/30">
                    <td className="px-3 py-1.5 font-bold text-notion-blue text-[11px] uppercase tracking-widest border-b border-r border-zinc-100 sticky left-0 bg-blue-50 z-10">Revenue</td>
                    <td colSpan={currentPeriod.sites.length + 1} className="border-b border-zinc-100"></td>
                  </tr>
                  {REVENUE_ROWS.map(row => (
                    <tr key={`rev-${row.key}`} className="hover:bg-blue-50/10 transition-colors">
                      <td className="px-3 py-0.5 text-notion-warm-gray-500 italic border-r border-b border-zinc-50 sticky left-0 bg-white z-10">{row.label}</td>
                      {currentPeriod.sites.map((site, i) => (
                        <td key={i} className="px-0.5 py-0.5 border-r border-b border-zinc-50">
                          <EditableCell isEditable={isEditMode} value={site.revenue?.[row.key] || 0} onChange={v => updateSiteField(i, 'revenue', row.key, v)} />
                        </td>
                      ))}
                      <td className="px-1.5 py-1 text-right font-semibold text-notion-black border-b border-zinc-50 bg-emerald-50/30">{fmt(grandTotals.revenue[row.key])}</td>
                    </tr>
                  ))}
                  {/* Total Revenue */}
                  <tr className="bg-blue-50/50 font-bold">
                    <td className="px-3 py-1.5 text-notion-blue border-r border-b border-zinc-100 sticky left-0 bg-blue-50 z-10">Total Revenue</td>
                    {currentPeriod.sites.map((_, i) => (
                      <td key={i} className="px-1.5 py-1.5 text-right text-notion-blue border-r border-b border-zinc-100">{fmt(siteTotals[i]?.totalRevenue || 0)}</td>
                    ))}
                    <td className="px-1.5 py-1.5 text-right text-notion-blue border-b border-zinc-100 bg-emerald-50/50">{fmt(grandTotals.totalRevenue)}</td>
                  </tr>

                  {/* Spacer */}
                  <tr><td colSpan={currentPeriod.sites.length + 2} className="h-1 border-b border-zinc-100"></td></tr>

                  {/* ── Direct Staff Cost ── */}
                  <tr className="bg-rose-50/30">
                    <td className="px-3 py-1.5 font-bold text-red-500 text-[11px] uppercase tracking-widest border-b border-r border-zinc-100 sticky left-0 bg-rose-50 z-10">Direct Staff Cost</td>
                    <td colSpan={currentPeriod.sites.length + 1} className="border-b border-zinc-100"></td>
                  </tr>
                  {COST_ROWS.map(row => (
                    <tr key={`cost-${row.key}`} className="hover:bg-rose-50/10 transition-colors">
                      <td className="px-3 py-0.5 text-notion-warm-gray-500 italic border-r border-b border-zinc-50 sticky left-0 bg-white z-10">{row.label}</td>
                      {currentPeriod.sites.map((site, i) => (
                        <td key={i} className="px-0.5 py-0.5 border-r border-b border-zinc-50">
                          <EditableCell isEditable={isEditMode} value={site.directCost?.[row.key] || 0} onChange={v => updateSiteField(i, 'directCost', row.key, v)} />
                        </td>
                      ))}
                      <td className="px-1.5 py-1 text-right font-semibold text-notion-black border-b border-zinc-50 bg-emerald-50/30">{fmt(grandTotals.directCost[row.key])}</td>
                    </tr>
                  ))}
                  {/* Total Cost */}
                  <tr className="bg-rose-50/50 font-bold">
                    <td className="px-3 py-1.5 text-red-500 border-r border-b border-zinc-100 sticky left-0 bg-rose-50 z-10">Total Cost</td>
                    {currentPeriod.sites.map((_, i) => (
                      <td key={i} className="px-1.5 py-1.5 text-right text-red-500 border-r border-b border-zinc-100">{fmt(siteTotals[i]?.totalCost || 0)}</td>
                    ))}
                    <td className="px-1.5 py-1.5 text-right text-red-500 border-b border-zinc-100 bg-emerald-50/50">{fmt(grandTotals.totalCost)}</td>
                  </tr>

                  {/* Spacer */}
                  <tr><td colSpan={currentPeriod.sites.length + 2} className="h-1 border-b border-zinc-100"></td></tr>

                  {/* ── Gross Profit ── */}
                  <tr className="bg-emerald-50/60 font-bold text-sm">
                    <td className="px-3 py-2 text-emerald-700 border-r border-b border-zinc-100 sticky left-0 bg-emerald-50 z-10">Gross Profit</td>
                    {currentPeriod.sites.map((_, i) => {
                      const gp = siteTotals[i]?.grossProfit || 0;
                      return (
                        <td key={i} className={`px-1.5 py-2 text-right border-r border-b border-zinc-100 font-bold ${gp >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(gp)}</td>
                      );
                    })}
                    <td className={`px-1.5 py-2 text-right border-b border-zinc-100 font-bold bg-emerald-50/80 ${grandTotals.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(grandTotals.grossProfit)}</td>
                  </tr>

                  {/* GP Margin */}
                  <tr className="bg-emerald-50/30">
                    <td className="px-3 py-1 text-emerald-600 font-semibold border-r border-b border-zinc-100 sticky left-0 bg-emerald-50 z-10">GP Margin</td>
                    {currentPeriod.sites.map((_, i) => {
                      const gp = siteTotals[i]?.gpMargin || 0;
                      return (
                        <td key={i} className={`px-1.5 py-1 text-right border-r border-b border-zinc-100 font-semibold ${gp >= 25 ? 'text-emerald-600' : gp >= 12 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(gp)}</td>
                      );
                    })}
                    <td className={`px-1.5 py-1 text-right border-b border-zinc-100 font-semibold bg-emerald-50/50 ${grandTotals.gpMargin >= 25 ? 'text-emerald-600' : grandTotals.gpMargin >= 12 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(grandTotals.gpMargin || 0)}</td>
                  </tr>

                  {/* Spacer */}
                  <tr><td colSpan={currentPeriod.sites.length + 2} className="h-1 border-b border-zinc-100"></td></tr>

                  {/* ── Vehicle Allowance Income ── */}
                  <tr className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-3 py-0.5 text-notion-warm-gray-500 font-semibold border-r border-b border-zinc-100 sticky left-0 bg-white z-10">Vehicle Allowance - Income</td>
                    {currentPeriod.sites.map((site, i) => (
                      <td key={i} className="px-0.5 py-0.5 border-r border-b border-zinc-100">
                        <EditableCell isEditable={isEditMode} value={site.vehicleAllowanceIncome || 0} onChange={v => updateSiteField(i, 'vehicleAllowanceIncome', null, v)} />
                      </td>
                    ))}
                    <td className="px-1.5 py-1 text-right font-semibold text-notion-black border-b border-zinc-100 bg-emerald-50/30">{fmt(grandTotals.vehicleAllowanceIncome)}</td>
                  </tr>

                  {/* Spacer */}
                  <tr><td colSpan={currentPeriod.sites.length + 2} className="h-1 border-b border-zinc-100"></td></tr>

                  {/* ── Overhead ── */}
                  <tr className="bg-amber-50/30">
                    <td className="px-3 py-1.5 font-bold text-amber-700 text-[11px] uppercase tracking-widest border-b border-r border-zinc-100 sticky left-0 bg-amber-50 z-10">Overhead</td>
                    <td colSpan={currentPeriod.sites.length + 1} className="border-b border-zinc-100"></td>
                  </tr>
                  
                  {/* Dynamic Manager Allocation Rows */}
                  {currentPeriod.managers?.map(mgr => (
                    <tr key={`mgr-alloc-${mgr.id}`} className="hover:bg-amber-50/10 transition-colors">
                      <td className="px-3 py-0.5 text-notion-warm-gray-500 italic border-r border-b border-zinc-50 sticky left-0 bg-white z-10">
                        <div className="flex items-center justify-between">
                          <span>{mgr.name} Alloc %</span>
                          <span className="text-[9px] text-notion-warm-gray-400 font-normal no-italic">of {fmt(mgr.totalSalary || 0)}</span>
                        </div>
                      </td>
                      {currentPeriod.sites.map((site, i) => (
                        <td key={i} className="px-0.5 py-0.5 border-r border-b border-zinc-50">
                          <EditableCell isEditable={isEditMode} value={site.managerAllocations?.[mgr.id] || 0} onChange={v => handleUpdateManagerAllocation(i, mgr.id, v)} isPct={true} />
                        </td>
                      ))}
                      <td className="px-1.5 py-1 text-right font-semibold text-notion-black border-b border-zinc-50 bg-emerald-50/30">
                        {fmtPct(currentPeriod.sites.reduce((s, site) => s + (site.managerAllocations?.[mgr.id] || 0), 0))}
                      </td>
                    </tr>
                  ))}

                  {OVERHEAD_ROWS.map(row => (
                    <tr key={`oh-${row.key}`} className="hover:bg-amber-50/10 transition-colors">
                      <td className="px-3 py-0.5 text-notion-warm-gray-500 italic border-r border-b border-zinc-50 sticky left-0 bg-white z-10">{row.label}</td>
                      {currentPeriod.sites.map((site, i) => (
                        <td key={i} className="px-0.5 py-0.5 border-r border-b border-zinc-50">
                          {row.key === 'managerSalary' ? (
                            <div className="w-full h-full px-1.5 py-1 text-right text-xs text-notion-warm-gray-400 font-semibold cursor-not-allowed bg-zinc-50/50" title="Auto-calculated in Overhead Settings">{fmt(site.overhead?.managerSalary || 0)}</div>
                          ) : (
                            <EditableCell isEditable={isEditMode} value={site.overhead?.[row.key] || 0} onChange={v => updateSiteField(i, 'overhead', row.key, v)} isPct={row.isPct} />
                          )}
                        </td>
                      ))}
                      <td className="px-1.5 py-1 text-right font-semibold text-notion-black border-b border-zinc-50 bg-emerald-50/30">
                        {row.isPct ? fmtPct(grandTotals.overhead[row.key] || 0) : fmt(grandTotals.overhead[row.key] || 0)}
                      </td>
                    </tr>
                  ))}

                  {/* Spacer */}
                  <tr><td colSpan={currentPeriod.sites.length + 2} className="h-2 border-b-2 border-zinc-200"></td></tr>

                  {/* ── Net Profit ── */}
                  <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 font-bold text-sm">
                    <td className="px-3 py-2.5 text-emerald-800 border-r border-zinc-200 sticky left-0 bg-gradient-to-r from-emerald-50 to-teal-50 z-10 text-sm">Net Profit</td>
                    {currentPeriod.sites.map((_, i) => {
                      const np = siteTotals[i]?.netProfit || 0;
                      return (
                        <td key={i} className={`px-1.5 py-2.5 text-right border-r border-zinc-200 text-sm font-bold ${np >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>{fmt(np)}</td>
                      );
                    })}
                    <td className={`px-1.5 py-2.5 text-right text-sm font-bold bg-emerald-100/50 ${grandTotals.netProfit >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>{fmt(grandTotals.netProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      )}

      {/* ─── VIEW: ANALYTICS DASHBOARD ────────────────────────────────── */}
      {view === 'analytics' && (
        <div className="space-y-5">
          {currentPeriod.sites.length === 0 ? (
            <div className="notion-card p-12 text-center">
              <p className="text-caption text-notion-warm-gray-500">No data to visualize. Switch to Data Entry and add sites first.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Revenue', value: grandTotals.totalRevenue, color: 'text-notion-blue', bg: 'bg-blue-50/50' },
                  { label: 'Total Cost', value: grandTotals.totalCost, color: 'text-red-500', bg: 'bg-rose-50/50' },
                  { label: 'Gross Profit', value: grandTotals.grossProfit, color: grandTotals.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600', bg: 'bg-emerald-50/50' },
                  { label: 'Net Profit', value: grandTotals.netProfit, color: grandTotals.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600', bg: 'bg-emerald-50/50' },
                ].map(card => (
                  <div key={card.label} className={`notion-card p-4 ${card.bg}`}>
                    <p className="text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className={`text-sub-heading ${card.color}`}>{fmt(card.value)}</p>
                    {compareMode && comparePeriod && (() => {
                      const compSites = comparePeriod.sites || [];
                      let compVal = 0;
                      if (card.label === 'Total Revenue') compVal = compSites.reduce((s, site) => s + (site.revenue?.regular || 0) + (site.revenue?.extraWork || 0) + (site.revenue?.supervisorAllowance || 0), 0);
                      else if (card.label === 'Total Cost') compVal = compSites.reduce((s, site) => s + (site.directCost?.regular || 0) + (site.directCost?.extraWork || 0) + (site.directCost?.motorVehicle || 0), 0);
                      else if (card.label === 'Gross Profit') { const rev = compSites.reduce((s, site) => s + (site.revenue?.regular || 0) + (site.revenue?.extraWork || 0) + (site.revenue?.supervisorAllowance || 0), 0); const cost = compSites.reduce((s, site) => s + (site.directCost?.regular || 0) + (site.directCost?.extraWork || 0) + (site.directCost?.motorVehicle || 0), 0); compVal = rev - cost; }
                      else { compVal = compSites.reduce((s, site) => { const c = computeSite(site); return s + c.netProfit; }, 0); }
                      const delta = card.value - compVal;
                      return (
                        <p className={`text-[10px] font-semibold mt-0.5 ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {delta >= 0 ? '▲' : '▼'} {fmt(Math.abs(delta))} vs {MONTHS[compareMonth]?.slice(0,3)}
                        </p>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {/* Revenue vs Cost Chart */}
              <div className="notion-card p-5">
                <h3 className="text-card-title text-notion-black mb-3">Revenue vs Cost by Site</h3>
                <div className="flex items-end gap-3 mb-2">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-notion-warm-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-notion-blue inline-block"></span> Revenue</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-notion-warm-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> Cost</span>
                </div>
                <MiniBarChart
                  data={currentPeriod.sites.map((site, i) => ({
                    label: site.name,
                    value1: siteTotals[i]?.totalRevenue || 0,
                    value2: siteTotals[i]?.totalCost || 0,
                  }))}
                  width={Math.max(400, currentPeriod.sites.length * 65)}
                  height={260}
                />
              </div>

              {/* Net Profit Chart */}
              <div className="notion-card p-5">
                <h3 className="text-card-title text-notion-black mb-3">Net Profit by Site</h3>
                <div className="flex items-end gap-3 mb-2">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-notion-warm-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> Profit</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-notion-warm-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"></span> Loss</span>
                </div>
                <MiniBarChart
                  data={currentPeriod.sites.map((site, i) => ({
                    label: site.name,
                    value1: siteTotals[i]?.netProfit || 0,
                    value2: 0,
                  }))}
                  width={Math.max(400, currentPeriod.sites.length * 65)}
                  height={260}
                  isNetProfit={true}
                />
              </div>

              {/* GP% Gauges */}
              <div className="notion-card p-5">
                <h3 className="text-card-title text-notion-black mb-4">GP Margin by Site</h3>
                <div className="flex flex-wrap gap-4 justify-center">
                  {currentPeriod.sites.map((site, i) => (
                    <GpGauge key={i} percent={siteTotals[i]?.gpMargin || 0} label={site.name} />
                  ))}
                </div>
              </div>

              {/* Site Ranking */}
              <div className="notion-card p-5">
                <h3 className="text-card-title text-notion-black mb-3">Site Performance Ranking</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-left px-3 py-2 text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">Rank</th>
                        <th className="text-left px-3 py-2 text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">Site</th>
                        <th className="text-right px-3 py-2 text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">Revenue</th>
                        <th className="text-right px-3 py-2 text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">Cost</th>
                        <th className="text-right px-3 py-2 text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">GP%</th>
                        <th className="text-right px-3 py-2 text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">Net Profit</th>
                        <th className="text-center px-3 py-2 text-[10px] font-bold text-notion-warm-gray-300 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPeriod.sites
                        .map((site, i) => ({ site, computed: siteTotals[i], index: i }))
                        .sort((a, b) => (b.computed?.netProfit || 0) - (a.computed?.netProfit || 0))
                        .map((item, rank) => {
                          const c = item.computed;
                          const status = c.netProfit > 0 
                            ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" title="Profit"></span> 
                            : c.netProfit === 0 
                              ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" title="Break Even"></span> 
                              : <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" title="Loss"></span>;
                          return (
                            <tr key={item.index} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                              <td className="px-3 py-2 font-bold text-notion-warm-gray-300">#{rank + 1}</td>
                              <td className="px-3 py-2 font-semibold text-notion-black">{item.site.name}</td>
                              <td className="px-3 py-2 text-right text-notion-blue font-semibold">{fmt(c.totalRevenue)}</td>
                              <td className="px-3 py-2 text-right text-red-500 font-semibold">{fmt(c.totalCost)}</td>
                              <td className={`px-3 py-2 text-right font-bold ${c.gpMargin >= 25 ? 'text-emerald-600' : c.gpMargin >= 12 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(c.gpMargin)}</td>
                              <td className={`px-3 py-2 text-right font-bold ${c.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(c.netProfit)}</td>
                              <td className="px-3 py-2 text-center text-sm">{status}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── VIEW: MULTI-PERIOD RANGE ──────────────────────────────────── */}
      {view === 'range' && (
        <div className="space-y-4">
          {/* Period Banner */}
          <div className="notion-card p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-violet-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
                </div>
                <span className="text-xs font-bold text-violet-700 uppercase tracking-widest">Multi-Period Aggregate</span>
              </div>
              {rangeData ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {rangeData.periods.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-violet-200 text-violet-700 text-[11px] font-semibold rounded-full">{p}</span>
                    ))}
                  </div>
                  <span className="text-[11px] text-violet-500 font-semibold ml-auto">
                    {rangeData.periodCount} period{rangeData.periodCount !== 1 ? 's' : ''} · {rangeData.sites.length} site{rangeData.sites.length !== 1 ? 's' : ''} · Read-only
                  </span>
                </>
              ) : (
                <span className="text-xs text-violet-500">No data found for the selected range.</span>
              )}
            </div>
          </div>

          {!rangeData ? (
            <div className="notion-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-notion-warm-white flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-notion-warm-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-card-title text-notion-black mb-1">No data in selected range</h3>
              <p className="text-caption text-notion-warm-gray-500">Enter data in the Data Entry tab for the selected months first.</p>
            </div>
          ) : (
            <div className="notion-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-violet-50 to-indigo-50">
                      <th className="text-left px-3 py-2.5 font-bold text-violet-500 text-[11px] uppercase tracking-widest border-b border-r border-violet-100 sticky left-0 bg-gradient-to-r from-violet-50 to-indigo-50 z-10 min-w-[180px]">Description</th>
                      {rangeData.sites.map((site, i) => (
                        <th key={i} className="text-center px-2 py-2.5 font-bold text-notion-black text-[11px] border-b border-r border-violet-100 min-w-[110px]">{site.name}</th>
                      ))}
                      <th className="text-center px-2 py-2.5 font-bold text-notion-black text-[11px] border-b border-violet-100 min-w-[100px] bg-emerald-50/50">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Revenue */}
                    <tr className="bg-blue-50/30">
                      <td className="px-3 py-1.5 font-bold text-notion-blue text-[11px] uppercase tracking-widest border-b border-r border-zinc-100 sticky left-0 bg-blue-50 z-10">Revenue</td>
                      <td colSpan={rangeData.sites.length + 1} className="border-b border-zinc-100"></td>
                    </tr>
                    {REVENUE_ROWS.map(row => (
                      <tr key={`rrev-${row.key}`} className="hover:bg-blue-50/10 transition-colors">
                        <td className="px-3 py-0.5 text-notion-warm-gray-500 italic border-r border-b border-zinc-50 sticky left-0 bg-white z-10">{row.label}</td>
                        {rangeData.sites.map((site, i) => (
                          <td key={i} className="px-1.5 py-1 text-right border-r border-b border-zinc-50 text-notion-black">{fmt(site.revenue?.[row.key] || 0)}</td>
                        ))}
                        <td className="px-1.5 py-1 text-right font-semibold text-notion-black border-b border-zinc-50 bg-emerald-50/30">{fmt(rangeData.grandTotals.revenue[row.key] || 0)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50/50 font-bold">
                      <td className="px-3 py-1.5 text-notion-blue border-r border-b border-zinc-100 sticky left-0 bg-blue-50 z-10">Total Revenue</td>
                      {rangeData.sites.map((_, i) => (
                        <td key={i} className="px-1.5 py-1.5 text-right text-notion-blue border-r border-b border-zinc-100">{fmt(rangeData.siteTotals[i]?.totalRevenue || 0)}</td>
                      ))}
                      <td className="px-1.5 py-1.5 text-right text-notion-blue border-b border-zinc-100 bg-emerald-50/50">{fmt(rangeData.grandTotals.totalRevenue)}</td>
                    </tr>

                    <tr><td colSpan={rangeData.sites.length + 2} className="h-1 border-b border-zinc-100"></td></tr>

                    {/* Direct Staff Cost */}
                    <tr className="bg-rose-50/30">
                      <td className="px-3 py-1.5 font-bold text-red-500 text-[11px] uppercase tracking-widest border-b border-r border-zinc-100 sticky left-0 bg-rose-50 z-10">Direct Staff Cost</td>
                      <td colSpan={rangeData.sites.length + 1} className="border-b border-zinc-100"></td>
                    </tr>
                    {COST_ROWS.map(row => (
                      <tr key={`rcost-${row.key}`} className="hover:bg-rose-50/10 transition-colors">
                        <td className="px-3 py-0.5 text-notion-warm-gray-500 italic border-r border-b border-zinc-50 sticky left-0 bg-white z-10">{row.label}</td>
                        {rangeData.sites.map((site, i) => (
                          <td key={i} className="px-1.5 py-1 text-right border-r border-b border-zinc-50 text-notion-black">{fmt(site.directCost?.[row.key] || 0)}</td>
                        ))}
                        <td className="px-1.5 py-1 text-right font-semibold text-notion-black border-b border-zinc-50 bg-emerald-50/30">{fmt(rangeData.grandTotals.directCost[row.key] || 0)}</td>
                      </tr>
                    ))}
                    <tr className="bg-rose-50/50 font-bold">
                      <td className="px-3 py-1.5 text-red-500 border-r border-b border-zinc-100 sticky left-0 bg-rose-50 z-10">Total Cost</td>
                      {rangeData.sites.map((_, i) => (
                        <td key={i} className="px-1.5 py-1.5 text-right text-red-500 border-r border-b border-zinc-100">{fmt(rangeData.siteTotals[i]?.totalCost || 0)}</td>
                      ))}
                      <td className="px-1.5 py-1.5 text-right text-red-500 border-b border-zinc-100 bg-emerald-50/50">{fmt(rangeData.grandTotals.totalCost)}</td>
                    </tr>

                    <tr><td colSpan={rangeData.sites.length + 2} className="h-1 border-b border-zinc-100"></td></tr>

                    {/* Gross Profit */}
                    <tr className="bg-emerald-50/60 font-bold text-sm">
                      <td className="px-3 py-2 text-emerald-700 border-r border-b border-zinc-100 sticky left-0 bg-emerald-50 z-10">Gross Profit</td>
                      {rangeData.sites.map((_, i) => {
                        const gp = rangeData.siteTotals[i]?.grossProfit || 0;
                        return <td key={i} className={`px-1.5 py-2 text-right border-r border-b border-zinc-100 font-bold ${gp >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(gp)}</td>;
                      })}
                      <td className={`px-1.5 py-2 text-right border-b border-zinc-100 font-bold bg-emerald-50/80 ${rangeData.grandTotals.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(rangeData.grandTotals.grossProfit)}</td>
                    </tr>
                    <tr className="bg-emerald-50/30">
                      <td className="px-3 py-1 text-emerald-600 font-semibold border-r border-b border-zinc-100 sticky left-0 bg-emerald-50 z-10">GP Margin</td>
                      {rangeData.sites.map((_, i) => {
                        const gp = rangeData.siteTotals[i]?.gpMargin || 0;
                        return <td key={i} className={`px-1.5 py-1 text-right border-r border-b border-zinc-100 font-semibold ${gp >= 25 ? 'text-emerald-600' : gp >= 12 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(gp)}</td>;
                      })}
                      <td className={`px-1.5 py-1 text-right border-b border-zinc-100 font-semibold bg-emerald-50/50 ${rangeData.grandTotals.gpMargin >= 25 ? 'text-emerald-600' : rangeData.grandTotals.gpMargin >= 12 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(rangeData.grandTotals.gpMargin || 0)}</td>
                    </tr>

                    <tr><td colSpan={rangeData.sites.length + 2} className="h-1 border-b border-zinc-100"></td></tr>

                    {/* Vehicle Allowance */}
                    <tr className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-3 py-0.5 text-notion-warm-gray-500 font-semibold border-r border-b border-zinc-100 sticky left-0 bg-white z-10">Vehicle Allowance - Income</td>
                      {rangeData.sites.map((site, i) => (
                        <td key={i} className="px-1.5 py-1 text-right border-r border-b border-zinc-100 text-notion-black">{fmt(site.vehicleAllowanceIncome || 0)}</td>
                      ))}
                      <td className="px-1.5 py-1 text-right font-semibold text-notion-black border-b border-zinc-100 bg-emerald-50/30">{fmt(rangeData.grandTotals.vehicleAllowanceIncome)}</td>
                    </tr>

                    <tr><td colSpan={rangeData.sites.length + 2} className="h-1 border-b border-zinc-100"></td></tr>

                    {/* Overhead */}
                    <tr className="bg-amber-50/30">
                      <td className="px-3 py-1.5 font-bold text-amber-700 text-[11px] uppercase tracking-widest border-b border-r border-zinc-100 sticky left-0 bg-amber-50 z-10">Overhead</td>
                      <td colSpan={rangeData.sites.length + 1} className="border-b border-zinc-100"></td>
                    </tr>
                    {OVERHEAD_ROWS.map(row => (
                      <tr key={`roh-${row.key}`} className="hover:bg-amber-50/10 transition-colors">
                        <td className="px-3 py-0.5 text-notion-warm-gray-500 italic border-r border-b border-zinc-50 sticky left-0 bg-white z-10">{row.label}</td>
                        {rangeData.sites.map((site, i) => (
                          <td key={i} className="px-1.5 py-1 text-right border-r border-b border-zinc-50 text-notion-black">{fmt(site.overhead?.[row.key] || 0)}</td>
                        ))}
                        <td className="px-1.5 py-1 text-right font-semibold text-notion-black border-b border-zinc-50 bg-emerald-50/30">{fmt(rangeData.grandTotals.overhead[row.key] || 0)}</td>
                      </tr>
                    ))}

                    <tr><td colSpan={rangeData.sites.length + 2} className="h-2 border-b-2 border-zinc-200"></td></tr>

                    {/* Net Profit */}
                    <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 font-bold text-sm">
                      <td className="px-3 py-2.5 text-emerald-800 border-r border-zinc-200 sticky left-0 bg-gradient-to-r from-emerald-50 to-teal-50 z-10 text-sm">Net Profit</td>
                      {rangeData.sites.map((_, i) => {
                        const np = rangeData.siteTotals[i]?.netProfit || 0;
                        return <td key={i} className={`px-1.5 py-2.5 text-right border-r border-zinc-200 text-sm font-bold ${np >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>{fmt(np)}</td>;
                      })}
                      <td className={`px-1.5 py-2.5 text-right text-sm font-bold bg-emerald-100/50 ${rangeData.grandTotals.netProfit >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>{fmt(rangeData.grandTotals.netProfit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── VIEW: OVERHEAD SETTINGS ──────────────────────────────────── */}
      {view === 'overhead' && (
        <div className="space-y-6">
          <div className="notion-card p-6">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <div>
                <h3 className="text-card-title text-notion-black mb-1">Manager Profiles</h3>
                <p className="text-caption text-notion-warm-gray-500">Create multiple managers and assign their total salary pools.</p>
              </div>
              <button onClick={handleAddManager} className="px-3 py-1.5 text-xs font-semibold text-white bg-notion-blue hover:bg-notion-blue-active rounded-micro shadow-sm flex items-center gap-1.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Add Manager
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentPeriod.managers?.map(mgr => (
                <div key={mgr.id} className="p-4 bg-notion-warm-white rounded-standard border border-zinc-100 flex flex-col gap-3 relative group">
                  <button onClick={() => handleRemoveManager(mgr.id)} className="absolute top-2 right-2 p-1 text-notion-warm-gray-400 hover:text-red-500 hover:bg-red-50 rounded-micro opacity-0 group-hover:opacity-100 transition-all" title="Remove Manager">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <div>
                    <label className="text-[10px] font-bold text-notion-warm-gray-400 uppercase tracking-widest mb-1 block">Manager Name</label>
                    <input
                      type="text"
                      value={mgr.name}
                      onChange={e => handleUpdateManager(mgr.id, 'name', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm font-semibold text-notion-black bg-white whisper-border rounded-micro focus:outline-none focus:ring-1 focus:ring-notion-blue"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-notion-warm-gray-400 uppercase tracking-widest mb-1 block flex items-center gap-1"><span><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></span> Total Salary Pool</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-notion-warm-gray-400 text-sm font-bold">$</span>
                      <input
                        type="number"
                        value={mgr.totalSalary || 0}
                        onChange={e => handleUpdateManager(mgr.id, 'totalSalary', parseFloat(e.target.value) || 0)}
                        className="w-full pl-6 pr-2 py-1.5 text-sm font-semibold text-notion-black bg-white whisper-border rounded-micro focus:outline-none focus:ring-1 focus:ring-notion-blue [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!currentPeriod.managers || currentPeriod.managers.length === 0) && (
                <div className="p-4 text-sm text-notion-warm-gray-500 italic col-span-full">No managers added yet.</div>
              )}
            </div>
          </div>

          {currentPeriod.managers?.length > 0 && currentPeriod.sites?.length > 0 && (
            <div className="notion-card p-6">
              <h3 className="text-card-title text-notion-black mb-1">Site Allocations by Manager</h3>
              <p className="text-caption text-notion-warm-gray-500 mb-6">Assign the percentage of each manager's time to specific sites.</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentPeriod.managers.map(mgr => {
                  const totalPct = currentPeriod.sites.reduce((s, site) => s + (site.managerAllocations?.[mgr.id] || 0), 0);
                  const isValid = Math.abs(totalPct - 100) < 0.5;
                  const totalAllocatedDollars = (totalPct / 100) * (mgr.totalSalary || 0);

                  return (
                    <div key={mgr.id} className="border border-zinc-100 rounded-standard overflow-hidden bg-white shadow-sm">
                      <div className="bg-notion-warm-white p-3 border-b border-zinc-100 flex items-center justify-between">
                        <span className="font-bold text-sm text-notion-black">{mgr.name}</span>
                        <span className="text-xs font-semibold text-notion-blue">{fmt(mgr.totalSalary || 0)}</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="text-left px-3 py-2 text-[10px] font-bold text-notion-warm-gray-400 uppercase tracking-widest">Site</th>
                            <th className="text-right px-3 py-2 text-[10px] font-bold text-notion-warm-gray-400 uppercase tracking-widest">Alloc %</th>
                            <th className="text-right px-3 py-2 text-[10px] font-bold text-notion-warm-gray-400 uppercase tracking-widest">$ Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPeriod.sites.map((site, i) => {
                            const pct = site.managerAllocations?.[mgr.id] || 0;
                            const dollars = (pct / 100) * (mgr.totalSalary || 0);
                            return (
                              <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                                <td className="px-3 py-1.5 font-semibold text-notion-black truncate max-w-[120px]" title={site.name}>{site.name}</td>
                                <td className="px-2 py-1.5 text-right">
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={pct === 0 ? '' : pct}
                                    placeholder="0"
                                    onChange={e => handleUpdateManagerAllocation(i, mgr.id, parseFloat(e.target.value) || 0)}
                                    className="w-16 px-1.5 py-1 text-right text-xs whisper-border rounded-micro bg-white focus:outline-none focus:ring-1 focus:ring-notion-blue [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                </td>
                                <td className="px-3 py-1.5 text-right font-semibold text-notion-warm-gray-500">{fmt(dollars)}</td>
                              </tr>
                            );
                          })}
                          <tr className={`font-bold border-t-2 ${isValid ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-red-800'}`}>
                            <td className="px-3 py-2 flex items-center gap-1">
                              Total
                              {!isValid && <span className="text-[10px] text-red-500 font-semibold">(needs 100%)</span>}
                            </td>
                            <td className="px-3 py-2 text-right">{fmtPct(totalPct)}</td>
                            <td className="px-3 py-2 text-right">{fmt(totalAllocatedDollars)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Add Site Modal ───────────────────────────────────────────── */}
      {showAddSite && (() => {
        const historicalSites = new Set();
        allPeriods.forEach(p => p.sites?.forEach(s => historicalSites.add(s.name)));
        // Remove currently existing sites from the suggestions
        currentPeriod.sites.forEach(s => historicalSites.delete(s.name));
        
        return (
          <AddSiteModal
            onAdd={handleAddSite}
            onClose={() => setShowAddSite(false)}
            existingNames={currentPeriod.sites.map(s => s.name)}
            historicalSites={Array.from(historicalSites).sort()}
          />
        );
      })()}
    </div>
  );
};

export default ProfitLoss;
