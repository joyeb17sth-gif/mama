// Native helpers
export const parseISO = (dateStr) => new Date(dateStr);
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
export const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

const formatYMD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatEEE = (date) => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
const formatDisplay = (date) => {
  const d = new Date(date);
  const day = d.getDate();
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d);
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);
  return `${day} ${month} (${weekday})`;
};

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
      date: formatYMD(current),
      dayName: formatEEE(current),
      dayOfWeek: current.getDay(), // 0 = Sunday, 6 = Saturday
      isWeekend: isWeekend(current),
    });
    current = addDays(current, 1);
  }
  
  return dates;
};

// Get day type for pay rate calculation
export const getDayType = (date, publicHolidays = []) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateStr = formatYMD(dateObj);
  
  // Check if it's a public holiday
  // publicHolidays can be an array of objects {id, date, name} or raw date strings
  const isPublicHoliday = publicHolidays.some(h => {
    if (typeof h === 'string') return h === dateStr;
    return h?.date === dateStr;
  });
  if (isPublicHoliday) {
    return 'publicHoliday';
  }
  
  const day = dateObj.getDay();
  
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
};

// Format date for display
export const formatDateDisplay = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDisplay(d);
};

// --- Polyfills for date-fns ---
export const differenceInDays = (dateLeft, dateRight) => Math.round((new Date(dateLeft) - new Date(dateRight)) / (1000 * 60 * 60 * 24));
export const format = (date, formatStr) => {
    const d = new Date(date);
    if (isNaN(d)) return '';
    // M, d, yyyy-MM-dd
    if (formatStr === 'yyyy-MM-dd') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (formatStr === 'MMM d, yyyy' || formatStr === 'MMM dd, yyyy' || formatStr === 'MMM d, yyy') {
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
    }
    if (formatStr === 'MMMM yyyy') {
        return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);
    }
    if (formatStr === 'MMM yyyy') {
        return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(d);
    }
    if (formatStr === 'd MMM') {
        return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(d);
    }
    if (formatStr === 'EEE') {
        return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);
    }
    
    let res = formatStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    res = res.replace(/yyyy/g, year);
    res = res.replace(/MM/g, month);
    res = res.replace(/dd/g, day);
    return res;
};
export const isValid = (date) => !isNaN(new Date(date));
export const startOfMonth = (date) => { const d = new Date(date); d.setDate(1); d.setHours(0,0,0,0); return d; };
export const endOfMonth = (date) => { const d = new Date(date); d.setMonth(d.getMonth() + 1, 0); d.setHours(23,59,59,999); return d; };
export const subMonths = (date, amount) => { const d = new Date(date); d.setMonth(d.getMonth() - amount); return d; };
export const addMonths = (date, amount) => { const d = new Date(date); d.setMonth(d.getMonth() + amount); return d; };
export const isBefore = (dateLeft, dateRight) => new Date(dateLeft) < new Date(dateRight);
export const isAfter = (dateLeft, dateRight) => new Date(dateLeft) > new Date(dateRight);
export const isSameMonth = (dateLeft, dateRight) => { const d1 = new Date(dateLeft); const d2 = new Date(dateRight); return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth(); };
export const startOfYear = (date) => { const d = new Date(date); d.setMonth(0, 1); d.setHours(0,0,0,0); return d; };
export const endOfYear = (date) => { const d = new Date(date); d.setMonth(11, 31); d.setHours(23,59,59,999); return d; };
export const addWeeks = (date, amount) => addDays(date, amount * 7);
export const startOfDay = (date) => { const d = new Date(date); d.setHours(0,0,0,0); return d; };
export const startOfWeek = (date) => { const d = new Date(date); const day = d.getDay(); d.setDate(d.getDate() - day); d.setHours(0,0,0,0); return d; };
export const endOfWeek = (date) => { const d = new Date(date); const day = d.getDay(); d.setDate(d.getDate() + (6 - day)); d.setHours(23,59,59,999); return d; };
export const isToday = (date) => { const d = new Date(date); const t = new Date(); return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate(); };
export const eachMonthOfInterval = ({ start, end }) => { 
    const d = []; 
    let current = startOfMonth(start); 
    const e = new Date(end); 
    while (current <= e) { d.push(new Date(current)); current = addMonths(current, 1); } 
    return d; 
};
export const eachDayOfInterval = ({ start, end }) => {
    const d = []; 
    let current = startOfDay(start); 
    const e = startOfDay(end); 
    while (current <= e) { d.push(new Date(current)); current = addDays(current, 1); } 
    return d; 
};
// export const parseISO is already defined in dateUtils.js
// export const addDays is already defined in dateUtils.js
// export const isWeekend is already defined in dateUtils.js
