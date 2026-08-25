# Seetal Management — Full Project Audit

**Date:** 2026-08-25
**Scope:** Whole-project read-only audit — architecture, security, data integrity, correctness, design/UX, and code hygiene.
**Method:** Manual source review of all ~44 components + utils + SQL + config, cross-referenced with two focused sub-audits (calculation/data-integrity and React correctness). Every finding below was verified against the actual source. **No code was changed.**

---

## 1. Executive Summary

This is a React 18 + Vite SPA ("Seetal Management", package name still `payslip-generator`) backed by Supabase (Postgres + Auth). It bundles three loosely-related products: a **facilities/periodical-task manager** (Sites + Task Matrix), a **leads CRM** (Lead Manager + analytics), and **multi-company financial reporting** (Profit & Loss, Staff Productivity, Branch Performance, Sydney Sales). Data is stored as **AES-encrypted JSON blobs** upserted into generic Supabase tables under fixed text IDs, with an offline-first sync layer (in-memory cache + IndexedDB + cloud).

The app works, but it carries three classes of serious problems:

1. **A broken server-side access-control model.** Row-Level Security grants *every authenticated user* read access to *all* payroll, PII, and financial data. The client-side "encryption" does not mitigate this because the key ships in the browser bundle. This is the single most important issue.
2. **A fragile, self-corrupting data model.** Unrelated datasets share one `leads` table under fixed IDs, and the admin lead-fetch merges all of them together — so using one feature corrupts another. Combined with empty-array-overwrites-local sync bugs and last-write-wins concurrency, data loss is possible under normal use.
3. **~43% of the codebase is orphaned dead code** from the app's earlier "payslip generator" life. This is where most of the scary-looking calculation bugs live — they are *latent*, not active — but the dead code inflates the attack/mistake surface and confuses maintenance.

Severity legend: **Critical** (data loss, security breach, or guaranteed crash in live paths) · **High** · **Medium** · **Low**. Each finding is tagged **[LIVE]** (reachable in the running app) or **[DEAD]** (in an orphaned component not wired into any route).

---

## 2. Architecture & Stack

| Area | Detail |
|---|---|
| Frontend | React 18.2, Vite 5, TailwindCSS 3.3.6, recharts, zod |
| Backend | Supabase (Postgres, Auth, Storage). No custom server; RLS is the *only* server-side authorization. |
| Data model | Encrypted JSON blobs (`crypto-js` AES) upserted into generic tables (`sites`, `leads`, `profit_loss`, …) keyed by fixed IDs (`main_list`, `user_<uuid>`, `branchPerformance_v1`, …). |
| Sync | `memoryCache` + `localforage` (IndexedDB) + cloud; incremental via `sync_metadata` timestamps; 30s interval + focus/visibility triggers. |
| Routing | No router. A single `activeTab` string switches `<Suspense>`-lazy-loaded tab components in `App.jsx`. |
| Roles | `admin`, `supervisor`, `manager`, `payslip_management`, `leads_team`, `user`. Gated client-side by `hasPermission()` and by RLS server-side. |
| Size | ~18.4k LOC, ~60 source files, of which ~19 components are unreachable. |

**Structural observation:** the product pivoted from a payslip/timesheet generator to a facilities+leads+finance suite, but the old subsystem was never removed — only unlinked from the nav. This explains most of the "dead but buggy" findings below.

---

## 3. Security

### 3.1 — CRITICAL [LIVE] · Broken read access control (confidentiality breach)
`DATABASE_MASTER_SETUP.sql` grants every core table (contractors, sites, timesheets, pay_rates, training_releases, payment_summaries, public_holidays, periodical_tasks, global_rates, staff_productivity_reports, profit_loss) this policy:

```sql
CREATE POLICY "<t>_select_auth" ON public.<t>
  FOR SELECT TO authenticated USING (true);
```

**Any authenticated account** — including a self-registered `user` who sees no navigation — can call the Supabase REST/JS API directly and read **all** rows of **all** these tables: payroll, bank details (BSB/account numbers), financials, everyone's data. The UI's `hasPermission()` gating is cosmetic; it is not enforced at the data layer. `profiles` is likewise `USING (true)`, exposing every user's email and role.
Writes are correctly admin-only, so this is a **confidentiality** breach, not an integrity one — but for payroll/PII that is severe.
**Fix:** replace `USING (true)` with role/ownership predicates (e.g. restrict financial tables to `admin`/relevant roles via an `EXISTS` check on `profiles`, as the write policies already do). Treat this as the top priority.

