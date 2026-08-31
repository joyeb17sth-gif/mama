import React, { useState } from 'react';
import PremiumDialog from './PremiumDialog';

const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const LeadSettings = ({ counselors, setCounselors, setLeadReports }) => {
  const [newCounselor, setNewCounselor] = useState({ name: '', specialty: '', branch: 'Search Nepal' });
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', specialty: '', branch: 'Search Nepal' });

  const handleAdd = (e) => {
    e.preventDefault();
    if (newCounselor.name.trim()) {
      setCounselors(prev => [...prev, {
        id: generateId(),
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
    setDialogConfig({
      isOpen: true,
      type: 'danger',
      title: 'Delete Counselor',
      message: 'Are you sure you want to delete this counselor? Their historical reports will remain in the system.',
      confirmText: 'Delete',
      onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
      onConfirm: () => {
        setCounselors(prev => prev.filter(c => c.id !== id));
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleClearData = () => {
    setDialogConfig({
      isOpen: true,
      type: 'danger',
      title: 'Clear All Data',
      message: 'Are you SURE you want to delete ALL lead reports and historical data? This cannot be undone.',
      confirmText: 'Yes, Clear All',
      onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
      onConfirm: () => {
        setLeadReports && setLeadReports([]);
        const keysToRemove = ['payscleep_leads', 'payscleep_lead_reports', 'payscleep_lead_reports_v2', 'payscleep_lead_reports_v3'];
        keysToRemove.forEach(k => localStorage.removeItem(k));
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('leads') && !key.includes('counselor')) {
            localStorage.removeItem(key);
          }
        }
        setDialogConfig({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'All lead data has been cleared.',
          confirmText: 'Reload Page',
          onConfirm: () => window.location.reload()
        });
      }
    });
  };

  const handleGenerateSampleData = () => {
    const doGenerate = (activeCounselorsToUse) => {
      const currentYear = new Date().getFullYear();
      const mockReports = [];
      const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

      activeCounselorsToUse.forEach(c => {
        const months = [`${currentYear}-carryover`, ...Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`)];
        months.forEach(month => {
          const fb = r(5, 25); const ref = r(2, 10); const web = r(5, 20); const walk = r(1, 10);
          const totalLeads = fb + ref + web + walk;
          const yes = r(Math.floor(totalLeads * 0.4), Math.floor(totalLeads * 0.8));
          const no = r(1, totalLeads - yes); const dna = totalLeads - yes - no;
          const appApplied = r(Math.floor(yes * 0.5), yes);
          const appWaitingPayment = r(0, Math.floor(appApplied * 0.3));
          const appDroppedOut = r(0, Math.floor(appApplied * 0.2));
          const paymentDone = appApplied - appWaitingPayment - appDroppedOut;
          const visaLodging = r(Math.floor(paymentDone * 0.8), paymentDone);
          const visaGranted = r(Math.floor(visaLodging * 0.5), visaLodging);
          const visaRefusal = r(0, visaLodging - visaGranted);
          const visaInProgress = visaLodging - visaGranted - visaRefusal;

          mockReports.push({
            id: generateId(), createdAt: new Date().toISOString(), counselorId: c.id, month,
            totalLeads, sourceFacebook: fb, sourceReferrals: ref, sourceWebsite: web, sourceWalkIn: walk,
            convYes: yes, convNo: no, convDNA: dna, appApplied, appWaitingPayment, appDroppedOut, paymentDone,
            visaLodging, visaInProgress, visaGranted, visaRefusal
          });
        });
      });

      if (setLeadReports) {
        setLeadReports(prev => {
          let filtered = [...prev];
          mockReports.forEach(mr => {
            filtered = filtered.filter(existing => !(existing.counselorId === mr.counselorId && existing.month === mr.month));
          });
          return [...filtered, ...mockReports];
        });
      }
      
      setDialogConfig({
        isOpen: true,
        type: 'success',
        title: 'Data Generated',
        message: 'Smart sample data generated successfully!',
        confirmText: 'Awesome',
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    };

    let activeCounselors = [...counselors];

    if (activeCounselors.length === 0) {
      setDialogConfig({
        isOpen: true,
        type: 'info',
        title: 'No Counselors Found',
        message: 'You have no counselors. Would you like to automatically create sample counselors and data?',
        confirmText: 'Yes, Create',
        onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
        onConfirm: () => {
          const mockCounselors = [
            { id: generateId(), name: 'Joyeb', specialty: 'General', branch: 'Search Nepal' },
            { id: generateId(), name: 'Ajay', specialty: 'General', branch: 'Search Nepal' },
            { id: generateId(), name: 'Suraj', specialty: 'General', branch: 'Search Australia' },
            { id: generateId(), name: 'Mandira', specialty: 'General', branch: 'Search Chili' }
          ];
          setCounselors(mockCounselors);
          doGenerate(mockCounselors);
        }
      });
    } else {
      setDialogConfig({
        isOpen: true,
        type: 'info',
        title: 'Generate Sample Data',
        message: 'This will generate smart sample data for all existing counselors covering carryover and recent months. Proceed?',
        confirmText: 'Generate',
        onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
        onConfirm: () => doGenerate(activeCounselors)
      });
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
            onClick={handleClearData}
            className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-bold shadow-sm hover:bg-rose-200 transition-colors"
          >
            Clear All Data
          </button>
          <button 
            onClick={handleGenerateSampleData}
            className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            Generate Sample Data
          </button>
        </div>
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
      <PremiumDialog {...dialogConfig} />
    </div>
  );
};

export default LeadSettings;
