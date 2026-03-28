import React from 'react';

const ContractorList = ({ contractors, onEdit, onDelete }) => {
  if (contractors.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-zinc-100">
        <div className="text-4xl mb-4 opacity-20">👥</div>
        <h3 className="text-p1 font-bold text-zinc-900 mb-2">No contractors found</h3>
        <p className="text-zinc-500 max-w-xs mx-auto">Add your first contractor to begin managing your workforce payroll.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100">
          <thead>
            <tr className="bg-zinc-50/50">
              <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Identity & Contact
              </th>
              <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                ID
              </th>
              <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Banking Details
              </th>
              <th className="px-6 py-4 text-left text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Status
              </th>
              <th className="px-6 py-4 text-right text-p3 font-bold text-zinc-400 uppercase tracking-widest">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {contractors.map((contractor) => (
              <tr key={contractor.id} className="hover:bg-zinc-50 transition-colors group">
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                      {contractor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-p3 font-bold text-zinc-900">{contractor.name}</div>
                      <div className="text-xs text-zinc-500 font-medium">
                        {contractor.email || 'No email'}{contractor.phone ? ` • ${contractor.phone}` : ''}
                      </div>
                      {contractor.role && (
                        <div className="text-[10px] text-primary-600 font-bold uppercase tracking-widest mt-1">
                          {contractor.role}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-xs font-mono font-bold text-zinc-400 uppercase tracking-tighter">
                  {contractor.contractorId}
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 font-mono tracking-widest">{contractor.bsb}</span>
                    <span className="text-xs text-zinc-400 font-mono tracking-tighter">{contractor.accountNumber}</span>
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${contractor.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                      }`}
                  >
                    {contractor.status}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(contractor)}
                      className="p-2 text-zinc-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                      title="Edit Contractor"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      onClick={() => onDelete(contractor.id)}
                      className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Contractor"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContractorList;
