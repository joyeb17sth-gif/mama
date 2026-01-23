// Local storage utilities for employee data
export const saveEmployees = (employees) => {
  localStorage.setItem('employees', JSON.stringify(employees));
};

export const getEmployees = () => {
  const stored = localStorage.getItem('employees');
  return stored ? JSON.parse(stored) : [];
};

export const savePayslips = (payslips) => {
  localStorage.setItem('payslips', JSON.stringify(payslips));
};

export const getPayslips = () => {
  const stored = localStorage.getItem('payslips');
  return stored ? JSON.parse(stored) : [];
};
