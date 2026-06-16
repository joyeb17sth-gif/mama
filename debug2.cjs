const { parseISO, isBefore, startOfDay, format } = require('date-fns');

const exactDateStr = '2026-06-10';
const endDateStr = '2026-06-15';
const schedule = { targetPeriod: '2026-05' };
const today = new Date('2026-06-08');

const monthDate = parseISO(`${schedule.targetPeriod}-01`);
let isPastDue = false;
let scheduleDate = monthDate;
let scheduleEndDate = monthDate;

let displayExactDate = exactDateStr;
if (exactDateStr && exactDateStr !== 'Not Set') {
  const parts = exactDateStr.split('-');
  if (parts.length === 3) {
    let exactYear = parseInt(schedule.targetPeriod.split('-')[0], 10);
    const targetMonth = parseInt(schedule.targetPeriod.split('-')[1], 10);
    const exactMonth = parseInt(parts[1], 10);
    if (exactMonth < targetMonth && (targetMonth - exactMonth) >= 6) {
       exactYear += 1;
    }
    displayExactDate = `${exactYear}-${parts[1]}-${parts[2]}`;
  }
  const parsed = parseISO(displayExactDate);
  if (!isNaN(parsed)) {
    scheduleDate = parsed;
    scheduleEndDate = parsed;
    if (isBefore(parsed, today)) {
      isPastDue = true;
    }
  }
}

let displayEndDate = endDateStr;
if (endDateStr) {
  const parts = endDateStr.split('-');
  if (parts.length === 3) {
    let endYear = displayExactDate && displayExactDate !== 'Not Set' 
        ? parseInt(displayExactDate.split('-')[0], 10) 
        : parseInt(schedule.targetPeriod.split('-')[0], 10);
    const endMonth = parseInt(parts[1], 10);
    
    if (displayExactDate && displayExactDate !== 'Not Set') {
      const exactMonth = parseInt(displayExactDate.split('-')[1], 10);
      if (endMonth < exactMonth) {
        endYear += 1;
      }
    } else {
      const targetMonth = parseInt(schedule.targetPeriod.split('-')[1], 10);
      if (endMonth < targetMonth && (targetMonth - endMonth) >= 6) {
        endYear += 1;
      }
    }
    
    displayEndDate = `${endYear}-${parts[1]}-${parts[2]}`;
    const parsedEnd = parseISO(displayEndDate);
    if (!isNaN(parsedEnd)) {
       scheduleEndDate = parsedEnd;
    }
  }
}

const item = {
  scheduleDate,
  scheduleEndDate
};

const day = parseISO('2026-05-10');
const start = startOfDay(item.scheduleDate);
const end = startOfDay(item.scheduleEndDate);
const current = startOfDay(day);

console.log("start:", start);
console.log("end:", end);
console.log("current:", current);
console.log("current.getTime() >= start.getTime():", current.getTime() >= start.getTime());
console.log("current.getTime() <= end.getTime():", current.getTime() <= end.getTime());
