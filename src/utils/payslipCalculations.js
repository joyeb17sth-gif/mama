// Payslip calculation utilities
export const calculatePayslip = (employee, salary, allowances = 0, deductions = 0, month, year) => {
  const basicSalary = parseFloat(salary) || 0;
  const totalAllowances = parseFloat(allowances) || 0;
  const totalDeductions = parseFloat(deductions) || 0;
  
  // Calculate gross salary
  const grossSalary = basicSalary + totalAllowances;
  
  // Calculate net salary
  const netSalary = grossSalary - totalDeductions;
  
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    employeeIdNumber: employee.employeeId || 'N/A',
    designation: employee.designation || 'N/A',
    department: employee.department || 'N/A',
    month,
    year,
    basicSalary,
    allowances: totalAllowances,
    deductions: totalDeductions,
    grossSalary,
    netSalary,
    currency: 'USD',
    generatedDate: new Date().toISOString(),
  };
};
