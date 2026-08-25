import React, { useState, useEffect } from 'react';
import { getGlobalRates, saveGlobalRates, DEFAULT_GLOBAL_RATES } from '../utils/storage';
import Toast from './Toast';

const GlobalRatesConfig = () => {
  const [rates, setRates] = useState({ ...DEFAULT_GLOBAL_RATES });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const current = getGlobalRates();
    setRates({
      allowancePerHour: current.allowancePerHour ?? DEFAULT_GLOBAL_RATES.allowancePerHour,
      otherPerDay: current.otherPerDay ?? DEFAULT_GLOBAL_RATES.otherPerDay,
    });
  }, []);

  const handleSave = async () => {
    await saveGlobalRates(rates);
    setToastMessage('Global parameters synchronized.');
    setShowToast(true);
  };

  const handleReset = () => {
    setRates({ ...DEFAULT_GLOBAL_RATES });
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Header Container */}
      <div className="notion-card overflow-hidden">
        <div className="p-10 bg-notion-warm-white border-b whisper-border">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-micro bg-notion-black text-notion-blue flex items-center justify-center shadow-notion-card">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <div>
              <h3 className="text-display-secondary text-notion-black tracking-notion-display">Global Rate Coefficients</h3>
              <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-1">System-wide allowance and compensation parameters.</p>
            </div>
          </div>
        </div>

        {/* Active Values Display */}
        <div className="p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="bg-notion-badge-blue-bg/30 whisper-border rounded-comfortable p-8 relative overflow-hidden group hover:shadow-notion-card transition-all">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-badge font-bold text-notion-blue uppercase tracking-widest">Active Allowance</span>
                  <span className="px-2.5 py-1 bg-white whisper-border text-notion-blue text-[9px] font-bold rounded-micro shadow-sm uppercase tracking-widest">PER HOUR</span>
                </div>
                <div className="text-4xl font-bold text-notion-black tracking-notion-display tabular-nums">
                  ${rates.allowancePerHour.toFixed(2)}
                  <span className="text-sm font-bold text-notion-warm-gray-100 ml-1">/hr</span>
                </div>
                <p className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mt-4">Applied per worked unit for each resource</p>
              </div>
            </div>

            <div className="bg-emerald-50/30 whisper-border border-emerald-100 rounded-comfortable p-8 relative overflow-hidden group hover:shadow-notion-card transition-all">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-badge font-bold text-emerald-600 uppercase tracking-widest">Other Additions</span>
                  <span className="px-2.5 py-1 bg-white border border-emerald-100 text-emerald-700 text-[9px] font-bold rounded-micro shadow-sm uppercase tracking-widest">PER DAY</span>
                </div>
                <div className="text-4xl font-bold text-notion-black tracking-notion-display tabular-nums">
                  ${rates.otherPerDay.toFixed(2)}
                  <span className="text-sm font-bold text-notion-warm-gray-100 ml-1">/day</span>
                </div>
                <p className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest mt-4">Daily compensation for verified deployments</p>
              </div>
            </div>
          </div>

          {/* Edit Fields */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field">
                <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-3 block group-focus-within/field:text-notion-black transition-colors">
                  Authorize Allowance Synthesis (per hour)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rates.allowancePerHour}
                    onChange={(e) => setRates({ ...rates, allowancePerHour: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-5 py-4 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all pl-12 tabular-nums"
                  />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-notion-warm-gray-100 font-bold text-lg">$</div>
                </div>
              </div>

              <div className="group/field">
                <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-3 block group-focus-within/field:text-notion-black transition-colors">
                  Authorize Addition Protocol (per day)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rates.otherPerDay}
                    onChange={(e) => setRates({ ...rates, otherPerDay: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-5 py-4 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all pl-12 tabular-nums"
                  />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-notion-warm-gray-100 font-bold text-lg">$</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={handleSave}
                className="px-10 py-4 bg-notion-blue text-white rounded-micro font-bold text-badge uppercase tracking-widest shadow-notion-card hover:bg-notion-blue-active transition shadow-notion-deep"
              >
                Commit System Parameters
              </button>
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-white whisper-border text-notion-warm-gray-300 rounded-micro font-bold text-badge uppercase tracking-widest hover:bg-notion-warm-white transition shadow-sm"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-notion-black rounded-comfortable p-8 text-white relative overflow-hidden shadow-notion-deep">
        <div className="relative z-10 flex gap-5">
          <div className="w-12 h-12 rounded-micro bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-notion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h5 className="text-badge font-bold text-notion-blue uppercase tracking-widest mb-2">Architectural Logic</h5>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              The <strong className="text-white">Allowance Coefficient</strong> is applied per worked unit across all terminals. 
              The <strong className="text-white">Other Addition Protocol</strong> is calculated per active deployment day. 
              These parameters are baseline values and can be overridden by site-specific role designate. Changes apply to all future payroll synthesis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalRatesConfig;
