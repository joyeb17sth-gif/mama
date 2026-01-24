import { useState } from 'react';
import { getStoredCredentials, updatePassword, updateUsername, updateSecurityQA } from '../utils/auth';

const Settings = ({ onLogout }) => {
  const credentials = getStoredCredentials();
  const [activeTab, setActiveTab] = useState('password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUsername, setNewUsername] = useState(credentials.username);
  const [securityQuestion, setSecurityQuestion] = useState(credentials.securityQuestion);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Verify current password
    if (currentPassword !== credentials.password) {
      setMessage({ type: 'error', text: 'Current password is incorrect' });
      return;
    }

    // Validate new password
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    updatePassword(newPassword);
    setMessage({ type: 'success', text: 'Password updated successfully!' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleUsernameChange = (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newUsername.length < 3) {
      setMessage({ type: 'error', text: 'Username must be at least 3 characters long' });
      return;
    }

    updateUsername(newUsername);
    setMessage({ type: 'success', text: 'Username updated successfully!' });
  };

  const handleSecurityQAChange = (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!securityQuestion.trim()) {
      setMessage({ type: 'error', text: 'Security question cannot be empty' });
      return;
    }

    if (!securityAnswer.trim()) {
      setMessage({ type: 'error', text: 'Security answer cannot be empty' });
      return;
    }

    updateSecurityQA(securityQuestion, securityAnswer);
    setMessage({ type: 'success', text: 'Security question and answer updated successfully!' });
    setSecurityAnswer('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('password');
              setMessage({ type: '', text: '' });
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Change Password
            </button>
            <button
              onClick={() => {
                setActiveTab('username');
                setMessage({ type: '', text: '' });
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'username'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Change Username
            </button>
            <button
              onClick={() => {
                setActiveTab('security');
                setMessage({ type: '', text: '' });
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Security Question
            </button>
          </nav>
        </div>

        {/* Messages */}
        {message.text && (
          <div
            className={`mb-4 px-4 py-3 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Change Password Tab */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Update Password
            </button>
          </form>
        )}

        {/* Change Username Tab */}
        {activeTab === 'username' && (
          <form onSubmit={handleUsernameChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                minLength={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 3 characters</p>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Update Username
            </button>
          </form>
        )}

        {/* Security Question Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handleSecurityQAChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Question
              </label>
              <input
                type="text"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., What is your favorite color?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Answer
              </label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your answer"
              />
              <p className="text-xs text-gray-500 mt-1">
                This answer will be used for password recovery
              </p>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Update Security Question
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Settings;
