import { createServer } from 'vite';

// Mock minimal browser globals for browser-dependent modules
globalThis.window = {
  navigator: { userAgent: 'node' },
  atob: (str) => Buffer.from(str, 'base64').toString('binary'),
  btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
};
globalThis.document = {
  createElement: () => ({
    setAttribute: () => {},
    click: () => {},
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

// Vite plugin to mock dompurify for Node SSR environment
const mockDompurifyPlugin = {
  name: 'mock-dompurify',
  enforce: 'pre',
  resolveId(id) {
    if (id === 'dompurify' || id.includes('dompurify')) {
      return '\0mock-dompurify';
    }
  },
  load(id) {
    if (id === '\0mock-dompurify') {
      return 'export default { sanitize: (val) => val };';
    }
  }
};

async function runTests() {
  console.log('=== STARTING SYSTEM INTEGRATION TESTS ===\n');

  const vite = await createServer({
    plugins: [mockDompurifyPlugin],
    ssr: {
      noExternal: ['dompurify']
    },
    server: { middlewareMode: true },
    appType: 'custom'
  });

  let testCount = 0;
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      failCount++;
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  try {
    // 1. Load Modules via SSR (resolves import.meta.env automatically)
    console.log('Loading system utility modules...');
    const encryptionUtils = await vite.ssrLoadModule('./src/utils/encryptionUtils.js');
    const dateUtils = await vite.ssrLoadModule('./src/utils/dateUtils.js');
    const payrollCalculations = await vite.ssrLoadModule('./src/utils/payrollCalculations.js');
    const validation = await vite.ssrLoadModule('./src/utils/validation.js');
    console.log('✓ All utility modules loaded successfully!\n');

    // ==========================================
    // TEST 1: Encryption & Decryption
    // ==========================================
    console.log('--- Testing Encryption Utilities ---');
    const testPayload = { testId: 'user_9921', permission: 'admin', key: 12345 };
    const ciphertext = encryptionUtils.encryptData(testPayload);
    assert(typeof ciphertext === 'string' && ciphertext.length > 0, 'encryptData returns an encrypted string');
    
    const decrypted = encryptionUtils.decryptData(ciphertext);
    assert(decrypted !== null && decrypted.testId === testPayload.testId, 'decryptData successfully decrypts to original object');
    assert(encryptionUtils.decryptData('invalid_ciphertext') === null, 'decryptData handles invalid ciphertext by returning null');
    console.log('');

    // ==========================================
    // TEST 2: Date Utilities
    // ==========================================
    console.log('--- Testing Date Utilities ---');
    // Period dates
    const weeklyPeriod = dateUtils.getPayrollPeriodDates('2026-05-01', 'weekly');
    assert(
      weeklyPeriod.start instanceof Date && 
      weeklyPeriod.end instanceof Date && 
      weeklyPeriod.end.getDate() === 7, 
      'getPayrollPeriodDates correctly calculates weekly duration (7 days)'
    );

    const fortnightlyPeriod = dateUtils.getPayrollPeriodDates('2026-05-01', 'fortnightly');
    assert(fortnightlyPeriod.end.getDate() === 14, 'getPayrollPeriodDates correctly calculates fortnightly duration (14 days)');

    // Generate period dates array
    const generatedDates = dateUtils.generatePeriodDates('2026-05-01', '2026-05-07');
    assert(generatedDates.length === 7, 'generatePeriodDates outputs correct length');
    assert(generatedDates[0].date === '2026-05-01' && generatedDates[1].dayName === 'Sat', 'generatePeriodDates sets correct date and day labels');

    // Day type checking
    const publicHolidays = ['2026-05-01']; // May Day
    assert(dateUtils.getDayType('2026-05-01', publicHolidays) === 'publicHoliday', 'getDayType correctly flags public holidays');
    assert(dateUtils.getDayType('2026-05-03', publicHolidays) === 'sunday', 'getDayType correctly flags Sundays');
    assert(dateUtils.getDayType('2026-05-02', publicHolidays) === 'saturday', 'getDayType correctly flags Saturdays');
    assert(dateUtils.getDayType('2026-05-04', publicHolidays) === 'weekday', 'getDayType correctly flags Weekdays');
    console.log('');

    // ==========================================
    // TEST 3: Payroll Calculations
    // ==========================================
    console.log('--- Testing Payroll Calculations ---');
    const payRates = {
      weekday: 25.0,
      saturday: 35.0,
      sunday: 45.0,
      publicHoliday: 55.0
    };

    // calculateDayPay
    assert(payrollCalculations.calculateDayPay(4, 'weekday', payRates) === 100, 'calculateDayPay works for weekdays');
    assert(payrollCalculations.calculateDayPay(2, 'sunday', payRates) === 90, 'calculateDayPay works for sundays');

    // checkBudgetStatus
    const budgetCheck = payrollCalculations.checkBudgetStatus(12, 350, 10, 300);
    assert(budgetCheck.withinBudget === false, 'checkBudgetStatus correctly flags budget breaches');
    assert(budgetCheck.hoursOver === 2 && budgetCheck.amountOver === 50, 'checkBudgetStatus outputs correct hours/amount breaches');

    // calculateTimesheetPay (Daily mode)
    const timesheetEntryDaily = {
      manualLumpSumHours: null,
      allowance: 15,
      otherPay: 0,
      customAddition: 5,
      deduction: 10,
      dailyHours: [
        { date: '2026-05-04', hours: 8, isTraining: false, isPH: false }, // Mon (weekday) = 8 * 25 = 200
        { date: '2026-05-02', hours: 4, isTraining: false, isPH: false }, // Sat = 4 * 35 = 140
        { date: '2026-05-03', hours: 2, isTraining: true, isPH: false }   // Sun (training) = 2 * 45 = 90
      ],
      extraHours: 0
    };
    
    // Regular pay: 200 + 140 = 340. Net pay: 340 + 15 (allowance) + 5 (custom) - 10 (deduction) = 350.
    // Training pay: 90.
    const calcDailyResult = payrollCalculations.calculateTimesheetPay(timesheetEntryDaily, payRates, []);
    assert(calcDailyResult.totalHours === 12, 'calculateTimesheetPay parses correct total hours');
    assert(calcDailyResult.totalPay === 340, 'calculateTimesheetPay calculates correct total regular pay');
    assert(calcDailyResult.trainingPay === 90 && calcDailyResult.trainingHours === 2, 'calculateTimesheetPay calculates correct training metrics');
    assert(calcDailyResult.netPay === 350, 'calculateTimesheetPay calculates correct net pay with allowances and deductions');

    // calculateTimesheetPay (Manual lump sum mode)
    const timesheetEntryManual = {
      manualLumpSumHours: {
        weekday: 10,
        saturday: 2,
        sunday: 0,
        publicHoliday: 0
      },
      allowance: 0,
      otherPay: 0,
      customAddition: 0,
      deduction: 0,
      extraHours: 1 // Weekday extra hours
    };
    // Pay: (10 + 1) * 25 + 2 * 35 = 275 + 70 = 345
    const calcManualResult = payrollCalculations.calculateTimesheetPay(timesheetEntryManual, payRates, []);
    assert(calcManualResult.totalHours === 13, 'calculateTimesheetPay (manual) sums correct hours');
    assert(calcManualResult.netPay === 345, 'calculateTimesheetPay (manual) calculates correct net pay including extra hours');
    console.log('');

    // ==========================================
    // TEST 4: Data Validation & Sanitization
    // ==========================================
    console.log('--- Testing Input Validation & Sanitization ---');
    
    // Sanitization
    const dirtyString = '  Safe Text  ';
    const cleanedString = validation.sanitize(dirtyString);
    assert(cleanedString === 'Safe Text', 'sanitize trims surrounding whitespace');

    // Auth Validation Schema
    const validAuth = { email: 'test@example.com', password: 'password123' };
    const authResult = validation.validateData(validation.AuthSchema, validAuth);
    assert(authResult.success === true, 'AuthSchema validates correct login data');
    assert(authResult.data.email === 'test@example.com', 'AuthSchema parses emails successfully');

    const invalidAuth = { email: 'bad-email', password: '123' };
    const authResultBad = validation.validateData(validation.AuthSchema, invalidAuth);
    assert(authResultBad.success === false, 'AuthSchema catches invalid emails and short passwords');
    console.log('');

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('=== TEST SUITE COMPLETED ===');
    console.log(`Total tests run: ${testCount}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);

    if (failCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  } finally {
    await vite.close();
  }
}

runTests();
