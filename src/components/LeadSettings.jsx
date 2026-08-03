import React, { useState } from 'react';

const LeadSettings = ({ counselors, setCounselors, setLeadReports }) => {
  const [newCounselor, setNewCounselor] = useState({ name: '', specialty: '', branch: 'Search Nepal' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', specialty: '', branch: 'Search Nepal' });

  const handleAdd = (e) => {
    e.preventDefault();
    if (newCounselor.name.trim()) {
      setCounselors(prev => [...prev, {
        id: crypto.randomUUID(),
        name: newCounselor.name.trim(),
        specialty: newCounselor.specialty.trim() || 'General',
        branch: newCounselor.branch || 'Search Nepal'
      }]);
      setNewCounselor({ name: '', specialty: '', branch: 'Search Nepal' });
    }
  };

  const handleStartEdit = (c) => {
    setEditingId(c.id);
    setEditData({ name: c.name, specialty: c.specialty, branch: c.branch || 'Search Nepal' });
  };

  const handleSaveEdit = () => {
    if (editData.name.trim()) {
      setCounselors(prev => prev.map(c => 
        c.id === editingId ? { ...c, name: editData.name.trim(), specialty: editData.specialty.trim(), branch: editData.branch } : c
      ));
      setEditingId(null);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this counselor? Their historical reports will remain in the system.')) {
      setCounselors(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleClearData = () => {
    if (window.confirm('Are you SURE you want to delete ALL lead reports and historical data? This cannot be undone.')) {
      setLeadReports && setLeadReports([]);
      
      // Explicitly remove old and current lead data keys
      const keysToRemove = [
        'payscleep_leads',
        'payscleep_lead_reports',
        'payscleep_lead_reports_v2',
        'payscleep_lead_reports_v3'
      ];
      
      keysToRemove.forEach(k => localStorage.removeItem(k));
      
      // Also check for any other old keys containing 'leads' (excluding counselors)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('leads') && !key.includes('counselor')) {
          localStorage.removeItem(key);
        }
      }

      alert('All lead data has been cleared.');
      window.location.reload();
    }
  };

  const handleGenerateSampleData = () => {
    if (!setLeadReports) return;
    
    if (counselors.length === 0) {
      alert('Please add at least one counselor first before generating sample data.');
      return;
    }
    
    if (window.confirm('This will generate sample data for the current year. Proceed?')) {
      const year = new Date().getFullYear().toString();
      const sampleReports = [];
      
      for (let month = 1; month <= 12; month++) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        counselors.forEach(c => {
          // Add some randomness, 80% chance to have data for a month
          if (Math.random() > 0.2) { 
             const total = Math.floor(Math.random() * 50) + 10;
             const yes = Math.floor(total * 0.4);
             const no = Math.floor(total * 0.3);
             const dna = total - yes - no;
             
             const fb = Math.floor(total * 0.5);
             const ref = Math.floor(total * 0.2);
             const web = Math.floor(total * 0.2);
             const walk = total - fb - ref - web;
             
             const applied = Math.floor(yes * 0.8);
             const waiting = Math.floor(applied * 0.2);
             const dropped = Math.floor(applied * 0.1);
             const paymentDone = applied - waiting - dropped;
             
             const lodging = Math.floor(paymentDone * 0.9);
             const inProgress = Math.floor(lodging * 0.3);
             const granted = Math.floor(lodging * 0.6);
             const refusal = lodging - inProgress - granted;

             sampleReports.push({
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
                createdAt: new Date().toISOString(),
                counselorId: c.id,
                month: monthStr,
                totalLeads: total,
                sourceFacebook: fb,
                sourceReferrals: ref,
                sourceWebsite: web,
                sourceWalkIn: walk,
                convYes: yes,
                convNo: no,
                convDNA: dna,
                appApplied: applied,
                appWaitingPayment: waiting,
                appDroppedOut: dropped,
                paymentDone: paymentDone,
                visaLodging: lodging,
                visaInProgress: inProgress,
                visaGranted: granted,
                visaRefusal: refusal
             });
          }
        });
      }
      
      setLeadReports(prev => [...prev, ...sampleReports]);
      alert('Sample data generated successfully!');
    }
  };

  const inputClasses = "w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-notion-blue/20 focus:border-notion-blue outline-none transition-all";

  return (
    <div>
      <h3 className="text-xl font-bold text-notion-black mb-6">Settings</h3>
      
      {/* Data Management */}
      <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 mb-8">
        <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Data Management</h4>
        <div className="flex gap-4">
          <button 
            onClick={handleGenerateSampleData}
            className="px-4 py-2 bg-notion-blue text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors"
          >
            Generate Sample Data
          </button>
          <button 
            onClick={handleClearData}
            className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-bold shadow-sm hover:bg-rose-200 transition-colors"
          >
            Clear All Data
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-3">Note: Generating sample data requires at least one counselor to be added below.</p>
      </div>

      <h3 className="text-xl font-bold text-notion-black mb-6 mt-10">Counselor Management</h3>
      
      {/* Add New Counselor */}
      <form onSubmit={handleAdd} className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 mb-8">
        <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Add New Counselor</h4>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-zinc-500 mb-1.5 ml-1">Name</label>
            <input 
              type="text" 
              value={newCounselor.name} 
              onChange={e => setNewCounselor(prev => ({...prev, name: e.target.value}))}
              className={inputClasses}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-zinc-500 mb-1.5 ml-1">Specialty (Optional)</label>
            <input 
              type="text" 
              value={newCounselor.specialty} 
              onChange={e => setNewCounselor(prev => ({...prev, specialty: e.target.value}))}
              className={inputClasses}
              placeholder="e.g. Australian Visas"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-zinc-500 mb-1.5 ml-1">Branch</label>
            <select
              value={newCounselor.branch}
              onChange={e => setNewCounselor(prev => ({...prev, branch: e.target.value}))}
              className={inputClasses}
            >
              <option value="Search Nepal">Search Nepal</option>
              <option value="Search Australia">Search Australia</option>
              <option value="Search Chili">Search Chili</option>
            </select>
          </div>
          <button 
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-notion-blue text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all"
          >
            Add Counselor
          </button>
        </div>
      </form>

      {/* List Counselors */}
      <div className="space-y-4">
        {counselors.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 bg-white border border-dashed border-zinc-300 rounded-xl">
            No counselors added yet.
          </div>
        ) : (
          counselors.map(c => (
            <div key={c.id} className="p-4 bg-white border border-zinc-200 rounded-xl flex items-center justify-between hover:border-notion-blue/30 transition-colors">
              {editingId === c.id ? (
                <div className="flex-1 flex gap-3 items-center mr-4">
                  <input 
                    type="text" 
                    value={editData.name} 
                    onChange={e => setEditData(prev => ({...prev, name: e.target.value}))}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded focus:border-notion-blue outline-none"
                  />
                  <input 
                    type="text" 
                    value={editData.specialty} 
                    onChange={e => setEditData(prev => ({...prev, specialty: e.target.value}))}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded focus:border-notion-blue outline-none"
                    placeholder="Specialty"
                  />
                  <select
                    value={editData.branch}
                    onChange={e => setEditData(prev => ({...prev, branch: e.target.value}))}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded focus:border-notion-blue outline-none"
                  >
                    <option value="Search Nepal">Search Nepal</option>
                    <option value="Search Australia">Search Australia</option>
                    <option value="Search Chili">Search Chili</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded font-bold text-xs hover:bg-emerald-200">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded font-bold text-xs hover:bg-zinc-200">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-notion-blue/10 flex items-center justify-center text-notion-blue font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-notion-black">{c.name}</h4>
                      <p className="text-xs text-zinc-500">
                        {c.specialty} <span className="mx-1">&bull;</span> <span className="font-semibold text-zinc-600">{c.branch || 'Search Nepal'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleStartEdit(c)}
                      className="p-2 text-zinc-400 hover:text-notion-blue hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LeadSettings;
