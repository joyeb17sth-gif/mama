import React from 'react';
import { getContractors } from '../utils/storage';

const SiteList = ({ sites, onEdit, onAddSubSite, onDelete }) => {
  const contractors = getContractors();

  if (sites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No sites added yet. Add your first site to get started.</p>
      </div>
    );
  }

  const mainSites = sites.filter(s => !s.isSubSite);

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50/50">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Site Organization
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Client
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Cycle
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Type
            </th>
            <th className="px-6 py-4 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Budget (Hrs/$)
            </th>
            <th className="px-6 py-4 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Training
            </th>
            <th className="px-6 py-4 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {mainSites.map((mainSite) => {
            const subSites = sites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id);

            return (
              <React.Fragment key={mainSite.id}>
                {/* Main Site Row */}
                <tr className="bg-slate-50/50 group border-t-2 border-slate-100">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm shadow-blue-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-blue-600 uppercase tracking-tighter mb-0.5">Parent Site</div>
                        <div className="text-sm font-medium text-gray-900">{mainSite.siteName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600 font-medium">
                    {mainSite.clientName || '-'}
                  </td>
                  <td className="px-6 py-5 text-xs text-gray-500 font-medium uppercase">
                    {mainSite.payrollCycle}
                  </td>
                  <td className="px-6 py-5 text-xs text-gray-500 capitalize font-medium">
                    {mainSite.cleaningType || 'housekeeping'}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="text-sm font-medium text-gray-900">{mainSite.budgetedHours || 0}h</div>
                    <div className="text-[10px] text-gray-400 font-semibold tracking-tighter">${mainSite.budgetedAmount || 0} LIMIT</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {mainSite.isTrainingSite ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold uppercase tracking-widest">Active</span>
                    ) : (
                      <span className="text-[10px] text-gray-300 font-semibold uppercase">Standard</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onAddSubSite(mainSite)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Add Sub-site">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      </button>
                      <button onClick={() => onEdit(mainSite)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => onDelete(mainSite.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Sub-Site Rows */}
                {subSites.map((subSite, index) => (
                  <tr key={subSite.id} className="hover:bg-indigo-50/20 transition group">
                    <td className="px-6 py-4 pl-14 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="text-indigo-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-tighter mb-0.5">Sub-site {index + 1}</div>
                          <div className="text-sm font-medium text-slate-700">{subSite.siteName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      (Inherited)
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-400 font-medium uppercase">
                      {subSite.payrollCycle}
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-400 capitalize">
                      {subSite.cleaningType || 'housekeeping'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-slate-600">{subSite.budgetedHours || 0}h</div>
                      <div className="text-[10px] text-slate-300 font-semibold tracking-tighter">${subSite.budgetedAmount || 0}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {subSite.isTrainingSite && <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Training Site"></span>}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(subSite)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => onDelete(subSite.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition">
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
  );
};

export default SiteList;
