import React, { useState, useEffect } from 'react';
import { registerUser, getAllUsers, deleteUser, adminResetPassword, getStoredCredentials } from '../utils/auth';

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
    
    // User List state
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const fetched = await getAllUsers();
            setUsers(fetched);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        setCurrentUser(getStoredCredentials());
        loadUsers();
    }, []);

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
            loadUsers(); // Refresh the list after creation
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

            {/* List of Invited Users */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                <div className="p-8 border-b border-zinc-100 bg-zinc-50/50">
                    <h2 className="text-xl font-bold text-zinc-900">Manage Team Members</h2>
                    <p className="text-zinc-500 text-sm mt-1">View, reset passwords, or remove access for existing users.</p>
                </div>
                
                <div className="p-0">
                    {loadingUsers ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">No secondary users found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50 text-zinc-400 text-xs uppercase tracking-widest border-b border-zinc-100">
                                        <th className="p-4 font-bold">Username</th>
                                        <th className="p-4 font-bold">Role</th>
                                        <th className="p-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {users.map((user) => (
                                        <tr key={user.dbId} className="hover:bg-zinc-50/50 transition-colors">
                                            <td className="p-4 font-medium text-zinc-900">{user.username}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' && user.username === 'Joyeb' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {user.username === 'Joyeb' ? 'Master Admin' : 'Staff Admin'}
                                                </span>
                                            </td>
                                            <td className="p-4 flex items-center justify-end gap-3">
                                                {user.username !== 'Joyeb' ? (
                                                    <>
                                                        <button 
                                                            onClick={async () => {
                                                                const newPass = prompt(`Enter new password for ${user.username} (min 6 chars):`);
                                                                if (!newPass) return;
                                                                if (newPass.length < 6) return alert("Password must be at least 6 characters.");
                                                                
                                                                if (window.confirm(`Are you sure you want to forcefully reset the password for ${user.username}?`)) {
                                                                    try {
                                                                        await adminResetPassword(user.username, newPass);
                                                                        alert(`Password for ${user.username} has been reset.`);
                                                                    } catch (e) {
                                                                        alert("Error: " + e.message);
                                                                    }
                                                                }
                                                            }}
                                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                                                        >
                                                            Reset Password
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                if (window.confirm(`CRITICAL: Are you sure you want to permenantly delete the account for ${user.username}? They will immediately lose all access.`)) {
                                                                    try {
                                                                        await deleteUser(user.dbId);
                                                                        loadUsers();
                                                                    } catch (e) {
                                                                        alert("Error deleting user: " + e.message);
                                                                    }
                                                                }
                                                            }}
                                                            className="text-xs font-bold text-rose-600 hover:text-rose-800 uppercase tracking-widest"
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs italic text-zinc-400">Restricted</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
