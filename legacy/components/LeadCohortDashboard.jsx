import React, { useState, useMemo } from 'react';
import { format, parseISO, isValid, startOfMonth, subMonths, isBefore, isAfter, isSameMonth } from '../utils/dateUtils';

const LeadCohortDashboard = ({ leads }) => {
  const [targetMonthStr, setTargetMonthStr] = useState(format(new Date(), 'yyyy-MM'));

  const analytics = useMemo(() => {
    let targetStart = new Date(`${targetMonthStr}-01T00:00:00`);
    if (!isValid(targetStart)) targetStart = new Date();
    
    // 1. Lead Source Breakdown
    const sources = {};
    
    // 2. Prior Month DNA Status
    let priorDnaYes = 0;
    let priorDnaNo = 0;
    let priorDnaStillChasing = 0;
    let priorDnaDropped = 0;

    // 3. Application Status
    let appThisMonth = { application: 0, thinking: 0, dnr: 0 };
    let appPastMonth = { application: 0, thinking: 0, dnr: 0 };

    // 4. Payment Status
    let paid = 0;
    let waitingPayment = 0;
    let visa = 0;

    leads.forEach(lead => {
      // Determine creation date safely
      let createdDate = new Date();
      if (lead.createdAt) createdDate = new Date(lead.createdAt);
      else if (lead.id && !isNaN(parseInt(lead.id))) createdDate = new Date(parseInt(lead.id));
      else if (lead.updatedAt) createdDate = new Date(lead.updatedAt);
      if (!isValid(createdDate)) createdDate = new Date();

      const isTargetMonth = isSameMonth(createdDate, targetStart);
      const isBeforeTargetMonth = isBefore(createdDate, startOfMonth(targetStart));

      // --- SECTION 1: Lead Source Breakdown ---
      if (isTargetMonth) {
        const sourceName = lead.source || 'Unknown';
        if (!sources[sourceName]) {
          sources[sourceName] = { total: 0, yes: 0, no: 0, dna: 0 };
        }
        sources[sourceName].total++;
        if (lead.conversion === 'yes') sources[sourceName].yes++;
        else if (lead.conversion === 'no') sources[sourceName].no++;
        else if (lead.conversion === 'DNA') sources[sourceName].dna++;
      }

      // --- SECTION 2: Prior Month DNA Status ---
      if (isBeforeTargetMonth) {
        // Was this lead ever marked as DNA prior to the target month?
        // Let's check history log if available, otherwise just use current state if created before.
        // For simplicity matching the spreadsheet, we assume if they are currently DNA or were DNA and changed this month.
        let wasDnaBeforeTarget = false;
        if (lead.historyLog && lead.historyLog.length > 0) {
          lead.historyLog.forEach(log => {
             const logDate = new Date(log.date);
             if (isBefore(logDate, targetStart) && log.action === 'Conversion Update' && log.detail.includes('DNA')) {
                wasDnaBeforeTarget = true;
             }
          });
        } else {
           // Fallback if no robust history
           if (lead.conversion === 'DNA' && isBeforeTargetMonth) wasDnaBeforeTarget = true;
        }

        if (wasDnaBeforeTarget) {
          // Check what their status is NOW (or as of the end of target month, but usually users just want current status)
          if (lead.conversion === 'yes') priorDnaYes++;
          else if (lead.conversion === 'no') priorDnaNo++;
          else if (lead.conversion === 'DNA') {
             // Let's assume if it hasn't been updated in 30 days it's dropped, otherwise still chasing
             const lastUpdate = lead.updatedAt ? new Date(lead.updatedAt) : createdDate;
             const daysSinceUpdate = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24);
             if (daysSinceUpdate > 30) priorDnaDropped++;
             else priorDnaStillChasing++;
          }
        }
      }

      // --- SECTION 3: Application Status ---
      // For leads that are currently 'yes' (converted)
      if (lead.conversion === 'yes') {
        const isApp = lead.status === 'application';
        const isThinking = lead.status === 'still thinking';
        const isDnr = lead.status === 'did not respond';
        
        if (isTargetMonth) {
          if (isApp) appThisMonth.application++;
          if (isThinking) appThisMonth.thinking++;
          if (isDnr) appThisMonth.dnr++;
        } else if (isBeforeTargetMonth) {
          if (isApp) appPastMonth.application++;
          if (isThinking) appPastMonth.thinking++;
          if (isDnr) appPastMonth.dnr++;
        }
      }

      // --- SECTION 4: Payment Status ---
      if (lead.conversion === 'yes' && lead.status === 'application') {
         if (lead.stage === 'payment') {
            paid++;
         } else if (lead.stage === 'visa') {
            visa++;
         } else if (lead.stage === 'deposit' || lead.stage === 'still thinking') {
            waitingPayment++;
         }
      }
    });

    return {
      sources: Object.entries(sources).map(([name, stats]) => ({ name, ...stats })).sort((a,b) => b.total - a.total),
      priorDna: { yes: priorDnaYes, no: priorDnaNo, chasing: priorDnaStillChasing, dropped: priorDnaDropped },
      application: { thisMonth: appThisMonth, pastMonth: appPastMonth },
      payment: { paid, waiting: waitingPayment, visa }
    };
  }, [leads, targetMonthStr]);

  const targetDateDisplay = format(new Date(`${targetMonthStr}-01T00:00:00`), 'MMMM yyyy');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header and Picker */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-zinc-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-notion-black flex items-center gap-2">
            <span>Lead Dash Board</span>
          </h3>
          <p className="text-sm text-notion-warm-gray-500 mt-2">Monthly cohort tracking matching your master spreadsheet.</p>
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-notion-warm-gray-500 uppercase tracking-wider mb-1 ml-1">Target Month</label>
          <input 
            type="month" 
            value={targetMonthStr} 
            onChange={(e) => setTargetMonthStr(e.target.value)}
            className="px-4 py-2 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-notion-blue/20 focus:border-notion-blue outline-none transition-all shadow-sm w-48"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Lead Source & Application Status */}
        <div className="space-y-8">
          
          {/* SECTION 1: Lead */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="bg-[#9fc5e8] px-4 py-3 flex items-center justify-center">
              <h4 className="font-bold text-notion-black">Lead</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-4 py-3 text-left font-bold text-notion-black w-1/3">{format(new Date(`${targetMonthStr}-01T00:00:00`), 'MMMM')}</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">Total Lead</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">Yes</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">No</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">DNA</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.sources.length === 0 ? (
                    <tr><td colSpan="5" className="px-4 py-6 text-zinc-400 italic">No leads found for {targetDateDisplay}</td></tr>
                  ) : (
                    analytics.sources.map(s => (
                      <tr key={s.name} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                        <td className="px-4 py-3 text-left text-zinc-600">{s.name}</td>
                        <td className="px-2 py-3 font-medium">{s.total}</td>
                        <td className="px-2 py-3">{s.yes}</td>
                        <td className="px-2 py-3">{s.no}</td>
                        <td className="px-2 py-3">{s.dna}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: Application Status */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="bg-[#9fc5e8] px-4 py-3">
              <h4 className="font-bold text-notion-black text-center">Application Status</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-4 py-3 text-left w-1/3"></th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">Application</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">Still Thinking</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">DNR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3 text-left text-zinc-600">From This Month</td>
                    <td className="px-2 py-3">{analytics.application.thisMonth.application}</td>
                    <td className="px-2 py-3">{analytics.application.thisMonth.thinking}</td>
                    <td className="px-2 py-3">{analytics.application.thisMonth.dnr}</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-left text-zinc-600">From Past Month</td>
                    <td className="px-2 py-3">{analytics.application.pastMonth.application}</td>
                    <td className="px-2 py-3">{analytics.application.pastMonth.thinking}</td>
                    <td className="px-2 py-3">{analytics.application.pastMonth.dnr}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: Payment Status */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="bg-[#9fc5e8] px-4 py-3">
              <h4 className="font-bold text-notion-black text-center">Payment & Visa Status</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-4 py-3 text-left w-1/4"></th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">Paid</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">Waiting for Payment</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">Visa Processing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-left text-zinc-600"></td>
                    <td className="px-2 py-3 font-medium text-purple-700">{analytics.payment.paid}</td>
                    <td className="px-2 py-3">{analytics.payment.waiting}</td>
                    <td className="px-2 py-3 font-medium text-blue-700">{analytics.payment.visa}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Prior Month DNA Status */}
        <div className="space-y-8">
          
          {/* SECTION 2: Prior Month DNA Status */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="bg-[#9fc5e8] px-4 py-3">
              <h4 className="font-bold text-notion-black text-center">Priod Month DNA Status</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-2 py-3 font-semibold text-zinc-600">Yes</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">No</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">Still Chasing</th>
                    <th className="px-2 py-3 font-semibold text-zinc-600">DNA - Dropped</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-zinc-50">
                    <td className="px-2 py-4 text-lg font-medium">{analytics.priorDna.yes}</td>
                    <td className="px-2 py-4 text-lg font-medium">{analytics.priorDna.no}</td>
                    <td className="px-2 py-4 text-lg font-medium">{analytics.priorDna.chasing}</td>
                    <td className="px-2 py-4 text-lg font-medium">{analytics.priorDna.dropped}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-zinc-50 text-xs text-zinc-500 border-t border-zinc-100">
              * Identifies leads created before {targetDateDisplay} that were previously marked as "DNA" and tracks their current status. "Dropped" applies to leads inactive for 30+ days.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LeadCohortDashboard;
