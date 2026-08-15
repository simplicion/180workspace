'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { Wallet, Plus, Filter, CheckCircle2, AlertCircle, Building2, User, Eye, Download, ShieldAlert, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { LogoLoader, ConfirmModal } from "@workspace/ui";
import ContextActions from '@/app/dashboard/(dashboard)/_components/ContextActions';

import { CreateTransactionDrawer } from './_components/CreateTransactionDrawer';

const STATUS_STYLES: Record<string, { badge: string; label: string; icon: any }> = {
    pending_approval: { badge: 'badge-orange', label: 'Pending Approval', icon: AlertCircle },
    approved: { badge: 'badge-blue', label: 'Approved (Unpaid)', icon: CheckCircle2 },
    unpaid: { badge: 'badge-orange', label: 'Unpaid', icon: AlertCircle },
    paid: { badge: 'badge-green', label: 'Paid', icon: CheckCircle2 },
    rejected: { badge: 'badge-red', label: 'Rejected', icon: ShieldAlert },
};

export default function BillsAndExpensesPage() {
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    
    const [transactions, setTransactions] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        loadData();
    }, [filterStatus]);

    function loadData() {
        setLoading(true);
        Promise.all([
            api.get('/api/expenses', { params: { status: filterStatus || undefined } }),
            api.get('/api/vendors'),
            api.get('/api/projects'),
            api.get('/api/clients')
        ])
        .then(([expensesRes, vendorsRes, projectsRes, clientsRes]) => {
            setTransactions(expensesRes.data.data?.expenses || []);
            setVendors(vendorsRes.data.data?.vendors || []);
            setProjects(projectsRes.data.data?.projects || []);
            setClients(clientsRes.data.data?.clients || []);
        })
        .catch(() => {
            toast.error('Failed to load transactions');
        })
        .finally(() => setLoading(false));
    }

    async function updateStatus(id: string, status: string) {
        try {
            await api.patch(`/api/expenses/${id}/status`, { status });
            toast.success(`Marked as ${status}`);
            loadData();
        } catch { 
            toast.error('Failed to update status'); 
        }
    }

    async function approveClaim(id: string) {
        try {
            await api.patch(`/api/expenses/${id}/approve`);
            toast.success(`Claim Approved`);
            loadData();
        } catch { 
            toast.error('Failed to approve claim'); 
        }
    }

    return (
        <div>
            <CreateTransactionDrawer 
                isOpen={showCreate} 
                onClose={() => setShowCreate(false)} 
                onSuccess={loadData} 
                vendors={vendors} 
                projects={projects}
                clients={clients}
            />

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Bills & Expenses</h1>
                    <p className="page-subtitle">Manage company expenses, vendor bills, and employee reimbursements.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Add Transaction
                </button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400" />
                {['', ...Object.keys(STATUS_STYLES)].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                            filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                        {s === '' ? 'All' : STATUS_STYLES[s].label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-16">
                    <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No transactions yet</p>
                    <p className="text-gray-300 text-sm mt-1">Record your first expense or bill.</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Title & Type</th>
                                    <th>Payee</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(txn => {
                                    const statusInfo = STATUS_STYLES[txn.status] || STATUS_STYLES.unpaid;
                                    const StatusIcon = statusInfo.icon;
                                    const isClaim = txn.type === 'employee_claim';
                                    
                                    return (
                                        <tr key={txn.id} className="group">
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isClaim ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600")}>
                                                        {isClaim ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{txn.title}</p>
                                                        <p className="text-xs text-gray-500 capitalize">{isClaim ? 'Employee Claim' : 'Company Expense'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {isClaim ? (
                                                    <p className="font-medium text-gray-800">{txn.employee?.name || 'Unknown'}</p>
                                                ) : (
                                                    <p className="font-medium text-gray-800">{txn.vendor?.name || 'None'}</p>
                                                )}
                                            </td>
                                            <td className="font-bold text-gray-900">
                                                {currencySymbol}{txn.amount?.toLocaleString('en-IN')}
                                            </td>
                                            <td className="text-sm text-gray-500">
                                                {txn.date ? format(new Date(txn.date), 'MMM d, yyyy') : '-'}
                                            </td>
                                            <td>
                                                <span className={clsx('badge text-xs flex items-center gap-1 w-fit', statusInfo.badge)}>
                                                    <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex justify-end">
                                                    <ContextActions
                                                        actions={[
                                                            ...(isClaim && txn.status === 'pending_approval' && user?.role !== 'employee' ? [{
                                                                label: 'Approve',
                                                                icon: CheckCircle2,
                                                                onClick: () => approveClaim(txn.id)
                                                            }] : []),
                                                            ...(txn.status === 'unpaid' || txn.status === 'approved' ? [{
                                                                label: 'Mark Paid',
                                                                icon: CheckCircle2,
                                                                onClick: () => updateStatus(txn.id, 'paid')
                                                            }] : []),
                                                            ...(txn.status === 'pending_approval' || txn.status === 'unpaid' ? [{
                                                                label: 'Reject',
                                                                icon: ShieldAlert,
                                                                onClick: () => updateStatus(txn.id, 'rejected'),
                                                                variant: 'danger' as const
                                                            }] : []),
                                                        ]}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
