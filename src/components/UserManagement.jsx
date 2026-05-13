import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { registerUser } from '../utils/auth';

const UserManagement = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    
    // User List state
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            // Explicitly select columns to prevent over-fetching of potentially sensitive future columns
            const { data, error } = await supabase.from('profiles').select('id, email, role, created_at').order('created_at', { ascending: false });
            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            if (import.meta.env.DEV) console.error("Failed to load profiles:", err);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
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
            setError('Auth credentials mismatch.');
            setLoading(false);
            return;
        }

        try {
            await registerUser(formData.email, formData.password);
            setSuccess(`Entity "${formData.email}" initialized successfully.`);
            setFormData({
                email: '',
                password: '',
                confirmPassword: '',
            });
            setTimeout(loadUsers, 2000); // Wait for trigger to create profile
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full space-y-12 animate-fade-in-up">
            <div className="notion-card overflow-hidden shadow-notion-deep">
                <div className="p-10 bg-notion-warm-white border-b whisper-border">
                    <h2 className="text-display-secondary text-notion-black tracking-notion-display">Initialize Administrative Access</h2>
                    <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-1">Configure secondary credentials for system orchestration.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    {error && (
                        <div className="p-4 bg-notion-badge-rose-bg whisper-border border-rose-100 text-rose-600 rounded-micro text-badge font-bold uppercase tracking-widest shadow-sm">
                            Error: {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-emerald-50 whisper-border border-emerald-100 text-emerald-600 rounded-micro text-badge font-bold uppercase tracking-widest shadow-sm">
                            {success}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2">
                            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-3 block">Authorization Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-5 py-4 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all"
                                placeholder="new_admin@example.com"
                            />
                        </div>

                        <div>
                            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-3 block">Access Key</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-5 py-4 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all"
                                placeholder="Secure protocol"
                            />
                        </div>

                        <div>
                            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-3 block">Key Verification</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-5 py-4 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all"
                                placeholder="Re-enter for audit"
                            />
                        </div>
                    </div>

                    <div className="pt-8">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-notion-black text-white rounded-micro font-bold uppercase tracking-widest text-badge shadow-notion-deep hover:bg-black transition-all disabled:opacity-20 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {loading ? 'Initializing Interface...' : 'Authorize Secondary Identity'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List of Invited Users */}
            <div className="notion-card overflow-hidden shadow-notion-deep">
                <div className="p-10 bg-notion-warm-white border-b whisper-border flex justify-between items-start">
                    <div>
                        <h2 className="text-display-secondary text-notion-black tracking-notion-display">Personnel Access Matrix</h2>
                        <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-1">Audit active administrative credentials.</p>
                    </div>
                    <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-micro text-badge font-bold uppercase border border-amber-200">
                        Admin resets moved to Supabase Dashboard
                    </div>
                </div>
                
                <div className="p-0">
                    {loadingUsers ? (
                        <div className="p-12 text-center text-notion-warm-gray-100 font-bold text-badge uppercase tracking-widest">Synchronizing credentials...</div>
                    ) : users.length === 0 ? (
                        <div className="p-12 text-center text-notion-warm-gray-100 font-bold text-badge uppercase tracking-widest">No active secondary identities identified.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-notion-warm-white text-notion-warm-gray-300 text-badge font-bold uppercase tracking-widest border-b whisper-border">
                                        <th className="p-6">Authorization Email</th>
                                        <th className="p-6 text-center">Protocol Level</th>
                                        <th className="p-6 text-right">Added</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y whisper-border">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-zinc-50/30 transition-colors">
                                            <td className="p-6 font-bold text-notion-black tracking-tight">{user.email}</td>
                                            <td className="p-6 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-micro text-badge font-bold uppercase tracking-widest shadow-sm whisper-border ${user.role === 'admin' ? 'bg-notion-badge-blue-bg text-notion-blue' : 'bg-notion-badge-green-bg text-emerald-700'}`}>
                                                    {user.role === 'admin' ? 'System Admin' : 'User'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right text-notion-warm-gray-300 font-bold text-badge">
                                                {new Date(user.created_at).toLocaleDateString()}
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
