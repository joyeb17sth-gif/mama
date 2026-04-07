# SitalPayslip: System Handover Document

## 1. Executive Summary
**SitalPayslip** is a proprietary, end-to-end personnel management and payroll generation web application designed specifically for complex contracting structures. It replaces messy manual spreadsheets with a secure, automated, and lightning-fast internal portal to track contractor hours, manage varying site pay rates, and effortlessly distribute payslips in bulk.

---

## 2. Core Functional Pillars

### 🏗️ Decentralized Site & Rate Management
Instead of flat hourly wages, SitalPayslip allows administrators to define dynamic pay structures unique to every individual project site.
- **Sub-sites:** You can attach customized "Child Sites" to a parent site (e.g. `ACE HOTEL - FLOOR 1`) so that granular budgets and hours can be tracked accurately.
- **Pay Rate Overrides:** Standard contractor rates can be instantly overridden depending on the specific site they are assigned to work at, ensuring payroll accuracy down to the cent without manual calculation. 

### ⏱️ Automated Timesheet Protocol
The backbone of the application is a robust timesheet parser designed to handle variable work schedules.
- **Training Escrow System:** Automatically isolates 'Training Hours' from active billable hours. The payment for training hours goes into an escrow vault where the system locks it until the contractor successfully completes 5 active working days on-site, protecting your budget from prematurely paid training turnover.
- **Granular Adjustments:** Allows manual administrative overriding of automatically calculated hours across Weekdays, Saturdays, Sundays, and Public Holidays.

### 💰 Payroll Consolidation & Bulk Dispatch
At the end of a pay cycle, SitalPayslip takes the heavy lifting out of accounting.
- **Master Payment Summary:** Automatically aggregates all verified timesheets into a single digestible payout list, highlighting Net Pay.
- **Export Data to CSV:** Seamlessly export the payload directly to a CSV file designed specifically to interface with banking and accounting software.
- **Bulk PDF Bundling:** Need individual payslips for contractors? You can generate and download hundreds of clean, highly detailed PDF payslips enclosed within a single zipped folder in just a few seconds.
- **1-Click Secure Email Dispatch:** Send payslip emails containing the PDFs directly to all active contractors with a single click. 

### 🛡️ Enterprise Security & Data Infrastructure
The app has been engineered to process sensitive financial data strictly and safely. 
- **Role-Based Access Control:** Invite-only system. A designated "Main Admin" has overarching authority to force-reset passwords and revoke access to sub-administrators instantly.
- **Client-Side Encryption:** Built on top of AES-Encryption. All personnel data, timesheets, and banking details are fundamentally encrypted before they ever leave the browser, meaning the database securely holds data that cannot be read if compromised.
- **Infinite Scalability (IndexedDB):** Bypasses standard browser limits using a "LocalForage" cache layer. The app feels instantaneous and has a data ceiling high enough to handle years of active, uninterrupted payroll.

### 🗄️ System Auditing & Archiving
Because data security is paramount, you are given total oversight over the health of your operational timeline.
- **Detailed Audit Trail:** Every action taken in the system (e.g. deleting a site, modifying a timesheet, authorizing a training release) is permanently logged with a timestamp and the identity of the administrator who performed the action.
- **Data Archiver Protocol:** When a financial year closes, administrators can download an encrypted JSON backup payload and permanently purge the year's timesheets from the system, keeping the server database uncluttered and optimized for the next cycle.

---

## 3. Standard Operating Workflow

For day-to-day administrators, the system requires four simple steps:

1. **Configurations Phase:** Add your active Contractors and Project Sites globally.
2. **Log Phase:** Navigate to the Timesheet tab and log active working hours against specific Sites and dates for the contractors. 
3. **Escrow Phase:** Return to the Dashboard and check if any contractors have completed their 5-day protocol to manually authorize the release of their Training Pay.
4. **Dispatch Phase:** Go to the Payment Summary tab at the end of the week, verify the combined totals, select your contractors, and instantly generate their PDF payslips or export to CSV.

---

> **Prepared By:** Your Development Partner    
> **Date Delivered:** April 2026   
> **Status:** Production-Ready
