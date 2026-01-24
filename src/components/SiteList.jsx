import { getContractors } from '../utils/storage';

const SiteList = ({ sites, onEdit, onDelete }) => {
  const contractors = getContractors();

  if (sites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No sites added yet. Add your first site to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Site Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payroll Cycle
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Budgeted Hours
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Budgeted Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Training Site
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Allocated Contractors
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sites.map((site) => (
            <tr key={site.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {site.siteName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {site.clientName || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {site.payrollCycle}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {site.budgetedHours || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${site.budgetedAmount || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {site.isTrainingSite ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    Yes
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">No</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {site.allocatedContractors && site.allocatedContractors.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {site.allocatedContractors.map(contractorId => {
                      const contractor = contractors.find(c => c.id === contractorId);
                      return contractor ? (
                        <span
                          key={contractorId}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {contractor.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">No contractors allocated</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onEdit(site)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(site.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SiteList;
