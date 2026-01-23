import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePDF = (payslip, companyInfo = {}) => {
  const doc = new jsPDF();
  
  // Company Information
  const companyName = companyInfo.name || 'Your Company Name';
  const companyAddress = companyInfo.address || 'Company Address';
  const companyPhone = companyInfo.phone || 'Phone: N/A';
  const companyEmail = companyInfo.email || 'Email: N/A';
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, 20, { align: 'center' });
  
  // Company Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, 105, 30, { align: 'center' });
  doc.setFontSize(10);
  doc.text(companyAddress, 105, 36, { align: 'center' });
  doc.text(companyPhone, 105, 42, { align: 'center' });
  doc.text(companyEmail, 105, 48, { align: 'center' });
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, 55, 190, 55);
  
  let yPos = 65;
  
  // Employee Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${payslip.employeeName}`, 20, yPos);
  yPos += 7;
  doc.text(`Employee ID: ${payslip.employeeIdNumber}`, 20, yPos);
  yPos += 7;
  doc.text(`Designation: ${payslip.designation}`, 20, yPos);
  yPos += 7;
  doc.text(`Department: ${payslip.department}`, 20, yPos);
  yPos += 7;
  doc.text(`Pay Period: ${payslip.month} ${payslip.year}`, 20, yPos);
  yPos += 15;
  
  // Salary Details Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Salary Details', 20, yPos);
  yPos += 10;
  
  const salaryData = [
    ['Description', 'Amount'],
    ['Basic Salary', `${payslip.currency} ${payslip.basicSalary.toFixed(2)}`],
    ['Allowances', `${payslip.currency} ${payslip.allowances.toFixed(2)}`],
    ['Gross Salary', `${payslip.currency} ${payslip.grossSalary.toFixed(2)}`],
    ['Deductions', `${payslip.currency} ${payslip.deductions.toFixed(2)}`],
    ['Net Salary', `${payslip.currency} ${payslip.netSalary.toFixed(2)}`],
  ];
  
  doc.autoTable({
    startY: yPos,
    head: [salaryData[0]],
    body: salaryData.slice(1),
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 70, halign: 'right' },
    },
  });
  
  // Footer
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated document. No signature required.', 105, finalY, { align: 'center' });
  doc.text(`Generated on: ${new Date(payslip.generatedDate).toLocaleDateString()}`, 105, finalY + 7, { align: 'center' });
  
  // Save the PDF
  const fileName = `Payslip_${payslip.employeeName}_${payslip.month}_${payslip.year}.pdf`;
  doc.save(fileName);
};
