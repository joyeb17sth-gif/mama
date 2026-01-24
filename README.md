# Contractor & Timesheet Management System

A specialized system for managing cleaning service contractors, multi-site timesheets, complex pay rates, and training pay escrow.

## Features

### 1. Contractor Management
- Manage contractors with unique IDs and bank details (BSB, Account Number).
- Track active/inactive status.
- **Audit Logging:** All creations, updates, and deletions are logged.

### 2. Multi-Site & Pay Rates
- create multiple sites with specific budgets (Hours/Cost).
- Configure **site-specific pay rates** for Weekdays, Saturdays, Sundays, and Public Holidays.
- Allocate contractors to specific sites.

### 3. Timesheet Management
- **Excel-style Grid:** Daily entry for hours.
- **Auto-Population:** Pre-fills allocated contractors for the site.
- **Budget Control:** Real-time visual warnings (Red Banner) if site budget is exceeded.
- **Manual Override:** "Lump Sum" option to override calculated daily pay.
- **Escrow Display:** Clearly shows "Escrowed" (Held) amounts vs "Payable" amounts.
- **Management:** View history, check statuses, and **Delete** incorrect timesheets.

### 4. Training Pay Escrow (Unique Feature)
- **Accumulation:** Mark days as "Training" in the timesheet. Pay is calculated but **HELD** (Escrowed), not paid immediately.
- **Management:** Dedicated "Training Pay" tab to view accumulated balances per contractor.
- **Release:** Admin can "Release" specific amounts (e.g., after 4 weeks).
- **Consolidation:** Released amounts are legally added to the *current* period's payment summary.

### 5. Payment Consolidation
- Generates a single payment record per contractor per period.
- Combines hours from multiple sites.
- Includes any **Training Pay Releases** processed in that period.
- Export to CSV for bank processing.

### 6. Audit Trail
- Tracks all sensitive actions:
    - Contractor Changes
    - Site Changes
    - Timesheet Submissions & Deletions
    - Training Pay Releases
- Filterable view to Audit Logs.

## Tech Stack
- React + Vite
- Tailwind CSS
- LocalStorage (Persistence)

## Quick Start
1. **Contractors:** Add your contractors.
2. **Sites:** Create sites and set budgets.
3. **Pay Rates:** Configure rates for each site.
4. **Allocation:** Assign contractors to sites.
5. **Timesheets:** Enter daily hours. Watch for Budget Warnings!
6. **Training:** Release held pay when ready.
7. **Payments:** Generate and export the final pay run.
