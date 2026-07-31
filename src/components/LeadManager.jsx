import React, { useState, useMemo, useCallback, useEffect } from 'react';
import LeadAnalytics from './LeadAnalytics';
import { supabase } from '../utils/supabaseClient';

const LeadManager = ({ leads, onSave }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [activeView, setActiveView] = useState('list');

  const [isAdmin, setIsAdmin] = useState(false);
  const [consultants, setConsultants] = useState([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState('all');

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile?.role === 'admin') {
          setIsAdmin(true);
          const { data: allProfiles } = await supabase.from('profiles').select('id, email, role');
          setConsultants(allProfiles || []);
        }
      }
    };
    initAuth();
  }, []);

  const displayedLeads = useMemo(() => {
    if (!isAdmin) return leads;
    if (selectedConsultantId === 'all') return leads;
    return leads.filter(l => l.consultantId === selectedConsultantId);
  }, [leads, isAdmin, selectedConsultantId]);

  const generateSampleData = async () => {
    const fakeLeads = [];
    const sources = ['Website', 'Referral', 'Social Media', 'Walk in'];
    const names = ['John Doe', 'Sarah Smith', 'Michael Johnson', 'Emily Davis', 'Chris Wilson', 'Anna Brown', 'James Taylor', 'Laura Martinez', 'David Anderson', 'Lisa Thomas'];

    // Generate 200 leads across 2025 and 2026
    for (let i = 0; i < 200; i++) {
      const createdDate = new Date();
      createdDate.setFullYear(2026);
      createdDate.setMonth(Math.floor(Math.random() * 12)); // 0 (Jan) to 11 (Dec)
      createdDate.setDate(Math.floor(Math.random() * 28) + 1); // random day 1-28

      const randConversion = Math.random();
      let conversion = null;
      let convertedDate = null;
      let statusUpdatedAt = null;
      let stageUpdatedAt = null;
      let status = null;
      let stage = null;
      let updatedAt = createdDate;
      const historyLog = [];

      // Initial Creation log
      historyLog.push({ id: crypto.randomUUID(), date: createdDate.toISOString(), action: 'Lead Acquired', detail: `Source: ${sources[Math.floor(Math.random() * sources.length)]}` });

      if (randConversion > 0.4) {
        conversion = 'yes';
        status = ['application', 'still thinking', 'did not respond'][Math.floor(Math.random() * 3)];
        if (status === 'application') {
          stage = ['payment', 'deposit', 'visa', 'still thinking'][Math.floor(Math.random() * 4)];
        }

        // Converted date logic: 60% chance same month, 40% chance later
        convertedDate = new Date(createdDate);
        if (Math.random() > 0.6) {
          convertedDate.setMonth(convertedDate.getMonth() + Math.floor(Math.random() * 3) + 1);
        }

        // Simulate Prior Month DNA
        if (Math.random() > 0.8 && convertedDate.getMonth() !== createdDate.getMonth()) {
          historyLog.push({ id: crypto.randomUUID(), date: createdDate.toISOString(), action: 'Conversion Update', detail: `Changed to DNA` });
          // They were DNA, now they are 'yes'
        }

        historyLog.push({ id: crypto.randomUUID(), date: convertedDate.toISOString(), action: 'Conversion Update', detail: `Changed to yes` });

        statusUpdatedAt = new Date(convertedDate);
        statusUpdatedAt.setDate(statusUpdatedAt.getDate() + 1);
        historyLog.push({ id: crypto.randomUUID(), date: statusUpdatedAt.toISOString(), action: 'Status Update', detail: `Moved to ${status}` });

        if (stage) {
          stageUpdatedAt = new Date(statusUpdatedAt);
          stageUpdatedAt.setDate(stageUpdatedAt.getDate() + 2);
          historyLog.push({ id: crypto.randomUUID(), date: stageUpdatedAt.toISOString(), action: 'Stage Update', detail: `Moved to ${stage}` });
          updatedAt = stageUpdatedAt;
        } else {
          updatedAt = statusUpdatedAt;
        }

      } else if (randConversion > 0.2) {
        conversion = 'no';
        convertedDate = new Date(createdDate);
        if (Math.random() > 0.7) {
          convertedDate.setMonth(convertedDate.getMonth() + Math.floor(Math.random() * 2) + 1);
        }

        // Simulate Prior Month DNA
        if (Math.random() > 0.8 && convertedDate.getMonth() !== createdDate.getMonth()) {
          historyLog.push({ id: crypto.randomUUID(), date: createdDate.toISOString(), action: 'Conversion Update', detail: `Changed to DNA` });
        }

        historyLog.push({ id: crypto.randomUUID(), date: convertedDate.toISOString(), action: 'Conversion Update', detail: `Changed to no` });
        updatedAt = convertedDate;
      } else {
        conversion = 'DNA';
        convertedDate = new Date(createdDate);
        historyLog.push({ id: crypto.randomUUID(), date: convertedDate.toISOString(), action: 'Conversion Update', detail: `Changed to DNA` });

        // Make some DNA leads very old so they show as "Dropped" (inactive for 30+ days)
        if (Math.random() > 0.5) {
          updatedAt = new Date(createdDate);
          updatedAt.setDate(updatedAt.getDate() - 40); // force older than 30 days
        } else {
          updatedAt = new Date(); // force recent so they show as "Still Chasing"
        }
      }

      fakeLeads.push({
        id: crypto.randomUUID(),
        name: names[i % names.length] + ' ' + (i + 1),
        phone: '555-01' + Math.floor(Math.random() * 99).toString().padStart(2, '0'),
        email: `lead${i}@example.com`,
        notes: 'Sample lead automatically generated.',
        source: sources[Math.floor(Math.random() * sources.length)],
        conversion,
        status,
        stage,
        createdAt: createdDate.toISOString(),
        convertedAt: convertedDate ? convertedDate.toISOString() : null,
        statusUpdatedAt: statusUpdatedAt ? statusUpdatedAt.toISOString() : null,
        stageUpdatedAt: stageUpdatedAt ? stageUpdatedAt.toISOString() : null,
        historyLog,
        updatedAt: updatedAt.toISOString()
      });
    }

    onSave(fakeLeads, 'REPLACE');
  };

  // Pipeline Modal states
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [pipelineLead, setPipelineLead] = useState(null);

  // Form states
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('');

  // Pipeline states
  const [conversion, setConversion] = useState('');
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');

  const handleEdit = useCallback((lead) => {
    setEditingLead(lead);
    setName(lead.name || '');
    setPhone(lead.phone || '');
    setEmail(lead.email || '');
    setNotes(lead.notes || '');
    setSource(lead.source || '');
    setConversion(lead.conversion || '');
    setStatus(lead.status || '');
    setStage(lead.stage || '');
    setStep(1);
    setShowForm(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingLead(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setSource('');
    setConversion('');
    setStatus('');
    setStage('');
    setStep(1);
    setShowForm(true);
  }, []);

  const handleOpenPipeline = useCallback((lead) => {
    setPipelineLead(lead);
    setConversion(lead.conversion || '');
    setStatus(lead.status || '');
    setStage(lead.stage || '');
    setShowPipelineModal(true);
  }, []);

  const handleSavePipeline = () => {
    const now = new Date().toISOString();
    const isNewlyConverted = conversion === 'yes' && pipelineLead.conversion !== 'yes';
    const newStatus = conversion === 'yes' ? status : null;
    const newStage = (conversion === 'yes' && status === 'application') ? stage : null;

    let historyLog = pipelineLead.historyLog || [];

    if (pipelineLead.conversion !== conversion) {
      historyLog = [...historyLog, { id: crypto.randomUUID(), date: now, action: 'Conversion Update', detail: `Changed to ${conversion || 'None'}` }];
    }
    if (pipelineLead.status !== newStatus && newStatus) {
      historyLog = [...historyLog, { id: crypto.randomUUID(), date: now, action: 'Status Update', detail: `Moved to ${newStatus}` }];
    }
    if (pipelineLead.stage !== newStage && newStage) {
      historyLog = [...historyLog, { id: crypto.randomUUID(), date: now, action: 'Stage Update', detail: `Moved to ${newStage}` }];
    }

    const updatedLead = {
      ...pipelineLead,
      conversion,
      status: newStatus,
      stage: newStage,
      convertedAt: isNewlyConverted ? now : pipelineLead.convertedAt,
      statusUpdatedAt: pipelineLead.status !== newStatus ? now : pipelineLead.statusUpdatedAt,
      stageUpdatedAt: pipelineLead.stage !== newStage ? now : pipelineLead.stageUpdatedAt,
      historyLog,
      updatedAt: now
    };
    onSave(updatedLead, true);
    setShowPipelineModal(false);
    setPipelineLead(null);
  };

  const handleSave = () => {
    const isNew = !editingLead;
    const now = new Date().toISOString();
    const leadData = {
      id: editingLead ? editingLead.id : crypto.randomUUID(),
      name: DOMPurify.sanitize(name),
      phone: DOMPurify.sanitize(phone),
      email: DOMPurify.sanitize(email),
      notes: DOMPurify.sanitize(notes),
      source: DOMPurify.sanitize(source),
      conversion: editingLead ? editingLead.conversion : conversion,
      status: editingLead ? editingLead.status : status,
      stage: editingLead ? editingLead.stage : stage,
      createdAt: isNew ? now : editingLead.createdAt,
      convertedAt: editingLead ? editingLead.convertedAt : null,
      statusUpdatedAt: editingLead ? editingLead.statusUpdatedAt : null,
      stageUpdatedAt: editingLead ? editingLead.stageUpdatedAt : null,
      historyLog: isNew ? [{ id: crypto.randomUUID(), date: now, action: 'Lead Acquired', detail: `Source: ${source}` }] : (editingLead.historyLog || []),
      updatedAt: now
    };
    onSave(leadData, !!editingLead);
    setShowForm(false);
  };

  const handleDelete = useCallback((id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      const updatedLeads = leads.filter(l => l.id !== id);
      onSave(updatedLeads, 'DELETE');
    }
  }, [leads, onSave]);

  if (showPipelineModal && pipelineLead) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl mx-auto mt-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-notion-black tracking-tight">
              Update Pipeline
            </h2>
            <p className="text-base text-notion-warm-gray-500 mt-2 flex items-center gap-2">
              Currently updating:
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-notion-blue/10 text-notion-blue font-bold text-sm">
                {pipelineLead.name || 'Unnamed Lead'}
              </span>
            </p>
          </div>
          <button
            onClick={() => setShowPipelineModal(false)}
            className="px-4 py-2 text-notion-warm-gray-500 hover:text-notion-black hover:bg-zinc-100 rounded-lg text-sm font-semibold transition"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 p-8 sm:p-10 flex flex-col relative overflow-hidden">

          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-notion-blue/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col space-y-10">

            {/* STAGE 1: CONVERSION */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-sm shadow-sm z-10">1</div>
                <h3 className="text-lg font-bold text-notion-black">What was the outcome?</h3>
              </div>
              {conversion === 'yes' && (
                <div className="absolute left-4 top-8 bottom-[-40px] w-0.5 bg-zinc-200 z-0"></div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pl-12">
                <button
                  onClick={() => { setConversion('yes'); if (!status) setStatus('application'); }}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all group overflow-hidden ${conversion === 'yes' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-zinc-200 hover:border-emerald-300 hover:bg-zinc-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-zinc-500 transition-colors ${conversion === 'yes' ? 'text-emerald-500' : 'group-hover:text-emerald-400'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    </span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${conversion === 'yes' ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-300'}`}>
                      {conversion === 'yes' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${conversion === 'yes' ? 'text-emerald-800' : 'text-notion-black'}`}>Quality Lead</div>
                  <div className={`text-xs mt-1 ${conversion === 'yes' ? 'text-emerald-600' : 'text-notion-warm-gray-400'}`}>They are interested</div>
                </button>

                <button
                  onClick={() => setConversion('no')}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all group overflow-hidden ${conversion === 'no' ? 'border-rose-500 bg-rose-50 shadow-sm' : 'border-zinc-200 hover:border-rose-300 hover:bg-zinc-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-zinc-500 transition-colors ${conversion === 'no' ? 'text-rose-500' : 'group-hover:text-rose-400'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${conversion === 'no' ? 'border-rose-500 bg-rose-500' : 'border-zinc-300'}`}>
                      {conversion === 'no' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${conversion === 'no' ? 'text-rose-800' : 'text-notion-black'}`}>No</div>
                  <div className={`text-xs mt-1 ${conversion === 'no' ? 'text-rose-600' : 'text-notion-warm-gray-400'}`}>Not interested</div>
                </button>

                <button
                  onClick={() => setConversion('DNA')}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all group overflow-hidden ${conversion === 'DNA' ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-zinc-200 hover:border-amber-300 hover:bg-zinc-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-zinc-500 transition-colors ${conversion === 'DNA' ? 'text-amber-500' : 'group-hover:text-amber-400'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${conversion === 'DNA' ? 'border-amber-500 bg-amber-500' : 'border-zinc-300'}`}>
                      {conversion === 'DNA' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${conversion === 'DNA' ? 'text-amber-800' : 'text-notion-black'}`}>DNA</div>
                  <div className={`text-xs mt-1 ${conversion === 'DNA' ? 'text-amber-600' : 'text-notion-warm-gray-400'}`}>Did not answer</div>
                </button>
              </div>
            </div>

            {/* STAGE 2: STATUS */}
            {conversion === 'yes' && (
              <div className="relative animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-sm shadow-sm z-10">2</div>
                  <h3 className="text-lg font-bold text-notion-black">What is their current status?</h3>
                </div>
                {status === 'application' && (
                  <div className="absolute left-4 top-8 bottom-[-40px] w-0.5 bg-zinc-200 z-0"></div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pl-12">
                  {[
                    { id: 'application', label: 'Application', desc: 'Moving forward', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
                    { id: 'still thinking', label: 'Still Thinking', desc: 'Needs more time', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                    { id: 'did not respond', label: 'Did Not Respond', desc: 'No reply', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg> }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setStatus(s.id); if (s.id !== 'application') setStage(''); else if (!stage) setStage('still thinking'); }}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${status === s.id ? 'border-notion-blue bg-notion-blue/5 shadow-sm' : 'border-zinc-200 hover:border-notion-blue/40 hover:bg-zinc-50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-zinc-500 transition-colors ${status === s.id ? 'text-notion-blue' : 'group-hover:text-notion-blue/60'}`}>{s.icon}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${status === s.id ? 'border-notion-blue bg-notion-blue' : 'border-zinc-300'}`}>
                          {status === s.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                      </div>
                      <div className={`font-bold text-sm capitalize ${status === s.id ? 'text-notion-blue' : 'text-notion-black'}`}>{s.label}</div>
                      <div className={`text-xs mt-1 ${status === s.id ? 'text-notion-blue/70' : 'text-notion-warm-gray-400'}`}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STAGE 3: APPLICATION STAGE */}
            {conversion === 'yes' && status === 'application' && (
              <div className="relative animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 text-white font-bold text-sm shadow-sm z-10">3</div>
                  <h3 className="text-lg font-bold text-notion-black">Where are they in the application?</h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pl-12">
                  {[
                    { id: 'payment', label: 'Payment', desc: 'Fully paid', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>, color: 'purple' },
                    { id: 'visa', label: 'Visa', desc: 'Secured visa', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>, color: 'blue' },
                    { id: 'deposit', label: 'Deposit', desc: 'Partial payment', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'indigo' },
                    { id: 'still thinking', label: 'Still Thinking', desc: 'Pending decision', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'orange' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setStage(s.id)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${stage === s.id ? 'border-zinc-900 bg-zinc-900 shadow-md' : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-zinc-500 transition-colors ${stage === s.id ? 'text-white' : 'group-hover:text-zinc-700'}`}>{s.icon}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${stage === s.id ? 'border-white bg-white' : 'border-zinc-300'}`}>
                          {stage === s.id && <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full"></div>}
                        </div>
                      </div>
                      <div className={`font-bold text-sm capitalize ${stage === s.id ? 'text-white' : 'text-notion-black'}`}>{s.label}</div>
                      <div className={`text-xs mt-1 ${stage === s.id ? 'text-zinc-400' : 'text-notion-warm-gray-400'}`}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-end pt-8 mt-10 border-t border-zinc-100 z-10 relative">
            <button
              onClick={handleSavePipeline}
              className="px-8 py-3.5 bg-notion-black text-white font-bold rounded-xl text-sm hover:bg-zinc-800 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] flex items-center gap-2"
            >
              Save Pipeline Status
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </button>
          </div>

          {/* History Timeline */}
          {pipelineLead.historyLog && pipelineLead.historyLog.length > 0 && (
            <div className="mt-8 pt-8 border-t border-zinc-100 z-10 relative animate-in fade-in duration-500">
              <h3 className="text-lg font-bold text-notion-black mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-notion-warm-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Activity History
              </h3>
              <div className="space-y-4">
                {[...pipelineLead.historyLog].reverse().map((log, idx, arr) => {
                  const logDate = new Date(log.date);
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={log.id || idx} className="flex gap-4 relative group">
                      {!isLast && <div className="absolute left-4 top-8 bottom-[-16px] w-0.5 bg-zinc-100 group-hover:bg-zinc-200 transition-colors"></div>}
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-xs shrink-0 z-10 border-2 border-white shadow-sm">
                        {arr.length - idx}
                      </div>
                      <div className="bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-3 border border-zinc-100 hover:border-zinc-200 transition-colors w-full flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm text-notion-black">{log.action}</div>
                          <div className="text-xs text-notion-warm-gray-500 mt-0.5">{log.detail}</div>
                        </div>
                        <div className="text-[10px] font-semibold text-notion-warm-gray-400 text-right whitespace-nowrap ml-4 leading-tight">
                          {logDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}<br />
                          <span className="text-zinc-400">{logDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showForm) {
    const totalSteps = 2; // Step 1: Source, Step 2: Info

    const handleNext = () => {
      if (step === 1 && !source) return;

      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        handleSave();
      }
    };

    const handleBack = () => {
      if (step > 1) setStep(step - 1);
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-display-secondary text-notion-black tracking-notion-display">
            {editingLead ? 'Edit Lead' : 'Add New Lead'}
          </h2>
          <button
            onClick={() => setShowForm(false)}
            className="text-notion-warm-gray-500 hover:text-notion-black text-sm font-medium underline underline-offset-4"
          >
            ← Cancel
          </button>
        </div>

        {/* Kebab Stepper UI */}
        <div className="flex items-center justify-center mb-8">
          {[...Array(totalSteps)].map((_, i) => {
            const stepNumber = i + 1;
            const isActive = step === stepNumber;
            const isCompleted = step > stepNumber;
            return (
              <React.Fragment key={stepNumber}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold transition-colors ${isActive ? 'border-notion-blue bg-notion-blue text-white' : isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-notion-warm-gray-200 bg-white text-notion-warm-gray-400'}`}>
                  {isCompleted ? '✓' : stepNumber}
                </div>
                {stepNumber < totalSteps && (
                  <div className={`h-1 w-16 mx-2 rounded-full transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-notion-warm-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="notion-card p-8 min-h-[300px] flex flex-col">
          <div className="flex-1">
            {/* STEP 1: SOURCE */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold text-notion-black mb-2">Where did this lead come from?</h3>
                  <p className="text-sm text-notion-warm-gray-500">Manually enter the origin source of the lead.</p>
                </div>
                <div className="max-w-md mx-auto">
                  <label className="block mb-2 text-xs font-semibold text-notion-warm-gray-500 uppercase tracking-wider">Lead Source</label>
                  <input
                    type="text"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className="w-full px-4 py-3 whisper-border rounded-xl focus:outline-none focus:ring-2 focus:ring-notion-blue/50 bg-zinc-50/50 text-base"
                    placeholder="e.g., Facebook Ad, Friend Referral, Website Form..."
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* FINAL STEP: DETAILS */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold text-notion-black mb-2">Lead Information</h3>
                  <p className="text-sm text-notion-warm-gray-500">Enter the contact details and any notes.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                  <div className="col-span-2">
                    <label className="block mb-1 text-xs font-semibold text-notion-warm-gray-500 uppercase tracking-wider">Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 whisper-border rounded-lg focus:outline-none focus:ring-2 focus:ring-notion-blue/50 bg-zinc-50/50" placeholder="e.g. Jane Doe" autoFocus />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-notion-warm-gray-500 uppercase tracking-wider">Phone</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2.5 whisper-border rounded-lg focus:outline-none focus:ring-2 focus:ring-notion-blue/50 bg-zinc-50/50" placeholder="Phone Number" />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-notion-warm-gray-500 uppercase tracking-wider">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2.5 whisper-border rounded-lg focus:outline-none focus:ring-2 focus:ring-notion-blue/50 bg-zinc-50/50" placeholder="Email Address" />
                  </div>
                  <div className="col-span-2">
                    <label className="block mb-1 text-xs font-semibold text-notion-warm-gray-500 uppercase tracking-wider">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2.5 whisper-border rounded-lg focus:outline-none focus:ring-2 focus:ring-notion-blue/50 bg-zinc-50/50 min-h-[100px]" placeholder="Add any specific details here..." />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-zinc-100">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`px-6 py-2.5 font-semibold rounded-lg text-sm transition ${step === 1 ? 'opacity-0 cursor-default' : 'bg-notion-warm-white text-notion-black hover:bg-zinc-200'}`}
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !source)
              }
              className="px-8 py-2.5 bg-notion-blue text-white font-bold rounded-lg text-sm hover:bg-notion-blue-active transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {step === totalSteps ? 'Complete & Save' : 'Continue'}
              {step < totalSteps && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-8 rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-zinc-100">
        <div>
          <h2 className="text-3xl font-extrabold text-notion-black tracking-tight flex items-center gap-3">
            <span className="bg-notion-blue/10 text-notion-blue p-2 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </span>
            Lead Management
          </h2>
          <p className="text-notion-warm-gray-500 mt-2 ml-14">Track and manage your potential clients</p>
          <div className="flex flex-wrap items-center gap-4 mt-5 ml-0 sm:ml-14">
            <button onClick={() => setActiveView('list')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${activeView === 'list' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>Lead Pipeline</button>
            <button onClick={() => setActiveView('analytics')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${activeView === 'analytics' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>Analytics</button>
            <button onClick={generateSampleData} className="px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 flex items-center gap-2 ml-auto">
              ✨ Generate Sample Data
            </button>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="px-6 py-3 bg-notion-black text-white font-bold rounded-xl text-sm hover:bg-zinc-800 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Add New Lead
        </button>
      </div>

      {activeView === 'list' ? (
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-6 py-5 font-bold text-notion-warm-gray-500 uppercase tracking-wider text-[11px] w-1/4">Lead Details</th>
                  <th className="px-6 py-5 font-bold text-notion-warm-gray-500 uppercase tracking-wider text-[11px] w-1/5">Source</th>
                  <th className="px-6 py-5 font-bold text-notion-warm-gray-500 uppercase tracking-wider text-[11px] w-1/6">Outcome</th>
                  <th className="px-6 py-5 font-bold text-notion-warm-gray-500 uppercase tracking-wider text-[11px] w-1/4">Pipeline Status</th>
                  <th className="px-6 py-5 font-bold text-notion-warm-gray-500 uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center text-zinc-500 font-bold shadow-inner">
                          {(lead.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-notion-black text-base flex items-center gap-2">
                            {lead.name || 'Unnamed Lead'}
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-md tracking-wider">
                              {new Date(lead.createdAt || (lead.id && !isNaN(parseInt(lead.id)) ? parseInt(lead.id) : Date.now())).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </span>
                          </span>
                          <div className="text-xs text-notion-warm-gray-500 flex items-center gap-2 mt-0.5">
                            {lead.phone && <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{lead.phone}</span>}
                            {lead.phone && lead.email && <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>}
                            {lead.email && <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{lead.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {lead.source ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200/50">
                          {lead.source}
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-xs">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                        ${lead.conversion === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : lead.conversion === 'no' ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : lead.conversion === 'DNA' ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}
                      >
                        {lead.conversion === 'yes' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                        {lead.conversion === 'no' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                        {lead.conversion === 'DNA' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
                        {!lead.conversion && <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>}

                        {lead.conversion === 'DNA' ? 'DNA' : lead.conversion === 'yes' ? 'Quality Lead' : lead.conversion === 'no' ? 'Not Interested' : 'Pending'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {lead.conversion === 'yes' ? (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold text-notion-black capitalize flex items-center gap-2">
                            {lead.status === 'application' && <svg className="w-4 h-4 text-notion-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                            {lead.status === 'still thinking' && <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            {lead.status === 'did not respond' && <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>}
                            {lead.status || 'No Status'}
                          </span>
                          {lead.status === 'application' && (
                            <div className="flex items-center gap-2">
                              <svg className="w-3 h-3 text-zinc-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                                ${lead.stage === 'payment' ? 'bg-purple-100 text-purple-700'
                                  : lead.stage === 'deposit' ? 'bg-indigo-100 text-indigo-700'
                                    : lead.stage === 'still thinking' ? 'bg-orange-100 text-orange-700'
                                      : 'bg-zinc-100 text-zinc-500'}`}
                              >
                                {lead.stage || 'Pending'}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-300 text-sm italic">N/A</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenPipeline(lead)}
                          className="px-4 py-1.5 text-xs font-bold bg-notion-blue text-white hover:bg-notion-blue-active rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Update
                        </button>
                        <button
                          onClick={() => handleEdit(lead)}
                          className="p-2 text-zinc-400 hover:text-notion-blue hover:bg-notion-blue/10 rounded-lg transition-colors bg-zinc-50 border border-zinc-100"
                          title="Edit Info"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors bg-zinc-50 border border-zinc-100"
                          title="Delete Lead"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-400">
                        <svg className="w-16 h-16 mb-4 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <h3 className="text-lg font-bold text-zinc-600 mb-1">No leads yet</h3>
                        <p className="text-sm">Get started by adding your first lead to the pipeline.</p>
                        <button
                          onClick={handleAdd}
                          className="mt-6 px-6 py-2.5 bg-notion-blue/10 text-notion-blue font-bold rounded-xl text-sm hover:bg-notion-blue hover:text-white transition-colors"
                        >
                          + Add First Lead
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <LeadAnalytics
          leads={leads}
          onLeadClick={(lead) => {
            setActiveView('list');
            setPipelineLead(lead);
            setShowPipelineModal(true);
          }}
        />
      )}
    </div>
  );
};

export default LeadManager;
