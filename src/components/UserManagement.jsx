import React, { useState } from 'react';
import { registerUser } from '../utils/auth';

const UserManagement = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        securityQuestion: '',
        securityAnswer: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

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
            setSuccess(`User "${formData.username}" created successfully!`);
            setFormData({
                username: '',
                password: '',
                confirmPassword: '',
                securityQuestion: '',
                securityAnswer: '',
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                <div className="p-8 border-b border-zinc-100 bg-zinc-50/50">
                    <h2 className="text-xl font-bold text-zinc-900">Create New User Account</h2>
                    <p className="text-zinc-500 text-sm mt-1">Add a new team member with full access to the system.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-medium">
                            {success}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all font-medium"
                                placeholder="Team member's username"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all font-medium"
                                placeholder="Min 6 characters"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all font-medium"
                                placeholder="Repeat password"
                            />
                        </div>

                        <div className="md:col-span-2 pt-4 border-t border-zinc-100">
                            <p className="text-xs text-zinc-400 mb-4">Security verification for password recovery:</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Security Question</label>
                            <input
                                type="text"
                                name="securityQuestion"
                                value={formData.securityQuestion}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all font-medium"
                                placeholder="e.g., Favorite city?"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Security Answer</label>
                            <input
                                type="text"
                                name="securityAnswer"
                                value={formData.securityAnswer}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all font-medium"
                                placeholder="Answer"
                            />
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Creating Account...' : 'Create Team Member Account'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <div className="flex gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-blue-900 text-sm italic">Main Admin Privilege</h3>
                        <p className="text-blue-700/80 text-xs mt-1 leading-relaxed italic">As the Main Admin, only you can access this section to create or manage secondary user accounts. Secondary users will have the same data visibility but cannot create other users.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
