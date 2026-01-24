import { format, addDays, startOfWeek, endOfWeek, isWeekend, parseISO } from 'date-fns';

// Get dates for a payroll period
export const getPayrollPeriodDates = (startDate, cycleType) => {
  const start = parseISO(startDate);
  let end;
  
  switch (cycleType) {
    case 'weekly':
      end = addDays(start, 6);
      break;
    case 'fortnightly':
      end = addDays(start, 13);
      break;
    default:
      // Custom range - end date should be provided
      end = start;
  }
  
  return { start, end };
};

// Generate all dates in a period
export const generatePeriodDates = (startDate, endDate) => {
  const dates = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  let current = start;
  
  while (current <= end) {
    dates.push({
      date: format(current, 'yyyy-MM-dd'),
      dayName: format(current, 'EEE'),
      dayOfWeek: current.getDay(), // 0 = Sunday, 6 = Saturday
      isWeekend: isWeekend(current),
    });
    current = addDays(current, 1);
  }
  
  return dates;
};

// Get day type for pay rate calculation
export const getDayType = (date, publicHolidays = []) => {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  
  // Check if it's a public holiday
  if (publicHolidays.includes(dateStr)) {
    return 'publicHoliday';
  }
  
  const day = typeof date === 'string' ? parseISO(date).getDay() : date.getDay();
  
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
};

// Format date for display
export const formatDateDisplay = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM (EEE)');
};
