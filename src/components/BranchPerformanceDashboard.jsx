import React, { useState, useMemo, useEffect } from 'react';
import { 
  getBranchPerformance, 
  saveBranchPerformance, 
  getBranchPerformanceAsync,
  getBranchPerformanceConfig,
  saveBranchPerformanceConfig,
  getBranchPerformanceConfigAsync
} from '../utils/storage';

const DEFAULT_CONFIG = [
  {
    id: 'sydney',
    label: 'Sydney',
    color: 'emerald',
    showTotal: true,
    metrics: [
      { id: 'visa', label: 'No. of VISA', type: 'number' },
      { id: 'commission', label: 'Commission Income', type: 'currency' },
      { id: 'service', label: 'Service Income', type: 'currency' }
    ]
  },
  {
    id: 'chileSearch',
    label: 'Chile-Search',
    color: 'purple',
    showTotal: false,
    metrics: [
      { id: 'applications', label: 'No. of Application (Sydney)', type: 'number' },
      { id: 'irlCanNzVisa', label: 'Ireland, Canada & NZ Visa', type: 'number' },
      { id: 'irlCanNzCommission', label: 'Commission- Ireland, Canada & NZ', type: 'currency' },
      { id: 'ausStCommission', label: 'Commission Income - Australia St.', type: 'currency' }
    ]
  },
  {
    id: 'chilenosLatinos',
    label: 'Chilenos/Latinos En El Mundo',
    color: 'pink',
    showTotal: false,
    metrics: [
      { id: 'applications', label: 'No. of Application', type: 'number' },
      { id: 'chilenos', label: 'Chilenos En El Mundo', type: 'currency' },
      { id: 'latinos', label: 'Latinos En El Mundo', type: 'currency' }
    ]
  },
  {
    id: 'kathmandu',
    label: 'Kathmandu',
    color: 'orange',
    showTotal: false,
    metrics: [
      { id: 'visa', label: 'No. of VISA', type: 'number' },
      { id: 'commission', label: 'Commission Income (Net)', type: 'currency' },
      { id: 'ielts', label: 'IELTS Class/Book/Test/Process', type: 'currency' }
    ]
  },
  {
    id: 'mahendranagar',
    label: 'Mahendranagar',
    color: 'amber',
    showTotal: true,
    metrics: [
      { id: 'visa', label: 'No. of VISA', type: 'number' },
      { id: 'commissionGross', label: 'Commission Income (Gross)', type: 'currency' },
      { id: 'otherIncome', label: 'Other Income', type: 'currency' }
    ]
  },
  {
    id: 'nepalB2b',
    label: 'Nepal B2B',
    color: 'blue',
    showTotal: true,
    metrics: [
      { id: 'visa', label: 'No. of VISA', type: 'number' },
      { id: 'commissionGross', label: 'Commission Income (Gross)', type: 'currency' },
      { id: 'otherIncome', label: 'Other Income', type: 'currency' }
    ]
  }
];

const COLORS = ['emerald', 'blue', 'purple', 'pink', 'orange', 'amber', 'indigo', 'teal', 'red', 'cyan', 'rose', 'fuchsia'];

