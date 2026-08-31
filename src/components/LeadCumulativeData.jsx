import React, { useState, useMemo } from 'react';

const LeadCumulativeData = ({ counselors, existingReports }) => {
  const [isLeadSourceExpanded, setIsLeadSourceExpanded] = useState(false);
  const [filterBranch, setFilterBranch] = useState('All');

  const currentYear = new Date().getFullYear().toString();
  const [filterYear, setFilterYear] = useState('All');

  // Filter reports by year
  const filteredReports = useMemo(() => {
    if (filterYear === 'All') return existingReports;
    return existingReports.filter(r => r.month && r.month.startsWith(filterYear));
  }, [existingReports, filterYear]);

  // Compute carryover totals
  const carryoverTotals = useMemo(() => {
    const t = {
        sourceFacebook: 0, sourceReferrals: 0, sourceWebsite: 0, sourceWalkIn: 0,
        totalLeads: 0, convYes: 0, convNo: 0, convDNA: 0,
        appApplied: 0, appWaitingPayment: 0, appDroppedOut: 0,
        visaLodging: 0, visaInProgress: 0, visaGranted: 0, visaRefusal: 0,
        hasData: false
    };
    filteredReports.forEach(r => {
      if (r.month && r.month.endsWith('-carryover')) {
        t.hasData = true;
        t.sourceFacebook += parseInt(r.sourceFacebook) || 0;
        t.sourceReferrals += parseInt(r.sourceReferrals) || 0;
        t.sourceWebsite += parseInt(r.sourceWebsite) || 0;
        t.sourceWalkIn += parseInt(r.sourceWalkIn) || 0;
        t.totalLeads += parseInt(r.totalLeads) || 0;
        t.convYes += parseInt(r.convYes) || 0;
        t.convNo += parseInt(r.convNo) || 0;
        t.convDNA += parseInt(r.convDNA) || 0;
        t.appApplied += parseInt(r.appApplied) || 0;
        t.appWaitingPayment += parseInt(r.appWaitingPayment) || 0;
        t.appDroppedOut += parseInt(r.appDroppedOut) || 0;
        t.visaLodging += parseInt(r.visaLodging) || 0;
        t.visaInProgress += parseInt(r.visaInProgress) || 0;
        t.visaGranted += parseInt(r.visaGranted) || 0;
        t.visaRefusal += parseInt(r.visaRefusal) || 0;
      }
    });
    return t;
  }, [filteredReports]);

  // Compute cumulative data per counselor
  const counselorData = useMemo(() => {
    return counselors.map(c => {
      const reports = filteredReports.filter(r => r.counselorId === c.id);
      
      const sums = {
        sourceFacebook: 0,
        sourceReferrals: 0,
        sourceWebsite: 0,
        sourceWalkIn: 0,
        totalLeads: 0,
        convYes: 0,
        convNo: 0,
        convDNA: 0,
        appApplied: 0,
        appWaitingPayment: 0,
        appDroppedOut: 0,
        visaLodging: 0,
        visaInProgress: 0,
        visaGranted: 0,
        visaRefusal: 0
      };

      reports.forEach(r => {
        sums.sourceFacebook += parseInt(r.sourceFacebook) || 0;
        sums.sourceReferrals += parseInt(r.sourceReferrals) || 0;
        sums.sourceWebsite += parseInt(r.sourceWebsite) || 0;
        sums.sourceWalkIn += parseInt(r.sourceWalkIn) || 0;
        sums.totalLeads += parseInt(r.totalLeads) || 0;
        sums.convYes += parseInt(r.convYes) || 0;
        sums.convNo += parseInt(r.convNo) || 0;
        sums.convDNA += parseInt(r.convDNA) || 0;
        sums.appApplied += parseInt(r.appApplied) || 0;
        sums.appWaitingPayment += parseInt(r.appWaitingPayment) || 0;
        sums.appDroppedOut += parseInt(r.appDroppedOut) || 0;
        sums.visaLodging += parseInt(r.visaLodging) || 0;
        sums.visaInProgress += parseInt(r.visaInProgress) || 0;
        sums.visaGranted += parseInt(r.visaGranted) || 0;
        sums.visaRefusal += parseInt(r.visaRefusal) || 0;
      });

      return { counselor: c, sums };
    });
  }, [counselors, filteredReports]);

  // Compute grand totals
  const grandTotals = useMemo(() => {
    const t = {
        sourceFacebook: 0,
        sourceReferrals: 0,
        sourceWebsite: 0,
        sourceWalkIn: 0,
        totalLeads: 0,
        convYes: 0,
        convNo: 0,
        convDNA: 0,
        appApplied: 0,
        appWaitingPayment: 0,
        appDroppedOut: 0,
        visaLodging: 0,
        visaInProgress: 0,
        visaGranted: 0,
        visaRefusal: 0
    };

    counselorData.forEach(d => {
      Object.keys(t).forEach(key => {
        t[key] += d.sums[key];
      });
    });

    return t;
  }, [counselorData]);

  const groupThClass = "px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-center border-b-2 border-zinc-300";
  const thClass = "px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center border-b border-zinc-200 bg-zinc-50 min-w-[80px]";
  const tdClass = "px-4 py-3 text-sm font-medium text-center text-zinc-700 border-b border-zinc-100";
  const branchTotalTdClass = "px-4 py-3 text-sm font-bold text-center text-zinc-800 border-b-2 border-zinc-300 bg-slate-50";
  const footerTdClass = "px-4 py-3 text-sm font-extrabold text-center text-zinc-900 border-t-4 border-zinc-400 bg-zinc-100";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-notion-black mb-1">Cumulative Data</h3>
          <p className="text-sm text-zinc-500">View all-time aggregate totals for each counselor across all stages.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-zinc-500">Year:</label>
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-bold text-notion-black focus:ring-2 focus:ring-notion-blue/20 outline-none transition-all shadow-sm"
          >
            <option value="All">All Time</option>
            {[...Array(5)].map((_, i) => {
              const yr = parseInt(currentYear) - i;
              return <option key={yr} value={yr}>{yr}</option>;
            })}
          </select>

          <label className="text-sm font-bold text-zinc-500 ml-2">Branch:</label>
          <select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-bold text-notion-black focus:ring-2 focus:ring-notion-blue/20 outline-none transition-all shadow-sm"
          >
            <option value="All">All Branches</option>
            <option value="Search Australia">Search Australia</option>
            <option value="Search Chili">Search Chili</option>
            <option value="Search Nepal">Search Nepal</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            {/* Stage Grouping Headers */}
            <tr>
              <th rowSpan={3} className={`${thClass} min-w-[150px] align-bottom text-left !bg-blue-50 !text-blue-700 !border-r-zinc-300`}>
                Counselor
              </th>
              
              <th colSpan={isLeadSourceExpanded ? 8 : 4} className={`${groupThClass} bg-orange-50 text-orange-700 !border-r-zinc-300`}>
                Lead Stage
              </th>
              
              <th colSpan={4} className={`${groupThClass} bg-emerald-50 text-emerald-700 !border-r-zinc-300`}>
                Application State
              </th>
              
              <th colSpan={5} className={`${groupThClass} bg-indigo-50 text-indigo-700`}>
                Visa Stage
              </th>
            </tr>

            {/* Sub Headers */}
            <tr>
              <th 
                colSpan={isLeadSourceExpanded ? 5 : 1} 
                className={`${thClass} border-l-2 border-l-zinc-300 relative group cursor-pointer hover:bg-orange-100 transition-colors align-middle !bg-orange-50 !text-orange-700`}
                onClick={() => setIsLeadSourceExpanded(!isLeadSourceExpanded)}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Lead</span>
                  <div className={`p-1 rounded-md bg-orange-100 border border-orange-200 shadow-sm transition-transform ${isLeadSourceExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-3 h-3 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </th>
              
              <th rowSpan={2} className={`${thClass} border-l-2 border-l-zinc-300 align-bottom !bg-orange-50 !text-orange-700`}>Yes</th>
              <th rowSpan={2} className={`${thClass} align-bottom !bg-orange-50 !text-orange-700`}>No</th>
              <th rowSpan={2} className={`${thClass} align-bottom !border-r-zinc-300 !bg-orange-50 !text-orange-700`}>DNA</th>

              <th rowSpan={2} className={`${thClass} align-bottom !bg-emerald-50 !text-emerald-700`}>Application</th>
              <th rowSpan={2} className={`${thClass} align-bottom !bg-emerald-50 !text-emerald-700`}>App %</th>
              <th rowSpan={2} className={`${thClass} align-bottom min-w-[110px] !bg-emerald-50 !text-emerald-700`}>Wait on<br/>Payment</th>
              <th rowSpan={2} className={`${thClass} align-bottom !border-r-zinc-300 min-w-[120px] !bg-emerald-50 !text-emerald-700`}>Dropout from<br/>Application</th>

              <th rowSpan={2} className={`${thClass} align-bottom !bg-indigo-50 !text-indigo-700`}>Visa Lodge</th>
              <th rowSpan={2} className={`${thClass} align-bottom !bg-indigo-50 !text-indigo-700`}>In Process</th>
              <th rowSpan={2} className={`${thClass} align-bottom !bg-indigo-50 !text-indigo-700`}>Granted</th>
              <th rowSpan={2} className={`${thClass} align-bottom !bg-indigo-50 !text-indigo-700`}>Refusal</th>
              <th rowSpan={2} className={`${thClass} align-bottom !bg-indigo-50 !text-indigo-700`}>Visa %</th>
            </tr>
            
            {/* Expansion Headers for Lead */}
            <tr>
              {isLeadSourceExpanded && (
                <>
                  <th className={`${thClass} border-l-2 border-l-zinc-300 !bg-orange-50 !text-orange-700`}>Facebook</th>
                  <th className={`${thClass} !bg-orange-50 !text-orange-700`}>Referral</th>
                  <th className={`${thClass} !bg-orange-50 !text-orange-700`}>Website</th>
                  <th className={`${thClass} min-w-[90px] !bg-orange-50 !text-orange-700`}>Walk-in</th>
                </>
              )}
              <th className={`${thClass} ${!isLeadSourceExpanded ? 'border-l-2 border-l-zinc-300' : ''} !bg-orange-50 !text-orange-700`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filterYear !== 'All' && carryoverTotals.hasData && (
              <tr className="bg-amber-50/60 hover:bg-amber-100 transition-colors group border-b-2 border-amber-200">
                <td className={`${tdClass} text-left font-extrabold text-amber-900 !border-r-zinc-300`}>
                  Carryover from {parseInt(filterYear) - 1}
                </td>
                
                {isLeadSourceExpanded && (
                  <>
                    <td className={`${tdClass} border-l-2 border-l-zinc-200 text-amber-800`}>{carryoverTotals.sourceFacebook || 0}</td>
                    <td className={`${tdClass} text-amber-800`}>{carryoverTotals.sourceReferrals || 0}</td>
                    <td className={`${tdClass} text-amber-800`}>{carryoverTotals.sourceWebsite || 0}</td>
                    <td className={`${tdClass} text-amber-800`}>{carryoverTotals.sourceWalkIn || 0}</td>
                  </>
                )}
                
                <td className={`${tdClass} font-extrabold ${!isLeadSourceExpanded ? 'border-l-2 border-l-zinc-200' : ''} text-amber-900`}>
                  {carryoverTotals.totalLeads || 0}
                </td>

                <td className={`${tdClass} border-l-2 border-l-zinc-200 text-emerald-700 font-bold`}>{carryoverTotals.convYes || 0}</td>
                <td className={`${tdClass} text-rose-700 font-bold`}>{carryoverTotals.convNo || 0}</td>
                <td className={`${tdClass} text-zinc-500 !border-r-zinc-300`}>{carryoverTotals.convDNA || 0}</td>

                {(() => {
                  const appRate = carryoverTotals.totalLeads > 0 ? Math.round((carryoverTotals.appApplied / carryoverTotals.totalLeads) * 100) : 0;
                  const visaRate = carryoverTotals.visaLodging > 0 ? Math.round((carryoverTotals.visaGranted / carryoverTotals.visaLodging) * 100) : 0;
                  return (
                    <>
                      <td className={`${tdClass} font-bold text-amber-900`}>{carryoverTotals.appApplied || 0}</td>
                      <td className={`${tdClass} ${appRate >= 50 ? 'text-emerald-600' : appRate > 0 ? 'text-amber-600' : 'text-amber-900/50'}`}>{appRate > 0 ? `${appRate}%` : '-'}</td>
                      <td className={`${tdClass} text-amber-700`}>{carryoverTotals.appWaitingPayment || 0}</td>
                      <td className={`${tdClass} text-rose-700 !border-r-zinc-300`}>{carryoverTotals.appDroppedOut || 0}</td>

                      <td className={`${tdClass} text-zinc-700`}>{carryoverTotals.visaLodging || 0}</td>
                      <td className={`${tdClass} text-indigo-700`}>{carryoverTotals.visaInProgress || 0}</td>
                      <td className={`${tdClass} text-emerald-700 font-bold`}>{carryoverTotals.visaGranted || 0}</td>
                      <td className={`${tdClass} text-rose-700`}>{carryoverTotals.visaRefusal || 0}</td>
                      <td className={`${tdClass} ${visaRate >= 70 ? 'text-emerald-600' : visaRate > 0 ? 'text-amber-600' : 'text-amber-900/50'}`}>{visaRate > 0 ? `${visaRate}%` : '-'}</td>
                    </>
                  );
                })()}
              </tr>
            )}
            
            {counselorData.length === 0 ? (
              <tr>
                <td colSpan={20} className="px-4 py-8 text-center text-sm font-semibold text-zinc-400 border-b border-zinc-100">
                  No counselors available. Please add them in Settings.
                </td>
              </tr>
            ) : (
              ['Search Australia', 'Search Chili', 'Search Nepal']
                .filter(b => filterBranch === 'All' || b === filterBranch)
                .map(branch => {
                const branchData = counselorData.filter(d => (d.counselor.branch || 'Search Nepal') === branch);
                if (branchData.length === 0) return null;

                return (
                  <React.Fragment key={branch}>
                    <tr>
                      <td colSpan={isLeadSourceExpanded ? 16 : 12} className="px-4 py-2 bg-zinc-100 text-xs font-extrabold text-zinc-600 uppercase tracking-wider text-left border-b border-zinc-200">
                        {branch}
                      </td>
                    </tr>
                    {branchData.map(d => (
                      <tr key={d.counselor.id} className="hover:bg-notion-blue/5 transition-colors group">
                        <td className={`${tdClass} text-left font-bold text-notion-blue !border-r-zinc-300`}>
                          {d.counselor.name}
                        </td>
                        
                        {isLeadSourceExpanded && (
                          <>
                            <td className={`${tdClass} border-l-2 border-l-zinc-200 text-zinc-600`}>{d.sums.sourceFacebook || 0}</td>
                            <td className={`${tdClass} text-zinc-600`}>{d.sums.sourceReferrals || 0}</td>
                            <td className={`${tdClass} text-zinc-600`}>{d.sums.sourceWebsite || 0}</td>
                            <td className={`${tdClass} text-zinc-600`}>{d.sums.sourceWalkIn || 0}</td>
                          </>
                        )}
                        
                        <td className={`${tdClass} font-extrabold ${!isLeadSourceExpanded ? 'border-l-2 border-l-zinc-200' : ''} bg-zinc-50/50 group-hover:bg-transparent`}>
                          {d.sums.totalLeads || 0}
                        </td>

                        <td className={`${tdClass} border-l-2 border-l-zinc-200 text-emerald-600 bg-blue-50/10`}>{d.sums.convYes || 0}</td>
                        <td className={`${tdClass} text-rose-600 bg-blue-50/10`}>{d.sums.convNo || 0}</td>
                        <td className={`${tdClass} text-zinc-400 bg-blue-50/10 !border-r-zinc-300`}>{d.sums.convDNA || 0}</td>

                        <td className={`${tdClass} bg-blue-50/10`}>{d.sums.appApplied || 0}</td>
                        {(() => {
                          const appRate = d.sums.totalLeads > 0 ? Math.round((d.sums.appApplied / d.sums.totalLeads) * 100) : 0;
                          return <td className={`${tdClass} bg-blue-50/10 ${appRate >= 50 ? 'text-emerald-600' : appRate > 0 ? 'text-amber-600' : 'text-zinc-300'}`}>{appRate > 0 ? `${appRate}%` : '-'}</td>;
                        })()}
                        <td className={`${tdClass} text-amber-600 bg-blue-50/10`}>{d.sums.appWaitingPayment || 0}</td>
                        <td className={`${tdClass} text-rose-600 bg-blue-50/10 !border-r-zinc-300`}>{d.sums.appDroppedOut || 0}</td>

                        <td className={`${tdClass} text-zinc-600 bg-blue-50/10`}>{d.sums.visaLodging || 0}</td>
                        <td className={`${tdClass} text-indigo-600 bg-blue-50/10`}>{d.sums.visaInProgress || 0}</td>
                        <td className={`${tdClass} text-emerald-600 bg-blue-50/10 font-bold`}>{d.sums.visaGranted || 0}</td>
                        <td className={`${tdClass} text-rose-600 bg-blue-50/10`}>{d.sums.visaRefusal || 0}</td>
                        {(() => {
                          const visaRate = d.sums.visaLodging > 0 ? Math.round((d.sums.visaGranted / d.sums.visaLodging) * 100) : 0;
                          return <td className={`${tdClass} bg-blue-50/10 ${visaRate >= 70 ? 'text-emerald-600' : visaRate > 0 ? 'text-amber-600' : 'text-zinc-300'}`}>{visaRate > 0 ? `${visaRate}%` : '-'}</td>;
                        })()}
                      </tr>
                    ))}
                    {/* Branch Total Row */}
                    {(() => {
                      const branchTotal = branchData.reduce((acc, d) => {
                        Object.keys(d.sums).forEach(key => {
                          acc[key] = (acc[key] || 0) + (d.sums[key] || 0);
                        });
                        return acc;
                      }, {});
                      
                      const branchAppRate = branchTotal.totalLeads > 0 ? Math.round((branchTotal.appApplied / branchTotal.totalLeads) * 100) : 0;
                      const branchVisaRate = branchTotal.visaLodging > 0 ? Math.round((branchTotal.visaGranted / branchTotal.visaLodging) * 100) : 0;
                      
                      return (
                        <tr className="bg-slate-50 border-t border-b-2 border-zinc-300">
                          <td className={`${branchTotalTdClass} text-left uppercase tracking-wider text-slate-800`}>
                            {branch} Total
                          </td>
                          
                          {isLeadSourceExpanded && (
                            <>
                              <td className={`${branchTotalTdClass} border-l-2 border-l-zinc-300`}>{branchTotal.sourceFacebook}</td>
                              <td className={branchTotalTdClass}>{branchTotal.sourceReferrals}</td>
                              <td className={branchTotalTdClass}>{branchTotal.sourceWebsite}</td>
                              <td className={branchTotalTdClass}>{branchTotal.sourceWalkIn}</td>
                            </>
                          )}
                          
                          <td className={`${branchTotalTdClass} ${!isLeadSourceExpanded ? 'border-l-2 border-l-zinc-300' : ''}`}>
                            {branchTotal.totalLeads}
                          </td>

                          <td className={`${branchTotalTdClass} border-l-2 border-l-zinc-300`}>{branchTotal.convYes}</td>
                          <td className={branchTotalTdClass}>{branchTotal.convNo}</td>
                          <td className={branchTotalTdClass}>{branchTotal.convDNA}</td>

                          <td className={branchTotalTdClass}>{branchTotal.appApplied}</td>
                          <td className={`${branchTotalTdClass} ${branchAppRate >= 50 ? 'text-emerald-600' : branchAppRate > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{branchAppRate > 0 ? `${branchAppRate}%` : '-'}</td>
                          <td className={branchTotalTdClass}>{branchTotal.appWaitingPayment}</td>
                          <td className={branchTotalTdClass}>{branchTotal.appDroppedOut}</td>

                          <td className={branchTotalTdClass}>{branchTotal.visaLodging}</td>
                          <td className={branchTotalTdClass}>{branchTotal.visaInProgress}</td>
                          <td className={branchTotalTdClass}>{branchTotal.visaGranted}</td>
                          <td className={branchTotalTdClass}>{branchTotal.visaRefusal}</td>
                          <td className={`${branchTotalTdClass} ${branchVisaRate >= 70 ? 'text-emerald-600' : branchVisaRate > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{branchVisaRate > 0 ? `${branchVisaRate}%` : '-'}</td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                );
              })
            )}
            
            {/* Grand Totals Footer */}
            {counselorData.length > 0 && filterBranch === 'All' && (
              <tr>
                <td className={`${footerTdClass} text-left uppercase tracking-wider !border-r-zinc-300`}>
                  Grand Total
                </td>
                
                {isLeadSourceExpanded && (
                  <>
                    <td className={`${footerTdClass} border-l-2 border-l-zinc-300`}>{grandTotals.sourceFacebook}</td>
                    <td className={footerTdClass}>{grandTotals.sourceReferrals}</td>
                    <td className={footerTdClass}>{grandTotals.sourceWebsite}</td>
                    <td className={footerTdClass}>{grandTotals.sourceWalkIn}</td>
                  </>
                )}
                
                <td className={`${footerTdClass} ${!isLeadSourceExpanded ? 'border-l-2 border-l-zinc-300' : ''}`}>
                  {grandTotals.totalLeads}
                </td>

                <td className={`${footerTdClass} border-l-2 border-l-zinc-300`}>{grandTotals.convYes}</td>
                <td className={footerTdClass}>{grandTotals.convNo}</td>
                <td className={`${footerTdClass} !border-r-zinc-300`}>{grandTotals.convDNA}</td>

                <td className={footerTdClass}>{grandTotals.appApplied}</td>
                <td className={`${footerTdClass} text-zinc-400`}>{grandTotals.totalLeads > 0 ? Math.round((grandTotals.appApplied / grandTotals.totalLeads) * 100) + '%' : '-'}</td>
                <td className={footerTdClass}>{grandTotals.appWaitingPayment}</td>
                <td className={`${footerTdClass} !border-r-zinc-300`}>{grandTotals.appDroppedOut}</td>

                <td className={footerTdClass}>{grandTotals.visaLodging}</td>
                <td className={footerTdClass}>{grandTotals.visaInProgress}</td>
                <td className={footerTdClass}>{grandTotals.visaGranted}</td>
                <td className={footerTdClass}>{grandTotals.visaRefusal}</td>
                <td className={`${footerTdClass} text-zinc-400`}>{grandTotals.visaLodging > 0 ? Math.round((grandTotals.visaGranted / grandTotals.visaLodging) * 100) + '%' : '-'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadCumulativeData;
