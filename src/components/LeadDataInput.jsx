import React, { useState, useMemo, useEffect, useRef } from 'react';
import PremiumDialog from './PremiumDialog';


const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const LeadDataInput = ({ onSaveData, existingReports = [], counselors = [] }) => {
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthForInput, setSelectedMonthForInput] = useState(null); // 'YYYY-MM'

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [selectedCounselorId, setSelectedCounselorId] = useState('');
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });

  const [formData, setFormData] = useState({
    totalLeads: '',
    sourceFacebook: '',
    sourceReferrals: '',
    sourceWebsite: '',
    sourceWalkIn: '',
    convYes: '',
    convNo: '',
    convDNA: '',
    appApplied: '',
    appWaitingPayment: '',
    appWaitingApplication: '', appDropoutThisMonth: '', appDropoutPrevMonth: '',
    paymentDone: '',
    visaLodging: '',
    visaInProgress: '',
    visaGranted: '',
    visaRefusal: ''
  });

  // KPI Aggregates for the grid
  const monthAggregates = useMemo(() => {
    const agg = {};
    const carryoverStr = `${selectedYear}-carryover`;
    agg[carryoverStr] = { totalLeads: 0, paymentDone: 0, visaGranted: 0, hasData: false };
    
    for (let i = 0; i < 12; i++) {
      const monthStr = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
      agg[monthStr] = { totalLeads: 0, paymentDone: 0, visaGranted: 0, hasData: false };
    }
    
    existingReports.forEach(r => {
      if (r.month && r.month.startsWith(selectedYear)) {
        if (agg[r.month]) {
          agg[r.month].hasData = true;
          agg[r.month].totalLeads += parseInt(r.totalLeads) || 0;
          agg[r.month].paymentDone += parseInt(r.paymentDone) || 0;
          agg[r.month].visaGranted += parseInt(r.visaGranted) || 0;
        }
      }
    });
    return agg;
  }, [existingReports, selectedYear]);

  // Keep the latest reports in a ref so the loader below can read them WITHOUT
  // re-running on every background sync. If existingReports were an effect dependency,
  // a cloud sync mid-entry would re-fire this effect and wipe the user's unsaved input (§4.5).
  const existingReportsRef = useRef(existingReports);
  useEffect(() => { existingReportsRef.current = existingReports; }, [existingReports]);

  const blankForm = {
    totalLeads: '', sourceFacebook: '', sourceReferrals: '', sourceWebsite: '', sourceWalkIn: '',
    convYes: '', convNo: '', convDNA: '',
    appApplied: '', appWaitingApplication: '', appWaitingPayment: '', appDropoutThisMonth: '', appDropoutPrevMonth: '', paymentDone: '',
    visaLodging: '', visaInProgress: '', visaGranted: '', visaRefusal: ''
  };

  // Load existing data ONLY when the selected counselor or month changes — NOT when
  // existingReports updates underneath us (that would discard in-progress edits, §4.5).
  useEffect(() => {
    if (!selectedMonthForInput || !selectedCounselorId) {
      setFormData(blankForm);
      return;
    }

    const existing = existingReportsRef.current.find(r => r.month === selectedMonthForInput && r.counselorId === selectedCounselorId);
    if (existing) {
      setFormData({
        totalLeads: existing.totalLeads || '',
        sourceFacebook: existing.sourceFacebook || '',
        sourceReferrals: existing.sourceReferrals || '',
        sourceWebsite: existing.sourceWebsite || '',
        sourceWalkIn: existing.sourceWalkIn || '',
        convYes: existing.convYes || '',
        convNo: existing.convNo || '',
        convDNA: existing.convDNA || '',
        appApplied: existing.appApplied || '',
        appWaitingApplication: existing.appWaitingApplication || '',
        appWaitingPayment: existing.appWaitingPayment || '',
        appDropoutThisMonth: existing.appDropoutThisMonth || existing.appDroppedOut || '',
        appDropoutPrevMonth: existing.appDropoutPrevMonth || '',
        paymentDone: existing.paymentDone || '',
        visaLodging: existing.visaLodging || '',
        visaInProgress: existing.visaInProgress || '',
        visaGranted: existing.visaGranted || '',
        visaRefusal: existing.visaRefusal || ''
      });
    } else {
      setFormData(blankForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthForInput, selectedCounselorId]);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  // Navigations
  const handleNext = () => {
    if (step === 1) {
      if (!selectedCounselorId) {
        setError('Please select a counselor.');
        return;
      }
      const total = parseInt(formData.totalLeads) || 0;
      const fb = parseInt(formData.sourceFacebook) || 0;
      const ref = parseInt(formData.sourceReferrals) || 0;
      const web = parseInt(formData.sourceWebsite) || 0;
      const walk = parseInt(formData.sourceWalkIn) || 0;
      
      if (total <= 0) {
        setError('Total leads must be greater than 0.');
        return;
      }
      
      if (total !== (fb + ref + web + walk)) {
        setError(`Sum of sources (${fb + ref + web + walk}) must equal Total Leads (${total}).`);
        return;
      }
    }
    
    if (step === 2) {
      const total = parseInt(formData.totalLeads) || 0;
      const yes = parseInt(formData.convYes) || 0;
      const no = parseInt(formData.convNo) || 0;
      const dna = parseInt(formData.convDNA) || 0;
      
      if (total !== (yes + no + dna)) {
        setError(`Sum of conversions (${yes + no + dna}) must equal Total Leads (${total}).`);
        return;
      }
    }

    if (step === 3) {
      const yes = parseInt(formData.convYes) || 0;
      const applied = parseInt(formData.appApplied) || 0;
      const waitingApp = parseInt(formData.appWaitingApplication) || 0;
      const dropoutThis = parseInt(formData.appDropoutThisMonth) || 0;
      
      if (yes !== (applied + waitingApp + dropoutThis)) {
        setError(`Application outcomes (${applied} + ${waitingApp} + ${dropoutThis} = ${applied + waitingApp + dropoutThis}) must equal Total 'Yes' Conversions (${yes}).`);
        return;
      }

      const payDone = parseInt(formData.paymentDone) || 0;
      const waitPay = parseInt(formData.appWaitingPayment) || 0;
      if ((payDone + waitPay) > applied) {
        setError(`Payment Done (${payDone}) + Waiting on Payment (${waitPay}) = ${payDone + waitPay} cannot exceed Total Applied (${applied}).`);
        return;
      }
    }

    setError('');
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSave = () => {
    // Validate Step 4
    const lodging = parseInt(formData.visaLodging) || 0;
    const inProgress = parseInt(formData.visaInProgress) || 0;
    const granted = parseInt(formData.visaGranted) || 0;
    const refusal = parseInt(formData.visaRefusal) || 0;
    
    

    if (lodging !== (inProgress + granted + refusal)) {
      setError(`Sum of Visa outcomes (${inProgress + granted + refusal}) must equal Visa Lodging (${lodging}).`);
      return;
    }

    setError('');

    const reportData = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      counselorId: selectedCounselorId,
      month: selectedMonthForInput,
      ...formData };
    
    if (onSaveData) {
      onSaveData(reportData);
    }
    

    
    // Reset and return to grid
    setStep(1);
    setSelectedCounselorId('');
    setSelectedMonthForInput(null);
    setDialogConfig({
      isOpen: true,
      type: 'success',
      title: 'Report Saved',
      message: 'Report saved locally and will sync to the cloud automatically.',
      confirmText: 'Awesome',
      onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const renderStepIndicator = () => {
    const steps = ['Initial', 'Conversion', 'Application', 'Visa'];
    return (
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-zinc-100 rounded-full z-0"></div>
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-notion-blue rounded-full z-0 transition-all duration-500"
          style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {steps.map((s, idx) => {
          const isCompleted = step > idx + 1;
          const isActive = step === idx + 1;
          return (
            <div key={idx} className="relative z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                isActive ? 'bg-notion-blue text-white ring-4 ring-blue-50' 
                : isCompleted ? 'bg-emerald-500 text-white' 
                : 'bg-white border-2 border-zinc-200 text-zinc-400'
              }`}>
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span className={`absolute -bottom-6 text-xs font-semibold whitespace-nowrap ${isActive ? 'text-notion-blue' : 'text-zinc-400'}`}>
                {s}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const inputClasses = "w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-notion-blue/20 focus:border-notion-blue outline-none transition-all";
  const labelClasses = "block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1";

  // GRID VIEW
  if (!selectedMonthForInput) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-notion-black">Monthly KPI Dashboard</h3>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-bold shadow-sm focus:border-notion-blue outline-none cursor-pointer"
          >
            {[...Array(5)].map((_, i) => {
              const yr = parseInt(currentYear) - i;
              return <option key={yr} value={yr}>{yr}</option>
            })}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[
            { id: `${selectedYear}-carryover`, name: `Carryover from ${parseInt(selectedYear) - 1}`, isCarryover: true },
            ...monthNames.map((name, i) => ({ id: `${selectedYear}-${String(i + 1).padStart(2, '0')}`, name }))
          ].map((monthData) => {
            const monthStr = monthData.id;
            const stats = monthAggregates[monthStr];
            
            return (
              <div 
                key={monthStr}
                onClick={() => {
                  setSelectedMonthForInput(monthStr);
                  setStep(1);
                  setError('');
                }}
                className={`relative overflow-hidden rounded-2xl border p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  stats.hasData 
                    ? (monthData.isCarryover ? 'bg-amber-50 border-amber-200 hover:border-amber-400' : 'bg-white border-zinc-200 hover:border-notion-blue/50')
                    : (monthData.isCarryover ? 'bg-amber-50/50 border-dashed border-amber-200 hover:border-amber-400 opacity-80 hover:opacity-100' : 'bg-zinc-50 border-dashed border-zinc-300 hover:border-zinc-400 opacity-70 hover:opacity-100')
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`font-extrabold text-lg ${monthData.isCarryover ? 'text-amber-900' : 'text-notion-black'}`}>{monthData.name}</h4>
                  {stats.hasData && (
                    <span className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${monthData.isCarryover ? 'bg-amber-500 shadow-amber-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`}></span>
                  )}
                </div>
                
                {stats.hasData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-zinc-500 uppercase">Leads</span>
                      <span className="font-bold text-notion-black">{stats.totalLeads}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-zinc-500 uppercase">Payments</span>
                      <span className="font-bold text-emerald-600">{stats.paymentDone}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-zinc-500 uppercase">Visas</span>
                      <span className="font-bold text-notion-blue">{stats.visaGranted}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 text-sm font-semibold text-zinc-400">
                    No data entered
                  </div>
                )}
                
                <div className="absolute inset-0 border-2 border-transparent hover:border-notion-blue/10 rounded-2xl pointer-events-none transition-colors"></div>
              </div>
            );
          })}
        </div>
        <PremiumDialog {...dialogConfig} />
      </div>
    );
  }

  // FORM VIEW
  const monthNameDisplay = selectedMonthForInput?.endsWith('-carryover')
    ? `Carryover from ${parseInt(selectedMonthForInput.split('-')[0]) - 1}`
    : selectedMonthForInput ? new Date(`${selectedMonthForInput}-02`).toLocaleString('default', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <button 
          onClick={() => {
            setSelectedMonthForInput(null);
            setSelectedCounselorId('');
            setStep(1);
          }}
          className="text-sm font-bold text-zinc-500 hover:text-notion-blue transition-colors flex items-center gap-1.5"
        >
          <span>←</span> Back to Months
        </button>
        <div className="px-4 py-1.5 bg-notion-blue/10 text-notion-blue rounded-full text-xs font-extrabold uppercase tracking-widest">
          {monthNameDisplay}
        </div>
      </div>

      {renderStepIndicator()}
      
      <div className="mt-12 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 p-8">
        
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          </div>
        )}

        {/* STEP 1: INITIAL */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-bold text-notion-black mb-6">Initial Lead Generation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClasses}>Select Counselor</label>
                <select 
                  value={selectedCounselorId} 
                  onChange={(e) => {
                    setSelectedCounselorId(e.target.value);
                    if (error) setError('');
                  }}
                  className={inputClasses}
                >
                  <option value="">Select Counselor...</option>
                  {counselors.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.specialty ? `(${c.specialty})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClasses}>Total Leads for this Counselor</label>
                <input type="number" min="0" name="totalLeads" value={formData.totalLeads} onChange={handleChange} className={inputClasses} placeholder="e.g. 150" />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <h4 className="text-sm font-bold text-notion-black mb-4">Lead Sources Breakdown</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Facebook</label>
                  <input type="number" min="0" name="sourceFacebook" value={formData.sourceFacebook} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>Referrals</label>
                  <input type="number" min="0" name="sourceReferrals" value={formData.sourceReferrals} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>Website</label>
                  <input type="number" min="0" name="sourceWebsite" value={formData.sourceWebsite} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>Walk-in</label>
                  <input type="number" min="0" name="sourceWalkIn" value={formData.sourceWalkIn} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-sm font-bold text-zinc-500">Sources Sum:</span>
                <span className={`text-lg font-bold ${
                  (parseInt(formData.totalLeads) || 0) === 
                  ((parseInt(formData.sourceFacebook) || 0) + (parseInt(formData.sourceReferrals) || 0) + (parseInt(formData.sourceWebsite) || 0) + (parseInt(formData.sourceWalkIn) || 0))
                  ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {((parseInt(formData.sourceFacebook) || 0) + (parseInt(formData.sourceReferrals) || 0) + (parseInt(formData.sourceWebsite) || 0) + (parseInt(formData.sourceWalkIn) || 0))} 
                  <span className="text-sm text-zinc-400 mx-1">/</span> 
                  {parseInt(formData.totalLeads) || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONVERSION */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-bold text-notion-black mb-6">Conversion Phase</h3>
            <p className="text-sm text-zinc-500 mb-6">Enter the responses from the initial contact phase.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClasses}>Yes</label>
                <input type="number" min="0" name="convYes" value={formData.convYes} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
              <div>
                <label className={labelClasses}>No</label>
                <input type="number" min="0" name="convNo" value={formData.convNo} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
              <div>
                <label className={labelClasses}>Did Not Answer</label>
                <input type="number" min="0" name="convDNA" value={formData.convDNA} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-sm font-bold text-zinc-500">Conversions Sum:</span>
              <span className={`text-lg font-bold ${
                (parseInt(formData.totalLeads) || 0) === 
                ((parseInt(formData.convYes) || 0) + (parseInt(formData.convNo) || 0) + (parseInt(formData.convDNA) || 0))
                ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {((parseInt(formData.convYes) || 0) + (parseInt(formData.convNo) || 0) + (parseInt(formData.convDNA) || 0))} 
                <span className="text-sm text-zinc-400 mx-1">/</span> 
                {parseInt(formData.totalLeads) || 0}
              </span>
            </div>
          </div>
        )}

        {/* STEP 3: APPLICATION & PAYMENT */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-bold text-notion-black mb-6">Application & Payment Phase</h3>
            
            <div className="mb-6 flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-sm font-bold text-zinc-500">Applied + Wait (App) + Dropout (This) vs Total 'Yes' Conversions:</span>
              <span className={`text-lg font-bold ${
                ((parseInt(formData.appApplied) || 0) + (parseInt(formData.appWaitingApplication) || 0) + (parseInt(formData.appDropoutThisMonth) || 0)) === (parseInt(formData.convYes) || 0)
                ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {((parseInt(formData.appApplied) || 0) + (parseInt(formData.appWaitingApplication) || 0) + (parseInt(formData.appDropoutThisMonth) || 0))}
                <span className="text-sm text-zinc-400 mx-1">/</span> 
                {parseInt(formData.convYes) || 0}
              </span>
            </div>
            
            <div className="mb-6">
              <label className={labelClasses}>Total Applied</label>
              <input type="number" min="0" name="appApplied" value={formData.appApplied} onChange={handleChange} className={inputClasses} placeholder="0" />
            </div>

            <div className="pt-4 border-t border-zinc-100 mb-6">
              <h4 className="text-sm font-bold text-notion-black mb-4">Conversion Outcomes (Must sum to Total Yes)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClasses}>Waiting on Application</label>
                  <input type="number" min="0" name="appWaitingApplication" value={formData.appWaitingApplication} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>This Month Dropout (Before App)</label>
                  <input type="number" min="0" name="appDropoutThisMonth" value={formData.appDropoutThisMonth} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <h4 className="text-sm font-bold text-notion-black mb-4">Application Outcomes & Carryover Updates</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className={labelClasses}>Payment Done</label>
                  <input type="number" min="0" name="paymentDone" value={formData.paymentDone} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>Waiting on Payment</label>
                  <input type="number" min="0" name="appWaitingPayment" value={formData.appWaitingPayment} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>Previous Month Dropout (Late)</label>
                  <input type="number" min="0" name="appDropoutPrevMonth" value={formData.appDropoutPrevMonth} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: VISA */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-bold text-notion-black mb-6">Visa Stage</h3>
            
            <div className="mb-6 flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-sm font-bold text-zinc-500">Visa Lodging vs Total Payments Done:</span>
              <span className={`text-lg font-bold ${
                (parseInt(formData.visaLodging) || 0) === (parseInt(formData.paymentDone) || 0)
                ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {parseInt(formData.visaLodging) || 0}
                <span className="text-sm text-zinc-400 mx-1">/</span> 
                {parseInt(formData.paymentDone) || 0}
              </span>
            </div>
            
            <div className="mb-6">
              <label className={labelClasses}>Total Visa Lodging</label>
              <input type="number" min="0" name="visaLodging" value={formData.visaLodging} onChange={handleChange} className={inputClasses} placeholder="0" />
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <h4 className="text-sm font-bold text-notion-black mb-4">Visa Outcomes Breakdown</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className={labelClasses}>In Progress</label>
                  <input type="number" min="0" name="visaInProgress" value={formData.visaInProgress} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>Granted</label>
                  <input type="number" min="0" name="visaGranted" value={formData.visaGranted} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>Refusal</label>
                  <input type="number" min="0" name="visaRefusal" value={formData.visaRefusal} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              step === 1 ? 'opacity-0 pointer-events-none' : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            ← Back
          </button>
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-8 py-2.5 bg-notion-blue text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95"
            >
              Next Step →
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Save Report
            </button>
          )}
        </div>

      </div>
      <PremiumDialog {...dialogConfig} />
    </div>
  );
};

export default LeadDataInput;
