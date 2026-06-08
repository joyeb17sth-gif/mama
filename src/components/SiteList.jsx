import React, { useState } from 'react';
import { getContractors } from '../utils/storage';

const SiteList = ({ sites, onEdit, onAddSubSite, onDelete, isAdmin = true }) => {
  const contractors = getContractors();
  const [collapsedClients, setCollapsedClients] = useState({});
  const [collapsedSites, setCollapsedSites] = useState({});

  const toggleClient = (clientName) => {
    setCollapsedClients(prev => ({ ...prev, [clientName]: !prev[clientName] }));
  };

  const toggleSite = (siteId) => {
    setCollapsedSites(prev => ({ ...prev, [siteId]: !prev[siteId] }));
  };

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

  // Group main sites by client name
  const groupedByClient = mainSites.reduce((acc, site) => {
    const client = site.clientName || 'Direct Client';
    if (!acc[client]) acc[client] = [];
    acc[client].push(site);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden animate-fade-in">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100">
          <thead>
            <tr className="bg-zinc-50/50">
              <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Site Organization
              </th>
              <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Site Details
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
            {Object.entries(groupedByClient).map(([clientName, clientSites]) => (
              <React.Fragment key={clientName}>
                {/* Client Layer Header Row */}
                <tr 
                  className="bg-slate-100 border-t-[6px] border-white border-b-2 border-b-slate-200 cursor-pointer hover:bg-slate-200/70 transition-colors"
                  onClick={() => toggleClient(clientName)}
                >
                  <td colSpan="5" className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-notion-blue text-white shadow-sm flex items-center justify-center transition-transform duration-200">
                        <svg className={`w-4 h-4 transform ${collapsedClients[clientName] ? '-rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Client</span>
                        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">{clientName}</span>
                      </div>
                    </div>
                  </td>
                </tr>

                {!collapsedClients[clientName] && clientSites.map((mainSite) => {
                  const subSites = sites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id);

                  return (
                    <React.Fragment key={mainSite.id}>
                      {/* Main Site Row */}
                      <tr className="bg-blue-50/40 group hover:bg-blue-50/70 transition-colors border-b border-blue-100/50">
                        <td className="py-5 pl-12 pr-6 whitespace-nowrap">
                            <div className="flex items-center gap-4">
                              {subSites.length > 0 ? (
                                <button 
                                  onClick={() => toggleSite(mainSite.id)}
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                >
                                  <svg className={`w-4 h-4 transform transition-transform duration-200 ${collapsedSites[mainSite.id] ? '-rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </button>
                              ) : (
                                <div className="w-6 h-6"></div>
                              )}
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Primary Site</div>
                              <div className="text-p3 font-bold text-zinc-900">{mainSite.siteName}</div>
                            </div>
                          </div>
                        </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[9px] font-bold uppercase tracking-tighter">{mainSite.payrollCycle}</span>
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[9px] font-bold uppercase tracking-tighter">{mainSite.cleaningType || 'housekeeping'}</span>
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
                        {isAdmin && (
                          <button onClick={() => onAddSubSite(mainSite)} className="p-2 text-zinc-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all" title="Add Sub-site">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </button>
                        )}
                        <button onClick={() => onEdit(mainSite)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all" title="Edit Site">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {isAdmin && (
                          <button onClick={() => onDelete(mainSite.id)} className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete Site">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Sub-Site Rows */}
                  {!collapsedSites[mainSite.id] && subSites.map((subSite, index) => (
                    <tr key={subSite.id} className="bg-zinc-50/30 group hover:bg-zinc-50 transition-colors">
                      <td className="py-4 pl-[88px] pr-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
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
                          {isAdmin && (
                            <button onClick={() => onDelete(subSite.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-zinc-200 transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card-Based View */}
      <div className="block md:hidden space-y-10 p-4 bg-zinc-50/50">
        {Object.entries(groupedByClient).map(([clientName, clientSites]) => (
          <div key={clientName} className="space-y-4">
            {/* Client Header */}
            <div 
              className="flex items-center gap-3 p-3 bg-slate-100 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-200/70 transition-colors"
              onClick={() => toggleClient(clientName)}
            >
              <div className="w-10 h-10 rounded-lg bg-notion-blue text-white shadow-sm flex items-center justify-center">
                <svg className={`w-5 h-5 transform ${collapsedClients[clientName] ? '-rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Client</span>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">{clientName}</h3>
              </div>
            </div>
            
            {!collapsedClients[clientName] && (
              <div className="space-y-6">
                {clientSites.map((mainSite) => {
          const subSites = sites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id);

          return (
            <div key={mainSite.id} className="bg-blue-50/30 rounded-xl border border-blue-100/50 p-4 shadow-sm space-y-4">
              {/* Site Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {subSites.length > 0 ? (
                    <button 
                      onClick={() => toggleSite(mainSite.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 flex-shrink-0 transition-colors"
                    >
                      <svg className={`w-5 h-5 transform transition-transform duration-200 ${collapsedSites[mainSite.id] ? '-rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  ) : (
                    <div className="w-8 h-8 flex-shrink-0"></div>
                  )}
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Primary Site</span>
                    <h4 className="text-p3 font-bold text-zinc-900">{mainSite.siteName}</h4>
                  </div>
                </div>

                {/* Training Badge */}
                <div>
                  {mainSite.isTrainingSite ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[9px] font-bold uppercase tracking-wider">
                      Training
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-wider">Standard</span>
                  )}
                </div>
              </div>

              {/* Details & Budget */}
              <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-zinc-100 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Cycle / Type</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[9px] font-bold uppercase tracking-tighter">{mainSite.payrollCycle}</span>
                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[9px] font-bold uppercase tracking-tighter">{mainSite.cleaningType || 'housekeeping'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Budget Allocation</span>
                  <div className="font-bold text-zinc-900 mt-0.5">{mainSite.budgetedHours || 0} hrs</div>
                  <div className="text-[10px] text-zinc-500 font-semibold mt-1">
                    Limit: <span className="text-zinc-700">${mainSite.budgetedAmount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Actions row for Main Site */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-zinc-400 font-semibold">Actions</span>
                <div className="flex gap-2">
                  {isAdmin && (
                    <button onClick={() => onAddSubSite(mainSite)} className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-all" title="Add Sub-site">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      Sub-Site
                    </button>
                  )}
                  <button onClick={() => onEdit(mainSite)} className="p-2 text-zinc-500 hover:text-zinc-900 bg-zinc-50 border border-zinc-100 rounded-lg transition-all" title="Edit Site">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  {isAdmin && (
                    <button onClick={() => onDelete(mainSite.id)} className="p-2 text-zinc-500 hover:text-rose-600 bg-zinc-50 border border-zinc-100 rounded-lg transition-all" title="Delete Site">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-Sites Section */}
              {!collapsedSites[mainSite.id] && subSites.length > 0 && (
                <div className="pt-3 mt-3 border-t border-dashed border-zinc-100 space-y-2">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Nested Terminals ({subSites.length})</span>
                  <div className="space-y-2">
                    {subSites.map((subSite, index) => (
                      <div key={subSite.id} className="bg-zinc-50/50 rounded-xl p-3 border border-zinc-100/80 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[8px] font-bold text-zinc-400 uppercase block font-sans">Sub-site {index + 1}</span>
                          <span className="text-xs font-bold text-zinc-700 block">{subSite.siteName}</span>
                          <span className="text-[10px] text-zinc-500 font-semibold">{subSite.budgetedHours || 0}h / ${subSite.budgetedAmount || 0}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => onEdit(subSite)} className="p-1.5 text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          {isAdmin && (
                            <button onClick={() => onDelete(subSite.id)} className="p-1.5 text-zinc-500 hover:text-rose-600 bg-white border border-zinc-200 rounded-lg transition-all">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SiteList;
