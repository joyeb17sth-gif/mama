import re

def process():
    with open('src/components/LeadDataInput.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add PremiumDialog import
    content = content.replace("import React, { useState, useMemo, useEffect, useRef } from 'react';", "import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport PremiumDialog from './PremiumDialog';")
    
    # Add dialogConfig state
    state_injection = """  const [selectedCounselorId, setSelectedCounselorId] = useState('');
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });"""
    content = content.replace("  const [selectedCounselorId, setSelectedCounselorId] = useState('');", state_injection)
    
    # Refactor handleSave
    old_handle_save = """    // Reset and return to grid
    setStep(1);
    setSelectedCounselorId('');
    setSelectedMonthForInput(null);
    alert('Report saved locally and will sync to the cloud automatically.');
  };"""
    new_handle_save = """    // Reset and return to grid
    setStep(1);
    setSelectedCounselorId('');
    setSelectedMonthForInput(null);
    setDialogConfig({
      isOpen: true,
      type: 'success',
      title: 'Report Saved',
      message: 'Report saved locally and will sync to the cloud automatically.',
      confirmText: 'Awesome',
      onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
    });
  };"""
    content = content.replace(old_handle_save, new_handle_save)

    # Finally, insert <PremiumDialog {...dialogConfig} /> before the closing </div>
    # It's at the very end of the file
    content = content.replace("    </div>\n  );\n};", "      <PremiumDialog {...dialogConfig} />\n    </div>\n  );\n};")
    
    with open('src/components/LeadDataInput.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

process()
print("LeadDataInput.jsx updated successfully!")
