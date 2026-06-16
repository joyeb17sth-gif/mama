import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid, startOfMonth, subMonths, endOfMonth } from 'date-fns';

const LeadAnalytics = ({ leads, onLeadClick }) => {
  const [startMonth, setStartMonth] = useState('2026-01');
  const [endMonth, setEndMonth] = useState('2026-12');
  const [selectedCell, setSelectedCell] = useState(null);

  const filteredLeads = useMemo(() => {
    // Parse the YYYY-MM into a local Date at the start of that month
    let start = new Date(`${startMonth}-01T00:00:00`);
    if (!isValid(start)) start = new Date('2000-01-01'); // fallback

    // Parse the end month, and shift it to the very end of that month
    let end = new Date(`${endMonth}-01T00:00:00`);
    if (!isValid(end)) {
      end = new Date('2100-01-01');
    } else {
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // 0th day of next month = last day of current month
      end.setHours(23, 59, 59, 999);
    }

    return leads.filter(lead => {
      let createdDate = new Date();
      if (lead.createdAt) {
        createdDate = new Date(lead.createdAt);
      } else if (lead.id && !isNaN(parseInt(lead.id))) {
        createdDate = new Date(parseInt(lead.id)); 
      } else if (lead.updatedAt) {
        createdDate = new Date(lead.updatedAt);
      }
      if (!isValid(createdDate)) createdDate = new Date();
      return createdDate >= start && createdDate <= end;
    });
  }, [leads, startMonth, endMonth]);

  const analyticsData = useMemo(() => {
    let totalLeads = 0;
    let totalConverted = 0;
    
    const cohorts = {};
    const allConversionMonthsSet = new Set();
    const sourceStats = {};

    filteredLeads.forEach(lead => {
      totalLeads++;
      
      // 1. Determine Created Date
      let createdDate = new Date();
      if (lead.createdAt) {
        createdDate = new Date(lead.createdAt);
      } else if (lead.id && !isNaN(parseInt(lead.id))) {
        createdDate = new Date(parseInt(lead.id)); // fallback since id is Date.now()
      } else if (lead.updatedAt) {
        createdDate = new Date(lead.updatedAt);
      }
      
      if (!isValid(createdDate)) createdDate = new Date();
      const createdMonth = format(createdDate, 'yyyy-MM');

      // 2. Initialize Cohort
      if (!cohorts[createdMonth]) {
        cohorts[createdMonth] = { 
          displayMonth: format(createdDate, 'MMMM yyyy'),
          sortKey: createdMonth,
          total: 0, 
          converted: 0, 
          conversionsByMonth: {} 
        };
      }
      cohorts[createdMonth].total++;

      // 3. Source Stats
      const source = lead.source || 'Unknown';
      if (!sourceStats[source]) sourceStats[source] = { total: 0, converted: 0 };
      sourceStats[source].total++;

      // 4. Handle Conversions
      if (lead.conversion === 'yes') {
        totalConverted++;
        cohorts[createdMonth].converted++;
        sourceStats[source].converted++;

        let convertedDate = new Date();
        if (lead.convertedAt) {
          convertedDate = new Date(lead.convertedAt);
        } else if (lead.updatedAt) {
          convertedDate = new Date(lead.updatedAt);
        }
        if (!isValid(convertedDate)) convertedDate = new Date();
        
        const convertedMonth = format(convertedDate, 'yyyy-MM');
        const convertedDisplay = format(convertedDate, 'MMM yyyy');
        
        allConversionMonthsSet.add(convertedMonth);

        if (!cohorts[createdMonth].conversionsByMonth[convertedMonth]) {
          cohorts[createdMonth].conversionsByMonth[convertedMonth] = { 
            count: 0, 
            display: convertedDisplay,
            leadsList: []
          };
        }
        cohorts[createdMonth].conversionsByMonth[convertedMonth].count++;
        cohorts[createdMonth].conversionsByMonth[convertedMonth].leadsList.push(lead);
      }
    });

    const conversionMonthsList = Array.from(allConversionMonthsSet).sort(); // chronological
    const cohortList = Object.values(cohorts).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    
    // Sort sources by total leads descending
    const sourceList = Object.entries(sourceStats)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        converted: stats.converted,
        rate: stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalLeads,
      totalConverted,
      conversionRate: totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0,
      cohortList,
      conversionMonthsList,
      sourceList
    };
  }, [filteredLeads]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Date Range Picker Area */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-zinc-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-notion-black">Analytics Date Range</h3>
          <p className="text-sm text-notion-warm-gray-500 mt-1">Filter your cohorts and metrics by the date the lead was acquired.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex flex-col flex-1 sm:flex-none">
            <label className="text-[10px] font-bold text-notion-warm-gray-500 uppercase tracking-wider mb-1 ml-1">From Month</label>
            <input 
              type="month" 
              value={startMonth} 
              onChange={(e) => setStartMonth(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-notion-blue/20 focus:border-notion-blue outline-none transition-all w-full sm:w-48"
            />
          </div>
          <div className="flex flex-col flex-1 sm:flex-none">
            <label className="text-[10px] font-bold text-notion-warm-gray-500 uppercase tracking-wider mb-1 ml-1">To Month</label>
            <input 
              type="month" 
              value={endMonth} 
              onChange={(e) => setEndMonth(e.target.value)}
              className="px-4 py-2 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-notion-blue/20 focus:border-notion-blue outline-none transition-all w-full sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-zinc-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-notion-warm-gray-500 uppercase tracking-wider">Total Leads</p>
            <p className="text-3xl font-extrabold text-notion-black">{analyticsData.totalLeads}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-zinc-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-notion-warm-gray-500 uppercase tracking-wider">Total Converted</p>
            <p className="text-3xl font-extrabold text-notion-black">{analyticsData.totalConverted}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-zinc-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-notion-warm-gray-500 uppercase tracking-wider">Overall Win Rate</p>
            <p className="text-3xl font-extrabold text-notion-black">{analyticsData.conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Cohort Analysis Table */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/30">
          <h3 className="text-xl font-extrabold text-notion-black">Lead Cohort Analysis</h3>
          <p className="text-sm text-notion-warm-gray-500 mt-1">See exactly when your leads convert over time.</p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            {analyticsData.cohortList.length === 0 ? (
              <div className="text-center py-10 text-zinc-400 font-medium">No lead data available for analysis.</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b-2 border-zinc-100">
                  <th className="pb-3 px-4 font-bold text-notion-warm-gray-500 uppercase tracking-wider text-[11px] text-left w-[130px] min-w-[130px] max-w-[130px] sticky left-0 z-20 bg-white">Acquired Month</th>
                  <th className="pb-3 px-4 font-bold text-notion-warm-gray-500 uppercase tracking-wider text-[11px] text-left w-[100px] min-w-[100px] max-w-[100px] sticky left-[130px] z-20 bg-white">Total Leads</th>
                  <th className="pb-3 pl-4 pr-6 font-bold text-emerald-600 uppercase tracking-wider text-[11px] text-left border-r border-zinc-100 w-[150px] min-w-[150px] max-w-[150px] sticky left-[230px] z-20 bg-white shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] clip-path-right-shadow">Total Converted</th>
                  {analyticsData.conversionMonthsList.map(month => (
                    <th key={month} className="pb-3 px-4 font-bold text-notion-blue uppercase tracking-wider text-[11px] text-center min-w-[110px]">
                      Converted in<br/>{format(parseISO(`${month}-01`), 'MMM yyyy')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {analyticsData.cohortList.map((cohort) => (
                  <tr key={cohort.sortKey} className="hover:bg-zinc-50/80 transition-colors group">
                    <td className="py-2.5 px-4 font-bold text-notion-black whitespace-nowrap w-[130px] min-w-[130px] max-w-[130px] sticky left-0 z-10 bg-white group-hover:bg-zinc-50/80 transition-colors">{cohort.displayMonth}</td>
                    <td className="py-2.5 px-4 text-left font-semibold text-zinc-600 w-[100px] min-w-[100px] max-w-[100px] sticky left-[130px] z-10 bg-white group-hover:bg-zinc-50/80 transition-colors">{cohort.total}</td>
                    <td className="py-2.5 pl-4 pr-6 text-left font-bold text-emerald-600 border-r border-zinc-100 w-[150px] min-w-[150px] max-w-[150px] sticky left-[230px] z-10 bg-white group-hover:bg-zinc-50/80 transition-colors shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] clip-path-right-shadow">
                      {cohort.converted} <span className="text-xs text-emerald-400 font-normal ml-1">({cohort.total > 0 ? Math.round((cohort.converted/cohort.total)*100) : 0}%)</span>
                    </td>
                    {analyticsData.conversionMonthsList.map(month => {
                      const cellData = cohort.conversionsByMonth[month];
                      const count = cellData?.count || 0;
                      return (
                        <td key={month} className="py-2.5 px-4 text-center">
                          {count > 0 ? (
                            <button 
                              onClick={() => setSelectedCell({ month: cellData.display, leads: cellData.leadsList })}
                              className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg bg-notion-blue/10 text-notion-blue font-bold cursor-pointer transition-colors hover:bg-notion-blue/20"
                            >
                              {count}
                            </button>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      </div>

      {/* Source Performance */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/30">
          <h3 className="text-xl font-extrabold text-notion-black">Source Performance</h3>
          <p className="text-sm text-notion-warm-gray-500 mt-1">Which marketing channels bring the highest quality leads?</p>
        </div>
        <div className="p-6">
          <div className="space-y-6 max-w-3xl">
            {analyticsData.sourceList.map(source => (
              <div key={source.name} className="flex items-center gap-6">
                <div className="w-1/4 font-bold text-notion-black truncate" title={source.name}>{source.name}</div>
                <div className="flex-1">
                  <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${source.rate}%` }}
                      title="Converted"
                    ></div>
                    <div 
                      className="h-full bg-notion-blue/20 transition-all duration-1000" 
                      style={{ width: `${100 - source.rate}%` }}
                      title="Not Converted Yet"
                    ></div>
                  </div>
                </div>
                <div className="w-1/4 flex items-center justify-between text-sm">
                  <span className="font-semibold text-emerald-600">{source.rate}% win rate</span>
                  <span className="text-zinc-500 text-xs">({source.converted}/{source.total})</span>
                </div>
              </div>
            ))}
            {analyticsData.sourceList.length === 0 && (
              <div className="text-center py-6 text-zinc-400 font-medium">No source data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Converted Leads Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="font-bold text-notion-black text-lg">Converted in {selectedCell.month}</h3>
              <button onClick={() => setSelectedCell(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {selectedCell.leads.map(lead => (
                <button 
                  key={lead.id}
                  onClick={() => {
                    setSelectedCell(null);
                    if (onLeadClick) onLeadClick(lead);
                  }}
                  className="w-full text-left px-4 py-3 rounded-2xl hover:bg-zinc-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                      {(lead.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-notion-black text-sm">{lead.name || 'Unnamed Lead'}</div>
                      <div className="text-xs text-notion-warm-gray-500 mt-0.5">{lead.source || 'Unknown Source'}</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-zinc-300 group-hover:text-notion-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeadAnalytics;
