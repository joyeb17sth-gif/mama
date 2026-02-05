import { useState, useEffect } from 'react';
import { verifyLogin, setAuthenticated, isAccountLocked, getLockoutRemainingSeconds } from '../utils/auth';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Handle lockout countdown
  useEffect(() => {
    let timer;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        const remaining = getLockoutRemainingSeconds();
        setLockoutSeconds(remaining);
        if (remaining === 0) {
          setError('');
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check lockout first
    if (isAccountLocked()) {
      setLockoutSeconds(getLockoutRemainingSeconds());
      setError(`Too many failed attempts. Please wait ${getLockoutRemainingSeconds()} seconds.`);
      return;
    }

    setLoading(true);

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = verifyLogin(username, password);

    if (result.success) {
      setAuthenticated(true);
      onLogin();
    } else if (result.locked) {
      setLockoutSeconds(result.remainingSeconds);
      setError(`Too many failed attempts. Please wait ${result.remainingSeconds} seconds.`);
      setPassword('');
    } else {
      setError(result.error + (result.attemptsRemaining !== undefined ? ` (${result.attemptsRemaining} attempts remaining)` : ''));
      setPassword('');
    }
    setLoading(false);
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payslip Generator</h1>
          <p className="text-gray-600 text-sm">Please login to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${isLocked ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {isLocked && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Account locked. Try again in {lockoutSeconds}s</span>
                </div>
              )}
              {!isLocked && error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              disabled={isLocked}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLocked}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold uppercase tracking-wider text-sm shadow-lg"
          >
            {loading ? 'Logging in...' : isLocked ? `Locked (${lockoutSeconds}s)` : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => onLogin('forgot')}
            disabled={isLocked}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
