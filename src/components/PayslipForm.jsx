import { useState, useEffect } from 'react';
import { format } from 'date-fns';

const PayslipForm = ({ employees, onGenerate, companyInfo }) => {
  const currentDate = new Date();
  const [formData, setFormData] = useState({
    employeeId: '',
    month: format(currentDate, 'MMMM'),
    year: currentDate.getFullYear().toString(),
    basicSalary: '',
    allowances: '0',
    deductions: '0',
    allowanceDetails: '',
    deductionDetails: '',
  });

  const [companyData, setCompanyData] = useState({
    name: companyInfo?.name || '',
    address: companyInfo?.address || '',
    phone: companyInfo?.phone || '',
    email: companyInfo?.email || '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('companyInfo');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCompanyData(parsed);
    }
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCompanyChange = (e) => {
    const updated = {
      ...companyData,
      [e.target.name]: e.target.value,
    };
    setCompanyData(updated);
    localStorage.setItem('companyInfo', JSON.stringify(updated));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }
    onGenerate(formData, companyData);
  };

  const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);

  return (
    <div className="space-y-6">
      {/* Company Information Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-p1 font-bold mb-4">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              name="name"
              value={companyData.name}
              onChange={handleCompanyChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={companyData.phone}
              onChange={handleCompanyChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={companyData.address}
              onChange={handleCompanyChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={companyData.email}
              onChange={handleCompanyChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Payslip Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="text-p1 font-bold mb-4">Generate Payslip</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Select Employee *
            </label>
            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Designation:</strong> {selectedEmployee.designation}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Department:</strong> {selectedEmployee.department}
              </p>
            </div>
          )}

          <div>
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Month *
            </label>
            <select
              name="month"
              value={formData.month}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Year *
            </label>
            <select
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Basic Salary *
            </label>
            <input
              type="number"
              name="basicSalary"
              value={formData.basicSalary}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Total Allowances
            </label>
            <input
              type="number"
              name="allowances"
              value={formData.allowances}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-p3 font-bold text-gray-700 mb-1">
              Total Deductions
            </label>
            <input
              type="number"
              name="deductions"
              value={formData.deductions}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
          >
            Generate & Download Payslip
          </button>
        </div>
      </form>
    </div>
  );
};

export default PayslipForm;
