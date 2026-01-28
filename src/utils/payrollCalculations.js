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
  let trainingHours = 0;
  let trainingPay = 0;

  // Determine if we are in Manual Mode (Lump Sum)
  const isManual = timesheetEntry.manualLumpSumHours !== null;

  const hoursByRateType = {
    weekday: 0,
    saturday: 0,
    sunday: 0,
    publicHoliday: 0
  };

  if (isManual) {
    // MODE 1: Manual Lump Sum Calculation
    const manualData = timesheetEntry.manualLumpSumHours;
    if (typeof manualData === 'object') {
      const rateTypes = ['weekday', 'saturday', 'sunday', 'publicHoliday'];
      rateTypes.forEach(type => {
        const hrs = parseFloat(manualData[type]) || 0;
        if (hrs > 0) {
          totalHours += hrs;
          totalPay += hrs * (payRates[type] || 0);
          hoursByRateType[type] += hrs;
        }
      });
    } else {
      // Legacy fallback
      totalHours = parseFloat(manualData) || 0;
      totalPay = totalHours * (payRates.weekday || 0);
      hoursByRateType.weekday = totalHours;
    }
  } else {
    // MODE 2: Standard Daily Hours Calculation
    timesheetEntry.dailyHours?.forEach(day => {
      if (day.hours > 0) {
        const dayType = day.isPH ? 'publicHoliday' : getDayType(day.date, publicHolidays);
        const dayPay = calculateDayPay(day.hours, dayType, payRates);

        if (day.isTraining) {
          trainingHours += day.hours;
          trainingPay += dayPay;
        } else {
          totalHours += day.hours;
          totalPay += dayPay;
          hoursByRateType[dayType] += day.hours;
        }
      }
    });
  }

  // Add Extra Hours if present
  if (timesheetEntry.extraHours > 0) {
    const extraPay = timesheetEntry.extraHours * (payRates.weekday || 0);
    totalHours += timesheetEntry.extraHours;
    totalPay += extraPay;
    hoursByRateType.weekday += timesheetEntry.extraHours;
  }

  const allowance = parseFloat(timesheetEntry.allowance) || 0;
  const otherPay = parseFloat(timesheetEntry.otherPay) || 0;
  const deduction = parseFloat(timesheetEntry.deduction) || 0;
  const netPay = totalPay + allowance + otherPay - deduction;

  return {
    totalHours,
    totalPay,
    trainingHours,
    trainingPay,
    allowance,
    otherPay,
    deduction,
    netPay,
    hoursByRateType // Added for detailed payslips
  };
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
      const dayType = day.isPH ? 'publicHoliday' : getDayType(day.date, publicHolidays);
      const dayPay = calculateDayPay(day.hours, dayType, payRates);
      trainingHours += day.hours;
      trainingPay += dayPay;
      trainingDays += 1;
    }
  });

  return { trainingHours, trainingPay, trainingDays };
};
