'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
    Building2, Search, Filter, ShieldCheck, HeartPulse, ChevronRight, AlertTriangle, Plus, Trash2, Edit
} from 'lucide-react';
import { Skeleton } from "@workspace/ui";
import clsx from 'clsx';
import AddAccountModal from '@/app/dashboard/(dashboard)/_components/AddAccountModal';
import { ConfirmModal } from "@workspace/ui";
import toast from 'react-hot-toast';

export default function AccountsPage() {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const fetchAccounts = () => {
        setLoading(true);
        api.get('/api/sales/accounts')
            .then(({ data }) => setAccounts(data.accounts || data))
            .catch(() => setError('Failed to load accounts'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleDeleteAccount = (id: string, name: string) => {
        setConfirmState({
            open: true,
            title: 'Delete Account?',
            message: `Are you sure you want to delete "${name}"? This will permanently remove all associated data.`,
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    await api.delete(`/api/sales/accounts/${id}`);
                    toast.success('Account deleted successfully');
                    fetchAccounts();
                } catch (error) {
                    toast.error('Failed to delete account');
                } finally {
                    setIsDeleting(false);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const filteredAccounts = accounts.filter(a =>
        (a.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.industry || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <AddAccountModal 
                isOpen={isAddModalOpen || !!editingAccount} 
                onClose={() => { setIsAddModalOpen(false); setEditingAccount(null); }} 
                onSuccess={fetchAccounts} 
                account={editingAccount}
            />
            
            <ConfirmModal 
                isOpen={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                variant="danger"
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
                loading={isDeleting}
            />
            <div className="page-header flex justify-between items-start">
                <div>
                    <h1 className="page-title text-indigo-900 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-indigo-600" />
                        Account Database
                    </h1>
                    <p className="page-subtitle mt-1">Manage corporate clients, track Customer Lifetime Value, and monitor churn risk.</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Account
                </button>
            </div>

            {error && (
                <div className="text-red-600 bg-red-50 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            <div className="card overflow-hidden mt-4">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
                    <div className="relative max-w-sm w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search accounts or industries..."
                            className="input pl-10 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                                <th className="p-4">Account Name</th>
                                <th className="p-4">Lifetime Value (CLV)</th>
                                <th className="p-4">Health / Churn Risk</th>
                                <th className="p-4">Industry</th>
                                <th className="p-4">Size</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="p-4"><Skeleton variant="text" width="180px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="80px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="100px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="120px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="60px" /></td>
                                        <td className="p-4"></td>
                                    </tr>
                                ))
                            ) : filteredAccounts.length > 0 ? (
                                filteredAccounts.map(account => (
                                    <tr key={account.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                                                    {(account.companyName || 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{account.companyName || 'Unknown Company'}</div>
                                                    <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">{account.website?.replace('https://', '')}</a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-emerald-700">
                                                ${(account.clv || 0).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-400">Total Lifetime</div>
                                        </td>
                                        <td className="p-4">
                                            {account.healthStatus === 'At Risk' ? (
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 w-max">
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    At Risk
                                                </span>
                                            ) : account.healthStatus === 'Churned' ? (
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 w-max">
                                                    Churned
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700 w-max">
                                                    <HeartPulse className="w-3.5 h-3.5" />
                                                    Healthy
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 capitalize">
                                            {account.industry || 'â€”'}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {account.employeeCount || 'â€”'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1 px-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={() => setEditingAccount(account)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all"
                                                    title="Edit Account"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteAccount(account.id, account.companyName)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete Account"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <div className="w-px h-4 bg-gray-200 mx-1" />
                                                <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Detail</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        <Building2 className="w-8 h-8 opacity-20 mx-auto mb-3" />
                                        No accounts found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

