// Export utilities for CSV/Excel export

// Characters that spreadsheet apps (Excel, Sheets, LibreOffice) may treat as the
// start of a formula. Cells beginning with one of these are prefixed with a single
// quote so they are rendered as literal text (OWASP CSV-injection guidance).
const CSV_FORMULA_TRIGGERS = ['=', '+', '@', '\t', '\r'];

// Turn any value into a safe, RFC-4180-compliant CSV field:
//  1. Neutralize formula injection by prefixing a leading quote when needed.
//  2. Escape embedded double-quotes by doubling them.
//  3. Wrap the whole value in double-quotes (also protects commas/newlines).
// Well-formed numbers (incl. negatives like "-50.00") are left intact.
const sanitizeCsvCell = (value) => {
  let str = value === null || value === undefined ? '' : String(value);

  const isPlainNumber = /^-?\d+(\.\d+)?$/.test(str);
  if (str.length > 0 && !isPlainNumber) {
    const first = str[0];
    if (CSV_FORMULA_TRIGGERS.includes(first) || first === '-') {
      str = `'${str}`;
    }
  }

  return `"${str.replace(/"/g, '""')}"`;
};

// Export payment summary to CSV
export const exportPaymentSummaryToCSV = (paymentSummary, contractors) => {
  // 1. Find all unique site names across all payments to create dynamic columns
  const allSiteNames = new Set();
  paymentSummary.forEach(payment => {
    payment.siteBreakdown.forEach(site => {
      allSiteNames.add(site.siteName);
    });
  });

  // Sort site names to keep Training Pay Release at the end if possible
  const sortedSiteNames = Array.from(allSiteNames).sort((a, b) => {
    if (a === 'Training Pay Release') return 1;
    if (b === 'Training Pay Release') return -1;
    return a.localeCompare(b);
  });

  const headers = [
    'Contractor ID',
    'Contractor Name',
    ...sortedSiteNames,
    'Net Pay',
    'Account Details'
  ];

  const rows = paymentSummary.map(payment => {
    const contractor = contractors.find(c => c.id === payment.contractorId);

    // Create a map of site earnings for this contractor (net, matching the on-screen table)
    const siteEarnings = {};
    payment.siteBreakdown.forEach(s => {
      siteEarnings[s.siteName] = s.netPay.toFixed(2);
    });

    // Format Account Details
    const accountDetails = [
      `Account Name : ${contractor?.accountName || ''}`,
      `BSB : ${contractor?.bsb || ''}`,
      `Account no : ${contractor?.accountNumber || ''}`
    ].join('\n');

    // Build the row
    const row = [
      contractor?.contractorId || '',
      contractor?.name || '',
    ];

    // Add earnings for each dynamic site column
    sortedSiteNames.forEach(siteName => {
      row.push(siteEarnings[siteName] || '0.00');
    });

    // Add Net Pay after sites (true net: pay + allowances/other/custom − deductions,
    // including training releases — matches payment.totalNetPay shown on screen)
    row.push(payment.totalNetPay.toFixed(2));

    // Add Account Details at the very end
    row.push(accountDetails);

    return row;
  });

  const csvContent = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map(row => row.map(sanitizeCsvCell).join(',')),
  ].join('\n');

  // Create blob and download
  const confirmExport = window.confirm(
    'WARNING: This CSV file contains sensitive banking details (BSB, Account Numbers, Account Names).\n\nPlease store this file securely and do not share it via unencrypted channels.'
  );
  if (!confirmExport) return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `payment_summary_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export timesheet to CSV
export const exportTimesheetToCSV = (timesheet, contractors, dates) => {
  const contractor = contractors.find(c => c.id === timesheet.contractorId);
  const headers = ['Employee Name', ...dates.map(d => d.date), 'Total Hours', 'Rate', 'Payable Amount'];

  const rows = timesheet.entries.map(entry => {
    const entryContractor = contractors.find(c => c.id === entry.contractorId);
    const dailyHours = dates.map(d => {
      const dayEntry = entry.dailyHours?.find(dh => dh.date === d.date);
      return dayEntry?.hours || 0;
    });

    const totalHours = dailyHours.reduce((sum, h) => sum + h, 0);
    const rate = entry.rate || 0;
    const payable = totalHours * rate;

    return [
      entryContractor?.name || '',
      ...dailyHours.map(h => h.toFixed(2)),
      totalHours.toFixed(2),
      rate.toFixed(2),
      payable.toFixed(2),
    ];
  });

  const csvContent = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map(row => row.map(sanitizeCsvCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `timesheet_${timesheet.siteName}_${timesheet.periodStart}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
