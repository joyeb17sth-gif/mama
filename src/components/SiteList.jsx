import React from 'react';
import { getContractors } from '../utils/storage';

const SiteList = ({ sites, onEdit, onAddSubSite, onDelete }) => {
  const contractors = getContractors();

  if (sites.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-zinc-100">
        <div className="text-4xl mb-4 opacity-20">🏢</div>
        <h3 className="text-p1 font-bold text-zinc-900 mb-2">No sites found</h3>
        <p className="text-zinc-500 max-w-xs mx-auto">Create your first site to start tracking budgets and managing contractor timesheets.</p>
      </div>
    );
  }

  const mainSites = sites.filter(s => !s.isSubSite);

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100">
          <thead>
            <tr className="bg-zinc-50/50">
              <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Site Organization
              </th>
              <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Client / Details
              </th>
              <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Budget (Limit)
              </th>
              <th className="px-6 py-4 text-center text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Training
              </th>
              <th className="px-6 py-4 text-right text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {mainSites.map((mainSite) => {
              const subSites = sites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id);

              return (
                <React.Fragment key={mainSite.id}>
                  {/* Main Site Row */}
                  <tr className="bg-white group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-primary-600 uppercase tracking-widest mb-0.5">Primary Site</div>
                          <div className="text-p3 font-bold text-zinc-900">{mainSite.siteName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-p3 font-bold text-zinc-700">{mainSite.clientName || 'Direct Client'}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[9px] font-bold uppercase tracking-tighter">{mainSite.payrollCycle}</span>
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[9px] font-bold uppercase tracking-tighter">{mainSite.cleaningType || 'housekeeping'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <div className="text-p3 font-bold text-zinc-900">{mainSite.budgetedHours || 0} hrs</div>
                        <div className="text-[10px] text-zinc-400 font-bold tracking-tighter uppercase whitespace-nowrap">
                          Limit: <span className="text-zinc-600">${mainSite.budgetedAmount || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {mainSite.isTrainingSite ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Training Site
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Standard</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-4">
                        <button onClick={() => onAddSubSite(mainSite)} className="p-2 text-zinc-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all" title="Add Sub-site">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </button>
                        <button onClick={() => onEdit(mainSite)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all" title="Edit Site">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => onDelete(mainSite.id)} className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete Site">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Sub-Site Rows */}
                  {subSites.map((subSite, index) => (
                    <tr key={subSite.id} className="bg-zinc-50/30 group hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 pl-16 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                          </div>
                          <div>
                            <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Sub-site {index + 1}</div>
                            <div className="text-p3 font-bold text-zinc-700">{subSite.siteName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-zinc-400 italic">Inherited Client</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-zinc-600">{subSite.budgetedHours || 0}h</span>
                          <span className="text-[10px] text-zinc-300 font-bold">${subSite.budgetedAmount || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {subSite.isTrainingSite && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Training Site"></span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => onEdit(subSite)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg border border-transparent hover:border-zinc-200 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => onDelete(subSite.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-zinc-200 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SiteList;
