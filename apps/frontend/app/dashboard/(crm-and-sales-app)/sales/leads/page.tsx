'use client';


import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
    Search, Filter, Plus, FileUp, MoreVertical, Star, Target, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Skeleton } from "@workspace/ui";
import Link from 'next/link';
import clsx from 'clsx';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import ContextActions from '@/app/dashboard/(dashboard)/_components/ContextActions';
import { ConfirmModal } from "@workspace/ui";
import { Eye, Trash2, Banknote, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FavoriteButton } from "@workspace/ui";
import AddLeadModal from '@/app/dashboard/(dashboard)/_components/AddLeadModal';

export default function LeadsPage() {
    const { user } = useAuth();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const router = useRouter();

    const loadLeads = () => {
        setLoading(true);
        api.get('/api/sales/leads')
            .then(({ data }) => {
                const leadsData = data.leads || data;
                setLeads(Array.isArray(leadsData) ? leadsData : []);

                // Track Visit (Phase 6)
                api.post('/api/user-preferences/recent', {
                    recordId: 'leads-intelligence',
                    type: 'Lead',
                    label: 'Leads Intelligence',
                    href: '/dashboard/sales/leads'
                }).then(() => {
                    window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
                }).catch(err => console.error('Recent tracking error:', err));
            })
            .catch(() => setError('Failed to load leads'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadLeads();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const parsedLeads = results.data.map((row: any) => ({
                        name: row.name || row.Name || 'Unknown Contact',
                        company: row.companyName || row.Company || row.company || 'Unknown Company',
                        email: row.email || row.Email || '',
                        phone: row.phone || row.Phone || '',
                        jobTitle: row.jobTitle || row['Job Title'] || '',
                        industry: row.industry || row.Industry || 'Other',
                        companySize: parseInt(row.companySize || row['Company Size']) || 1,
                        source: (row.source || row.Source || 'outbound').toLowerCase(),
                    }));

                    const res = await api.post('/api/sales/leads/import', { leads: parsedLeads });
                    toast.success(res.data.message || `Successfully imported leads`);
                    loadLeads();
                } catch (err: any) {
                    toast.error(err.response?.data?.error || 'Failed to import leads');
                } finally {
                    setImporting(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            },
            error: (err: any) => {
                toast.error(`CSV Parsing Error: ${err.message}`);
                setImporting(false);
            }
        });
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        setIsDeleting(true);
        try {
            await api.delete(`/api/sales/leads/${deletingId}`);
            toast.success('Lead deleted');
            setLeads(prev => prev.filter(l => l.id !== deletingId));
            setDeletingId(null);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete lead');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredLeads = leads.filter(l =>
        (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.company || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="page-header flex justify-between items-start">
                <div>
                    <h1 className="page-title text-indigo-900 flex items-center gap-2">
                        <Target className="w-6 h-6 text-indigo-600" />
                        Leads Intelligence
                    </h1>
                    <p className="page-subtitle mt-1">Algorithmically scored leads prioritized by engagement and fit.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                    <button
                        className="btn-secondary flex items-center gap-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                    >
                        <FileUp className="w-4 h-4" />
                        {importing ? 'Importing...' : 'Import CSV'}
                    </button>
                    <FavoriteButton
                        recordId="leads-intelligence"
                        type="Lead"
                        label="Leads Intelligence"
                        href="/dashboard/sales/leads"
                    />
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Add Lead
                    </button>
                </div>
            </div>

            {error && (
                <div className="text-red-600 bg-red-50 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
                    <div className="relative max-w-sm w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search leads by name or company..."
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
                                <th className="p-4">Name / Company</th>
                                <th className="p-4">Lead Score</th>
                                <th className="p-4">Engagement</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Source</th>
                                <th className="p-4">Owner</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="p-4"><Skeleton variant="text" width="150px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="60px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="80px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="100px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="100px" /></td>
                                        <td className="p-4"><Skeleton variant="circular" width={24} height={24} /></td>
                                        <td className="p-4"></td>
                                    </tr>
                                ))
                            ) : filteredLeads.length > 0 ? (
                                filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-semibold text-gray-900">{lead.name}</div>
                                            <div className="text-xs text-gray-500">{lead.company}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="font-bold text-indigo-700">{lead.leadScore}</div>
                                                {lead.leadScore > 75 && <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm">{lead.engagementScore || 0} pts</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider",
                                                lead.status?.toLowerCase() === 'new' && "bg-blue-100 text-blue-700",
                                                lead.status?.toLowerCase() === 'contacted' && "bg-amber-100 text-amber-700",
                                                lead.status?.toLowerCase() === 'qualified' && "bg-emerald-100 text-emerald-700",
                                                (lead.status?.toLowerCase() === 'disqualified' || lead.status?.toLowerCase() === 'lost') && "bg-red-100 text-red-700",
                                                lead.status?.toLowerCase() === 'converted' && "bg-indigo-100 text-indigo-700",
                                            )}>
                                                {lead.status?.charAt(0).toUpperCase() + lead.status?.slice(1)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 capitalize">
                                            {lead.source}
                                        </td>
                                        <td className="p-4">
                                            {lead.assignedSalesRep ? (
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold" title={lead.assignedSalesRep.name}>
                                                    {lead.assignedSalesRep.name.charAt(0)}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end">
                                                <ContextActions
                                                    actions={[
                                                        {
                                                            label: 'Create Invoice',
                                                            icon: Banknote,
                                                            onClick: () => router.push(`/dashboard/invoices?create=true&clientId=${lead.id}&clientName=${encodeURIComponent(lead.name)}`),
                                                            variant: 'primary'
                                                        },
                                                        {
                                                            label: 'Edit',
                                                            icon: Edit,
                                                            onClick: () => toast.success('Edit feature coming soon')
                                                        },
                                                        {
                                                            label: 'Delete',
                                                            icon: Trash2,
                                                            onClick: () => setDeletingId(lead.id),
                                                            variant: 'danger'
                                                        }
                                                    ]}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        <Target className="w-8 h-8 opacity-20 mx-auto mb-3" />
                                        No leads found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!deletingId}
                title="Delete Lead"
                message="Are you sure you want to delete this lead? This action cannot be undone."
                confirmText="Delete"
                onConfirm={handleDelete}
                onCancel={() => setDeletingId(null)}
                loading={isDeleting}
                variant="danger"
            />

            <AddLeadModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={loadLeads}
            />
        </div>
    );
}

