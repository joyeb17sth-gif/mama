import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { registerUser } from '../utils/auth';
import { getContractors } from '../utils/storage';

const UserManagement = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'supervisor' // Default role
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
            if (error) throw error;
            setSuccess(`Permissions updated successfully.`);
            loadUsers();
        } catch (err) {
            setError('Failed to update permissions: ' + err.message);
        }
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
            
            // Wait a bit for trigger to create the profile entry
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Update role for the newly created user
            const { data: newUser } = await supabase.from('profiles').select('id').eq('email', formData.email).single();
            if (newUser) {
                await supabase.from('profiles').update({ role: formData.role }).eq('id', newUser.id);
            }

            setSuccess(`Entity "${formData.email}" initialized successfully as ${formData.role}.`);
            setFormData({
                email: '',
                password: '',
                confirmPassword: '',
                role: 'supervisor'
            });
            loadUsers();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getRoleLabel = (role) => {
        switch(role?.toLowerCase()) {
            case 'admin': return 'System Admin';
            case 'supervisor': return 'Supervisor';
            case 'manager': return 'Manager';
            case 'payslip_management': return 'Payslip Management';
            default: return 'User';
        }
    };

    const getRoleBadgeColor = (role) => {
        switch(role?.toLowerCase()) {
            case 'admin': return 'bg-notion-badge-blue-bg text-notion-blue';
            case 'supervisor': return 'bg-notion-badge-green-bg text-emerald-700';
            case 'manager': return 'bg-notion-badge-purple-bg text-purple-700';
            case 'payslip_management': return 'bg-notion-badge-rose-bg text-rose-700';
            default: return 'bg-zinc-100 text-zinc-600';
        }
    };

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
        if (matchingContractor) {
            entry.name = matchingContractor.name;
        }
    });

    const pendingEntries = supervisorAndModContractors
        .filter(c => c.email && !activeEmails.includes(c.email.toLowerCase()))
        .map(c => ({
            id: `pending-${c.id}`,
            email: c.email,
            role: c.role,
            isPending: true,
            name: c.name,
            contractor: c
        }));

    const combinedEntries = [...activeEntries, ...pendingEntries];

    return (
        <div className="w-full space-y-12 animate-fade-in-up">
            <div className="notion-card overflow-hidden shadow-notion-deep">
                <div className="p-10 bg-notion-warm-white border-b whisper-border">
                    <h2 className="text-display-secondary text-notion-black tracking-notion-display">Initialize Administrative Access</h2>
                    <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-1">Configure secondary credentials with role-specific permissions.</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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

                        <div className="md:col-span-2">
                            <label className="text-badge font-bold text-notion-warm-gray-300 uppercase tracking-widest pl-1 mb-3 block">Designated Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-5 py-4 bg-notion-warm-white whisper-border rounded-micro focus:shadow-notion-card outline-none font-bold text-notion-black transition-all"
                            >
                                <option value="admin">System Admin</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="manager">Manager</option>
                                <option value="payslip_management">Payslip Management</option>
                            </select>
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

            <div className="notion-card overflow-hidden shadow-notion-deep">
                <div className="p-10 bg-notion-warm-white border-b whisper-border flex justify-between items-start">
                    <div>
                        <h2 className="text-display-secondary text-notion-black tracking-notion-display">Personnel Access Matrix</h2>
                        <p className="text-caption text-notion-warm-gray-300 font-bold uppercase tracking-widest mt-1">Audit and modify administrative credentials.</p>
                    </div>
                </div>
                
                <div className="p-0">
                    {loadingUsers ? (
                        <div className="p-12 text-center text-notion-warm-gray-100 font-bold text-badge uppercase tracking-widest">Synchronizing credentials...</div>
                    ) : combinedEntries.length === 0 ? (
                        <div className="p-12 text-center text-notion-warm-gray-100 font-bold text-badge uppercase tracking-widest">No active secondary identities identified.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-notion-warm-white text-notion-warm-gray-300 text-badge font-bold uppercase tracking-widest border-b whisper-border">
                                        <th className="p-6">Authorization Email</th>
                                        <th className="p-6 text-center">Current Role</th>
                                        <th className="p-6 text-right">Switch Access Level</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y whisper-border">
                                    {combinedEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-zinc-50/30 transition-colors">
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-notion-black tracking-tight">{entry.email}</span>
                                                    {entry.name && (
                                                        <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                                                            {entry.name} {entry.isPending && <span className="text-amber-600 font-semibold">(Pending Workforce Auth)</span>}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                {entry.isPending ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-micro text-badge font-bold uppercase tracking-widest shadow-sm bg-amber-50 text-amber-700 whisper-border border-amber-100">
                                                        Setup Pending ({entry.role?.replace('/SUPERVISOR', '')})
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-micro text-badge font-bold uppercase tracking-widest shadow-sm whisper-border ${getRoleBadgeColor(entry.role)}`}>
                                                        {getRoleLabel(entry.role)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right">
                                                {entry.isPending ? (
                                                    <button
                                                        onClick={() => handleInitializeFromContractor(entry.contractor)}
                                                        className="px-3 py-1.5 bg-notion-black hover:bg-zinc-800 text-white rounded-micro text-badge font-bold uppercase tracking-widest shadow-sm transition-all"
                                                    >
                                                        Setup Access
                                                    </button>
                                                ) : (
                                                    <select 
                                                        value={entry.role || 'supervisor'}
                                                        onChange={(e) => handleRoleChange(entry.id, e.target.value)}
                                                        className="bg-white whisper-border text-badge font-bold rounded px-2 py-1 outline-none focus:border-notion-blue transition-all"
                                                    >
                                                        <option value="admin">System Admin</option>
                                                        <option value="supervisor">Supervisor</option>
                                                        <option value="manager">Manager</option>
                                                        <option value="payslip_management">Payslip Management</option>
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
            </div>
        </div>
    );
};

export default UserManagement;
