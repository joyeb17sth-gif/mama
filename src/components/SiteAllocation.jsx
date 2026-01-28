import React, { useState, useEffect } from 'react';
import { getSites, saveSites, getContractors } from '../utils/storage';
import Toast from './Toast';

const SiteAllocation = () => {
  const [sites, setSites] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContractorId, setEditingContractorId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedSites = getSites();
    setSites(loadedSites);
    setContractors(getContractors().filter(c => c.status === 'active'));
    // Refresh selected site if it exists
    if (selectedSite) {
      const refreshed = loadedSites.find(s => s.id === selectedSite.id);
      if (refreshed) setSelectedSite(refreshed);
    }
  };

  const handleAllocationToggle = (contractorId) => {
    if (!selectedSite) return;

    const isAllocating = !(selectedSite.allocatedContractors || []).includes(contractorId);

    const updatedSites = sites.map(site => {
      // Logic for the selected site itself
      if (site.id === selectedSite.id) {
        const allocated = site.allocatedContractors || [];
        const newAllocated = allocated.includes(contractorId)
          ? allocated.filter(id => id !== contractorId)
          : [...allocated, contractorId];

        return { ...site, allocatedContractors: newAllocated };
      }

      // AUTO-ALLOCATE TO PRIMARY: If allocating to a sub-site, also allocate to its parent
      if (isAllocating && selectedSite.isSubSite && site.id === selectedSite.parentSiteId) {
        const allocated = site.allocatedContractors || [];
        if (!allocated.includes(contractorId)) {
          return { ...site, allocatedContractors: [...allocated, contractorId] };
        }
      }

      return site;
    });

    setSites(updatedSites);
    saveSites(updatedSites);
    const updated = updatedSites.find(s => s.id === selectedSite.id);
    setSelectedSite(updated);

    const contractor = contractors.find(c => c.id === contractorId);
    setToastMessage(
      isAllocating
        ? `${contractor?.name} allocated to ${selectedSite.siteName}${selectedSite.isSubSite ? ' and Primary site' : ''}`
        : `${contractor?.name} removed from ${selectedSite.siteName}`
    );
    setShowToast(true);
  };

  const handleQuickRemoveSite = (contractorId, siteId) => {
    const updatedSites = sites.map(site => {
      if (site.id === siteId) {
        const allocated = site.allocatedContractors || [];
        return {
          ...site,
          allocatedContractors: allocated.filter(id => id !== contractorId)
        };
      }
      return site;
    });
    setSites(updatedSites);
    saveSites(updatedSites);

    const contractor = contractors.find(c => c.id === contractorId);
    const site = sites.find(s => s.id === siteId);
    setToastMessage(`${contractor?.name} removed from ${site?.siteName}`);
    setShowToast(true);
  };

  const handleQuickAddSite = (contractorId, siteId) => {
    if (!siteId) return;

    const targetSite = sites.find(s => s.id === siteId);
    if (!targetSite) return;

    const updatedSites = sites.map(site => {
      // Primary logic for target site
      if (site.id === siteId) {
        const allocated = site.allocatedContractors || [];
        if (!allocated.includes(contractorId)) {
          return { ...site, allocatedContractors: [...allocated, contractorId] };
        }
      }

      // Auto-allocate to primary if adding to a sub-site
      if (targetSite.isSubSite && site.id === targetSite.parentSiteId) {
        const allocated = site.allocatedContractors || [];
        if (!allocated.includes(contractorId)) {
          return { ...site, allocatedContractors: [...allocated, contractorId] };
        }
      }

      return site;
    });

    setSites(updatedSites);
    saveSites(updatedSites);

    const contractor = contractors.find(c => c.id === contractorId);
    setToastMessage(`${contractor?.name} allocated to ${targetSite.siteName}${targetSite.isSubSite ? ' and Primary site' : ''}`);
    setShowToast(true);
  };

  // Get all allocations summary grouped by contractor
  const getAllocationsSummary = () => {
    const contractorMap = new Map();

    sites.forEach(site => {
      if (site.allocatedContractors && site.allocatedContractors.length > 0) {
        site.allocatedContractors.forEach(contractorId => {
          const contractor = contractors.find(c => c.id === contractorId);
          if (contractor) {
            if (!contractorMap.has(contractorId)) {
              contractorMap.set(contractorId, {
                contractorId: contractor.id,
                contractorName: contractor.name,
                contractorIdNumber: contractor.contractorId,
                sites: []
              });
            }
            contractorMap.get(contractorId).sites.push({
              siteId: site.id,
              siteName: site.siteName
            });
          }
        });
      }
    });

    return Array.from(contractorMap.values()).sort((a, b) =>
      a.contractorName.localeCompare(b.contractorName)
    );
  };

  const allocationsSummary = getAllocationsSummary();

  return (
    <div className="space-y-6">
      {/* All Allocations Summary List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">All Contractor Allocations</h3>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search contractors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        {allocationsSummary.filter(a =>
          a.contractorName.toLowerCase().includes(searchQuery.toLowerCase())
        ).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Contractor Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Contractor ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Allocated Sites
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allocationsSummary.filter(a =>
                  a.contractorName.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((allocation) => (
                  <tr key={allocation.contractorId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border border-gray-300">
                      {allocation.contractorName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 border border-gray-300">
                      {allocation.contractorIdNumber}
                    </td>
                    <td className="px-4 py-4 border border-gray-300 bg-slate-50/20">
                      {(() => {
                        const contractorSites = allocation.sites;
                        const involvedPrimaryIds = [...new Set(contractorSites.map(cs => {
                          const fullSite = sites.find(s => s.id === cs.siteId);
                          return fullSite?.isSubSite ? fullSite.parentSiteId : fullSite?.id;
                        }))].filter(Boolean);

                        const tagColors = [
                          { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', tag: 'bg-white' },
                          { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', tag: 'bg-white' },
                          { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', tag: 'bg-white' },
                          { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', tag: 'bg-white' },
                          { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', tag: 'bg-white' },
                          { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', tag: 'bg-white' },
                        ];

                        const getPrimaryColor = (pId) => {
                          const idStr = String(pId);
                          const hash = idStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                          return tagColors[hash % tagColors.length];
                        };

                        if (involvedPrimaryIds.length === 0) return <span className="text-gray-400 italic text-xs">No sites allocated</span>;

                        return (
                          <div className="space-y-3">
                            {involvedPrimaryIds.map(pId => {
                              const primarySite = sites.find(s => s.id === pId);
                              const isPrimaryAllocated = contractorSites.some(cs => cs.siteId === pId);
                              const allocatedSubSites = sites.filter(s => s.isSubSite && s.parentSiteId === pId && contractorSites.some(cs => cs.siteId === s.id));
                              const color = getPrimaryColor(pId);

                              return (
                                <div key={pId} className={`${color.bg} ${color.border} border-l-4 rounded-r-xl p-3 shadow-sm`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${color.text}`}>
                                      🏢 {primarySite?.siteName || 'Unknown Site'}
                                    </span>
                                    {editingContractorId === allocation.contractorId && isPrimaryAllocated && (
                                      <button
                                        onClick={() => handleQuickRemoveSite(allocation.contractorId, pId)}
                                        className="text-rose-400 hover:text-rose-600 transition p-1"
                                        title="Remove Primary Site"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {isPrimaryAllocated && (
                                      <span className={`${color.tag} ${color.text} border ${color.border} px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1`}>
                                        Main Site
                                      </span>
                                    )}
                                    {allocatedSubSites.map(ss => (
                                      <span key={ss.id} className={`${color.tag} ${color.text} border ${color.border} px-2 py-0.5 rounded-lg text-[9px] font-bold shadow-sm flex items-center gap-2`}>
                                        <span className="opacity-40">↳</span> {ss.siteName}
                                        {editingContractorId === allocation.contractorId && (
                                          <button
                                            onClick={() => handleQuickRemoveSite(allocation.contractorId, ss.id)}
                                            className="hover:scale-125 transition-transform text-rose-500 font-bold"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {editingContractorId === allocation.contractorId && (
                              <div className="pt-2 border-t border-slate-100">
                                <select
                                  onChange={(e) => {
                                    handleQuickAddSite(allocation.contractorId, e.target.value);
                                    e.target.value = '';
                                  }}
                                  className="w-full text-xs font-bold border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none text-slate-400 hover:border-slate-300 transition-colors"
                                >
                                  <option value="">+ Allocate to another site...</option>
                                  {sites
                                    .filter(s => !s.isSubSite)
                                    .map(mainSite => {
                                      const isMainAdded = contractorSites.some(as => as.siteId === mainSite.id);
                                      return (
                                        <React.Fragment key={mainSite.id}>
                                          <option value={mainSite.id} disabled={isMainAdded}>
                                            🏢 {mainSite.siteName} {isMainAdded ? '- Already Added' : ''}
                                          </option>
                                          {sites
                                            .filter(s => s.isSubSite && s.parentSiteId === mainSite.id)
                                            .map(subSite => {
                                              const isSubAdded = contractorSites.some(as => as.siteId === subSite.id);
                                              return (
                                                <option key={subSite.id} value={subSite.id} disabled={isSubAdded}>
                                                  &nbsp;&nbsp;&nbsp;↳ {subSite.siteName} {isSubAdded ? '- Already Added' : ''}
                                                </option>
                                              );
                                            })}
                                        </React.Fragment>
                                      );
                                    })}
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center border border-gray-300">
                      <button
                        onClick={() => setEditingContractorId(
                          editingContractorId === allocation.contractorId ? null : allocation.contractorId
                        )}
                        className={`px-3 py-1 rounded text-xs font-medium transition ${editingContractorId === allocation.contractorId
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {editingContractorId === allocation.contractorId ? 'Done' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-600 mt-3">
              {searchQuery ? (
                <>Showing {allocationsSummary.filter(a => a.contractorName.toLowerCase().includes(searchQuery.toLowerCase())).length} of {allocationsSummary.length} contractor(s)</>
              ) : (
                <>Total: {allocationsSummary.reduce((sum, a) => sum + a.sites.length, 0)} allocation(s) for {allocationsSummary.length} contractor(s) across {sites.filter(s => s.allocatedContractors?.length > 0).length} site(s)</>
              )}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">No contractor allocations found. Allocate contractors to sites below.</p>
          </div>
        )}
      </div>

      {/* Site Selection and Management */}
      <div className="bg-white rounded-lg shadow p-6">
        {showToast && (
          <Toast
            message={toastMessage}
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
        <h3 className="text-lg font-semibold mb-4">Manage Allocations</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Site
          </label>
          <select
            value={selectedSite?.id || ''}
            onChange={(e) => {
              const site = sites.find(s => s.id === e.target.value);
              setSelectedSite(site || null);
            }}
            onFocus={loadData}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none font-bold text-gray-900 transition-all shadow-sm"
          >
            <option value="">Choose a site...</option>
            {sites.filter(s => !s.isSubSite).map(mainSite => (
              <React.Fragment key={mainSite.id}>
                <option value={mainSite.id} className="font-black text-blue-600 bg-blue-50">
                  🏢 {mainSite.siteName} (Primary)
                </option>
                {sites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id).map(subSite => (
                  <option key={subSite.id} value={subSite.id} className="pl-4">
                    &nbsp;&nbsp;&nbsp;↳ {subSite.siteName}
                  </option>
                ))}
              </React.Fragment>
            ))}
          </select>
        </div>

        {selectedSite && (
          <div className="space-y-6">
            {/* Saved Allocations Display */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Allocated Contractors to <span className="text-blue-600">{selectedSite.siteName}</span>
              </h4>
              {selectedSite.allocatedContractors && selectedSite.allocatedContractors.length > 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedSite.allocatedContractors.map(contractorId => {
                      const contractor = contractors.find(c => c.id === contractorId);
                      return contractor ? (
                        <div
                          key={contractorId}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-md shadow-sm"
                        >
                          <span className="text-sm font-medium text-gray-900">
                            {contractor.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({contractor.contractorId})
                          </span>
                          <button
                            onClick={() => handleAllocationToggle(contractorId)}
                            className="ml-2 text-red-600 hover:text-red-800 text-sm font-bold"
                            title="Remove allocation"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    Total: {selectedSite.allocatedContractors.length} contractor(s) allocated
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">
                    No contractors allocated to this site yet. Select contractors below to allocate them.
                  </p>
                </div>
              )}
            </div>

            {/* Contractor Selection Section */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Select Contractors to Allocate
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contractors.map(contractor => {
                  const isAllocated = selectedSite.allocatedContractors?.includes(contractor.id);
                  return (
                    <label
                      key={contractor.id}
                      className={`flex items-center p-3 border rounded-md cursor-pointer transition ${isAllocated
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAllocated}
                        onChange={() => handleAllocationToggle(contractor.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {contractor.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {contractor.contractorId}
                        </div>
                      </div>
                      {isAllocated && (
                        <span className="text-xs text-green-600 font-medium ml-2">
                          ✓ Allocated
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAllocation;
