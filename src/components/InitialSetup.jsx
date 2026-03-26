import { useState } from 'react';
import { registerUser, setAuthenticated } from '../utils/auth';

const InitialSetup = ({ onComplete }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        securityQuestion: '',
        securityAnswer: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            await registerUser(
                formData.username,
                formData.password,
                formData.securityQuestion,
                formData.securityAnswer
            );
            setAuthenticated(true);
            onComplete();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-h1 text-gray-900 mb-2">Welcome to Payslip Generator</h1>
                    <p className="text-gray-600 text-p3">Set up your admin account to get started</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-p3 font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="username" className="block text-p3 font-bold text-gray-400 mb-2">
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            minLength={3}
                            autoFocus
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition font-medium"
                            placeholder="Choose a username (min 3 characters)"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="password" className="block text-p3 font-bold text-gray-400 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition font-medium"
                                placeholder="Min 6 characters"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-p3 font-bold text-gray-400 mb-2">
                                Confirm
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition font-medium"
                                placeholder="Confirm password"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-4">Security question for password recovery:</p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="securityQuestion" className="block text-p3 font-bold text-gray-400 mb-2">
                                    Security Question
                                </label>
                                <input
                                    id="securityQuestion"
                                    name="securityQuestion"
                                    type="text"
                                    value={formData.securityQuestion}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition font-medium"
                                    placeholder="e.g., What is your favorite color?"
                                />
                            </div>
                            <div>
                                <label htmlFor="securityAnswer" className="block text-p3 font-bold text-gray-400 mb-2">
                                    Security Answer
                                </label>
                                <input
                                    id="securityAnswer"
                                    name="securityAnswer"
                                    type="text"
                                    value={formData.securityAnswer}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition font-medium"
                                    placeholder="Your answer (case insensitive)"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold uppercase tracking-wider text-sm"
                    >
                        {loading ? 'Setting up...' : 'Create Account & Continue'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Your credentials are encrypted and stored securely.
                </div>
            </div>
        </div>
    );
};

export default InitialSetup;
