import re

def process():
    with open('src/components/LeadDataInput.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update initial state and blankForm
    content = content.replace("appDroppedOut: '',", "appWaitingApplication: '', appDropoutThisMonth: '', appDropoutPrevMonth: '',")

    # 2. Update existing load logic
    # Find: appDroppedOut: existing.appDroppedOut || '',
    load_regex = r"appDroppedOut:\s*existing\.appDroppedOut\s*\|\|\s*'',"
    new_load = "appWaitingApplication: existing.appWaitingApplication || '',\n        appDropoutThisMonth: existing.appDropoutThisMonth || existing.appDroppedOut || '',\n        appDropoutPrevMonth: existing.appDropoutPrevMonth || '',"
    content = re.sub(load_regex, new_load, content)

    # 3. Add validation logic for step === 3
    # Find the block inside `if (step === 3)`
    step3_validation_find = """    if (step === 3) {
      const yes = parseInt(formData.convYes) || 0;
      const applied = parseInt(formData.appApplied) || 0;
      const waiting = parseInt(formData.appWaitingPayment) || 0;
      const dropped = parseInt(formData.appDroppedOut) || 0;
    }"""
    # Wait, the code doesn't have the closing brace right there, there are no validation blocks inside step === 3!
    # Let's check exactly what is inside `if (step === 3) {`
    
    # We saw earlier:
    # 153:    if (step === 3) {
    # 154:      const yes = parseInt(formData.convYes) || 0;
    # 155:      const applied = parseInt(formData.appApplied) || 0;
    # 156:      const waiting = parseInt(formData.appWaitingPayment) || 0;
    # 157:      const dropped = parseInt(formData.appDroppedOut) || 0;
    # 164:    setError('');
    
    # Let's replace the whole step 3 block.
    # regex to capture `if (step === 3) { ... }` up to the next `setError('');\n    setStep(prev => prev + 1);`
    # actually it's easier to just replace from `if (step === 3) {` up to `setError('');` right before `setStep`
    step3_block_regex = r"    if \(step === 3\) \{.*?\}(?=\s*setError\(''\);\s*setStep\(prev => prev \+ 1\);)"
    
    new_step3_block = """    if (step === 3) {
      const yes = parseInt(formData.convYes) || 0;
      const applied = parseInt(formData.appApplied) || 0;
      const waitingApp = parseInt(formData.appWaitingApplication) || 0;
      const dropoutThis = parseInt(formData.appDropoutThisMonth) || 0;
      
      if (yes !== (applied + waitingApp + dropoutThis)) {
        setError(`Application outcomes (${applied} + ${waitingApp} + ${dropoutThis} = ${applied + waitingApp + dropoutThis}) must equal Total 'Yes' Conversions (${yes}).`);
        return;
      }
    }"""
    content = re.sub(step3_block_regex, new_step3_block, content, flags=re.DOTALL)

    # 4. Update the UI for Step 3
    # Find the UI block for Step 3.
    # It starts with `<h3 className="text-xl font-bold text-notion-black mb-6">Application & Payment Phase</h3>`
    # We'll replace the entire block from the h3 down to the `</div>` before `</div>` ending step 3.
    
    ui_find = r'<h3 className="text-xl font-bold text-notion-black mb-6">Application & Payment Phase</h3>.*?(?=          </div>\s*\}\)\s*\{\/\* STEP 4: VISA \*\/)'
    
    new_ui = """<h3 className="text-xl font-bold text-notion-black mb-6">Application & Payment Phase</h3>
            
            <div className="mb-6 flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-sm font-bold text-zinc-500">Applied + Wait (App) + Dropout (This) vs Total 'Yes' Conversions:</span>
              <span className={`text-lg font-bold ${
                ((parseInt(formData.appApplied) || 0) + (parseInt(formData.appWaitingApplication) || 0) + (parseInt(formData.appDropoutThisMonth) || 0)) === (parseInt(formData.convYes) || 0)
                ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {((parseInt(formData.appApplied) || 0) + (parseInt(formData.appWaitingApplication) || 0) + (parseInt(formData.appDropoutThisMonth) || 0))}
                <span className="text-sm text-zinc-400 mx-1">/</span> 
                {parseInt(formData.convYes) || 0}
              </span>
            </div>
            
            <div className="mb-6">
              <label className={labelClasses}>Total Applied</label>
              <input type="number" min="0" name="appApplied" value={formData.appApplied} onChange={handleChange} className={inputClasses} placeholder="0" />
            </div>

            <div className="pt-4 border-t border-zinc-100 mb-6">
              <h4 className="text-sm font-bold text-notion-black mb-4">Conversion Outcomes (Must sum to Total Yes)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClasses}>Waiting on Application</label>
                  <input type="number" min="0" name="appWaitingApplication" value={formData.appWaitingApplication} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>This Month Dropout (Before App)</label>
                  <input type="number" min="0" name="appDropoutThisMonth" value={formData.appDropoutThisMonth} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <h4 className="text-sm font-bold text-notion-black mb-4">Application Outcomes & Carryover Updates</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className={labelClasses}>Payment Done</label>
                  <input type="number" min="0" name="paymentDone" value={formData.paymentDone} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>Waiting on Payment</label>
                  <input type="number" min="0" name="appWaitingPayment" value={formData.appWaitingPayment} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
                <div>
                  <label className={labelClasses}>Previous Month Dropout (Late)</label>
                  <input type="number" min="0" name="appDropoutPrevMonth" value={formData.appDropoutPrevMonth} onChange={handleChange} className={inputClasses} placeholder="0" />
                </div>
              </div>
            </div>
"""
    content = re.sub(ui_find, new_ui, content, flags=re.DOTALL)

    with open('src/components/LeadDataInput.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

process()
print("LeadDataInput updated.")
