import React, { useState, useMemo } from 'react';

const LeadMonthlyReport = ({ counselors, existingReports }) => {
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [isLeadSourceExpanded, setIsLeadSourceExpanded] = useState(false);
  const [filterBranch, setFilterBranch] = useState('All');

  // Compute grand totals for the footer row
  const totals = useMemo(() => {
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
      paymentDone: 0,
      visaGranted: 0
    };

    counselors.forEach(c => {
      const report = existingReports.find(r => r.month === selectedMonth && r.counselorId === c.id);
      if (report) {
        t.sourceFacebook += parseInt(report.sourceFacebook) || 0;
        t.sourceReferrals += parseInt(report.sourceReferrals) || 0;
        t.sourceWebsite += parseInt(report.sourceWebsite) || 0;
        t.sourceWalkIn += parseInt(report.sourceWalkIn) || 0;
        t.totalLeads += parseInt(report.totalLeads) || 0;
        t.convYes += parseInt(report.convYes) || 0;
        t.convNo += parseInt(report.convNo) || 0;
        t.convDNA += parseInt(report.convDNA) || 0;
        t.appApplied += parseInt(report.appApplied) || 0;
        t.paymentDone += parseInt(report.paymentDone) || 0;
        t.visaGranted += parseInt(report.visaGranted) || 0;
      }
    });

    return t;
  }, [counselors, existingReports, selectedMonth]);

  const thClass = "px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-r border-zinc-200 bg-zinc-50/50";
  const tdClass = "px-4 py-3 text-sm font-semibold text-center text-notion-black border-b border-r border-zinc-100";
  const footerTdClass = "px-4 py-3 text-sm font-extrabold text-center text-notion-blue border-b border-r border-zinc-200 bg-notion-blue/5";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-notion-black mb-1">Monthly Reports</h3>
          <p className="text-sm text-zinc-500">View detailed performance tables per month.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-zinc-500">Branch:</label>
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

          <label className="text-sm font-bold text-zinc-500 ml-4">Select Month:</label>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-bold text-notion-black focus:ring-2 focus:ring-notion-blue/20 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th rowSpan={2} className={`${thClass} min-w-[150px] align-bottom !bg-blue-50 !text-blue-700`}>
                Counselor
              </th>
              <th 
                colSpan={isLeadSourceExpanded ? 5 : 1} 
                className={`${thClass} text-center border-l-2 border-l-zinc-300 relative group cursor-pointer hover:bg-orange-100 transition-colors !bg-orange-50 !text-orange-700`}
                onClick={() => setIsLeadSourceExpanded(!isLeadSourceExpanded)}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Lead Source</span>
                  <div className={`p-1 rounded-md bg-orange-100 border border-orange-200 shadow-sm transition-transform ${isLeadSourceExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-3 h-3 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </th>
              <th colSpan={3} className={`${thClass} text-center border-l-2 border-l-zinc-300 !bg-emerald-50 !text-emerald-700`}>
                Conversions
              </th>
              <th rowSpan={2} className={`${thClass} border-l-2 border-l-zinc-300 align-bottom`}>
                Application
              </th>
              <th rowSpan={2} className={`${thClass} align-bottom`}>
                Payment
              </th>
              <th rowSpan={2} className={`${thClass} align-bottom`}>
                Visa
              </th>
            </tr>
            <tr>
              {isLeadSourceExpanded && (
                <>
                  <th className={`${thClass} border-l-2 border-l-zinc-300 !bg-orange-50 !text-orange-700`}>Facebook</th>
                  <th className={`${thClass} !bg-orange-50 !text-orange-700`}>Referral</th>
                  <th className={`${thClass} !bg-orange-50 !text-orange-700`}>Website</th>
                  <th className={`${thClass} !bg-orange-50 !text-orange-700`}>Walk-in</th>
                </>
              )}
              <th className={`${thClass} ${!isLeadSourceExpanded ? 'border-l-2 border-l-zinc-300' : ''} !bg-orange-50 !text-orange-700`}>Total</th>
              
              <th className={`${thClass} border-l-2 border-l-zinc-300 !bg-emerald-50 !text-emerald-700`}>Yes</th>
              <th className={`${thClass} !bg-emerald-50 !text-emerald-700`}>No</th>
              <th className={`${thClass} !bg-emerald-50 !text-emerald-700`}>DNA</th>
            </tr>
          </thead>
          <tbody>
            {counselors.length === 0 ? (
              <tr>
                <td colSpan={isLeadSourceExpanded ? 19 : 15} className="px-4 py-8 text-center text-sm font-semibold text-zinc-400 border-b border-zinc-100">
                  No counselors available. Please add them in Settings.
                </td>
              </tr>
            ) : (
              ['Search Australia', 'Search Chili', 'Search Nepal']
                .filter(b => filterBranch === 'All' || b === filterBranch)
                .map(branch => {
                const branchCounselors = counselors.filter(c => (c.branch || 'Search Nepal') === branch);
                if (branchCounselors.length === 0) return null;

                return (
                  <React.Fragment key={branch}>
                    <tr>
                      <td colSpan={isLeadSourceExpanded ? 12 : 8} className="px-4 py-2 bg-zinc-100 text-xs font-extrabold text-zinc-600 uppercase tracking-wider text-left border-b border-zinc-200">
                        {branch}
                      </td>
                    </tr>
                    {branchCounselors.map(c => {
                      const report = existingReports.find(r => r.month === selectedMonth && r.counselorId === c.id) || {};
                      
                      return (
                        <tr key={c.id} className="hover:bg-notion-blue/5 transition-colors group">
                          <td className={`${tdClass} text-left font-bold text-notion-blue`}>
                            {c.name}
                          </td>
                          
                          {isLeadSourceExpanded && (
                            <>
                              <td className={`${tdClass} border-l-2 border-l-zinc-200 text-zinc-600`}>{report.sourceFacebook || ''}</td>
                              <td className={`${tdClass} text-zinc-600`}>{report.sourceReferrals || ''}</td>
                              <td className={`${tdClass} text-zinc-600`}>{report.sourceWebsite || ''}</td>
                              <td className={`${tdClass} text-zinc-600`}>{report.sourceWalkIn || ''}</td>
                            </>
                          )}
                          
                          <td className={`${tdClass} font-extrabold ${!isLeadSourceExpanded ? 'border-l-2 border-l-zinc-200' : ''} bg-zinc-50/50 group-hover:bg-transparent`}>
                            {report.totalLeads || ''}
                          </td>
                          
                          <td className={`${tdClass} border-l-2 border-l-zinc-200 text-emerald-600`}>{report.convYes || ''}</td>
                          <td className={`${tdClass} text-rose-600`}>{report.convNo || ''}</td>
                          <td className={`${tdClass} text-zinc-400`}>{report.convDNA || ''}</td>
                          
                          <td className={`${tdClass} border-l-2 border-l-zinc-200`}>{report.appApplied || ''}</td>
                          <td className={`${tdClass} text-emerald-600`}>{report.paymentDone || ''}</td>
                          <td className={`${tdClass} text-notion-blue`}>{report.visaGranted || ''}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
            
            {/* Grand Totals Footer */}
            {counselors.length > 0 && filterBranch === 'All' && (
              <tr>
                <td className={`${footerTdClass} text-left uppercase tracking-wider`}>
                  Grand Total
                </td>
                
                {isLeadSourceExpanded && (
                  <>
                    <td className={`${footerTdClass} border-l-2 border-l-zinc-300`}>{totals.sourceFacebook}</td>
                    <td className={footerTdClass}>{totals.sourceReferrals}</td>
                    <td className={footerTdClass}>{totals.sourceWebsite}</td>
                    <td className={footerTdClass}>{totals.sourceWalkIn}</td>
                  </>
                )}
                
                <td className={`${footerTdClass} ${!isLeadSourceExpanded ? 'border-l-2 border-l-zinc-300' : ''}`}>
                  {totals.totalLeads}
                </td>

                <td className={`${footerTdClass} border-l-2 border-l-zinc-300`}>{totals.convYes}</td>
                <td className={footerTdClass}>{totals.convNo}</td>
                <td className={footerTdClass}>{totals.convDNA}</td>

                <td className={`${footerTdClass} border-l-2 border-l-zinc-300`}>{totals.appApplied}</td>
                <td className={footerTdClass}>{totals.paymentDone}</td>
                <td className={footerTdClass}>{totals.visaGranted}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadMonthlyReport;
