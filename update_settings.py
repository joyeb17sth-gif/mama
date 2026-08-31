import re

def process():
    with open('src/components/LeadSettings.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add PremiumDialog import
    content = content.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport PremiumDialog from './PremiumDialog';")
    
    # Add dialogConfig state
    state_injection = """  const [newCounselor, setNewCounselor] = useState({ name: '', specialty: '', branch: 'Search Nepal' });
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });"""
    content = content.replace("  const [newCounselor, setNewCounselor] = useState({ name: '', specialty: '', branch: 'Search Nepal' });", state_injection)
    
    # Refactor handleDelete
    old_handle_delete = """  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this counselor? Their historical reports will remain in the system.')) {
      setCounselors(prev => prev.filter(c => c.id !== id));
    }
  };"""
    new_handle_delete = """  const handleDelete = (id) => {
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
  };"""
    content = content.replace(old_handle_delete, new_handle_delete)
    
    # Refactor handleClearData
    old_handle_clear = """  const handleClearData = () => {
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
  };"""
    new_handle_clear = """  const handleClearData = () => {
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
  };"""
    content = content.replace(old_handle_clear, new_handle_clear)

    # Refactor handleGenerateSampleData
    # Note: we need to rewrite this entire function carefully because of the nested generation logic
    old_generate_start = "  const handleGenerateSampleData = () => {"
    old_generate_end = """    alert("Smart sample data generated successfully!");
  };"""
    
    # We will use regex to capture the whole function and replace it.
    generate_regex = r'  const handleGenerateSampleData = \(\) => \{.*?alert\("Smart sample data generated successfully!"\);\s*\};'
    new_generate = """  const handleGenerateSampleData = () => {
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
  };"""
    content = re.sub(generate_regex, new_generate, content, flags=re.DOTALL)

    # Finally, insert <PremiumDialog {...dialogConfig} /> right before the last closing </div>
    content = content.replace("    </div>\n  );\n};", "      <PremiumDialog {...dialogConfig} />\n    </div>\n  );\n};")
    
    with open('src/components/LeadSettings.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

process()
print("LeadSettings.jsx updated successfully!")
