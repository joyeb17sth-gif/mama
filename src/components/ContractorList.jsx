const ContractorList = ({ contractors, onEdit, onDelete }) => {
  if (contractors.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No contractors added yet. Add your first contractor to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
              Contractor ID
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
              BSB
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
              Account Number
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {contractors.map((contractor) => (
            <tr key={contractor.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                {contractor.contractorId}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">
                {contractor.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                {contractor.bsb}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                {contractor.accountNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${contractor.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}
                >
                  {contractor.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onEdit(contractor)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(contractor.id)}
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

export default ContractorList;