### 3.2 — CRITICAL [LIVE] · Client-side encryption key is public
`src/utils/encryptionUtils.js` builds the AES key from `import.meta.env.VITE_ENCRYPTION_KEY`. **Vite inlines every `VITE_*` variable into the client bundle**, so the key is delivered to every browser. Client-side "encryption" with a shipped key provides **no confidentiality** against an authenticated user (see 3.1) — they can fetch the blobs and decrypt them with the bundled key. It only obscures data at rest in the browser's IndexedDB.
**Fix:** stop treating this as a security control. Real confidentiality must come from RLS (3.1). If at-rest encryption is a genuine requirement, it needs server-side key custody, which this architecture can't provide from the browser.

### 3.3 — HIGH [LIVE] · Password reset is broken end-to-end
`ForgotPassword.jsx` calls `resetPasswordForEmail` with `redirectTo = window.location.origin + '/reset-password'`, but **there is no `/reset-password` route or handler** (no router; `vercel.json` rewrites everything to `index.html`, which renders the login). `updatePassword` in `auth.js` is defined but never called. Users who request a reset land back on the login screen with no way to set a new password.
**Fix:** implement a reset-password view that reads the recovery token and calls `supabase.auth.updateUser({ password })`, and route to it.

### 3.4 — MEDIUM [LIVE] · Login lockout is cosmetic
`auth.js` tracks attempts in module-level variables (`loginAttempts`, `lockoutUntil`), reset on page reload. An attacker refreshes to bypass. Not a real brute-force control (Supabase has its own throttling, so impact is limited, but the code implies protection it doesn't provide).
**Fix:** rely on Supabase-side rate limiting / captcha; remove or clearly label the client-side counter.

### 3.5 — MEDIUM · Weak CSP
`vercel.json` sets good baseline headers (`nosniff`, `X-Frame-Options: DENY`, HSTS) but the CSP allows `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, which defeats much of CSP's XSS value.
**Fix:** drop `unsafe-eval`; move toward hashes/nonces for inline scripts.

### 3.6 — MEDIUM [DEAD] · CSV formula injection & gross/net error in export
`exportUtils.js` wraps cells as `"${cell}"` with **no escaping of embedded quotes and no neutralization of `= + - @`** (spreadsheet formula injection), and `exportPaymentSummaryToCSV` exports **gross pay under a "Net Pay" header** (excludes allowances/deductions) — a bank file would pay wrong amounts. **Both functions are only called from the orphaned `PaymentSummary`/timesheet subsystem**, so they are not currently reachable. Flagged so they are fixed *before* any of that code is ever revived.

### 3.7 — LOW · Public storage bucket & tracked scratch files
`scope_files` bucket is `public` (anyone with a URL can read uploads). Tracked scratch files (`test.cjs`, `scratch_check_*.js`) hardcode the Supabase URL and the **publishable/anon** key — these are public-by-design, *not* a service-role secret, so this is hygiene, not a breach. Confirmed: real `.env`/`.env.local` are gitignored and untracked; no service-role key is committed.
**Fix:** make the bucket private with signed URLs if uploads are sensitive; delete the scratch files.

---

## 4. Data & Sync Integrity

### 4.1 — CRITICAL [LIVE] · The `leads` table self-corrupts admin analytics
`storage.js:399-436` — for `admin`/`leads_team`, `getLeadsAsync()` runs `select('data, consultant_id')` on `leads` with **no `id` filter** and merges *every array-shaped row* into the leads list. But the same `leads` table also stores non-lead datasets under fixed IDs: `payscleep_lead_reports_v2`, `payscleep_lead_counselors_v3`, `branchPerformance_v1`, `sydneySalesSummary_v1` (all arrays). As soon as an admin uses Branch Performance or Sydney Sales, those rows exist — and the next lead fetch flattens them into the leads list, poisoning `totalLeads`, sources, cohorts, and the counselor table. **Using one feature silently corrupts another.**
**Fix:** filter the admin lead query to only genuine lead rows (e.g. `.like('id', 'user_%')`), or move the global datasets out of the `leads` table into their own tables.

### 4.2 — HIGH [LIVE] · Empty cloud reads overwrite good local data
`App.jsx` guards only `cloudLeads` correctly (`Array.isArray && length > 0`, line 214). The sibling branches use truthy checks — `if (cloudSites)` (187), `if (cloudPeriodicalTasks)` (196), `if (cloudLeadReports)` (224), `if (cloudLeadCounselors)` (237), `if (cloudProfitLoss)` (204). An empty array is truthy, so a transient/empty cloud read **overwrites local state and persists `[]` to IndexedDB**, and the "restore from local" fallbacks (228, 241) are dead for the `[]` case. Real data-loss risk on a flaky sync.
**Fix:** apply the `Array.isArray(x) && x.length > 0` guard uniformly (the correct pattern already exists for leads).

### 4.3 — HIGH [LIVE] · Last-write-wins on shared row IDs
`storage.js` upserts sites/timesheets/periodical_tasks/global_rates/profit_loss to a single row `id = 'main_list'` with a plain `.upsert()` and no version/optimistic-concurrency check. Two admins editing concurrently silently clobber each other. `syncData` additionally has **no in-flight guard** (`isSyncing` is UI-only), so the 30s interval, focus/visibility debounce, and login sync can overlap and race.
**Fix:** add an `updated_at`/version check (reject stale writes) or per-entity rows; add a concurrency guard around `syncData`.

### 4.4 — HIGH [LIVE] · Cross-counselor report overwrite
`LeadManager.jsx:13` — `handleSaveReport` dedupes existing reports by `r.month === report.month` only, but reports are keyed by **month + counselor**. Saving one counselor's monthly report **overwrites another counselor's** report for the same month → data loss.
**Fix:** dedupe on `month && counselorId`.

### 4.5 — MEDIUM [LIVE] · In-progress form wiped by background sync
`LeadDataInput.jsx:58-96` resets `formData` whenever `existingReports` changes. A background cloud sync mid-way through the 4-step entry form discards the user's unsaved input. Related: `:178` shows an "Report saved successfully!" `alert` fired on local save only — if the cloud save later fails, the user was told it saved.
**Fix:** don't reset an actively-edited form on prop change; surface real save success/failure.

### 4.6 — MEDIUM · Partial-write and init failure modes
`saveLeads` admin path awaits `saveToCloud` per consultant group in a loop (`storage.js:385-387`); a mid-loop rejection leaves some groups saved and others not, with no rollback. `App.jsx:279-283` `initStorage().then(...)` has **no `.catch()`** — if storage/crypto init rejects, `setIsStorageReady(true)` never runs and the app hangs on "Mounting Secure Storage…".
**Fix:** wrap init in try/catch with a visible error; make the multi-group save atomic or report partial failure.

---

## 5. Correctness & Calculation Bugs

> The financial subsystem (payroll/payslip/timesheet/payment-summary/escrow) is **orphaned dead code** (§7). Its bugs are real but **latent** — they cannot fire in the running app today. They are documented so the code is fixed *before* any revival. The **live** calc issues are in Profit & Loss, Staff Productivity, and the date utilities that live code also imports.

### Live
- **HIGH [LIVE] · `dateUtils.js` date handling.** `parseISO = new Date(dateStr)` parses `'YYYY-MM-DD'` as UTC midnight while `getDay()/getDate()` read local time → in any negative-UTC-offset environment dates roll back a day (wrong weekday/holiday classification). Separately, the `format()` polyfill mishandles common patterns: `format(d,'dd MMM yyyy')` yields `"15 03M 2024"`. These format strings are used on live-adjacent screens. *(Impact today is muted because the screens that display them are mostly in the dead subsystem, but `dateUtils` is imported app-wide — audit each live caller.)*
- **MEDIUM [LIVE] · ProfitLoss.jsx compare mode** (`:1362-1365`) hardcodes revenue/cost keys and omits `other` + custom rows, and calls `computeSite` without period rows → "vs previous" deltas are wrong whenever those rows carry value, while current-period totals include them (mismatched comparison). `handleCopyPrevious` (`:656`) copies legacy `managerSalaryPct` but not the current `managerAllocations` model → copied periods recompute manager salaries to 0.
- **MEDIUM [LIVE] · MonthlyRevenue.jsx** dereferences `staff.revenueEarned[i]` / `staff.basicSalary.map(...)` without the `|| []` guards it applies elsewhere → a legacy staff record missing those arrays crashes the report for that staff. Surplus gate at `:398` ignores service-fee/extra-revenue rows (blank surplus despite nonzero value).

### Dead (latent — fix before reuse)
- **CRITICAL [DEAD] · PaymentSummary.jsx:654-655** references undefined `selectedContractors`/`handleSelectAll` → guaranteed `ReferenceError` crash as soon as a summary renders. (Component is not routed.)
- **HIGH [DEAD] · Escrow maturity conflict:** `PaymentSummary.jsx:289` uses first-training-day **+150 days**; `TrainingEscrowManager.jsx:77` uses **+28 days** — two different due dates for the same money.
- **HIGH [DEAD] · payrollCalculations.js:17** — `manualLumpSumHours !== null` treats `undefined` (legacy entries) as manual, then falls through to pay **$0** silently. `Math.max(0, …)` net-pay flooring (`:79`) hides over-deductions; `PaymentSummary.jsx:119`'s `entry.netPay || …` fallback then recomputes a floored-0 into a **negative** total.
- **MEDIUM [DEAD] · TimesheetEntry.jsx** allowance/otherPay inputs divide stored dollars by a global rate (division-by-zero → `Infinity`; `×0` on change silently wipes the amount); the save path can overwrite a saved timesheet's entries with freshly-zeroed rows (hour loss).

---

## 6. React Quality, Design & Accessibility

### 6.1 — MEDIUM [LIVE] · Production Tailwind purge kills dynamic classes
`BranchPerformanceDashboard.jsx` (390, 405, 506) and `SydneySalesSummary.jsx` (221, 249) build classes by interpolation — `bg-${branch.color}-100`, `text-${col.color}-900`. Tailwind's JIT can't see these strings, so they're **purged from the production build** and the color theming silently disappears in prod (works in dev). Also: `tailwind.config.js` defines no `animation`/`keyframes`, so `animate-fade-in` / `animate-fade-in-up` used in markup are **no-ops**.
**Fix:** map to a static class lookup (a `{ blue: 'bg-blue-100 …' }` object) or add a `safelist`; define the animations or drop the classes.

### 6.2 — HIGH [LIVE] · Shared-reference mutation corrupts module defaults
`SydneySalesSummary.jsx:142,160` — `openConfigModal` shallow-copies `columns` (shared object refs) and `updateColumn` mutates in place. On first open `columns` **is** the module-level `DEFAULT_COLUMNS` constant, so editing staff names/colors mutates the constant itself and "Cancel" can't revert. (`BranchPerformanceDashboard` deep-clones at 272 to avoid exactly this — apply the same fix here.) The same shallow-copy-then-mutate anti-pattern recurs in `SiteForm.jsx:233`, `TaskManagementModal.jsx:131`, and `BranchPerformanceDashboard.jsx:305-332`.

### 6.3 — MEDIUM [LIVE] · Stale-prop state & index keys
Several components seed state from props once and never resync (`SiteForm.jsx:29` `tasks`; `TaskManagementModal.jsx:10`) → edits operate on stale data after a sync. Editable add/remove lists use pure index keys (`key={idx}` / `key={bIdx}` / `key={mIdx}` in BranchPerformance, SydneySales, TaskMatrix) → removing a middle item makes React reuse the wrong input values.

### 6.4 — MEDIUM · Fragmented design language & hardcoded ranges
Three visual systems coexist: `notion-*` tokens (Layout, SiteForm, ContractorForm), `zinc-*`/`primary-*` (UserManagement, App loading), and a blue/indigo gradient with `text-h1/text-p3` (Login) — inconsistent and partly undefined in the Tailwind config. `LeadAnalytics.jsx:8` hardcodes the default date range to `2026-01..2026-12` (shows nothing in 2027+ until changed) and `:31` runs `parseInt` on UUID lead IDs, mis-dating leads to 1970. `design-system/branch-performance-dashboard/MASTER.md` specs a blue+amber Fira-font system that is **not implemented** (tokens absent, font never loaded).

### 6.5 — MEDIUM · Accessibility gaps
Force-sync is a `<div onClick>` (Layout.jsx:253) — not keyboard-focusable; the mobile hamburger has no `aria-label`; modals across the app lack `role="dialog"`, focus trap, and Escape-to-close. `Dropdown.jsx:18` throws if `options` is omitted (no default).

### 6.6 — LOW · Fire-and-forget saves swallow errors
`saveBranchPerformance*`/`saveSydneySales*` are called without `.catch()` at the call sites; a cloud-save failure surfaces nothing to the user. Async load effects in those two components lack unmount guards (`setState` after unmount warnings).

---

## 7. Dead Code & Hygiene

**~19 of 44 components (~43%) are unreachable** — the entire payslip/timesheet/contractor subsystem left over from the pivot:

`PaymentSummary`, `Payslip`, `PayslipForm`, `TimesheetEntry`, `TimesheetList`, `ContractorForm`, `ContractorList`, `EmployeeForm`, `EmployeeList`, `PayRateConfiguration`, `GlobalRatesConfig`, `TrainingEscrowManager`, `PublicHolidayManager`, `SiteAllocation`, `LeadAnalytics` (+ its children `LeadCohortDashboard`, `YearlyAnalyticsChart`), `AuditLogViewer`, `InitialSetup`.

Supporting dead code:
- **`App.jsx:596-638`** — `handleSaveTimesheet`/`handleEditTimesheet` reference six undefined setters and unimported `getTimesheets`/`saveTimesheets`; guaranteed `ReferenceError` if ever wired.
- **`Login.jsx`** — `const isLoginMode = true` but `toggleMode`/signup branch call the undefined `setIsLoginMode` (dead since registration is disabled).
- **Audit trail is fiction** — `logAction`/`saveAuditLogs`/`getAuditLogs` are no-ops (`getAuditLogs` returns `[]`); the dead `AuditLogViewer` **fabricates** user names from a hash of `['Joyeb','Suraj','Ajaya']` and calls itself an "immutable ledger." Every `logAction(...)` call sprinkled through `App.jsx` does nothing.
- **`design-system/`** contains a single aspirational spec never implemented.
- `puppeteer` is a dependency but unused in `src`.

**Fix:** delete the orphaned subsystem (git history preserves it), or, if it's slated for revival, fix its Critical/High bugs (§5) *first* and re-link deliberately. Remove the no-op `logAction` calls or implement real auditing. Drop unused deps and scratch files.

---

## 8. Prioritized Remediation Roadmap

**P0 — Security & data loss (do first)**
1. **Rewrite RLS SELECT policies** (§3.1) — restrict every financial/PII table to appropriate roles. This is the headline fix.
2. **Stop relying on client-side encryption as a control** (§3.2); document that RLS is the real boundary.
3. **Fix the `leads`-table contamination** (§4.1) — filter admin lead reads / separate the global datasets.
4. **Uniform empty-array sync guard** (§4.2) and a **concurrency guard + version check** on writes (§4.3).
5. **Fix cross-counselor report overwrite** (§4.4).

**P1 — Correctness in live paths**
6. Fix `LeadDataInput` form-wipe (§4.5), `initStorage` no-catch (§4.6), ProfitLoss compare/copy (§5), MonthlyRevenue guards (§5), and audit `dateUtils` callers in live code (§5).
7. Fix SydneySales shared-ref mutation (§6.2) and the Tailwind dynamic-class purge (§6.1).

**P2 — Auth & UX**
8. Implement working password reset (§3.3); tighten CSP (§3.5); fix a11y basics (§6.5).

**P3 — Hygiene**
9. Delete (or deliberately revive-and-fix) the ~43% dead subsystem (§7); remove no-op audit logging or implement it for real; unify the design language; drop unused deps/scratch files.

---

### What's actually solid
Not everything is broken. Baseline HTTP security headers are good; secrets are correctly gitignored (no service-role key committed); write policies *are* admin-scoped; `ErrorBoundary`, the `Toast` ref pattern, and `ContractorForm`'s zod validation (BSB/account regex) are correct; the offline-first architecture is reasonable; and the leads consultant/admin RLS split is properly row-scoped. The core problems are concentrated in the access-control model, the shared-table data model, and the un-removed legacy subsystem — all fixable without a rewrite.
