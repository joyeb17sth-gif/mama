import { useState, useEffect } from 'react';
import { getEmployees, saveEmployees } from './utils/storage';
import { calculatePayslip } from './utils/payslipCalculations';
import { generatePDF } from './utils/pdfGenerator';
import { isAuthenticated, setAuthenticated } from './utils/auth';
import EmployeeForm from './components/EmployeeForm';
import EmployeeList from './components/EmployeeList';
import PayslipForm from './components/PayslipForm';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Settings from './components/Settings';

function App() {
  const [authenticated, setAuthenticatedState] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('employees');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({});

  useEffect(() => {
    // Check authentication status on mount
    setAuthenticatedState(isAuthenticated());
    
    // Load employees from localStorage
    const loadedEmployees = getEmployees();
    setEmployees(loadedEmployees);

    // Load company info
    const saved = localStorage.getItem('companyInfo');
    if (saved) {
      setCompanyInfo(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Load employees from localStorage
    const loadedEmployees = getEmployees();
    setEmployees(loadedEmployees);

    // Load company info
    const saved = localStorage.getItem('companyInfo');
    if (saved) {
      setCompanyInfo(JSON.parse(saved));
    }
  }, []);

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowEmployeeForm(true);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const handleSaveEmployee = (formData) => {
    if (editingEmployee) {
      // Update existing employee
      const updated = employees.map(emp =>
        emp.id === editingEmployee.id
          ? { ...emp, ...formData }
          : emp
      );
      setEmployees(updated);
      saveEmployees(updated);
    } else {
      // Add new employee
      const newEmployee = {
        id: Date.now().toString(),
        ...formData,
      };
      const updated = [...employees, newEmployee];
      setEmployees(updated);
      saveEmployees(updated);
    }
    setShowEmployeeForm(false);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      const updated = employees.filter(emp => emp.id !== id);
      setEmployees(updated);
      saveEmployees(updated);
    }
  };

  const handleCancelEmployeeForm = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(null);
  };

  const handleGeneratePayslip = (formData, companyData) => {
    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    if (!selectedEmployee) {
      alert('Employee not found');
      return;
    }

    const payslip = calculatePayslip(
      selectedEmployee,
      formData.basicSalary,
      formData.allowances,
      formData.deductions,
      formData.month,
      formData.year
    );

    // Generate and download PDF
    generatePDF(payslip, companyData);

    // Save payslip to history
    const payslips = JSON.parse(localStorage.getItem('payslips') || '[]');
    payslips.push(payslip);
    localStorage.setItem('payslips', JSON.stringify(payslips));
  };

  const handleLogin = (action) => {
    if (action === 'forgot') {
      setShowForgotPassword(true);
    } else {
      setAuthenticatedState(true);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAuthenticatedState(false);
    setActiveTab('employees');
  };

  // Show login if not authenticated
  if (!authenticated) {
    if (showForgotPassword) {
      return (
        <ForgotPassword
          onBack={() => setShowForgotPassword(false)}
          onLogin={() => {
            setShowForgotPassword(false);
            setAuthenticatedState(true);
          }}
        />
      );
    }
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Payslip Generator</h1>
          <p className="text-gray-600 mt-1">Automated payslip generation for your business</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('employees')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'employees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Employees
            </button>
            <button
              onClick={() => setActiveTab('payslip')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payslip'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Generate Payslip
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="mt-6">
            {!showEmployeeForm ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Employee Management</h2>
                  <button
                    onClick={handleAddEmployee}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    + Add Employee
                  </button>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <EmployeeList
                    employees={employees}
                    onEdit={handleEditEmployee}
                    onDelete={handleDeleteEmployee}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </h2>
                  <button
                    onClick={handleCancelEmployeeForm}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    ← Back to List
                  </button>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <EmployeeForm
                    employee={editingEmployee}
                    onSave={handleSaveEmployee}
                    onCancel={handleCancelEmployeeForm}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payslip Tab */}
        {activeTab === 'payslip' && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Generate Payslip</h2>
            {employees.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-800">
                  Please add at least one employee before generating payslips.
                </p>
                <button
                  onClick={() => setActiveTab('employees')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Go to Employees
                </button>
              </div>
            ) : (
              <PayslipForm
                employees={employees}
                onGenerate={handleGeneratePayslip}
                companyInfo={companyInfo}
              />
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="mt-6">
            <Settings onLogout={handleLogout} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Payslip Generator. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
