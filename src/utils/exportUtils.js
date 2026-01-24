// Export utilities for CSV/Excel export

// Export payment summary to CSV
export const exportPaymentSummaryToCSV = (paymentSummary, contractors) => {
  const headers = [
    'Contractor ID',
    'Contractor Name',
    'BSB',
    'Account Number',
    'Account Name',
    'Total Hours',
    'Total Payable Amount',
    'Site Breakdown',
  ];
  
  const rows = paymentSummary.map(payment => {
    const contractor = contractors.find(c => c.id === payment.contractorId);
    const siteBreakdown = payment.siteBreakdown
      .map(s => `${s.siteName}: ${s.hours}h / $${s.pay.toFixed(2)}`)
      .join('; ');
    
    return [
      contractor?.contractorId || '',
      contractor?.name || '',
      contractor?.bsb || '',
      contractor?.accountNumber || '',
      contractor?.accountName || '',
      payment.totalHours.toFixed(2),
      payment.totalPay.toFixed(2),
      siteBreakdown,
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  // Create blob and download
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
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
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
