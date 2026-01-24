// Local storage utilities for the Contractor Timesheet & Payroll Management System

// Contractors
export const saveContractors = (contractors) => {
  localStorage.setItem('contractors', JSON.stringify(contractors));
};

export const getContractors = () => {
  const stored = localStorage.getItem('contractors');
  return stored ? JSON.parse(stored) : [];
};

// Sites
export const saveSites = (sites) => {
  localStorage.setItem('sites', JSON.stringify(sites));
};

export const getSites = () => {
  const stored = localStorage.getItem('sites');
  return stored ? JSON.parse(stored) : [];
};

// Site Allocations
export const saveSiteAllocations = (allocations) => {
  localStorage.setItem('siteAllocations', JSON.stringify(allocations));
};

export const getSiteAllocations = () => {
  const stored = localStorage.getItem('siteAllocations');
  return stored ? JSON.parse(stored) : [];
};

// Timesheets
export const saveTimesheets = (timesheets) => {
  localStorage.setItem('timesheets', JSON.stringify(timesheets));
};

export const getTimesheets = () => {
  const stored = localStorage.getItem('timesheets');
  return stored ? JSON.parse(stored) : [];
};

// Pay Rates
export const savePayRates = (rates) => {
  localStorage.setItem('payRates', JSON.stringify(rates));
};

export const getPayRates = () => {
  const stored = localStorage.getItem('payRates');
  return stored ? JSON.parse(stored) : [];
};

// Budgets
export const saveBudgets = (budgets) => {
  localStorage.setItem('budgets', JSON.stringify(budgets));
};

export const getBudgets = () => {
  const stored = localStorage.getItem('budgets');
  return stored ? JSON.parse(stored) : [];
};

// Training Pay
export const saveTrainingPay = (trainingPay) => {
  localStorage.setItem('trainingPay', JSON.stringify(trainingPay));
};

export const getTrainingPay = () => {
  const stored = localStorage.getItem('trainingPay');
  return stored ? JSON.parse(stored) : [];
};

// Payment Summaries
export const savePaymentSummaries = (summaries) => {
  localStorage.setItem('paymentSummaries', JSON.stringify(summaries));
};

export const getPaymentSummaries = () => {
  const stored = localStorage.getItem('paymentSummaries');
  return stored ? JSON.parse(stored) : [];
};
