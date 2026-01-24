import { getDayType } from './dateUtils';

// Calculate payable amount for a day
export const calculateDayPay = (hours, dayType, payRates) => {
  const rate = payRates[dayType] || 0;
  return hours * rate;
};

// Calculate total payable for a timesheet entry
export const calculateTimesheetPay = (timesheetEntry, payRates, publicHolidays = []) => {
  let totalHours = 0;
  let totalPay = 0;
  
  timesheetEntry.dailyHours?.forEach(day => {
    if (day.hours > 0) {
      const dayType = getDayType(day.date, publicHolidays);
      const dayPay = calculateDayPay(day.hours, dayType, payRates);
      totalHours += day.hours;
      totalPay += dayPay;
    }
  });
  
  // If manual lump sum is set, use that instead
  if (timesheetEntry.manualLumpSumHours) {
    totalHours = timesheetEntry.manualLumpSumHours;
    totalPay = totalHours * (payRates.weekday || 0); // Default to weekday rate for lump sum
  }
  
  return { totalHours, totalPay };
};

// Check if budget is exceeded
export const checkBudgetStatus = (actualHours, actualAmount, budgetedHours, budgetedAmount) => {
  const hoursOver = Math.max(0, actualHours - budgetedHours);
  const amountOver = Math.max(0, actualAmount - budgetedAmount);
  
  return {
    withinBudget: hoursOver === 0 && amountOver === 0,
    hoursOver,
    amountOver,
    regularHours: Math.min(actualHours, budgetedHours),
    extraHours: hoursOver,
    regularAmount: Math.min(actualAmount, budgetedAmount),
    extraAmount: amountOver,
  };
};

// Consolidate payments across multiple sites for a contractor
export const consolidateContractorPay = (contractorId, timesheets, payRates, publicHolidays = []) => {
  const contractorTimesheets = timesheets.filter(
    ts => ts.contractorId === contractorId && ts.status === 'approved'
  );
  
  let totalHours = 0;
  let totalPay = 0;
  const siteBreakdown = [];
  
  contractorTimesheets.forEach(timesheet => {
    const calculation = calculateTimesheetPay(timesheet, payRates, publicHolidays);
    totalHours += calculation.totalHours;
    totalPay += calculation.totalPay;
    
    siteBreakdown.push({
      siteId: timesheet.siteId,
      siteName: timesheet.siteName,
      hours: calculation.totalHours,
      pay: calculation.totalPay,
    });
  });
  
  return {
    contractorId,
    totalHours,
    totalPay,
    siteBreakdown,
  };
};

// Calculate training pay accumulation
export const calculateTrainingPay = (timesheetEntry, payRates, publicHolidays = []) => {
  let trainingHours = 0;
  let trainingPay = 0;
  let trainingDays = 0;
  
  timesheetEntry.dailyHours?.forEach(day => {
    if (day.isTraining && day.hours > 0) {
      const dayType = getDayType(day.date, publicHolidays);
      const dayPay = calculateDayPay(day.hours, dayType, payRates);
      trainingHours += day.hours;
      trainingPay += dayPay;
      trainingDays += 1;
    }
  });
  
  return { trainingHours, trainingPay, trainingDays };
};
