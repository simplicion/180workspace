'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Building2, Mail, Phone, Globe, MapPin, Briefcase, Receipt, Activity, Clock, TrendingUp, ArrowUpRight, DollarSign, FileText, ExternalLink, ChevronRight, Edit3, Plus, MoreVertical, LayoutGrid, Users, User, MessageSquare, CalendarIcon, PhoneCall, Trash2, X, CheckCircle, FolderOpen, Video, CalendarDays, Receipt as ReceiptIcon } from 'lucide-react';
import { Skeleton,  SkeletonTable  , LogoLoader } from "@workspace/ui";
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import AddClientDrawer from '@/app/(platform)/(crm-and-sales-app)/_components/AddClientDrawer';
import { LogInteractionDrawer } from '@/app/(platform)/(crm-and-sales-app)/_components/LogInteractionDrawer';
import { formatDistanceToNow, format } from 'date-fns';

const TABS = [
    { id: 'overview',        label: 'Overview',        icon: LayoutGrid },
    { id: 'projects',        label: 'Projects',        icon: Briefcase },
    { id: 'team',            label: 'Team',            icon: Users },
    { id: 'communications',  label: 'Communications',  icon: MessageSquare },
    { id: 'finances',        label: 'Finances',        icon: DollarSign },
    { id: 'activity',        label: 'Activity',        icon: Activity },
];

const COMM_TYPES = [
    { value: 'email',   label: 'Email',   icon: Mail,        color: 'bg-blue-50 text-blue-600',   bar: 'bg-blue-500' },
    { value: 'call',    label: 'Call',    icon: PhoneCall,   color: 'bg-green-50 text-green-600', bar: 'bg-green-500' },
    { value: 'meeting', label: 'Meeting', icon: CalendarIcon,color: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
    { value: 'note',    label: 'Note',    icon: FileText,    color: 'bg-gray-50 text-gray-600',   bar: 'bg-gray-400' },
];

function getCommMeta(type: string) {
    return COMM_TYPES.find(t => t.value === type) || COMM_TYPES[3];
}

/* ════════════════════════════════════════════════════════════════════════
   Page
════════════════════════════════════════════════════════════════════════ */
export default function ClientProfilePage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [client, setClient]   = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading]   = useState(true);
    const [stats, setStats]       = useState({ revenue: 0, pending: 0 });
    const [showEdit, setShowEdit] = useState(false);

    const loadData = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.get(`/api/clients/${id}`),
            api.get('/api/invoices', { params: { clientId: id } }),
        ]).then(([{ data: cData }, { data: iData }]) => {
            setClient(cData.client);
            setInvoices(iData.invoices || []);
            const paid    = (iData.invoices || []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
            const pending = (iData.invoices || []).filter((i: any) => ['sent', 'overdue'].includes(i.status)).reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
            setStats({ revenue: paid, pending });
        }).catch(() => {
            toast.error('Failed to load client profile');
            router.push('/clients');
        }).finally(() => setLoading(false));
    }, [id, router]);

    useEffect(() => { loadData(); }, [loadData]);

    function handleCreateInvoice() {
        router.push(`/invoices/new?clientId=${id}&clientName=${encodeURIComponent(client?.name || '')}`);
    }

    if (loading) return (
        <div className="space-y-6 max-w-7xl mx-auto p-4">
            <Skeleton variant="rectangular" width="100%" height={120} className="rounded-2xl mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" height={100} className="rounded-2xl" />)}
            </div>
            <SkeletonTable rows={6} columns={5} />
        </div>
    );
    if (!client) return null;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {showEdit && (
                <AddClientDrawer
                    open={showEdit}
                    editClient={client}
                    onClose={() => setShowEdit(false)}
                    onSuccess={(updated) => { setShowEdit(false); setClient(updated); }}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex items-start gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-0.5 shadow-lg shadow-blue-200">
                        <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                            {client.logoUrl
                                ? <img src={client.logoUrl} alt={client.name} className="w-full h-full object-cover" />
                                : <Building2 className="w-8 h-8 text-blue-600" />}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                            <span className={clsx('badge capitalize',
                                client.status === 'active' ? 'badge-green' :
                                client.status === 'lead'   ? 'badge-orange' : 'badge-gray'
                            )}>{client.status}</span>
                        </div>
                        <p className="text-gray-500 font-medium flex items-center gap-2">
                            {client.company || 'Private Client'}
                            {client.website && (
                                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowEdit(true)} className="btn-secondary">
                        <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                    <button onClick={handleCreateInvoice} className="btn-primary">
                        <Plus className="w-4 h-4" /> Create Invoice
                    </button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Total Revenue"  value={`₹${stats.revenue.toLocaleString()}`}  icon={TrendingUp}  color="text-green-600"  bg="bg-green-50"  />
                <MetricCard label="Pending Balance" value={`₹${stats.pending.toLocaleString()}`} icon={DollarSign}  color="text-amber-600"  bg="bg-amber-50"  />
                <MetricCard label="Active Projects" value={client.projectIds?.length || 0}        icon={Briefcase}   color="text-blue-600"   bg="bg-blue-50"   />
                <MetricCard label="Client Since"    value={client?.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy') : 'N/A'} icon={Clock} color="text-purple-600" bg="bg-purple-50" />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-100 p-1 bg-gray-50/50 rounded-xl w-fit flex-wrap">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            activeTab === tab.id
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                >
                    {activeTab === 'overview'       && <ClientOverview client={client} onCreateInvoice={handleCreateInvoice} />}
                    {activeTab === 'projects'       && <ClientProjects projects={client.projectIds || []} clientId={id} />}
                    {activeTab === 'team'           && <ClientTeam projects={client.projectIds || []} />}
                    {activeTab === 'communications' && <ClientCommunications clientId={id} />}
                    {activeTab === 'finances'       && <ClientFinances invoices={invoices} />}
                    {activeTab === 'activity'       && <ClientActivity clientId={id} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

/* ════ Shared ═══════════════════════════════════════════════════════════ */

function MetricCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
                    <Icon className={clsx('w-5 h-5', color)} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value, isLink }: any) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-gray-400">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            {isLink && value ? (
                <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                    {value}<ExternalLink className="w-3 h-3" />
                </a>
            ) : (
                <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
            )}
        </div>
    );
}

