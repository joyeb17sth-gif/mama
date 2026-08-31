import re
import sys

def remove_percentage_columns(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Update colSpans in Headers
    # In Cumulative Data:
    # <th colSpan={4} className={`${groupThClass} bg-emerald-50 text-emerald-700 `}> Application State </th>
    # <th colSpan={5} className={`${groupThClass} bg-indigo-50 text-indigo-700`}> Visa Stage </th>
    c = re.sub(r'(<th colSpan=\{)4(\}.*?>\s*Application State\s*</th>)', r'\g<1>3\g<2>', c)
    c = re.sub(r'(<th colSpan=\{)5(\}.*?>\s*Visa Stage\s*</th>)', r'\g<1>4\g<2>', c)
    
    # In Monthly Report:
    # <th colSpan={4} className={`${thClass} text-center ... !bg-emerald-50 !text-emerald-700`}> Conversions </th>
    # wait, monthly report colSpan might be different. Let's just remove the th/td tags directly.
    
    # 2. Remove the TH elements for App % and Visa %
    c = re.sub(r'<th[^>]*>\s*App %\s*</th>', '', c)
    c = re.sub(r'<th[^>]*>\s*Visa %\s*</th>', '', c)
    
    # 3. Remove the TD elements that render the percentage
    # They look like: <td className={`${tdClass} ${appRate >= 50 ? ...}`}>{appRate > 0 ? `${appRate}%` : '-'}</td>
    # Or similarly for visaRate
    # Or for branch totals / grand totals: <td className={`${footerTdClass} ...`}>{totals.totalLeads > 0 ? Math.round((totals.appApplied / totals.totalLeads) * 100) + '%' : '-'}</td>
    
    # Let's remove lines containing '%` : \'-\'}'
    c = re.sub(r'<td[^>]*>\{[^{}]*`\$\{.*?%\}`\s*:\s*\'-\'\s*\}</td>', '', c)
    
    # And lines containing '%' + '%' or + '%' in grand totals
    c = re.sub(r'<td[^>]*>\{[^{}]*\+\s*\'%\'\s*:\s*\'-\'\s*\}</td>', '', c)

    # Let's also remove the variable definitions just in case, though they won't hurt if unused (eslint might complain)
    c = re.sub(r'const appRate = .*?;\n', '', c)
    c = re.sub(r'const visaRate = .*?;\n', '', c)
    
    # Also in Monthly Report:
    # const branchAppRate = ...
    # const branchVisaRate = ...
    # And totals.appApplied / totals.totalLeads ...
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

remove_percentage_columns('src/components/LeadCumulativeData.jsx')
remove_percentage_columns('src/components/LeadMonthlyReport.jsx')
print("Percentages removed.")
