import { useState, useEffect } from 'react';
import { loginUser, registerUser, setAuthenticated, isAccountLocked, getLockoutRemainingSeconds } from '../utils/auth';

const Login = ({ onLogin }) => {
  // Registration is disabled for security — only admins can create users via User Management
  const isLoginMode = true;

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

  const resetForm = () => {
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Check lockout first (only relevant for login, but good practice)
    if (isLoginMode && isAccountLocked()) {
      setLockoutSeconds(getLockoutRemainingSeconds());
      setError(`Too many failed attempts. Please wait ${getLockoutRemainingSeconds()} seconds.`);
      return;
    }

    if (!isLoginMode && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (isLoginMode) {
        // LOGIN FLOW
        const result = await loginUser(email, password);

        if (result.success) {
          setAuthenticated(true);
          onLogin();
        } else if (result.locked) {
          setLockoutSeconds(result.remainingSeconds);
          setError(`Too many failed attempts. Please wait ${result.remainingSeconds} seconds.`);
          setPassword('');
        } else {
          const attemptsMsg = result.attemptsRemaining !== undefined ? ` (${result.attemptsRemaining} attempts remaining)` : '';
          setError((result.error || 'Login failed') + attemptsMsg);
          setPassword('');
        }
      } else {
        // SIGNUP FLOW
        await registerUser(email, password);
        setSuccessMsg('Account created successfully! You can now login.');
        setIsLoginMode(true);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-dashboard-primary/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-dashboard-secondary/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-3xl p-10 relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 transition-all duration-300">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-dashboard-secondary to-dashboard-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_25px_rgba(59,130,246,0.4)]">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-dashboard-foreground mb-3 tracking-tight">
            {isLoginMode ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-slate-500 font-medium">
            {isLoginMode ? 'Sign in to access your operations dashboard.' : 'Set up your profile to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error / Success Messages */}
          {(error || successMsg) && (
            <div className={`px-4 py-3 rounded-xl text-p3 font-medium ${successMsg ? 'bg-green-50 border border-green-200 text-green-700' :
              isLocked ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                'bg-red-50 border border-red-200 text-red-700'
              }`}>
              {isLocked && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Account locked. Try again in {lockoutSeconds}s</span>
                </div>
              )}
              {!isLocked && (error || successMsg)}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={isLocked || loading}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-dashboard-secondary focus:ring-4 focus:ring-dashboard-secondary/10 outline-none transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="admin@example.com"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={isLocked || loading}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-dashboard-secondary focus:ring-4 focus:ring-dashboard-secondary/10 outline-none transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
              placeholder={isLoginMode ? "Enter password" : "Min 6 characters"}
            />
          </div>

          {/* Signup Extra Fields */}
          {!isLoginMode && (
            <div>
              <label className="block text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-dashboard-secondary focus:ring-4 focus:ring-dashboard-secondary/10 outline-none transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                placeholder="Confirm password"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (isLoginMode && isLocked)}
            className={`w-full text-white py-3.5 px-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-dashboard-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold uppercase tracking-widest text-sm mt-6 bg-gradient-to-r from-dashboard-primary to-dashboard-secondary shadow-[0_4px_15px_rgba(30,64,175,0.4)] hover:shadow-[0_6px_25px_rgba(30,64,175,0.6)] hover:-translate-y-0.5`}
          >
            {loading ? (isLoginMode ? 'Authenticating...' : 'Creating Account...') :
              (isLoginMode && isLocked) ? `Locked (${lockoutSeconds}s)` :
                (isLoginMode ? 'Access Dashboard' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-center">
          {isLoginMode && (
            <button
              type="button"
              onClick={() => onLogin('forgot')}
              disabled={isLocked || loading}
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50"
            >
              Forgot Password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
