import React, { useState, useMemo } from 'react';
import Dropdown from './Dropdown';

const TaskBudgetMatrix = ({ sites, periodicalTasks }) => {
  const [filterFreq, setFilterFreq] = useState('Quarterly');

  const filteredTasks = useMemo(() => {
    return periodicalTasks
      .filter(t => t.frequency === filterFreq)
      .sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
  }, [periodicalTasks, filterFreq]);

  // Determine period names based on selected frequency
  const periodNames = useMemo(() => {
    if (filterFreq === 'Quarterly') return ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
    if (filterFreq === 'Monthly') return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (filterFreq === '6 Monthly') return ['1st Half', '2nd Half'];
    if (filterFreq === 'Yearly') return ['Annual'];
    if (filterFreq === 'Weekly') return ['Weekly Average'];
    if (filterFreq === 'Custom Date') return ['Custom Schedule'];
    return [];
  }, [filterFreq]);

  const totals = useMemo(() => {
    let totalHrsAnnum = 0;
    let totalPriceAnnum = 0;
    const periodTotals = periodNames.map(() => ({ hours: 0, pricing: 0 }));

    filteredTasks.forEach(task => {
      const periods = task.periodBudgets || [];
      periodNames.forEach((name, idx) => {
        const p = periods.find(period => period.name === name);
        if (p && !p.isDisabled) {
          const hrs = p.hours || 0;
          const prc = p.pricing || 0;
          periodTotals[idx].hours += hrs;
          periodTotals[idx].pricing += prc;
          totalHrsAnnum += hrs;
          totalPriceAnnum += prc;
        }
      });
    });

    return { totalHrsAnnum, totalPriceAnnum, periodTotals };
  }, [filteredTasks, periodNames]);

  return (
    <div className="bg-white rounded-xl shadow-notion-card border border-notion-warm-gray-200 mt-8">
      {/* Header Controls */}
      <div className="p-4 border-b border-notion-warm-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#a8d08d] rounded-t-xl">
        <h3 className="font-bold text-notion-black text-base md:text-lg">Task Budget Matrix</h3>
        <div className="w-full sm:w-64">
          <Dropdown
            value={filterFreq}
            onChange={(val) => setFilterFreq(val)}
            options={[
              { value: 'Weekly', label: 'Weekly Breakdown' },
              { value: 'Monthly', label: 'Monthly Breakdown' },
              { value: 'Quarterly', label: 'Quarterly Breakdown' },
              { value: '6 Monthly', label: '6 Monthly Breakdown' },
              { value: 'Yearly', label: 'Yearly Breakdown' },
              { value: 'Custom Date', label: 'Custom Date Breakdown' }
            ]}
          />
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-xs md:text-sm text-left whitespace-nowrap min-w-max border-collapse">
          <thead>
            <tr className="bg-[#9bc2e6] border-b border-notion-warm-gray-300 text-notion-black font-bold text-center">
              <th rowSpan={2} className="px-3 py-2 border-r border-notion-warm-gray-300 text-left w-48 bg-[#a8d08d]">Location</th>
              <th rowSpan={2} className="px-3 py-2 border-r border-notion-warm-gray-300 text-left w-48 bg-[#a8d08d]">Task</th>
              {periodNames.map(name => (
                <th key={name} colSpan={2} className="px-3 py-2 border-r border-notion-warm-gray-300 bg-[#a8d08d]">
                  {name}
                </th>
              ))}
              <th rowSpan={2} className="px-3 py-2 border-r border-notion-warm-gray-300 w-24">Total Hours Per Annum</th>
              <th rowSpan={2} className="px-3 py-2 border-r border-notion-warm-gray-300 w-32">Total Price Per Annum</th>
            </tr>
            <tr className="bg-[#a8d08d] border-b border-notion-warm-gray-300 text-notion-black font-bold text-center text-[10px] md:text-xs">
              {periodNames.map(name => (
                <React.Fragment key={`${name}-sub`}>
                  <th className="px-3 py-1.5 border-r border-notion-warm-gray-300 w-20">Hours</th>
                  <th className="px-3 py-1.5 border-r border-notion-warm-gray-300 w-24">Pricing</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={4 + periodNames.length * 2} className="px-6 py-8 text-center text-notion-warm-gray-500 bg-white">
                  No tasks found with a {filterFreq} budget breakdown.
                </td>
              </tr>
            )}
            
            {filteredTasks.map((task, idx) => {
              const site = sites.find(s => s.id === task.siteId);
              const periods = task.periodBudgets || [];
              
              // Only sum active periods for task totals
              const activePeriods = periods.filter(p => !p.isDisabled);
              const taskTotalHrs = activePeriods.reduce((sum, p) => sum + (p.hours || 0), 0);
              const taskTotalPrice = activePeriods.reduce((sum, p) => sum + (p.pricing || 0), 0);

              return (
                <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-notion-warm-white'} border-b border-notion-warm-gray-200 hover:bg-yellow-50 transition-colors`}>
                  <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 font-semibold truncate max-w-[200px]" title={site?.siteName}>
                    {site?.siteName || 'Unknown'}
                  </td>
                  <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 truncate max-w-[200px]" title={task.taskName}>
                    <span className="text-[10px] md:text-xs text-notion-warm-gray-500 mr-2">{task.taskCode}</span>
                    {task.taskName}
                  </td>
                  
                  {periodNames.map((name, i) => {
                    const p = periods.find(period => period.name === name);
                    const isActive = p && !p.isDisabled;
                    const hours = isActive ? (p.hours || 0) : 0;
                    const pricing = isActive ? (p.pricing || 0) : 0;
                    
                    return (
                      <React.Fragment key={i}>
                        <td className={`px-3 py-1.5 border-r border-notion-warm-gray-200 text-center tabular-nums ${!isActive ? 'text-notion-warm-gray-300 bg-notion-warm-white/50' : 'text-notion-warm-gray-500'}`}>
                          {hours ? hours.toFixed(2) : '-'}
                        </td>
                        <td className={`px-3 py-1.5 border-r border-notion-warm-gray-200 text-right tabular-nums ${!isActive ? 'text-notion-warm-gray-300 bg-notion-warm-white/50' : ''}`}>
                          {pricing ? `$ ${pricing.toFixed(2)}` : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Totals at the end as requested */}
                  <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 text-center tabular-nums font-bold bg-[#9bc2e6]">
                    {taskTotalHrs.toFixed(2)}
                  </td>
                  <td className="px-3 py-1.5 border-r border-notion-warm-gray-200 text-right tabular-nums font-bold bg-[#9bc2e6]">
                    $ {taskTotalPrice.toFixed(2)}
                  </td>
                </tr>
              );
            })}

            {/* Totals Row */}
            {filteredTasks.length > 0 && (
              <tr className="bg-[#0070c0] text-white font-bold text-xs md:text-sm">
                <td colSpan={2} className="px-3 py-2 border-r border-blue-400 text-right uppercase tracking-widest">
                  TOTAL:
                </td>
                {totals.periodTotals.map((pt, i) => (
                  <React.Fragment key={`total-${i}`}>
                    <td className="px-3 py-2 border-r border-blue-400 text-center tabular-nums">
                      {pt.hours.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 border-r border-blue-400 text-right tabular-nums">
                      $ {pt.pricing.toFixed(2)}
                    </td>
                  </React.Fragment>
                ))}
                <td className="px-3 py-2 border-r border-blue-400 text-center tabular-nums">
                  {totals.totalHrsAnnum.toFixed(2)}
                </td>
                <td className="px-3 py-2 border-r border-blue-400 text-right tabular-nums">
                  $ {totals.totalPriceAnnum.toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskBudgetMatrix;
