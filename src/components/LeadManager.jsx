import React, { useState, useEffect } from 'react';
import LeadDataInput from './LeadDataInput';
import LeadSettings from './LeadSettings';
import LeadMonthlyReport from './LeadMonthlyReport';
import LeadCumulativeData from './LeadCumulativeData';

const LeadManager = ({ leads, onSave, leadReports = [], setLeadReports, counselors = [], setCounselors }) => {
  const [activeTab, setActiveTab] = useState('input');

  const handleSaveReport = (report) => {
    if (!setLeadReports) return;
    setLeadReports(prev => {
      const existingIdx = prev.findIndex(r => r.month === report.month && r.counselorId === report.counselorId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = report;
        return updated;
      }
      return [...prev, report];
    });
  };

  return (
    <div className="p-6 w-full">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-notion-black tracking-tight mb-2">Lead Management</h2>
          <p className="text-notion-warm-gray-500 text-sm">Manage, track, and analyze your leads.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-1.5 inline-flex mb-8">
        <button
          onClick={() => setActiveTab('input')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === 'input' 
              ? 'bg-notion-blue text-white shadow-md' 
              : 'text-notion-warm-gray-500 hover:text-notion-black hover:bg-zinc-50'
          }`}
        >
          Data Input
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === 'monthly' 
              ? 'bg-notion-blue text-white shadow-md' 
              : 'text-notion-warm-gray-500 hover:text-notion-black hover:bg-zinc-50'
          }`}
        >
          Monthly Reports
        </button>
        <button
          onClick={() => setActiveTab('cumulative')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === 'cumulative' 
              ? 'bg-notion-blue text-white shadow-md' 
              : 'text-notion-warm-gray-500 hover:text-notion-black hover:bg-zinc-50'
          }`}
        >
          Cumulative Data
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === 'settings' 
              ? 'bg-notion-blue text-white shadow-md' 
              : 'text-notion-warm-gray-500 hover:text-notion-black hover:bg-zinc-50'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Tab Content Areas */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 p-8 min-h-[400px]">
        {activeTab === 'input' && (
          <LeadDataInput 
            existingReports={leadReports} 
            counselors={counselors}
            onSaveData={handleSaveReport} 
          />
        )}

        {activeTab === 'monthly' && (
          <LeadMonthlyReport 
            counselors={counselors} 
            existingReports={leadReports} 
            onSaveData={handleSaveReport}
          />
        )}

        {activeTab === 'cumulative' && (
          <LeadCumulativeData
            counselors={counselors}
            existingReports={leadReports}
          />
        )}

        {activeTab === 'settings' && (
          <LeadSettings 
            counselors={counselors} 
            setCounselors={setCounselors} 
            setLeadReports={setLeadReports}
          />
        )}
      </div>
    </div>
  );
};

export default LeadManager;