/* ════ Overview ═════════════════════════════════════════════════════════ */

function ClientOverview({ client, onCreateInvoice }: any) {
    const ACTIONS = [
        {
            label: 'Send Email',
            desc: client.email || 'No email on file',
            icon: Mail,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            accent: 'hover:border-blue-200 hover:bg-blue-50/40',
            href: client.email ? `mailto:${client.email}` : undefined,
        },
        {
            label: 'Call Client',
            desc: client.phone || 'No phone on file',
            icon: PhoneCall,
            iconBg: 'bg-green-50',
            iconColor: 'text-green-600',
            accent: 'hover:border-green-200 hover:bg-green-50/40',
            href: client.phone ? `tel:${client.phone}` : undefined,
        },
        {
            label: 'Schedule Meeting',
            desc: 'Open calendar & book a slot',
            icon: CalendarDays,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            accent: 'hover:border-amber-200 hover:bg-amber-50/40',
            href: '/meeting',
        },
        {
            label: 'Create New Project',
            desc: 'Start a project for this client',
            icon: FolderOpen,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            accent: 'hover:border-indigo-200 hover:bg-indigo-50/40',
            href: `/projects?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`,
        },
        {
            label: 'Create Invoice',
            desc: 'Generate a new invoice',
            icon: ReceiptIcon,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            accent: 'hover:border-purple-200 hover:bg-purple-50/40',
            onClick: onCreateInvoice,
        },
        {
            label: 'Log Interaction',
            desc: 'Record a call, email, or note',
            icon: MessageSquare,
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            accent: 'hover:border-rose-200 hover:bg-rose-50/40',
            href: `#communications`,
        },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Contact Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                        <InfoItem icon={Mail}     label="Email Address"         value={client.email} />
                        <InfoItem icon={Phone}    label="Phone Number"          value={client.phone || 'Not provided'} />
                        <InfoItem icon={Globe}    label="Website"               value={client.website} isLink />
                        <InfoItem icon={MapPin}   label="Billing Address"       value={client.billingAddress || client.address} />
                        <InfoItem icon={Building2} label="Industry"             value={client.industry || 'General'} />
                        <InfoItem icon={FileText} label="Tax ID / Registration" value={client.taxId || 'Not provided'} />
                    </div>
                </div>
                {client.notes && (
                    <div className="card p-6 border-l-4 border-l-indigo-500">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Internal Remarks</h3>
                        </div>
                        <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
                    </div>
                )}
            </div>
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Company & Account Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                        <InfoItem icon={Briefcase} label="Client Type" value={client.clientType || 'Standard'} />
                        <InfoItem icon={Users} label="Employee Count" value={client.employeeCount || 'Not specified'} />
                        <InfoItem icon={DollarSign} label="Annual Revenue" value={client.annualRevenue ? `$${client.annualRevenue.toLocaleString()}` : 'Not specified'} />
                        <InfoItem icon={Activity} label="Health Status" value={client.healthStatus || 'Healthy'} />
                        <InfoItem icon={TrendingUp} label="Lifetime Value (CLV)" value={client.clv ? `$${client.clv.toLocaleString()}` : 'Not calculated'} />
                        <InfoItem icon={User} label="Assigned Manager" value={client.assignedManager || 'Unassigned'} />
                    </div>
                </div>

            {/* Quick Actions — 180workspace themed */}
            <div>
                <div className="card p-5 border border-gray-100 shadow-sm">
                    {/* Card header */}
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-50">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Video className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900 leading-none">Quick Actions</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">Common tasks for this client</p>
                        </div>
                    </div>

                    {/* Action rows */}
                    <div className="space-y-2">
                        {ACTIONS.map((action) => {
                            const Icon = action.icon;
                            const isDisabled = !action.href && !action.onClick;
                            const base = clsx(
                                'w-full flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all duration-150 group',
                                action.accent,
                                isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            );
                            const inner = (
                                <>
                                    <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105', action.iconBg)}>
                                        <Icon className={clsx('w-4 h-4', action.iconColor)} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold text-gray-800 leading-none mb-0.5">{action.label}</p>
                                        <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{action.desc}</p>
                                    </div>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                                </>
                            );

                            if (action.onClick) {
                                return <button key={action.label} className={base} onClick={action.onClick}>{inner}</button>;
                            }
                            if (action.href) {
                                const isExternal = action.href.startsWith('mailto:') || action.href.startsWith('tel:');
                                return isExternal
                                    ? <a key={action.label} href={action.href} className={base}>{inner}</a>
                                    : <a key={action.label} href={action.href} className={base}>{inner}</a>;
                            }
                            return <div key={action.label} className={base}>{inner}</div>;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ════ Projects ═════════════════════════════════════════════════════════ */

function ClientProjects({ projects, clientId }: { projects: any[]; clientId: string }) {
    if (!projects || projects.length === 0) return (
        <div className="card p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No projects yet</h3>
            <p className="text-gray-500 mt-1 max-w-xs mx-auto">This client doesn&apos;t have any active or past projects.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p: any) => (
                <div
                    key={p.id}
                    className="card p-5 hover:border-blue-200 transition-colors group cursor-pointer"
                    onClick={() => (window.location.href = `/projects/${p.id}`)}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5" />
                        </div>
                        <span className={clsx('badge text-[10px]',
                            p.status === 'completed'  ? 'badge-green' :
                            p.status === 'in-progress'? 'badge-blue'  : 'badge-orange'
                        )}>{p.status}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                    <div className="mt-4 space-y-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500 font-medium tracking-tight">PROGRESS</span>
                            <span className="text-gray-900 font-bold">{p.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {p.deadline ? new Date(p.deadline).toLocaleDateString() : 'No deadline'}
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ════ Team ═════════════════════════════════════════════════════════════ */

function ClientTeam({ projects }: { projects: any[] }) {
    const team: any[] = [];
    const seen = new Set();
    projects?.forEach((p: any) => {
        p.team?.forEach((m: any) => {
            if (!seen.has(m.id)) {
                seen.add(m.id);
                team.push({ ...m, project: p.name });
            }
        });
    });

    if (team.length === 0) return (
        <div className="card p-12 text-center border-dashed">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No team members assigned</h3>
            <p className="text-gray-500 mt-1 max-w-xs mx-auto">Assign employees to projects linked with this client.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map(member => (
                <div key={member.id} className="card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center border border-indigo-200">
                        <span className="text-indigo-600 font-bold">{member.name?.[0]}</span>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-900 leading-none mb-1">{member.name}</h4>
                        <p className="text-xs text-indigo-600 font-medium">{member.role || 'Member'}</p>
                        <div className="mt-2">
                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase font-black">{member.project}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ════ Communications ═══════════════════════════════════════════════════ */

function ClientCommunications({ clientId }: { clientId: string }) {
    const [comms, setComms]       = useState<any[]>([]);
    const [loading, setLoading]   = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchComms = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/clients/${clientId}/communications`);
            setComms(data.communications || []);
        } catch {
            toast.error('Failed to load communications');
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => { fetchComms(); }, [fetchComms]);

    async function handleDelete(commId: string) {
        if (!confirm('Delete this communication log?')) return;
        setDeleting(commId);
        try {
            await api.delete(`/api/clients/${clientId}/communications/${commId}`);
            setComms(p => p.filter(c => c.id !== commId));
            toast.success('Log deleted');
        } catch {
            toast.error('Failed to delete');
        } finally {
            setDeleting(null);
        }
    }

    if (loading) return <div className="p-12 text-center"><LogoLoader className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></div>;

    return (
        <div className="space-y-6">
            <LogInteractionDrawer
                isOpen={showModal}
                clientId={clientId}
                onClose={() => setShowModal(false)}
                onSuccess={(c: any) => { setComms(p => [c, ...p]); setShowModal(false); }}
            />

            {/* Header bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Communication History</h3>
                    <p className="text-sm text-gray-500 italic">Tracking all emails, calls, and meetings</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4" /> Log Interaction
                </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {comms.length === 0 ? (
                    <div className="card p-12 text-center opacity-60">
                        <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="font-bold text-gray-900">No interactions logged yet.</p>
                        <p className="text-sm text-gray-500 mt-1">Click &quot;Log Interaction&quot; to add the first entry.</p>
                    </div>
                ) : comms.map(comm => {
                    const meta = getCommMeta(comm.type);
                    const Icon = meta.icon;
                    return (
                        <div key={comm.id} className="card p-5 relative overflow-hidden group">
                            <div className={clsx('absolute left-0 top-0 bottom-0 w-1', meta.bar)} />
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', meta.color)}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-base">{comm.subject}</h4>
                                        {comm.summary && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{comm.summary}</p>}
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {comm.date ? format(new Date(comm.date), 'dd MMM yyyy') : 'N/A'}
                                            </span>
                                            <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                            <span className="text-xs font-bold text-gray-500 uppercase">
                                                Logged by {comm.loggedByName || comm.loggedBy?.name || 'Team'}
                                            </span>
                                            <span className={clsx('text-[10px] px-2 py-0.5 rounded font-bold uppercase', meta.color)}>{comm.type}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(comm.id)}
                                    disabled={deleting === comm.id}
                                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                                    title="Delete"
                                >
                                    {deleting === comm.id ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ════ Finances ═════════════════════════════════════════════════════════ */

function ClientFinances({ invoices }: { invoices: any[] }) {
    if (!invoices || invoices.length === 0) return (
        <div className="card p-12 text-center">
            <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No financial records</h3>
            <p className="text-gray-500 mt-1 max-w-xs mx-auto">Generate the first invoice to track payments and revenue.</p>
        </div>
    );

    const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalPending = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.totalAmount || 0), 0);

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card p-4 text-center">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Invoices</p>
                    <p className="text-2xl font-black text-gray-900">{invoices.length}</p>
                </div>
                <div className="card p-4 text-center border-green-100">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Paid</p>
                    <p className="text-2xl font-black text-green-600">₹{totalPaid.toLocaleString()}</p>
                </div>
                <div className="card p-4 text-center border-amber-100">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Pending</p>
                    <p className="text-2xl font-black text-amber-600">₹{totalPending.toLocaleString()}</p>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Status</th>
                                <th>Issue Date</th>
                                <th>Due Date</th>
                                <th className="text-right">Amount</th>
                                <th className="text-right">View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="font-mono text-sm font-bold text-blue-600">{inv.invoiceNumber}</td>
                                    <td>
                                        <span className={clsx('badge text-[10px] uppercase tracking-wider font-extrabold',
                                            inv.status === 'paid'    ? 'badge-green' :
                                            inv.status === 'overdue' ? 'badge-red'   : 'badge-blue'
                                        )}>{inv.status}</span>
                                    </td>
                                    <td className="text-sm text-gray-600">{new Date(inv.issueDate).toLocaleDateString()}</td>
                                    <td className="text-sm text-gray-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                    <td className="text-right font-bold text-gray-900">₹{inv.totalAmount?.toLocaleString()}</td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => window.open(`/invoices/${inv.id}`, '_blank')}
                                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                            title="View Invoice"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ════ Activity ═════════════════════════════════════════════════════════ */

const ACTIVITY_COLORS: Record<string, string> = {
    CREATE_CLIENT:      'bg-green-500',
    UPDATE_CLIENT:      'bg-blue-500',
    DELETE_CLIENT:      'bg-red-500',
    CREATE_CLIENT_COMM: 'bg-purple-500',
    CREATE_INVOICE:     'bg-amber-500',
    UPDATE_INVOICE:     'bg-amber-400',
    CREATE_PROJECT:     'bg-indigo-500',
};

function ClientActivity({ clientId }: { clientId: string }) {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading]       = useState(true);

    useEffect(() => {
        api.get(`/api/clients/${clientId}/activity`)
            .then(({ data }) => setActivities(data.activities || []))
            .catch(() => toast.error('Failed to load activity'))
            .finally(() => setLoading(false));
    }, [clientId]);

    if (loading) return <div className="p-12 text-center"><LogoLoader className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></div>;

    return (
        <div className="card divide-y divide-gray-100 overflow-hidden">
            <div className="p-5 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" /> Activity Timeline
                </h3>
            </div>

            {activities.length === 0 ? (
                <div className="p-12 text-center">
                    <Activity className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No activity recorded yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Actions like profile edits, invoice creation, and interaction logs will appear here.</p>
                </div>
            ) : (
                <div className="p-0">
                    {activities.map((item, idx) => (
                        <div key={item.id} className="p-5 hover:bg-gray-50 transition-colors flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={clsx('w-2.5 h-2.5 rounded-full mt-1.5', ACTIVITY_COLORS[item.action] || 'bg-blue-600')} />
                                {idx !== activities.length - 1 && <div className="w-px flex-1 bg-blue-100 mt-2" />}
                            </div>
                            <div className="pb-4">
                                <p className="text-sm font-bold text-gray-900">{item.content}</p>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : 'N/A'}
                                    </span>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                        {item.user}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