const BG_100_COLORS = {
  emerald: 'bg-emerald-100', blue: 'bg-blue-100', purple: 'bg-purple-100', pink: 'bg-pink-100', 
  orange: 'bg-orange-100', amber: 'bg-amber-100', indigo: 'bg-indigo-100', teal: 'bg-teal-100', 
  red: 'bg-red-100', cyan: 'bg-cyan-100', rose: 'bg-rose-100', fuchsia: 'bg-fuchsia-100'
};
const BG_50_COLORS = {
  emerald: 'bg-emerald-50', blue: 'bg-blue-50', purple: 'bg-purple-50', pink: 'bg-pink-50', 
  orange: 'bg-orange-50', amber: 'bg-amber-50', indigo: 'bg-indigo-50', teal: 'bg-teal-50', 
  red: 'bg-red-50', cyan: 'bg-cyan-50', rose: 'bg-rose-50', fuchsia: 'bg-fuchsia-50'
};
const BORDER_200_COLORS = {
  emerald: 'border-emerald-200', blue: 'border-blue-200', purple: 'border-purple-200', pink: 'border-pink-200', 
  orange: 'border-orange-200', amber: 'border-amber-200', indigo: 'border-indigo-200', teal: 'border-teal-200', 
  red: 'border-red-200', cyan: 'border-cyan-200', rose: 'border-rose-200', fuchsia: 'border-fuchsia-200'
};
const TEXT_900_COLORS = {
  emerald: 'text-emerald-900', blue: 'text-blue-900', purple: 'text-purple-900', pink: 'text-pink-900', 
  orange: 'text-orange-900', amber: 'text-amber-900', indigo: 'text-indigo-900', teal: 'text-teal-900', 
  red: 'text-red-900', cyan: 'text-cyan-900', rose: 'text-rose-900', fuchsia: 'text-fuchsia-900'
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatCurrency = (val) => {
  if (!val) return '-';
  return '$' + Number(val).toLocaleString('en-US');
};

const formatNumber = (val) => {
  if (!val) return '-';
  return Number(val).toLocaleString('en-US');
};

export default function BranchPerformanceDashboard() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [data, setData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isConfigModalOpen) {
        setIsConfigModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isConfigModalOpen]);

  useEffect(() => {
    const loadData = async () => {
      // 1. Load config
      let loadedConfig = getBranchPerformanceConfig();
      if (!loadedConfig) {
        loadedConfig = await getBranchPerformanceConfigAsync();
      }
      if (loadedConfig && loadedConfig.length > 0) {
        setConfig(loadedConfig);
      }

      // 2. Load data
      let loadedData = getBranchPerformance();
      if (!loadedData || loadedData.length === 0) {
        loadedData = await getBranchPerformanceAsync();
      }
      if (loadedData && loadedData.length > 0) {
        setData(loadedData);
      } else {
        // Initialize blank data dynamically based on config
        const blank = MONTHS.map(month => {
          const rowObj = { month };
          const activeConfig = loadedConfig || DEFAULT_CONFIG;
          activeConfig.forEach(branch => {
            rowObj[branch.id] = {};
            branch.metrics.forEach(m => {
              rowObj[branch.id][m.id] = 0;
            });
          });
          return rowObj;
        });
        setData(blank);
      }
    };
    loadData();
  }, []);

  const handleSave = () => {
    saveBranchPerformance(data);
    setIsEditing(false);
  };

  const handleCancel = () => {
    const loadedData = getBranchPerformance();
    if (loadedData && loadedData.length > 0) {
      setData(loadedData);
    } else {
      // Create blank
      const blank = MONTHS.map(month => {
        const rowObj = { month };
        config.forEach(branch => {
          rowObj[branch.id] = {};
          branch.metrics.forEach(m => {
            rowObj[branch.id][m.id] = 0;
          });
        });
        return rowObj;
      });
      setData(blank);
    }
    setIsEditing(false);
  };

  const handleInputChange = (rIdx, branchId, fieldId, value) => {
    const newData = [...data];
    if (!newData[rIdx][branchId]) {
      newData[rIdx][branchId] = {};
    }
    newData[rIdx] = {
      ...newData[rIdx],
      [branchId]: {
        ...newData[rIdx][branchId],
        [fieldId]: value === '' ? 0 : Number(value)
      }
    };
    setData(newData);
  };

  // Calculate totals per row dynamically
  const processedData = useMemo(() => {
    return data.map(row => {
      let totalNumber = 0;
      let totalCurrency = 0;
      const updatedRow = { ...row, totals: {} };

      config.forEach(branch => {
        let branchCurrencyTotal = 0;
        updatedRow[branch.id] = updatedRow[branch.id] || {};
        
        branch.metrics.forEach(metric => {
          const val = updatedRow[branch.id][metric.id] || 0;
          if (metric.type === 'number') {
            totalNumber += val;
          } else if (metric.type === 'currency') {
            totalCurrency += val;
            branchCurrencyTotal += val;
          }
        });
        
        if (branch.showTotal) {
          updatedRow[branch.id].total = branchCurrencyTotal;
        }
      });

      updatedRow.totals.totalNumber = totalNumber;
      updatedRow.totals.totalCurrency = totalCurrency;

      return updatedRow;
    });
  }, [data, config]);

  // Calculate grand totals for the footer
  const grandTotals = useMemo(() => {
    const totals = { branches: {}, totalNumber: 0, totalCurrency: 0 };
    
    config.forEach(branch => {
      totals.branches[branch.id] = { metrics: {}, total: 0 };
      let branchGrandCurrency = 0;
      
      branch.metrics.forEach(metric => {
        const sum = processedData.reduce((acc, row) => acc + (row[branch.id]?.[metric.id] || 0), 0);
        totals.branches[branch.id].metrics[metric.id] = sum;
        
        if (metric.type === 'currency') {
          branchGrandCurrency += sum;
        }
      });
      
      if (branch.showTotal) {
        totals.branches[branch.id].total = branchGrandCurrency;
      }
    });
    
    totals.totalNumber = processedData.reduce((acc, row) => acc + (row.totals?.totalNumber || 0), 0);
    totals.totalCurrency = processedData.reduce((acc, row) => acc + (row.totals?.totalCurrency || 0), 0);
    
    return totals;
  }, [processedData, config]);

  const renderEditableCell = ({ rIdx, branchId, metric, value }) => {
    const align = metric.type === 'currency' ? 'text-right' : 'text-center';
    const format = metric.type === 'currency' ? formatCurrency : formatNumber;
    
    if (!isEditing) {
      return (
        <td className={`px-3 py-2 border-r border-zinc-200 ${align}`}>
          {format(value)}
        </td>
      );
    }
    
    return (
      <td className="px-1 py-1 border-r border-zinc-200">
        <input 
          type="number" 
          value={value === 0 ? '' : (value || '')}
          onChange={(e) => handleInputChange(rIdx, branchId, metric.id, e.target.value)}
          className={`w-full bg-white border border-zinc-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${align}`}
          placeholder="0"
        />
      </td>
    );
  };

  // --- CONFIG MODAL LOGIC ---
  const openConfigModal = () => {
    // Deep clone the config to edit without mutating the active state
    setEditingConfig(JSON.parse(JSON.stringify(config)));
    setIsConfigModalOpen(true);
  };

  const saveConfig = () => {
    setConfig(editingConfig);
    saveBranchPerformanceConfig(editingConfig);
    
    // Auto-patch missing properties in existing data for new branches/metrics
    const patchedData = data.map(row => {
      const newRow = { ...row };
      editingConfig.forEach(branch => {
        if (!newRow[branch.id]) newRow[branch.id] = {};
        branch.metrics.forEach(m => {
          if (newRow[branch.id][m.id] === undefined) newRow[branch.id][m.id] = 0;
        });
      });
      return newRow;
    });
    setData(patchedData);
    saveBranchPerformance(patchedData); // Resave data immediately with structure patched
    
    setIsConfigModalOpen(false);
  };

  const addBranch = () => {
    const newId = 'branch_' + Date.now();
    setEditingConfig([
      ...editingConfig, 
      { id: newId, label: 'New Branch', color: COLORS[editingConfig.length % COLORS.length], showTotal: true, metrics: [] }
    ]);
  };

  const updateBranch = (bIdx, field, value) => {
    const updated = [...editingConfig];
    updated[bIdx][field] = value;
    setEditingConfig(updated);
  };

  const removeBranch = (bIdx) => {
    const updated = [...editingConfig];
    updated.splice(bIdx, 1);
    setEditingConfig(updated);
  };

  const addMetric = (bIdx) => {
    const updated = [...editingConfig];
    const newId = 'metric_' + Date.now();
    updated[bIdx].metrics.push({ id: newId, label: 'New Metric', type: 'currency' });
    setEditingConfig(updated);
  };

  const updateMetric = (bIdx, mIdx, field, value) => {
    const updated = [...editingConfig];
    updated[bIdx].metrics[mIdx][field] = value;
    setEditingConfig(updated);
  };

  const removeMetric = (bIdx, mIdx) => {
    const updated = [...editingConfig];
    updated[bIdx].metrics.splice(mIdx, 1);
    setEditingConfig(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-display-secondary text-notion-black tracking-notion-display font-semibold">
          Branch Performance Matrix
        </h2>
        <div className="flex gap-2">
          {!isEditing && (
            <button 
              onClick={openConfigModal}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Manage Columns
            </button>
          )}
          {isEditing ? (
            <>
              <button 
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-notion-black rounded hover:bg-notion-black/80 transition-colors"
            >
              Edit Data
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap min-w-max border-collapse">
            <thead className="text-xs text-zinc-700 bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10 font-mono">
              {/* Top Header Row for Branches */}
              <tr>
                <th rowSpan="2" className="px-4 py-3 border-r border-zinc-200 bg-zinc-50 sticky left-0 z-20 font-semibold text-zinc-900 w-32 align-bottom">
                  Month
                </th>
                {config.map(branch => {
                  const colSpan = branch.metrics.length + (branch.showTotal ? 1 : 0);
                  return (
                    <th key={`h1_${branch.id}`} colSpan={colSpan} className={`px-4 py-2 border-r ${BORDER_200_COLORS[branch.color] || 'border-zinc-200'} ${BG_100_COLORS[branch.color] || 'bg-zinc-100'} text-center font-bold ${TEXT_900_COLORS[branch.color] || 'text-zinc-900'}`}>
                      {branch.label}
                    </th>
                  );
                })}
                <th colSpan="2" className="px-4 py-2 text-center font-semibold text-zinc-900 bg-zinc-100">
                  Total
                </th>
              </tr>
              
              {/* Second Header Row for Metrics */}
              <tr className="bg-zinc-100">
                {config.map(branch => (
                  <React.Fragment key={`h2_${branch.id}`}>
                    {branch.metrics.map(metric => (
                      <th key={`h2_${branch.id}_${metric.id}`} className={`px-3 py-2 border-r border-zinc-200 font-medium ${metric.type === 'currency' ? 'text-right' : ''}`}>
                        {metric.label}
                      </th>
                    ))}
                    {branch.showTotal && (
                      <th className="px-3 py-2 border-r border-zinc-200 font-medium text-right font-semibold">Total Income</th>
                    )}
                  </React.Fragment>
                ))}
                
                <th className="px-3 py-2 border-r border-zinc-200 font-semibold bg-zinc-200">Total Count</th>
                <th className="px-3 py-2 font-semibold text-right bg-zinc-200">Total Currency</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-zinc-200 font-mono text-sm bg-white">
              {processedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-4 py-2.5 font-sans font-medium text-zinc-900 border-r border-zinc-200 bg-white group-hover:bg-blue-50/50 sticky left-0 z-10">{row.month}</td>
                  
                  {config.map(branch => (
                    <React.Fragment key={`body_${branch.id}`}>
                      {branch.metrics.map(metric => (
                        <React.Fragment key={`body_${branch.id}_${metric.id}`}>
                          {renderEditableCell({ 
                            rIdx: idx, 
                            branchId: branch.id, 
                            metric: metric, 
                            value: row[branch.id]?.[metric.id] 
                          })}
                        </React.Fragment>
                      ))}
                      {branch.showTotal && (
                        <td className="px-3 py-2 border-r border-zinc-200 text-right font-semibold bg-zinc-50/30">
                          {formatCurrency(row[branch.id]?.total)}
                        </td>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Totals */}
                  <td className="px-3 py-2 border-r border-zinc-200 text-center font-bold text-blue-900 bg-blue-50/30 group-hover:bg-blue-100/50">
                    {formatNumber(row.totals.totalNumber)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-blue-900 bg-blue-50/30 group-hover:bg-blue-100/50">
                    {formatCurrency(row.totals.totalCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
            
            <tfoot className="bg-zinc-100 font-mono text-sm font-semibold sticky bottom-0 z-10 border-t-2 border-zinc-300">
              <tr>
                <td className="px-4 py-3 border-r border-zinc-300 font-sans sticky left-0 z-20 bg-zinc-100 text-zinc-900 shadow-[1px_0_0_0_#d4d4d8]">Totals</td>
                
                {config.map(branch => (
                  <React.Fragment key={`foot_${branch.id}`}>
                    {branch.metrics.map(metric => {
                      const format = metric.type === 'currency' ? formatCurrency : formatNumber;
                      const align = metric.type === 'currency' ? 'text-right' : 'text-center';
                      return (
                        <td key={`foot_${branch.id}_${metric.id}`} className={`px-3 py-3 border-r border-zinc-300 ${align}`}>
                          {format(grandTotals.branches[branch.id]?.metrics[metric.id])}
                        </td>
                      );
                    })}
                    {branch.showTotal && (
                      <td className="px-3 py-3 border-r border-zinc-300 text-right text-black">
                        {formatCurrency(grandTotals.branches[branch.id]?.total)}
                      </td>
                    )}
                  </React.Fragment>
                ))}

                {/* Totals */}
                <td className="px-3 py-3 border-r border-zinc-300 text-center font-bold text-blue-900 bg-blue-100">
                  {formatNumber(grandTotals.totalNumber)}
                </td>
                <td className="px-3 py-3 text-right font-bold text-blue-900 bg-blue-100">
                  {formatCurrency(grandTotals.totalCurrency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Config Modal */}
      {isConfigModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <h3 className="font-semibold text-lg text-zinc-900">Manage Branches & Columns</h3>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-zinc-100/50 space-y-6">
              {editingConfig.map((branch, bIdx) => (
                <div key={bIdx} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                  <div className={`px-4 py-3 ${BG_50_COLORS[branch.color] || 'bg-zinc-50'} border-b border-zinc-200 flex flex-wrap gap-4 items-center justify-between`}>
                    <div className="flex-1 min-w-[200px] flex gap-3 items-center">
                      <div className="font-semibold text-zinc-800">Branch:</div>
                      <input 
                        type="text" 
                        value={branch.label} 
                        onChange={(e) => updateBranch(bIdx, 'label', e.target.value)}
                        className="flex-1 border border-zinc-300 rounded px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <select 
                        value={branch.color}
                        onChange={(e) => updateBranch(bIdx, 'color', e.target.value)}
                        className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm bg-white"
                      >
                        {COLORS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                      
                      <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={branch.showTotal}
                          onChange={(e) => updateBranch(bIdx, 'showTotal', e.target.checked)}
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        Show Currency Total
                      </label>
                      
                      <button onClick={() => removeBranch(bIdx)} className="text-red-500 hover:text-red-700 p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-zinc-50 space-y-3">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Metrics (Columns)</div>
                    {branch.metrics.map((metric, mIdx) => (
                      <div key={mIdx} className="flex gap-3 items-center">
                        <input 
                          type="text" 
                          value={metric.label} 
                          onChange={(e) => updateMetric(bIdx, mIdx, 'label', e.target.value)}
                          className="flex-1 border border-zinc-300 rounded px-3 py-1.5 text-sm"
                          placeholder="Metric Name"
                        />
                        <select 
                          value={metric.type}
                          onChange={(e) => updateMetric(bIdx, mIdx, 'type', e.target.value)}
                          className="w-32 border border-zinc-300 rounded px-3 py-1.5 text-sm bg-white"
                        >
                          <option value="number">Number</option>
                          <option value="currency">Currency ($)</option>
                        </select>
                        <button onClick={() => removeMetric(bIdx, mIdx)} className="text-zinc-400 hover:text-red-500 p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => addMetric(bIdx)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      Add Metric
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={addBranch}
                className="w-full py-4 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-600 font-medium hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 bg-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Add New Branch
              </button>
            </div>
            
            <div className="px-6 py-4 bg-white border-t border-zinc-200 flex justify-end gap-3">
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 border border-zinc-300 rounded text-zinc-700 hover:bg-zinc-50 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={saveConfig}
                className="px-4 py-2 bg-notion-black text-white rounded hover:bg-notion-black/80 font-medium"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
