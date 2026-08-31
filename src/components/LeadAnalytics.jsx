import React, { useMemo, useState } from 'react';
import { 
  FunnelChart, Funnel, LabelList, Tooltip, 
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#0075de', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const LeadAnalytics = ({ counselors, existingReports }) => {
  const [filterYear, setFilterYear] = useState('All');
  const currentYear = new Date().getFullYear().toString();

  const filteredReports = useMemo(() => {
    if (filterYear === 'All') return existingReports;
    return existingReports.filter(r => r.month && r.month.startsWith(filterYear));
  }, [existingReports, filterYear]);

  const aggregateData = useMemo(() => {
    const agg = {
      totalLeads: 0,
      sourceFacebook: 0,
      sourceReferrals: 0,
      sourceWebsite: 0,
      sourceWalkIn: 0,
      appApplied: 0,
      paymentDone: 0,
      visaLodging: 0,
      visaGranted: 0
    };

    filteredReports.forEach(r => {
      agg.totalLeads += parseInt(r.totalLeads) || 0;
      agg.sourceFacebook += parseInt(r.sourceFacebook) || 0;
      agg.sourceReferrals += parseInt(r.sourceReferrals) || 0;
      agg.sourceWebsite += parseInt(r.sourceWebsite) || 0;
      agg.sourceWalkIn += parseInt(r.sourceWalkIn) || 0;
      agg.appApplied += parseInt(r.appApplied) || 0;
      agg.paymentDone += parseInt(r.paymentDone) || 0;
      agg.visaLodging += parseInt(r.visaLodging) || 0;
      agg.visaGranted += parseInt(r.visaGranted) || 0;
    });

    return agg;
  }, [filteredReports]);

  // 1. Funnel Data
  const funnelData = [
    { name: 'Total Leads', value: aggregateData.totalLeads, fill: '#6366f1' },
    { name: 'Applications', value: aggregateData.appApplied, fill: '#3b82f6' },
    { name: 'Payment Done', value: aggregateData.paymentDone, fill: '#06b6d4' },
    { name: 'Visas Lodged', value: aggregateData.visaLodging, fill: '#10b981' },
    { name: 'Visas Granted', value: aggregateData.visaGranted, fill: '#22c55e' }
  ];

  // 2. Source Data
  const sourceData = [
    { name: 'Facebook', value: aggregateData.sourceFacebook },
    { name: 'Referrals', value: aggregateData.sourceReferrals },
    { name: 'Website', value: aggregateData.sourceWebsite },
    { name: 'Walk-in', value: aggregateData.sourceWalkIn }
  ].filter(d => d.value > 0);

  // 3. Counselor Data
  const counselorPerformance = useMemo(() => {
    return counselors.map(c => {
      let leads = 0;
      let visas = 0;
      filteredReports.filter(r => r.counselorId === c.id).forEach(r => {
        leads += parseInt(r.totalLeads) || 0;
        visas += parseInt(r.visaGranted) || 0;
      });
      return {
        name: c.name,
        Leads: leads,
        Visas: visas
      };
    }).sort((a, b) => b.Visas - a.Visas).slice(0, 5); // Top 5
  }, [counselors, filteredReports]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-notion-black mb-1">Visual Analytics</h3>
          <p className="text-sm text-zinc-500">Discover insights and performance trends.</p>
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* FUNNEL CHART */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h4 className="text-lg font-bold text-notion-black mb-6">Conversion Funnel</h4>
          <div className="h-80 w-full">
            {aggregateData.totalLeads > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 font-semibold">No data available</div>
            )}
          </div>
        </div>

        {/* SOURCE DISTRIBUTION */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h4 className="text-lg font-bold text-notion-black mb-6">Lead Sources</h4>
          <div className="h-80 w-full">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Leads']} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 font-semibold">No data available</div>
            )}
          </div>
        </div>

        {/* COUNSELOR PERFORMANCE */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm lg:col-span-2">
          <h4 className="text-lg font-bold text-notion-black mb-6">Top Counselors (Visas Granted)</h4>
          <div className="h-80 w-full">
            {counselorPerformance.some(c => c.Leads > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={counselorPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f4f4f5'}} />
                  <Legend />
                  <Bar dataKey="Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Visas" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 font-semibold">No data available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeadAnalytics;
