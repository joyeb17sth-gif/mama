import re

def process(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    # Clean borders (only remove the vertical line between columns)
    c = c.replace('border-l-2', '')
    c = re.sub(r'border-l-zinc-\d+', '', c)
    c = re.sub(r'!border-r-zinc-\d+', '', c)

    # Remove Branch Total logic entirely
    # The block is wrapped in {/* Branch Total Row */}... })()}
    c = re.sub(r'\{\/\*\s*Branch Total Row\s*\*\/\}.*?\}\)\(\)\}', '', c, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

process('src/components/LeadCumulativeData.jsx')
process('src/components/LeadMonthlyReport.jsx')
print('Success')
