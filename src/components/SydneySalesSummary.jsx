import React, { useState, useMemo, useEffect } from 'react';
import { 
  getSydneySales, 
  saveSydneySales, 
  getSydneySalesAsync,
  getSydneySalesConfig,
  saveSydneySalesConfig,
  getSydneySalesConfigAsync
} from '../utils/storage';

const DEFAULT_COLUMNS = [
  { id: 'lok', label: 'Lok', color: 'emerald' },
  { id: 'paras', label: 'Paras', color: 'blue' },
  { id: 'raj', label: 'Raj', color: 'purple' },
  { id: 'saraswoti', label: 'Saraswoti', color: 'pink' },
  { id: 'julia', label: 'Julia', color: 'orange' },
  { id: 'cecilia', label: 'Cecilia', color: 'amber' },
  { id: 'mark', label: 'Mark', color: 'indigo' },
  { id: 'rajJulia', label: 'Raj/Julia', color: 'teal' }
];

const COLORS = ['emerald', 'blue', 'purple', 'pink', 'orange', 'amber', 'indigo', 'teal', 'red', 'cyan', 'rose'];

const BG_COLORS = {
  emerald: 'bg-emerald-50', blue: 'bg-blue-50', purple: 'bg-purple-50', pink: 'bg-pink-50', 
  orange: 'bg-orange-50', amber: 'bg-amber-50', indigo: 'bg-indigo-50', teal: 'bg-teal-50', 
  red: 'bg-red-50', cyan: 'bg-cyan-50', rose: 'bg-rose-50'
};

const TEXT_COLORS = {
  emerald: 'text-emerald-900', blue: 'text-blue-900', purple: 'text-purple-900', pink: 'text-pink-900', 
  orange: 'text-orange-900', amber: 'text-amber-900', indigo: 'text-indigo-900', teal: 'text-teal-900', 
  red: 'text-red-900', cyan: 'text-cyan-900', rose: 'text-rose-900'
};

const MONTHS = [
  'Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'May-26', 'Jun-26',
  'Jul-26', 'Aug-26', 'Sep-26', 'Oct-26', 'Nov-26', 'Dec-26'
];

