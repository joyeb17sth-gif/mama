import re
import sys

def process(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Add paymentDone to formData initial state
    c = c.replace("appDroppedOut: '',", "appDroppedOut: '',\n    paymentDone: '',")
    
    # 2. Add paymentDone to blankForm
    c = c.replace("appApplied: '', appWaitingPayment: '', appDroppedOut: '',", "appApplied: '', appWaitingPayment: '', appDroppedOut: '', paymentDone: '',")
    
    # 3. Add paymentDone to the setFormData inside useEffect
    c = c.replace("appDroppedOut: existing.appDroppedOut || '',", "appDroppedOut: existing.appDroppedOut || '',\n        paymentDone: existing.paymentDone || '',")
    
    # 4. Remove useMemo for paymentDone
    c = re.sub(r'// Calculate payment done\s*const paymentDone = useMemo\(\(\) => \{.*?\},\s*\[.*?\]\);\s*', '', c, flags=re.DOTALL)
    
    # 5. Remove Step 3 validation rules
    c = re.sub(r'if \(applied > yes\) \{.*?return;\s*\}', '', c, flags=re.DOTALL)
    c = re.sub(r'if \(\(waiting \+ dropped\) > applied\) \{.*?return;\s*\}', '', c, flags=re.DOTALL)
    
    # 6. Remove Step 4 validation rule regarding Visa Lodging > paymentDone
    # The existing rule is: if (lodging > paymentDone) { ... }
    # Let's remove it because paymentDone might be from last month and lodging this month could be higher.
    c = re.sub(r'if \(lodging > paymentDone\) \{.*?return;\s*\}', '', c, flags=re.DOTALL)

    # 7. In handleSave, we no longer need to pass paymentDone separately if it's in formData
    # existing: ...formData, paymentDone };
    c = re.sub(r'\.\.\.formData,\s*paymentDone\s*\}', '...formData }', c)

    # 8. Update Step 3 UI
    # Replace the auto-calculated box with an input field
    # But wait, there are 4 inputs now. We can make the grid 2x2.
    old_grid = """<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className={labelClasses}>Applied</label>
                <input type="number" min="0" name="appApplied" value={formData.appApplied} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
              <div>
                <label className={labelClasses}>Waiting on Payment</label>
                <input type="number" min="0" name="appWaitingPayment" value={formData.appWaitingPayment} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
              <div>
                <label className={labelClasses}>Dropped Out</label>
                <input type="number" min="0" name="appDroppedOut" value={formData.appDroppedOut} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
            </div>

            <div className="mt-8 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-emerald-800">Payment Done</h4>
                <p className="text-xs text-emerald-600 mt-1">Automatically calculated (Applied - Waiting - Dropped)</p>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600">
                {paymentDone}
              </div>
            </div>"""
            
    new_grid = """<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelClasses}>Applied</label>
                <input type="number" min="0" name="appApplied" value={formData.appApplied} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
              <div>
                <label className={labelClasses}>Payment Done</label>
                <input type="number" min="0" name="paymentDone" value={formData.paymentDone} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
              <div>
                <label className={labelClasses}>Waiting on Payment</label>
                <input type="number" min="0" name="appWaitingPayment" value={formData.appWaitingPayment} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
              <div>
                <label className={labelClasses}>Dropped Out</label>
                <input type="number" min="0" name="appDroppedOut" value={formData.appDroppedOut} onChange={handleChange} className={inputClasses} placeholder="0" />
              </div>
            </div>"""
    
    # We will use regex to replace this whole block to be safe against slight whitespace differences
    c = re.sub(r'<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">.*?</div>\s*</div>', new_grid, c, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

process('src/components/LeadDataInput.jsx')
print("Successfully modified LeadDataInput.jsx")
