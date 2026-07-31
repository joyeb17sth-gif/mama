import React, { useMemo, useState } from 'react';
import { format, isValid } from '../utils/dateUtils';

const YearlyAnalyticsChart = ({ leads }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const years = useMemo(() => {
    const yearSet = new Set();
    leads.forEach(lead => {
      let d = new Date(lead.createdAt || parseInt(lead.id) || Date.now());
      if (isValid(d)) {
        yearSet.add(d.getFullYear().toString());
      }
    });
    // Add current and previous year by default if they don't exist
    yearSet.add('2025');
    yearSet.add('2026');
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a)); // Descending
  }, [leads]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chartData = useMemo(() => {
    // Initialize data structure
    const data = monthNames.map(month => ({
      month,
      yes: 0,
      no: 0,
      dna: 0,
      visa: 0,
      application: 0,
      paid: 0,
      total: 0 // cumulative total for the month (Total Leads)
    }));

    leads.forEach(lead => {
      let d = new Date(lead.createdAt || parseInt(lead.id) || Date.now());
      if (!isValid(d)) d = new Date();
      
      if (d.getFullYear().toString() === selectedYear) {
        const monthIndex = d.getMonth();
        const row = data[monthIndex];
        
        row.total++;
        
        if (lead.conversion === 'yes') row.yes++;
        if (lead.conversion === 'no') row.no++;
        if (lead.conversion === 'DNA') row.dna++;
        
        if (lead.conversion === 'yes' && lead.status === 'application') {
          row.application++;
          if (lead.stage === 'visa') row.visa++;
          if (lead.stage === 'payment') row.paid++;
        }
      }
    });

    return data;
  }, [leads, selectedYear]);

  const totals = useMemo(() => {
    return chartData.reduce((acc, row) => {
      acc.yes += row.yes;
      acc.no += row.no;
      acc.dna += row.dna;
      acc.visa += row.visa;
      acc.application += row.application;
      acc.paid += row.paid;
      acc.total += row.total;
      return acc;
    }, { yes: 0, no: 0, dna: 0, visa: 0, application: 0, paid: 0, total: 0 });
  }, [chartData]);

  return (
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/30 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-extrabold text-notion-black">Comparison Matrix</h3>
          <p className="text-sm text-notion-warm-gray-500 mt-1">Monthly breakdown of leads and their statuses.</p>
        </div>
        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-zinc-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-notion-blue/20 focus:border-notion-blue outline-none bg-white text-notion-black"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="p-6">
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b-2 border-zinc-100">
                <th className="pb-3 px-4 font-bold text-notion-warm-gray-500 uppercase tracking-wider text-[11px] text-left">Month</th>
                <th className="pb-3 px-4 font-bold text-emerald-600 uppercase tracking-wider text-[11px] text-center">Yes</th>
                <th className="pb-3 px-4 font-bold text-rose-500 uppercase tracking-wider text-[11px] text-center">No</th>
                <th className="pb-3 px-4 font-bold text-amber-500 uppercase tracking-wider text-[11px] text-center">DNA</th>
                <th className="pb-3 px-4 font-bold text-notion-blue uppercase tracking-wider text-[11px] text-center">Application</th>
                <th className="pb-3 px-4 font-bold text-indigo-600 uppercase tracking-wider text-[11px] text-center">Paid</th>
                <th className="pb-3 px-4 font-bold text-purple-600 uppercase tracking-wider text-[11px] text-center">Visa</th>
                <th className="pb-3 pl-4 pr-6 font-bold text-notion-black uppercase tracking-wider text-[11px] text-right border-l border-zinc-100">Total Leads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {chartData.map((row) => (
                <tr key={row.month} className="hover:bg-zinc-50/80 transition-colors group">
                  <td className="py-3 px-4 font-bold text-notion-black w-[100px]">{row.month}</td>
                  <td className="py-3 px-4 text-center font-semibold text-zinc-700">{row.yes > 0 ? row.yes : <span className="text-zinc-300">-</span>}</td>
                  <td className="py-3 px-4 text-center font-semibold text-zinc-700">{row.no > 0 ? row.no : <span className="text-zinc-300">-</span>}</td>
                  <td className="py-3 px-4 text-center font-semibold text-zinc-700">{row.dna > 0 ? row.dna : <span className="text-zinc-300">-</span>}</td>
                  <td className="py-3 px-4 text-center font-semibold text-zinc-700">{row.application > 0 ? row.application : <span className="text-zinc-300">-</span>}</td>
                  <td className="py-3 px-4 text-center font-semibold text-zinc-700">{row.paid > 0 ? row.paid : <span className="text-zinc-300">-</span>}</td>
                  <td className="py-3 px-4 text-center font-semibold text-zinc-700">{row.visa > 0 ? row.visa : <span className="text-zinc-300">-</span>}</td>
                  <td className="py-3 pl-4 pr-6 text-right font-extrabold text-notion-black border-l border-zinc-100 bg-zinc-50/30">{row.total}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-200 bg-zinc-50">
                <td className="py-4 px-4 font-extrabold text-notion-black">TOTAL</td>
                <td className="py-4 px-4 text-center font-extrabold text-emerald-600">{totals.yes}</td>
                <td className="py-4 px-4 text-center font-extrabold text-rose-500">{totals.no}</td>
                <td className="py-4 px-4 text-center font-extrabold text-amber-500">{totals.dna}</td>
                <td className="py-4 px-4 text-center font-extrabold text-notion-blue">{totals.application}</td>
                <td className="py-4 px-4 text-center font-extrabold text-indigo-600">{totals.paid}</td>
                <td className="py-4 px-4 text-center font-extrabold text-purple-600">{totals.visa}</td>
                <td className="py-4 pl-4 pr-6 text-right font-extrabold text-notion-black border-l border-zinc-100">{totals.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default YearlyAnalyticsChart;
