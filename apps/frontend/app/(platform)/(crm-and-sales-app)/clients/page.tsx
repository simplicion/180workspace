'use client';


import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Building2, Search, Plus, Trash2, Eye, Filter, Mail, Phone, ExternalLink, Download, Pencil, MessageCircle, Globe } from 'lucide-react';
import { Skeleton, SkeletonTable , LogoLoader } from "@workspace/ui";
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';
import AddClientDrawer from '@/app/(platform)/(crm-and-sales-app)/_components/AddClientDrawer';
import { ConfirmModal } from "@workspace/ui";
import ContextActions from '@/app/(platform)/(dashboard)/_components/ContextActions';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';

const STATUS_COLORS: Record<string, string> = {
    active: 'badge-green',
    inactive: 'badge-gray',
    lead: 'badge-orange',
};

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [editClient, setEditClient] = useState<any>(null);
    const [categoryFilter, setCategoryFilter] = useState('');

    const [categoriesList, setCategoriesList] = useState<string[]>([]);

    // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    const loadClients = useCallback(() => {
        const cacheKey = `clients:${search}:${status}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            // Instant 0ms Paint
            setClients(cached.data || []);
            setLoading(false);
        } else {
            setLoading(true);
        }

        api.get('/api/clients', { params: { search, status } })
            .then(({ data }) => {
                const fetched = data.clients || [];
                setClients(fetched);
                swrCacheRef.current.set(cacheKey, {
                    data: fetched,
                    timestamp: Date.now()
                });
            })
            .catch(() => {
                if (!cached) toast.error('Failed to load clients');
            })
            .finally(() => setLoading(false));

        api.get('/api/clients/categories')
            .then(({ data }) => {
                if (data.categories && Array.isArray(data.categories)) {
                    setCategoriesList(data.categories);
                }
            })
            .catch(() => {});
    }, [search, status]);

    const uniqueCategories = Array.from(new Set([
        ...categoriesList,
        ...clients.map(c => c.category).filter(Boolean)
    ])).sort();
    const displayClients = clients.filter(c => !categoryFilter || c.category === categoryFilter);

    useEffect(() => { loadClients(); }, [loadClients]);

    const stats = {
        total: clients.length,
        active: clients.filter(c => c.status === 'active').length,
        leads: clients.filter(c => c.status === 'lead').length,
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedClients(clients.map(c => c.id));
        } else {
            setSelectedClients([]);
        }
    };

    const handleSelectClient = (id: string) => {
        setSelectedClients(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedClients.length} clients?`)) return;
        setIsBulkDeleting(true);
        try {
            await Promise.all(selectedClients.map(id => api.delete(`/api/clients/${id}`)));
            toast.success('Selected clients deleted');
            setSelectedClients([]);
            loadClients();
        } catch {
            toast.error('Failed to delete some clients');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Name', 'Title', 'Company', 'Email', 'Phone', 'Industry', 'Size', 'Annual Revenue', 'CLV', 'Status', 'Health'];
        const rows = clients.map(c => [
            c.name,
            c.title || '',
            c.company || '',
            c.email,
            c.phone || '',
            c.industry || '',
            c.companySize || '',
            c.annualRevenue?.toString() || '',
            c.customerLifetimeValue?.toString() || '',
            c.status,
            c.healthStatus || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(v => `"${v}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6">
            {(showAdd || editClient) && (
                <AddClientDrawer
                    open={showAdd || !!editClient}
                    onClose={() => { setShowAdd(false); setEditClient(null); }}
                    onSuccess={() => { setShowAdd(false); setEditClient(null); loadClients(); }}
                    editClient={editClient || undefined}
                />
            )}

            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Delete Client"
                message={`Are you sure you want to delete ${confirmDelete?.name}? This will mark the client as deleted but preserve historical records for integrity.`}
                confirmText="Delete Client"
                onConfirm={() => {
                    setIsDeleting(true);
                    api.delete(`/api/clients/${confirmDelete.id}`)
                        .then(() => {
                            toast.success('Client deleted');
                            loadClients();
                            setConfirmDelete(null);
                        })
                        .catch(() => toast.error('Failed to delete client'))
                        .finally(() => setIsDeleting(false));
                }}
                onCancel={() => setConfirmDelete(null)}
                loading={isDeleting}
            />

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Client Database</h1>
                    <p className="page-subtitle">{stats.total} total clients â€¢ {stats.active} active â€¢ {stats.leads} leads</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToCSV} className="btn-secondary">
                        <ExternalLink className="w-4 h-4" />
                        Export
                    </button>
                    {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && (user.permissions.includes('can_manage_hr') || user.permissions.includes('can_manage_team')))) && (
                        <button onClick={() => setShowAdd(true)} className="btn-primary">
                            <Plus className="w-4 h-4" />
                            Add Client
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-3 flex-1 min-w-[300px]">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            placeholder="Search by name, company or email..." 
                            className="input pl-9" 
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <CustomSelect 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value)} 
                            className="select pl-9 w-40"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="lead">Lead / Prospect</option>
                        </CustomSelect>
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                        <CustomSelect 
                            value={categoryFilter} 
                            onChange={(e) => setCategoryFilter(e.target.value)} 
                            className="select pl-9 w-48 font-medium"
                        >
                            <option value="">All Categories</option>
                            {uniqueCategories.map(cat => (
                                <option key={cat as string} value={cat as string}>{cat as string}</option>
                            ))}
                        </CustomSelect>
                    </div>
                </div>

                {selectedClients.length > 0 && (
                    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl animate-in fade-in slide-in-from-top-1">
                        <span className="text-sm font-bold text-indigo-700">{selectedClients.length} clients selected</span>
                        <div className="w-px h-4 bg-indigo-200 mx-1"></div>
                        <button 
                            onClick={handleDeleteSelected}
                            disabled={isBulkDeleting}
                            className="text-sm font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 transition-colors"
                        >
                            {isBulkDeleting ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete Selected
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <SkeletonTable rows={8} columns={6} />
            ) : (
                <div className="card overflow-hidden">
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="w-10">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                            checked={selectedClients.length === displayClients.length && displayClients.length > 0}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th>Client / Company</th>
                                    <th>Contact Info</th>
                                    <th>Business Insights</th>
                                    <th>Category</th>
                                    <th>Status / Health</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayClients.map((client) => (
                                    <tr 
                                        key={client.id}
                                        className={clsx(
                                            "hover:bg-gray-50/80 cursor-pointer transition-colors group",
                                            selectedClients.includes(client.id) && "bg-indigo-50/30"
                                        )}
                                        onClick={() => router.push(`/clients/${client.id}`)}
                                    >
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                                checked={selectedClients.includes(client.id)}
                                                onChange={() => handleSelectClient(client.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                                    {client.logoUrl ? (
                                                        <img src={client.logoUrl} alt={client.name} className="w-full h-full rounded-xl object-cover" />
                                                    ) : (
                                                        <Building2 className="w-5 h-5 text-blue-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 leading-none mb-1">{client.name}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{client.title ? `${client.title} at ` : ''}{client.company || 'Individual'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    <Mail className="w-3 h-3 text-gray-400" />
                                                    {client.email}
                                                </div>
                                                {client.phone && (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                        <Phone className="w-3 h-3 text-gray-400" />
                                                        {client.phone}
                                                        <a 
                                                            href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="text-green-500 hover:text-green-600 ml-1 bg-green-50 p-1 rounded-full"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="Chat on WhatsApp"
                                                        >
                                                            <MessageCircle className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-800">{client.industry || '—'}</span>
                                                    {client.clientType && (
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                            {client.clientType}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    {client.website && (
                                                        <a 
                                                            href={client.website.startsWith('http') ? client.website : `https://${client.website}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1 hover:text-indigo-600"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Globe className="w-3 h-3" />
                                                            Website
                                                        </a>
                                                    )}
                                                    {client.website && (client.companySize || client.annualRevenue) && <span>•</span>}
                                                    {client.companySize && <span>{client.companySize}</span>}
                                                    {client.annualRevenue && <span>• ${client.annualRevenue.toLocaleString()}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {client.category ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/80">
                                                    🏷️ {client.category}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 font-medium">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="space-y-1.5">
                                                <span className={clsx('badge capitalize', STATUS_COLORS[client.status] || 'badge-gray')}>
                                                    {client.status}
                                                </span>
                                                {client.healthStatus && (
                                                    <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                                                        <div className={clsx('w-1.5 h-1.5 rounded-full', {
                                                            'bg-green-500': client.healthStatus === 'Excellent',
                                                            'bg-blue-500': client.healthStatus === 'Good',
                                                            'bg-orange-500': client.healthStatus === 'Average',
                                                            'bg-red-500': client.healthStatus === 'Poor' || client.healthStatus === 'At Risk'
                                                        })} />
                                                        {client.healthStatus}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <ContextActions
                                                actions={[
                                                    {
                                                        label: 'View Profile',
                                                        icon: Eye,
                                                        onClick: () => router.push(`/clients/${client.id}`),
                                                        variant: 'primary'
                                                    },
                                                    {
                                                        label: 'Edit',
                                                        icon: Pencil,
                                                        onClick: () => setEditClient(client),
                                                        variant: 'secondary'
                                                    },
                                                    {
                                                        label: 'Delete',
                                                        icon: Trash2,
                                                        onClick: () => setConfirmDelete(client),
                                                        variant: 'danger'
                                                    }
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {displayClients.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-40">
                                                <Building2 className="w-12 h-12 mb-3" />
                                                <p className="text-lg font-medium">No clients found</p>
                                                <p className="text-sm">Try adjusting your search or filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