const formatCurrency = (val) => {
  if (!val) return '-';
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function SydneySalesSummary() {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [data, setData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Config Modal State
  const [editingColumns, setEditingColumns] = useState([]);

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
    const loadConfigAndData = async () => {
      // 1. Load Config
      let config = getSydneySalesConfig();
      if (!config) {
        config = await getSydneySalesConfigAsync();
      }
      if (config && config.length > 0) {
        setColumns(config);
      }

      // 2. Load Data
      let loadedData = getSydneySales();
      if (!loadedData || loadedData.length === 0) {
        loadedData = await getSydneySalesAsync();
      }
      
      if (loadedData && loadedData.length > 0) {
        setData(loadedData);
      } else {
        // Init blank data based on current months
        setData(MONTHS.map(month => ({ month })));
      }
    };
    loadConfigAndData();
  }, []);

  const handleSave = () => {
    saveSydneySales(data);
    setIsEditing(false);
  };

  const handleCancel = () => {
    const loadedData = getSydneySales();
    if (loadedData && loadedData.length > 0) {
      setData(loadedData);
    } else {
      setData(MONTHS.map(month => ({ month })));
    }
    setIsEditing(false);
  };

  const handleInputChange = (rIdx, field, value) => {
    const newData = [...data];
    newData[rIdx] = {
      ...newData[rIdx],
      [field]: value === '' ? 0 : Number(value)
    };
    setData(newData);
  };

  // Calculate row totals
  const processedData = useMemo(() => {
    return data.map(row => {
      let rowTotal = 0;
      columns.forEach(col => {
        rowTotal += (row[col.id] || 0);
      });
      return {
        ...row,
        total: rowTotal
      };
    });
  }, [data, columns]);

  // Calculate column totals
  const grandTotals = useMemo(() => {
    const totals = {};
    columns.forEach(col => {
      totals[col.id] = processedData.reduce((acc, row) => acc + (row[col.id] || 0), 0);
    });
    totals.total = processedData.reduce((acc, row) => acc + (row.total || 0), 0);
    return totals;
  }, [processedData, columns]);

  const renderEditableCell = ({ rIdx, field, value }) => {
    if (!isEditing) {
      return (
        <td className="px-3 py-2 border-r border-zinc-200 text-right">
          {formatCurrency(value)}
        </td>
      );
    }
    
    return (
      <td className="px-1 py-1 border-r border-zinc-200">
        <input 
          type="number" 
          step="0.01"
          value={value === 0 ? '' : (value || '')}
          onChange={(e) => handleInputChange(rIdx, field, e.target.value)}
          className="w-full bg-white border border-zinc-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="0.00"
        />
      </td>
    );
  };

  const openConfigModal = () => {
    setEditingColumns(columns.map(c => ({ ...c })));
    setIsConfigModalOpen(true);
  };

  const saveConfig = () => {
    setColumns(editingColumns);
    saveSydneySalesConfig(editingColumns);
    setIsConfigModalOpen(false);
  };

  const addColumn = () => {
    const newId = 'col_' + Date.now();
    setEditingColumns([
      ...editingColumns, 
      { id: newId, label: 'New Staff', color: COLORS[editingColumns.length % COLORS.length] }
    ]);
  };

  const updateColumn = (index, field, value) => {
    const updated = [...editingColumns];
    updated[index] = { ...updated[index], [field]: value };
    setEditingColumns(updated);
  };

  const removeColumn = (index) => {
    const updated = [...editingColumns];
    updated.splice(index, 1);
    setEditingColumns(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-display-secondary text-notion-black tracking-notion-display font-semibold">
          Sydney Sales Persons Summary
        </h2>
        <div className="flex gap-2">
          {!isEditing && (
            <button 
              onClick={openConfigModal}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Manage Staff
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
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors"
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
              <tr>
                <th className="px-4 py-3 border-r border-zinc-200 bg-zinc-100 sticky left-0 z-20 font-bold text-zinc-900 w-32">Month</th>
                {columns.map(col => (
                  <th key={col.id} className={`px-3 py-2 border-r border-zinc-200 font-semibold ${BG_COLORS[col.color] || 'bg-zinc-50'} ${TEXT_COLORS[col.color] || 'text-zinc-900'} text-center`}>
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2 border-r border-zinc-200 font-bold bg-zinc-200 text-zinc-900 text-right">Total</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-zinc-200 font-mono text-sm bg-white">
              {processedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-4 py-2 font-sans font-medium text-zinc-900 border-r border-zinc-200 bg-white group-hover:bg-blue-50/50 sticky left-0 z-10">{row.month}</td>
                  
                  {columns.map(col => (
                    <React.Fragment key={col.id}>
                      {renderEditableCell({ rIdx: idx, field: col.id, value: row[col.id] })}
                    </React.Fragment>
                  ))}
                  
                  <td className="px-3 py-2 border-r border-zinc-200 text-right font-bold bg-zinc-50/50">{formatCurrency(row.total)}</td>
                </tr>
              ))}
            </tbody>
            
            <tfoot className="bg-zinc-100 font-mono text-sm font-semibold sticky bottom-0 z-10 border-t-2 border-zinc-300">
              <tr>
                <td className="px-4 py-3 border-r border-zinc-300 font-sans font-bold sticky left-0 z-20 bg-zinc-200 text-zinc-900 shadow-[1px_0_0_0_#d4d4d8]">Total Personal Sales</td>
                {columns.map(col => (
                  <td key={col.id} className={`px-3 py-3 border-r border-zinc-300 text-right font-bold ${TEXT_COLORS[col.color] || 'text-zinc-900'}`}>
                    {formatCurrency(grandTotals[col.id])}
                  </td>
                ))}
                <td className="px-3 py-3 border-r border-zinc-300 text-right font-bold bg-zinc-200 text-black">{formatCurrency(grandTotals.total)}</td>
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <h3 className="font-semibold text-lg text-zinc-900">Manage Staff Columns</h3>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-zinc-50/50">
              <div className="space-y-3">
                {editingColumns.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 border border-zinc-200 rounded-lg shadow-sm">
                    <div className="cursor-move text-zinc-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path></svg>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Staff Name</label>
                      <input 
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumn(idx, 'label', e.target.value)}
                        className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter name..."
                      />
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Color Theme</label>
                      <select 
                        value={col.color}
                        onChange={(e) => updateColumn(idx, 'color', e.target.value)}
                        className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        {COLORS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="pt-5">
                      <button 
                        onClick={() => removeColumn(idx)}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                        title="Remove column"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={addColumn}
                className="mt-4 w-full py-3 border-2 border-dashed border-zinc-300 rounded-lg text-zinc-600 font-medium hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 bg-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Add Staff Member
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
