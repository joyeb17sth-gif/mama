# `legacy/` — Archived (hidden) code, preserved for future use

**Archived on:** 2026-08-25

This folder holds code that is **not part of the live application**. It was moved
out of `src/` on purpose so it is **excluded from the Vite build and never shipped
to users**, while being **preserved intact** for possible revival later.

Nothing here is imported by any live module. The production build was re-run after
archiving and compiles cleanly (`✓ 835 modules transformed`) with everything below
removed from the module graph.

> **Do not delete.** These files are kept deliberately for future reuse.

---

## Why these files were hidden

The app began as a **payslip / timesheet / contractor-payroll generator** and later
pivoted to a **facilities + leads CRM + multi-company P&L** tool ("Seetal
Management"). The original payroll subsystem and an old lead-analytics screen were
disconnected from the navigation but the source files were left behind as unreachable
dead code. A dead-code reachability analysis confirmed none of these modules are
reachable from `src/main.jsx` → `src/App.jsx`. They are archived here rather than
deleted so the payroll/timesheet feature set can be revived without rebuilding it
from scratch.

---

## What's here

### `legacy/components/` — 19 components

**Timesheet / payroll cluster** (self-contained; these import each other and the
archived utils below):

| File | Purpose |
|------|---------|
| `TimesheetEntry.jsx` | Enter timesheet hours per contractor/site. Imports `ContractorForm`, uses `payrollCalculations`. |
| `TimesheetList.jsx` | List/manage saved timesheets. |
| `PaymentSummary.jsx` | Consolidated pay summary + CSV export. Imports `Payslip`, uses `payrollCalculations` + `exportUtils`. |
| `Payslip.jsx` | Individual payslip view. |
| `PayslipForm.jsx` | Payslip create/edit form. |
| `ContractorForm.jsx` | Add/edit a contractor. |
| `ContractorList.jsx` | List/manage contractors. |
| `EmployeeForm.jsx` | Add/edit an employee. |
| `EmployeeList.jsx` | List/manage employees. |
| `PayRateConfiguration.jsx` | Per-site / per-role pay-rate setup. |
| `GlobalRatesConfig.jsx` | Global default pay rates. |
| `SiteAllocation.jsx` | Allocate contractors/employees to sites. |
| `PublicHolidayManager.jsx` | Manage public-holiday dates for pay calc. |
| `TrainingEscrowManager.jsx` | Track/release withheld training pay. |
| `AuditLogViewer.jsx` | View action/audit log entries. |

**Lead-analytics cluster** (self-contained):

| File | Purpose |
|------|---------|
| `LeadAnalytics.jsx` | Old lead analytics dashboard. Imports the two below. |
| `LeadCohortDashboard.jsx` | Cohort breakdown chart. |
| `YearlyAnalyticsChart.jsx` | Yearly analytics chart. |

**Standalone:**

| File | Purpose |
|------|---------|
| `InitialSetup.jsx` | First-run admin-account setup screen. Was already disabled in `App.jsx` (render + trigger commented out); its now-removed import was the only thing keeping it bundled. |

### `legacy/utils/` — 3 utilities

| File | Purpose | Used by |
|------|---------|---------|
| `payrollCalculations.js` | Pay/budget calc helpers (`consolidateContractorPay`, `calculateTimesheetPay`, `checkBudgetStatus`). | `PaymentSummary`, `TimesheetEntry` |
| `exportUtils.js` | CSV export (`exportPaymentSummaryToCSV`, `exportTimesheetToCSV`). | `PaymentSummary` |
| `payslipCalculations.js` | Payslip math helpers. | *No importer found anywhere* — fully orphaned. |

---

## ⚠️ Known issues to fix BEFORE reviving

These were found during the project audit and are **not yet fixed** (they live only
in dead code, so they cannot affect users while archived):

1. **`components/PaymentSummary.jsx` — will crash on render.** It references
   `handleSelectAll` and `selectedContractors`, which are **undefined** in the
   component (a "select all" checkbox was never wired up). Reviving this screen as-is
   throws a `ReferenceError`. Define the handler + state before re-enabling.

2. **`utils/exportUtils.js` → `exportTimesheetToCSV` — payable is always `0`.** It
   computes `const rate = entry.rate || 0`, but timesheet entries carry a `rates`
   **object**, not a scalar `entry.rate`. So `rate` is always `0` and every
   "Payable Amount" exports as `0.00`. Map the correct rate before reviving.

### Already fixed (2026-08-25) in `utils/exportUtils.js`
These were corrected **before** archiving, so the archived copy is the good version:
- **CSV formula injection** — cells/headers starting with `= + - @` tab/CR are now
  prefixed with `'` and quotes are RFC-4180 escaped (`sanitizeCsvCell`).
- **Gross vs. net error** in `exportPaymentSummaryToCSV` — site columns now use
  `s.netPay` and the total uses `payment.totalNetPay`, matching the on-screen table.

---

## How to revive

1. **Move files back into `src/`**, preserving names:
   - `legacy/components/*.jsx` → `src/components/`
   - `legacy/utils/*.js` → `src/utils/`
   ```bash
   git mv legacy/components/*.jsx src/components/
   git mv legacy/utils/*.js src/utils/
   ```
   The internal relative imports (`./Sibling`, `../utils/…`) resolve automatically
   once the files are back in their original `src/` locations.
2. **Fix the two known issues above.**
3. **Re-add UI entry points** — these screens had no navigation. To reach them,
   add the relevant tab(s) to `src/App.jsx` (the `activeTab` switch + `<Suspense>`
   lazy imports) and the corresponding nav item(s) in `src/components/Layout.jsx`.
   If reviving `InitialSetup`, restore its import, the `showInitialSetup` state, and
   the first-run guard/render blocks in `App.jsx` (all removed on 2026-08-25).
4. **Rebuild** (`npm run build`) to confirm everything resolves.

---

## Note on imports while archived

While these files sit in `legacy/`, their imports of **live** modules that stayed in
`src/` (e.g. `../utils/storage`, `../utils/dateUtils`, `./Dropdown`, `./Toast`) do
**not** resolve — those live modules were intentionally left in `src/`. This is
expected and harmless: nothing here is compiled. All imports resolve again once the
files are moved back into `src/` per the revival steps above.
