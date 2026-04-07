import React, { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
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
    <div className="space-y-8 p-2">
      {/* Site Selection and Management */}
      <div className="bg-white rounded-[2rem] border border-zinc-100">
        {showToast && (
          <Toast
            message={toastMessage}
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
        <div className="p-8 border-b border-zinc-50 bg-gradient-to-br from-zinc-50/50 to-white rounded-t-[2rem]">
          <h3 className="text-h1 text-zinc-900 tracking-tight">Active Matrix Core</h3>
          <p className="text-p3 text-zinc-500 font-medium">Initialize or modify terminal-specific assignments.</p>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <label className="block text-[11px] font-bold text-zinc-400 mb-3 ml-1">
              Terminal Interface Selection
            </label>
            <Dropdown
              value={selectedSite?.id || ''}
              onChange={(val) => {
                const site = sites.find(s => s.id === val);
                setSelectedSite(site || null);
              }}
              options={sites.filter(s => !s.isSubSite).reduce((acc, mainSite) => {
                const subs = sites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id);
                acc.push({ value: mainSite.id, label: `${mainSite.siteName} (Terminal Master)`, isParent: subs.length > 0 });
                subs.forEach((sub, idx) => {
                  acc.push({ value: sub.id, label: sub.siteName, isSubItem: true, isLastSubItem: idx === subs.length - 1 });
                });
                return acc;
              }, [])}
              placeholder="Initialize Terminal Interface..."
            />
          </div>

          {selectedSite && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Saved Allocations Display */}
              <div>
                <div className="text-[11px] font-bold text-emerald-500 mb-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Stationed Personnel @ {selectedSite.siteName}
                </div>
                {selectedSite.allocatedContractors && selectedSite.allocatedContractors.length > 0 ? (
                  <div className="bg-zinc-50/50 border border-zinc-100 rounded-[1.5rem] p-6 mb-4">
                    <div className="flex flex-wrap gap-3">
                      {selectedSite.allocatedContractors.map(contractorId => {
                        const contractor = contractors.find(c => c.id === contractorId);
                        return contractor ? (
                          <div
                            key={contractorId}
                            className="flex items-center gap-3 px-4 py-2 bg-white border border-zinc-100 rounded-xl transition-all group/item"
                          >
                            <span className="text-p3 font-bold text-zinc-900 tracking-tight">
                              {contractor.name}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-bold">
                              #{contractor.contractorId}
                            </span>
                            <button
                              onClick={() => handleAllocationToggle(contractorId)}
                              className="ml-2 w-6 h-6 flex items-center justify-center bg-zinc-50 text-rose-500 rounded-lg group-hover/item:bg-rose-500 group-hover/item:text-white transition-all"
                              title="Revoke Assignment"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50/50 border border-dashed border-zinc-200 rounded-[1.5rem] p-10 text-center">
                    <p className="text-[11px] font-bold text-zinc-300 leading-loose">
                      Terminal currently clear. <br /> Initialize personnel allocation from the list below.
                    </p>
                  </div>
                )}
              </div>

              {/* Contractor Selection Section */}
              <div>
                <div className="text-[11px] font-bold text-primary-500 mb-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                  Available Workforce Pool
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contractors.map(contractor => {
                    const isAllocated = selectedSite.allocatedContractors?.includes(contractor.id);
                    return (
                      <label
                        key={contractor.id}
                        className={`flex items-center p-5 rounded-[1.5rem] cursor-pointer transition-all border group/label ${isAllocated
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-zinc-100 bg-white hover:bg-zinc-50'
                          }`}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={isAllocated}
                            onChange={() => handleAllocationToggle(contractor.id)}
                            className={`h-5 w-5 rounded-lg transition-all cursor-pointer border-zinc-300 focus:ring-4 focus:ring-offset-0 ${isAllocated ? 'text-emerald-600 focus:ring-emerald-100' : 'text-primary-600 focus:ring-primary-100'}`}
                          />
                        </div>
                        <div className="ml-4 flex-1">
                          <div className={`text-p3 font-bold tracking-tight transition-colors ${isAllocated ? 'text-emerald-900' : 'text-zinc-900'}`}>
                            {contractor.name}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-bold mt-0.5">
                            ID: {contractor.contractorId}
                          </div>
                        </div>
                        {isAllocated && (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          </div>
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

      {/* All Allocations Summary List */}
      <div className="bg-white rounded-[2rem] border border-zinc-100 overflow-hidden">
        <div className="p-8 border-b border-zinc-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-zinc-50/50 to-white">
          <div>
            <h3 className="text-h1 text-zinc-900 tracking-tight">Resource Deployment</h3>
            <p className="text-p3 text-zinc-500 font-medium">Global overview of contractor-site allocations.</p>
          </div>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search personnel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all text-sm font-bold"
            />
            <svg className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        {allocationsSummary.filter(a =>
          a.contractorName.toLowerCase().includes(searchQuery.toLowerCase())
        ).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 border-b border-zinc-800">
                    Contractor Profile
                  </th>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 border-b border-zinc-800">
                    Internal Identifier
                  </th>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 border-b border-zinc-800">
                    Assigned Terminals
                  </th>
                  <th className="px-6 py-5 text-center text-[11px] font-bold text-zinc-400 border-b border-zinc-800 w-32">
                    Orchestration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-50">
                {allocationsSummary.filter(a =>
                  a.contractorName.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((allocation) => (
                  <tr key={allocation.contractorId} className="hover:bg-zinc-50/50 transition-colors group/row">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-400 group-hover/row:bg-primary-50 group-hover/row:text-primary-600 transition-colors">
                          {allocation.contractorName[0]}
                        </div>
                        <span className="text-p3 font-bold text-zinc-900 tracking-tight">{allocation.contractorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-zinc-400">
                      #{allocation.contractorIdNumber}
                    </td>
                    <td className="px-6 py-6 bg-zinc-50/20">
                      {(() => {
                        const contractorSites = allocation.sites;
                        const displaySites = contractorSites.filter(cs => {
                          const siteObj = sites.find(s => s.id === cs.siteId);
                          // Only show sub-sites, hide the parent wrapper sites to reduce clutter
                          return siteObj && siteObj.isSubSite;
                        });

                        if (displaySites.length === 0) return <span className="text-zinc-300 font-bold text-[10px] italic">Idle Status</span>;

                        return (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {displaySites.map(cs => {
                                const siteObj = sites.find(s => s.id === cs.siteId);
                                return (
                                  <span key={cs.siteId} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-[10px] shadow-sm group">
                                    <span className="text-[11px] font-bold text-zinc-700">{siteObj?.siteName}</span>
                                    {editingContractorId === allocation.contractorId && (
                                      <button
                                        onClick={() => handleQuickRemoveSite(allocation.contractorId, cs.siteId)}
                                        className="ml-1 text-zinc-300 hover:text-rose-500 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                            {editingContractorId === allocation.contractorId && (
                              <div className="pt-4 border-t border-zinc-100 mt-2">
                                <div className="relative">
                                  <Dropdown
                                    value=""
                                    onChange={(val) => {
                                      handleQuickAddSite(allocation.contractorId, val);
                                    }}
                                    options={sites
                                      .filter(s => !s.isSubSite)
                                      .reduce((acc, mainSite) => {
                                        const isMainAllocated = contractorSites.some(cs => cs.siteId === mainSite.id);
                                        const subSites = sites.filter(s => s.isSubSite && s.parentSiteId === mainSite.id);
                                        const validSubSites = subSites.filter(sub => !contractorSites.some(cs => cs.siteId === sub.id));
                                        
                                        if (!isMainAllocated || validSubSites.length > 0) {
                                          if (!isMainAllocated) {
                                            acc.push({ value: mainSite.id, label: mainSite.siteName, isParent: validSubSites.length > 0 });
                                          } else {
                                            acc.push({ value: mainSite.id, label: mainSite.siteName, disabled: true, isParent: validSubSites.length > 0 });
                                          }
                                        }

                                        validSubSites.forEach((sub, idx) => {
                                          acc.push({ value: sub.id, label: sub.siteName, isSubItem: true, isLastSubItem: idx === validSubSites.length - 1 });
                                        });

                                        return acc;
                                      }, [])}
                                    placeholder="+ Append Resource..."
                                    variant="compact"
                                    buttonClassName="w-full flex items-center justify-between text-[11px] font-bold border-2 border-dashed border-zinc-200 rounded-[1.25rem] px-5 py-3 outline-none text-zinc-400 hover:border-zinc-300 hover:text-zinc-500 hover:bg-zinc-50 transition-all cursor-pointer bg-white"
                                    showSelected={false}
                                  />
                                </div>
                              </div>

                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button
                        onClick={() => setEditingContractorId(
                          editingContractorId === allocation.contractorId ? null : allocation.contractorId
                        )}
                        className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${editingContractorId === allocation.contractorId
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white text-zinc-400 border border-zinc-100 hover:text-zinc-900 group-hover/row:border-zinc-200'
                          }`}
                        title={editingContractorId === allocation.contractorId ? 'Lock Assignments' : 'Modify Deployment'}
                      >
                        {editingContractorId === allocation.contractorId ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-8 border-t border-zinc-50 bg-zinc-50/30">
              <p className="text-[11px] font-bold text-zinc-400 text-center">
                {searchQuery ? (
                  <>Filtering {allocationsSummary.filter(a => a.contractorName.toLowerCase().includes(searchQuery.toLowerCase())).length} of {allocationsSummary.length} Active Records</>
                ) : (
                  <>Consolidated: {allocationsSummary.reduce((sum, a) => sum + a.sites.length, 0)} Total Connections — {allocationsSummary.length} Contributors — {sites.filter(s => s.allocatedContractors?.length > 0).length} Terminals</>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">No contractor allocations found. Allocate contractors to sites below.</p>
          </div>
        )}
      </div>


    </div >
  );
};

export default SiteAllocation;
