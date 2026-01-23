# Payslip Generator

A modern web application for automatically generating professional payslips for your business employees.

## Features

- **Employee Management**: Add, edit, and manage employee information
- **Automatic Calculations**: Automatically calculates gross salary, net salary, and deductions
- **PDF Export**: Generate professional PDF payslips ready for printing or email
- **Company Information**: Customize company details on payslips
- **Local Storage**: All data is saved locally in your browser
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

## Usage

### Adding Employees

1. Go to the "Employees" tab
2. Click "Add Employee"
3. Fill in the employee details:
   - Full Name (required)
   - Employee ID (required)
   - Designation (required)
   - Department (required)
   - Email, Phone, Address (optional)
4. Click "Add Employee"

### Generating Payslips

1. Go to the "Generate Payslip" tab
2. Fill in company information (if not already set)
3. Select an employee from the dropdown
4. Choose the pay period (month and year)
5. Enter salary details:
   - Basic Salary (required)
   - Allowances (optional)
   - Deductions (optional)
6. Click "Generate & Download Payslip"

The payslip will be automatically downloaded as a PDF file.

## Technologies Used

- React 18
- Vite
- Tailwind CSS
- jsPDF (for PDF generation)
- date-fns (for date formatting)

## Browser Compatibility

Works on all modern browsers that support:
- ES6+ JavaScript
- Local Storage API
- PDF generation

## Data Storage

All employee data and company information is stored locally in your browser's localStorage. This means:
- Data persists between sessions
- Data is private to your browser
- No data is sent to any server

## License

This project is open source and available for personal and commercial use.
