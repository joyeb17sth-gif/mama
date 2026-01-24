import { useState, useEffect } from 'react';
import { getSites, saveSites, getContractors } from '../utils/storage';
import Toast from './Toast';

const SiteAllocation = () => {
  const [sites, setSites] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
    
    const updatedSites = sites.map(site => {
      if (site.id === selectedSite.id) {
        const allocated = site.allocatedContractors || [];
        const newAllocated = allocated.includes(contractorId)
          ? allocated.filter(id => id !== contractorId)
          : [...allocated, contractorId];
        
        return {
          ...site,
          allocatedContractors: newAllocated,
        };
      }
      return site;
    });
    
    setSites(updatedSites);
    saveSites(updatedSites);
    const updated = updatedSites.find(s => s.id === selectedSite.id);
    setSelectedSite(updated);
    
    const contractor = contractors.find(c => c.id === contractorId);
    const isAllocated = updated.allocatedContractors?.includes(contractorId);
    setToastMessage(
      isAllocated
        ? `${contractor?.name} allocated to ${selectedSite.siteName}`
        : `${contractor?.name} removed from ${selectedSite.siteName}`
    );
    setShowToast(true);
  };

  // Get all allocations summary
  const getAllocationsSummary = () => {
    const summary = [];
    sites.forEach(site => {
      if (site.allocatedContractors && site.allocatedContractors.length > 0) {
        site.allocatedContractors.forEach(contractorId => {
          const contractor = contractors.find(c => c.id === contractorId);
          if (contractor) {
            summary.push({
              contractorId: contractor.id,
              contractorName: contractor.name,
              contractorIdNumber: contractor.contractorId,
              siteId: site.id,
              siteName: site.siteName,
            });
          }
        });
      }
    });
    return summary;
  };

  const allocationsSummary = getAllocationsSummary();

  return (
    <div className="space-y-6">
      {/* All Allocations Summary List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">All Contractor Allocations</h3>
        {allocationsSummary.length > 0 ? (
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
                    Allocated to Site
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allocationsSummary.map((allocation, index) => (
                  <tr key={`${allocation.contractorId}-${allocation.siteId}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      {allocation.contractorName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border border-gray-300">
                      {allocation.contractorIdNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border border-gray-300">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {allocation.siteName}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-600 mt-3">
              Total: {allocationsSummary.length} allocation(s) across {sites.filter(s => s.allocatedContractors?.length > 0).length} site(s)
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a site...</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>
              {site.siteName}
            </option>
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
                    className={`flex items-center p-3 border rounded-md cursor-pointer transition ${
                      isAllocated
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
