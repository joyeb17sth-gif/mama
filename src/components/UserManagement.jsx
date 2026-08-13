import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { registerUser } from '../utils/auth';
import { getContractors, getProfilesAsync, clearProfilesCache } from '../utils/storage';

// SVG Icons
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const FilterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const UserManagement = () => {
    // UI State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    
    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'supervisor'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Data State
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    // Role Change Confirmation State
    const [roleChangeTarget, setRoleChangeTarget] = useState(null); // { id, currentRole, targetRole, email }

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const data = await getProfilesAsync(true);
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

    const handleInitializeFromContractor = (contractor) => {
        let assignedRole = 'supervisor';
        const roleLower = contractor.role?.toLowerCase() || '';
        if (roleLower.includes('manager') || roleLower.includes('mod')) {
            assignedRole = 'manager';
        }
        setFormData({
            email: contractor.email || '',
            password: '',
            confirmPassword: '',
            role: assignedRole
        });
        setIsAddModalOpen(true);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleRoleChangeInitiate = (userId, newRole, email, currentRole) => {
        setRoleChangeTarget({ id: userId, targetRole: newRole, currentRole, email });
    };

    const confirmRoleChange = async () => {
        if (!roleChangeTarget) return;
        
        try {
            const { error } = await supabase.from('profiles').update({ role: roleChangeTarget.targetRole }).eq('id', roleChangeTarget.id);
            if (error) {
                // Handle specific constraint violation (e.g., invalid role value)
                if (error.message.includes('profiles_role_check')) {
                    setError(`Role "${roleChangeTarget.targetRole}" is not allowed by the database. Please run the latest SECURITY_FIX.sql to update allowed roles.`);
                } else if (error.code === '42501' || error.message.includes('policy')) {
                    setError('Permission denied. Only administrators can change user roles.');
                } else {
                    setError('Failed to update role: ' + error.message);
                }
                setRoleChangeTarget(null);
                return;
            }
            
            clearProfilesCache();
            // Show inline success on the table temporarily
            setSuccess(`Updated ${roleChangeTarget.email} to ${roleChangeTarget.targetRole}.`);
            setTimeout(() => setSuccess(''), 4000);
            
            loadUsers();
        } catch (err) {
            setError('Failed to update permissions: ' + (err.message || 'Unknown error'));
        } finally {
            setRoleChangeTarget(null);
        }
    };


    // Robust polling mechanism for role assignment
    const assignRoleWithRetry = async (email, role, retries = 10, delayMs = 500) => {
        for (let i = 0; i < retries; i++) {
            const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
            if (profile) {
                await supabase.from('profiles').update({ role: role }).eq('id', profile.id);
                return true;
            }
            await new Promise(r => setTimeout(r, delayMs));
        }
        throw new Error('User created successfully, but assigning the role timed out. Please assign the role manually from the list.');
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
            // Register uses the non-persisting client in auth.js
            await registerUser(formData.email, formData.password);

            // Robust role assignment
            await assignRoleWithRetry(formData.email, formData.role);

            clearProfilesCache();
            setSuccess(`Entity "${formData.email}" initialized successfully as ${formData.role}.`);
            setFormData({ email: '', password: '', confirmPassword: '', role: 'supervisor' });
            setIsAddModalOpen(false);
            
            // Clear success message after 4s
            setTimeout(() => setSuccess(''), 4000);
            loadUsers();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getRoleLabel = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin': return 'System Admin';
            case 'supervisor': return 'Supervisor';
            case 'manager': return 'Manager';
            case 'payslip_management': return 'Payslip Management';
            case 'leads_team': return 'Leads Team';
            default: return 'User';
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin': return 'bg-blue-50 text-blue-700 border border-blue-200/50';
            case 'supervisor': return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
            case 'manager': return 'bg-purple-50 text-purple-700 border border-purple-200/50';
            case 'payslip_management': return 'bg-rose-50 text-rose-700 border border-rose-200/50';
            case 'leads_team': return 'bg-orange-50 text-orange-700 border border-orange-200/50';
            default: return 'bg-zinc-100 text-zinc-600 border border-zinc-200/50';
        }
    };

    const getAvatarInitials = (email, name) => {
        if (name) {
            const parts = name.split(' ');
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return name.substring(0, 2).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    // Data Processing for the Matrix
    const activeEmails = users.map(u => u.email?.toLowerCase() || '');
    const supervisorAndModContractors = (getContractors() || []).filter(c => {
        const roleLower = c.role?.toLowerCase() || '';
        return roleLower.includes('supervisor') || roleLower.includes('manager') || roleLower.includes('mod');
    });

    const activeEntries = users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isPending: false,
        name: ''
    }));

    activeEntries.forEach(entry => {
        const matchingContractor = (getContractors() || []).find(c => c.email?.toLowerCase() === entry.email?.toLowerCase());
        if (matchingContractor) entry.name = matchingContractor.name;
    });

    // Apply Search Filter
    let combinedEntries = [...activeEntries];
    
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        combinedEntries = combinedEntries.filter(entry => 
            entry.email?.toLowerCase().includes(q) || 
            (entry.name && entry.name.toLowerCase().includes(q))
        );
    }

    // Apply Role Filter
    if (roleFilter !== 'all') {
        combinedEntries = combinedEntries.filter(entry => 
            entry.role?.toLowerCase() === roleFilter.toLowerCase()
        );
    }

    return (
        <div className="w-full space-y-8 animate-fade-in-up pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900">User Directory</h2>
                    <p className="text-zinc-500 mt-1">Manage system access, roles, and administrative credentials.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-all shadow-lg shadow-zinc-900/20 active:scale-95"
                >
                    <PlusIcon />
                    Add New User
                </button>
            </div>

            {/* Global Success Message */}
            {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg shadow-sm flex items-center justify-between animate-fade-in-up">
                    <span className="font-medium">{success}</span>
                </div>
            )}

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-xl leading-5 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all shadow-sm"
                    />
                </div>
                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <FilterIcon />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="block w-full pl-10 pr-10 py-3 border border-zinc-200 rounded-xl leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all shadow-sm appearance-none font-medium text-zinc-700"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">System Admin</option>
                        <option value="manager">Manager</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="leads_team">Leads Team</option>
                        <option value="user">User</option>
                    </select>
                </div>
            </div>

            {/* Data Matrix */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                {loadingUsers ? (
                    <div className="p-12 text-center text-zinc-500 font-medium animate-pulse">Synchronizing directory...</div>
                ) : combinedEntries.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border border-zinc-100">
                            <SearchIcon />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900">No users found</h3>
                        <p className="text-zinc-500 mt-1">We couldn't find anyone matching your current filters.</p>
                        {(searchQuery || roleFilter !== 'all') && (
                            <button onClick={() => { setSearchQuery(''); setRoleFilter('all'); }} className="mt-4 text-zinc-900 font-medium hover:underline">
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4 text-center">Status / Role</th>
                                    <th className="px-6 py-4 text-right">Access Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {combinedEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-zinc-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner shrink-0 ${entry.isPending ? 'bg-amber-100 text-amber-700' : 'bg-zinc-900 text-white'}`}>
                                                    {getAvatarInitials(entry.email, entry.name)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-zinc-900 truncate">{entry.name || entry.email.split('@')[0]}</span>
                                                    <span className="text-sm text-zinc-500 truncate">{entry.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {entry.isPending ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                                                    Setup Pending
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(entry.role)}`}>
                                                    {getRoleLabel(entry.role)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {entry.isPending ? (
                                                <button
                                                    onClick={() => handleInitializeFromContractor(entry.contractor)}
                                                    className="px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-900 rounded-lg text-sm font-semibold transition-all shadow-sm"
                                                >
                                                    Setup Access
                                                </button>
                                            ) : (
                                                <select
                                                    value={entry.role || 'supervisor'}
                                                    onChange={(e) => handleRoleChangeInitiate(entry.id, e.target.value, entry.email, entry.role)}
                                                    className="bg-transparent border border-transparent hover:border-zinc-200 hover:bg-white focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-sm font-semibold rounded-lg px-3 py-2 outline-none transition-all cursor-pointer shadow-sm text-zinc-700"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">System Admin</option>
                                                    <option value="supervisor">Supervisor</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="leads_team">Leads Team</option>
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Role Change Confirmation Modal */}
            {roleChangeTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-scale-in">
                        <h3 className="text-xl font-bold text-zinc-900 mb-2">Confirm Role Change</h3>
                        <p className="text-zinc-500 mb-6 leading-relaxed">
                            Are you sure you want to change the role for <strong className="text-zinc-900">{roleChangeTarget.email}</strong> from <span className="line-through">{getRoleLabel(roleChangeTarget.currentRole)}</span> to <strong className="text-zinc-900">{getRoleLabel(roleChangeTarget.targetRole)}</strong>?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setRoleChangeTarget(null)}
                                className="px-5 py-2.5 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRoleChange}
                                className="px-5 py-2.5 rounded-xl font-medium text-white bg-zinc-900 hover:bg-black shadow-lg shadow-zinc-900/20 transition-all active:scale-95"
                            >
                                Confirm Change
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
                        
                        <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-zinc-900">Initialize Access</h2>
                                <p className="text-zinc-500 mt-1 text-sm">Create a new administrative identity.</p>
                            </div>
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
                            >
                                <XIcon />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Authorization Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all shadow-sm"
                                            placeholder="admin@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Designated Role</label>
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all shadow-sm appearance-none font-medium text-zinc-800"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">System Admin</option>
                                            <option value="supervisor">Supervisor</option>
                                            <option value="manager">Manager</option>
                                            <option value="leads_team">Leads Team</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Access Key (Password)</label>
                                            <input
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all shadow-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Verify Key</label>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all shadow-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="px-6 py-3 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-medium shadow-lg shadow-zinc-900/20 hover:bg-black transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
                                    >
                                        {loading ? 'Processing...' : 'Authorize User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Required CSS Animations (Assuming Tailwind is configured, add these to global CSS if not present) */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scale-in {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}} />
        </div>
    );
};

export default UserManagement;
