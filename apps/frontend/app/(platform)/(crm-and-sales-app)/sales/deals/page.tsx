'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import api from '@/lib/api';
import {
    Search, Plus, CheckCircle2, GripVertical, FileUp, Edit, Zap, ArrowRight,
    Check, Trash2, ArrowRightLeft, MoreHorizontal, CheckSquare, Building, User, Phone, Mail,
    DollarSign, TrendingUp, Target, Briefcase, BarChart3, PieChart, Sparkles, Filter
} from 'lucide-react';
import { Skeleton, LogoLoader, ConfirmModal, BulkActionBar } from "@workspace/ui";
import clsx from 'clsx';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    pointerWithin,
    rectIntersection,
    CollisionDetection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STAGES = ['ContractPending', 'ContractSigned', 'InDelivery', 'Invoiced', 'ClosedPaid'];
const STAGE_LABELS: Record<string, string> = {
    'ContractPending': 'Contract Pending',
    'ContractSigned': 'Contract Signed',
    'InDelivery': 'In Delivery',
    'Invoiced': 'Invoiced',
    'ClosedPaid': 'Closed Paid'
};

const STAGE_STYLES: Record<string, { color: string, bg: string, badge: string, valueBadge: string, dot: string }> = {
    'ContractPending': { 
        color: 'border-amber-400', 
        bg: 'bg-amber-50/60 dark:bg-amber-950/20', 
        badge: 'badge-amber',
        valueBadge: 'text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 border-amber-300/70 dark:border-amber-800/60',
        dot: 'bg-amber-500'
    },
    'ContractSigned': { 
        color: 'border-blue-400', 
        bg: 'bg-blue-50/60 dark:bg-blue-950/20', 
        badge: 'badge-blue',
        valueBadge: 'text-blue-800 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/50 border-blue-300/70 dark:border-blue-800/60',
        dot: 'bg-blue-500'
    },
    'InDelivery': { 
        color: 'border-indigo-400', 
        bg: 'bg-indigo-50/60 dark:bg-indigo-950/20', 
        badge: 'badge-indigo',
        valueBadge: 'text-indigo-800 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/50 border-indigo-300/70 dark:border-indigo-800/60',
        dot: 'bg-indigo-500'
    },
    'Invoiced': { 
        color: 'border-purple-400', 
        bg: 'bg-purple-50/60 dark:bg-purple-950/20', 
        badge: 'badge-purple',
        valueBadge: 'text-purple-800 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-900/50 border-purple-300/70 dark:border-purple-800/60',
        dot: 'bg-purple-500'
    },
    'ClosedPaid': { 
        color: 'border-emerald-400', 
        bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', 
        badge: 'badge-emerald',
        valueBadge: 'text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 border-emerald-300/70 dark:border-emerald-800/60',
        dot: 'bg-emerald-500'
    }
};

export default function DealsPage() {
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Multi-selection state
    const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkMoving, setIsBulkMoving] = useState(false);
    const [isMoveStageMenuOpen, setIsMoveStageMenuOpen] = useState(false);
    const moveStageMenuRef = useRef<HTMLDivElement>(null);

    const router = useRouter();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Close stage mover dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (moveStageMenuRef.current && !moveStageMenuRef.current.contains(e.target as Node)) {
                setIsMoveStageMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    const loadLeads = () => {
        const cacheKey = 'crm:deals:all';
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            setLeads(cached.data || []);
            setLoading(false);
        } else {
            setLoading(true);
        }

        api.get('/api/sales/deals')
            .then(({ data }) => {
                const leadsData = data.deals || data.leads || data;
                const fetched = Array.isArray(leadsData) ? leadsData : [];
                setLeads(fetched);
                swrCacheRef.current.set(cacheKey, {
                    data: fetched,
                    timestamp: Date.now()
                });

                api.post('/api/user-preferences/recent', {
                    recordId: 'active-client-pipeline',
                    type: 'Pipeline',
                    label: 'Active Client Pipeline',
                    href: '/sales/deals'
                }).then(() => {
                    window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
                }).catch(err => console.error('Recent tracking error:', err));
            })
            .catch(() => {
                if (!cached) setError('Failed to load deals');
            })
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

                    const res = await api.post('/api/sales/deals/import', { leads: parsedLeads });
                    toast.success(res.data.message || `Successfully imported deals`);
                    loadLeads();
                } catch (err: any) {
                    toast.error(err.response?.data?.error || 'Failed to import deals');
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
            await api.delete(`/api/sales/deals/${deletingId}`);
            setLeads(prev => prev.filter(l => l.id !== deletingId));
            setSelectedDealIds(prev => prev.filter(id => id !== deletingId));
            toast.success('Deal deleted successfully');
        } catch (err) {
            toast.error('Failed to delete deal');
        } finally {
            setIsDeleting(false);
            setDeletingId(null);
        }
    };

    // Selection Handlers
    const filteredLeads = leads.filter(deal => 
        (deal.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         deal.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleToggleSelectDeal = (id: string) => {
        setSelectedDealIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAllDeals = () => {
        setSelectedDealIds(filteredLeads.map(d => d.id));
    };

    const handleDeselectAllDeals = () => {
        setSelectedDealIds([]);
    };

    const handleSelectAmount = (amount: number) => {
        const targetAmount = Math.min(amount, filteredLeads.length);
        const selectedSlice = filteredLeads.slice(0, targetAmount).map(d => d.id);
        setSelectedDealIds(selectedSlice);
        toast.success(`Selected first ${selectedSlice.length} deals`);
    };

    const handleToggleStageSelection = (stage: string) => {
        const stageDealIds = filteredLeads
            .filter(deal => normalizeStage(deal.stage || deal.status || 'ContractPending') === stage)
            .map(d => d.id);

        if (stageDealIds.length === 0) return;

        const allInStageSelected = stageDealIds.every(id => selectedDealIds.includes(id));
        if (allInStageSelected) {
            setSelectedDealIds(prev => prev.filter(id => !stageDealIds.includes(id)));
        } else {
            setSelectedDealIds(prev => Array.from(new Set([...prev, ...stageDealIds])));
            toast.success(`Selected all ${stageDealIds.length} deals in ${STAGE_LABELS[stage] || stage}`);
        }
    };

    const handleBulkDeleteSelected = async () => {
        if (selectedDealIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            await api.post('/api/sales/deals/bulk-delete', { ids: selectedDealIds });
            toast.success(`Successfully deleted ${selectedDealIds.length} deals`);
            setLeads(prev => prev.filter(d => !selectedDealIds.includes(d.id)));
            swrCacheRef.current.clear();
            setSelectedDealIds([]);
        } catch (error: any) {
            try {
                await Promise.all(selectedDealIds.map(id => api.delete(`/api/sales/deals/${id}`)));
                toast.success(`Deleted ${selectedDealIds.length} deals`);
                setLeads(prev => prev.filter(d => !selectedDealIds.includes(d.id)));
                swrCacheRef.current.clear();
                setSelectedDealIds([]);
            } catch (fallbackError: any) {
                toast.error(error.response?.data?.error || 'Failed to delete selected deals');
            }
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleBulkMoveStage = async (newStage: string) => {
        if (selectedDealIds.length === 0) return;
        setIsBulkMoving(true);
        setIsMoveStageMenuOpen(false);
        try {
            await api.post('/api/sales/deals/bulk-status', { 
                ids: selectedDealIds, 
                stage: newStage 
            });
            toast.success(`Moved ${selectedDealIds.length} deals to ${STAGE_LABELS[newStage] || newStage}`);
            setLeads(prev => prev.map(d => 
                selectedDealIds.includes(d.id) ? { ...d, stage: newStage } : d
            ));
            swrCacheRef.current.clear();
            setSelectedDealIds([]);
        } catch (error: any) {
            toast.error('Failed to move selected deals');
            loadLeads();
        } finally {
            setIsBulkMoving(false);
        }
    };

    const selectedPipelineValue = leads
        .filter(l => selectedDealIds.includes(l.id))
        .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

    const customCollisionDetection: CollisionDetection = (args) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
            const cardCollision = pointerCollisions.find(c => c.id !== args.active.id && !STAGES.includes(c.id as string));
            if (cardCollision) return [cardCollision];
            return pointerCollisions;
        }
        const rectCollisions = rectIntersection(args);
        if (rectCollisions.length > 0) {
            const cardCollision = rectCollisions.find(c => c.id !== args.active.id && !STAGES.includes(c.id as string));
            if (cardCollision) return [cardCollision];
            return rectCollisions;
        }
        return closestCorners(args);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const draggedId = active.id as string;
        const overId = over.id as string;

        const deal = leads.find(o => o.id === draggedId);
        if (!deal) return;

        let newStatus = overId;
        if (!STAGES.includes(newStatus)) {
            const overDeal = leads.find(o => o.id === overId);
            if (overDeal) newStatus = normalizeStage(overDeal.stage || overDeal.status || 'ContractPending');
        }

        if (!STAGES.includes(newStatus)) return;
        if (deal.stage === newStatus) return;

        const updatedDeals = leads.map(o => 
            o.id === draggedId ? { ...o, stage: newStatus } : o
        );
        setLeads(updatedDeals);

        try {
            await api.put(`/api/sales/deals/${draggedId}`, { stage: newStatus });
            swrCacheRef.current.clear();
            toast.success(`Moved to ${STAGE_LABELS[newStatus] || newStatus}`);
        } catch (error) {
            toast.error('Failed to move deal');
            loadLeads();
        }
    };

    const normalizeStage = (status: string) => {
        if (STAGES.includes(status)) return status;
        if (status === 'Qualified' || status === 'Demo' || status === 'Proposal' || status === 'Negotiation') return 'ContractPending';
        if (status === 'ClosedWon' || status === 'lead_converted' || status === 'converted' || status === 'won') return 'ContractPending';
        if (status === 'ClosedLost' || status === 'lost') return 'ContractPending';
        if (status === 'new' || status === 'contacted' || status === 'kickoff') return 'ContractPending';
        return 'ContractPending';
    };

    // Executive Pipeline Metrics & Valuation
    const totalPipelineValue = leads.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const totalDealsCount = leads.length;

    const STAGE_PROBABILITIES: Record<string, number> = {
        'ContractPending': 0.30,
        'ContractSigned': 0.70,
        'InDelivery': 0.90,
        'Invoiced': 0.95,
        'ClosedPaid': 1.00
    };

    const weightedPipelineValue = leads.reduce((sum, d) => {
        const stage = normalizeStage(d.stage || d.status || 'ContractPending');
        const prob = STAGE_PROBABILITIES[stage] ?? 0.5;
        return sum + ((Number(d.value) || 0) * prob);
    }, 0);

    const activeExecutionDeals = leads.filter(d => {
        const s = normalizeStage(d.stage || d.status || 'ContractPending');
        return s === 'ContractSigned' || s === 'InDelivery';
    });
    const activeExecutionValue = activeExecutionDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    const realizedDeals = leads.filter(d => {
        const s = normalizeStage(d.stage || d.status || 'ContractPending');
        return s === 'Invoiced' || s === 'ClosedPaid';
    });
    const realizedRevenue = realizedDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    const averageDealValue = totalDealsCount > 0 ? Math.round(totalPipelineValue / totalDealsCount) : 0;
    const highValueDeals = leads.filter(d => (Number(d.value) || 0) >= 20000 || (d.priorityScore || 0) >= 70);

    const grouped = STAGES.reduce((acc, stage) => {
        acc[stage] = filteredLeads.filter(deal => normalizeStage(deal.stage || deal.status || 'ContractPending') === stage);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="flex flex-col gap-4 pb-20">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <span>Active Client Pipeline</span>
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Post-sale execution & delivery workflow for converted clients</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search deals..."
                            className="input pl-9 w-full bg-gray-50 dark:bg-slate-800 text-sm py-1.5"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".csv" 
                        className="hidden" 
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="btn btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs whitespace-nowrap cursor-pointer"
                    >
                        <FileUp className="w-4 h-4" />
                        {importing ? 'Importing...' : 'Import CSV'}
                    </button>
                </div>
            </div>

            {/* Executive Pipeline Metrics & Financial Valuation Bar */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
                {/* 1. Total Active Pipeline */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Pipeline</span>
                        <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                            <DollarSign className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div>
                        <div className="text-xl lg:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                            {currencySymbol}{totalPipelineValue.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50">
                                {totalDealsCount} {totalDealsCount === 1 ? 'Deal' : 'Deals'} Total
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Weighted Pipeline Forecast */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Weighted Forecast</span>
                        <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50">
                            <TrendingUp className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div>
                        <div className="text-xl lg:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                            {currencySymbol}{Math.round(weightedPipelineValue).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/50">
                                {totalPipelineValue > 0 ? Math.round((weightedPipelineValue / totalPipelineValue) * 100) : 0}% Realization Confidence
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. In Fulfillment / Delivery */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">In Execution</span>
                        <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                            <Briefcase className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div>
                        <div className="text-xl lg:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                            {currencySymbol}{activeExecutionValue.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50">
                                {activeExecutionDeals.length} {activeExecutionDeals.length === 1 ? 'Deal' : 'Deals'} In Delivery
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Realized / Invoiced */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Realized / Invoiced</span>
                        <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div>
                        <div className="text-xl lg:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                            {currencySymbol}{realizedRevenue.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                                {realizedDeals.length} Settled / Paid
                            </span>
                        </div>
                    </div>
                </div>

                {/* 5. Average Deal Size (ACV) */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group col-span-2 md:col-span-1 lg:col-span-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Avg Deal Size</span>
                        <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50">
                            <BarChart3 className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div>
                        <div className="text-xl lg:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                            {currencySymbol}{averageDealValue.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                            <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-900/50">
                                {highValueDeals.length} High-Value (≥{currencySymbol}20k)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Stage Distribution Bar */}
            {totalPipelineValue > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Pipeline Value Distribution</span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                            100% = {currencySymbol}{totalPipelineValue.toLocaleString()}
                        </span>
                    </div>

                    <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                        {STAGES.map(stage => {
                            const stageDeals = grouped[stage] || [];
                            const stageValue = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
                            const percent = totalPipelineValue > 0 ? (stageValue / totalPipelineValue) * 100 : 0;
                            if (percent <= 0) return null;

                            const stageColor = STAGE_STYLES[stage]?.dot || 'bg-indigo-500';

                            return (
                                <div 
                                    key={stage}
                                    style={{ width: `${percent}%` }}
                                    className={clsx(stageColor, "h-full transition-all duration-300 hover:brightness-110 cursor-pointer")}
                                    title={`${STAGE_LABELS[stage] || stage}: ${currencySymbol}${stageValue.toLocaleString()} (${percent.toFixed(1)}%)`}
                                />
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1">
                        {STAGES.map(stage => {
                            const stageDeals = grouped[stage] || [];
                            const stageValue = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
                            const percent = totalPipelineValue > 0 ? (stageValue / totalPipelineValue) * 100 : 0;
                            const stageColor = STAGE_STYLES[stage]?.dot || 'bg-indigo-500';

                            return (
                                <div key={stage} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                    <span className={clsx("w-2 h-2 rounded-full", stageColor)} />
                                    <span>{STAGE_LABELS[stage] || stage}:</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">
                                        {currencySymbol}{stageValue.toLocaleString()}
                                    </span>
                                    <span className="text-gray-400 text-[10px]">({percent.toFixed(0)}%)</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 shrink-0">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>Post-Sale Execution:</strong> Deals enter this pipeline automatically when Won leads are converted in your Leads Pipeline.</span>
                </div>
                <button
                    onClick={() => router.push('/sales/leads-pipeline')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                    <span>Go to Leads Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {error && (
                <div className="text-red-600 bg-red-50 p-4 rounded-xl mb-6 shrink-0">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 items-stretch flex-1 min-h-[calc(100vh-220px)]">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="min-w-[280px] w-[280px] lg:min-w-[300px] lg:w-[300px] bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl flex flex-col min-h-[calc(100vh-220px)] border-dashed p-4 gap-4">
                            <Skeleton variant="text" height={24} width="120px" />
                            <Skeleton variant="rectangular" height={100} className="rounded-xl w-full" />
                            <Skeleton variant="rectangular" height={100} className="rounded-xl w-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={customCollisionDetection}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 overflow-x-auto pb-6 items-stretch flex-1 min-h-[calc(100vh-220px)]">
                        {STAGES.map(stage => (
                            <Column
                                key={stage}
                                id={stage}
                                title={STAGE_LABELS[stage]}
                                deals={grouped[stage]}
                                selectedDealIds={selectedDealIds}
                                currencySymbol={currencySymbol}
                                onToggleSelect={handleToggleSelectDeal}
                                onToggleStageSelect={() => handleToggleStageSelection(stage)}
                                onDelete={(id) => setDeletingId(id)}
                            />
                        ))}
                    </div>

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeId ? (
                            <DealCard
                                deal={leads.find(o => o.id === activeId)}
                                isSelected={selectedDealIds.includes(activeId)}
                                isDragging
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Bulk Actions Bar */}
            <BulkActionBar
                selectedCount={selectedDealIds.length}
                totalCount={filteredLeads.length}
                itemLabel="deals"
                sublabel={selectedPipelineValue > 0 ? `${currencySymbol}${selectedPipelineValue.toLocaleString()} selected deal value` : undefined}
                presetAmounts={[5, 10, 25, 50]}
                onSelectAll={handleSelectAllDeals}
                onDeselectAll={handleDeselectAllDeals}
                onSelectAmount={handleSelectAmount}
                onDeleteSelected={handleBulkDeleteSelected}
                isDeleting={isBulkDeleting}
                deleteModalTitle={`Delete ${selectedDealIds.length} Selected Deals`}
                deleteModalMessage={`Are you sure you want to permanently delete these ${selectedDealIds.length} deals? This action cannot be undone.`}
            >
                {/* Stage Mover Popover */}
                <div className="relative" ref={moveStageMenuRef}>
                    <button
                        onClick={() => setIsMoveStageMenuOpen(prev => !prev)}
                        disabled={isBulkMoving}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all cursor-pointer"
                        title="Move all selected deals to another stage"
                    >
                        {isBulkMoving ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                        <span>Move Stage</span>
                        <MoreHorizontal className="w-3 h-3" />
                    </button>

                    {isMoveStageMenuOpen && (
                        <div className="absolute left-0 bottom-full mb-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Move Selected Deals To
                            </div>
                            {STAGES.map(stage => (
                                <button
                                    key={stage}
                                    onClick={() => handleBulkMoveStage(stage)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                                >
                                    <span>{STAGE_LABELS[stage] || stage}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </BulkActionBar>

            <ConfirmModal
                isOpen={!!deletingId}
                title="Delete Deal"
                message="Are you sure you want to delete this deal? This action cannot be undone."
                confirmText="Delete Deal"
                onConfirm={handleDelete}
                onCancel={() => setDeletingId(null)}
                loading={isDeleting}
                variant="danger"
            />
        </div>
    );
}

// ─── Components ─────────────────────────────────────────────────────────────

interface ColumnProps {
    id: string;
    title: string;
    deals: any[];
    selectedDealIds: string[];
    currencySymbol?: string;
    onToggleSelect: (id: string) => void;
    onToggleStageSelect: () => void;
    onDelete: (id: string) => void;
}

function Column({ 
    id, 
    title, 
    deals, 
    selectedDealIds, 
    currencySymbol = '$',
    onToggleSelect, 
    onToggleStageSelect, 
    onDelete 
}: ColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: {
            type: 'Column',
            stage: id,
        },
    });
    const styles = STAGE_STYLES[id] || STAGE_STYLES['ContractPending'];
    const stageTotalValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    const allInStageSelected = deals.length > 0 && deals.every(o => selectedDealIds.includes(o.id));
    const someInStageSelected = deals.some(o => selectedDealIds.includes(o.id));

    return (
        <div 
            ref={setNodeRef}
            className={clsx(
                'rounded-2xl border-t-4 p-3 min-w-[280px] w-[280px] lg:min-w-[300px] lg:w-[300px] shrink-0 min-h-[calc(100vh-220px)] flex flex-col self-stretch transition-all duration-150',
                styles.bg,
                styles.color,
                isOver && 'ring-2 ring-indigo-500 bg-indigo-50/80 shadow-md'
            )}
        >
            <div className="flex items-center justify-between mb-3 shrink-0 gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    {deals.length > 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleStageSelect();
                            }}
                            title={allInStageSelected ? "Deselect column" : `Select all ${deals.length} in ${title}`}
                            className="p-1 -ml-1 text-gray-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                        >
                            <span className={clsx(
                                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                allInStageSelected ? "bg-indigo-600 border-indigo-600 text-white" : someInStageSelected ? "bg-indigo-100 border-indigo-400 text-indigo-700" : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                            )}>
                                {allInStageSelected ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                ) : someInStageSelected ? (
                                    <span className="w-2 h-0.5 bg-indigo-600 rounded-full" />
                                ) : null}
                            </span>
                        </button>
                    )}
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{title}</span>
                    <span className={clsx('badge text-[11px] px-1.5 py-0.5 font-bold', styles.badge)}>{deals.length}</span>
                </div>

                <div className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-lg border shadow-2xs shrink-0', styles.valueBadge)}>
                    {currencySymbol}{stageTotalValue.toLocaleString()}
                </div>
            </div>

            <div className="flex flex-col gap-2.5 pb-4 flex-1 h-full">
                <SortableContext items={deals.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {deals.map(deal => (
                        <SortableDealCard 
                            key={deal.id} 
                            deal={deal} 
                            isSelected={selectedDealIds.includes(deal.id)}
                            onToggleSelect={onToggleSelect}
                            onDelete={() => onDelete(deal.id)}
                        />
                    ))}
                </SortableContext>

                {deals.length === 0 && (
                    <div className={clsx(
                        "flex-1 flex items-center justify-center text-xs select-none py-12 transition-colors",
                        isOver ? "text-indigo-600 font-bold" : "text-gray-400/60"
                    )}>
                        {isOver ? "Drop here" : "Drop deals here"}
                    </div>
                )}
            </div>
        </div>
    );
}

function SortableDealCard({ deal, isSelected, onToggleSelect, onDelete }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: deal.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style as React.CSSProperties}>
            <DealCard 
                deal={deal} 
                isSelected={isSelected}
                onToggleSelect={onToggleSelect}
                dragHandleProps={{ ...attributes, ...listeners }} 
                isDragging={isDragging}
                onDelete={onDelete}
            />
        </div>
    );
}

function DealCard({ deal, isSelected, onToggleSelect, dragHandleProps, isDragging, onDelete }: any) {
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';

    if (!deal) return null;

    const dotColor = deal.priorityScore >= 80 ? 'bg-orange-500' : deal.priorityScore >= 50 ? 'bg-indigo-500' : 'bg-gray-400';
    const clientName = deal.client?.name || deal.client?.contactPersonName || deal.contactName || (deal.lead?.contactName && deal.lead.contactName !== deal.lead.name ? deal.lead.contactName : null);
    const rawCompanyName = deal.client?.companyName || deal.client?.company || deal.lead?.companyName || deal.lead?.company || null;
    const companyName = rawCompanyName && rawCompanyName !== clientName && rawCompanyName !== deal.title ? rawCompanyName : null;
    const phone = deal.client?.phone || deal.lead?.phone || null;
    const email = deal.client?.email || deal.lead?.email || null;

    return (
        <div 
            className={clsx(
                "p-3.5 hover:shadow-lg transition-all select-none group border rounded-2xl bg-white dark:bg-slate-900 relative flex flex-col gap-2.5 cursor-default",
                isSelected 
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs" 
                    : "border-gray-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/80 shadow-2xs",
                isDragging && "shadow-2xl ring-2 ring-indigo-500/40 cursor-grabbing rotate-1 scale-[1.02]"
            )}
            {...dragHandleProps}
        >
            {/* Header Row: Checkbox + Priority Score Dot + Title + Delete Action */}
            <div className="flex items-start gap-2.5">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleSelect) onToggleSelect(deal.id);
                    }}
                    className="mt-0.5 p-0.5 -ml-0.5 -mt-0.5 rounded cursor-pointer transition-colors"
                    title={isSelected ? "Deselect" : "Select deal"}
                >
                    <span className={clsx(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        isSelected 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" 
                            : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-500"
                    )}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                </button>

                <div className="flex-1 min-w-0 flex items-start gap-1.5">
                    <span className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', dotColor)} title={`Priority Score: ${deal.priorityScore || 0}`} />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {deal.title}
                    </h4>
                </div>

                {onDelete && (
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1 -mr-1 -mt-0.5 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded"
                        title="Delete deal"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Client & Organization Section */}
            <div className="flex flex-col gap-1 text-xs">
                {clientName ? (
                    <div className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200 truncate">
                        <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{clientName}</span>
                        <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.2 rounded border border-indigo-100 dark:border-indigo-800/50 shrink-0">Client</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 italic">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">No client attached</span>
                    </div>
                )}
                {companyName && (
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 truncate">
                        <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{companyName}</span>
                    </div>
                )}
                {phone && (
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 truncate">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{phone}</span>
                    </div>
                )}
                {email && !phone && (
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{email}</span>
                    </div>
                )}
            </div>

            {/* Footer Row: WhatsApp Chat + Assignee + Deal Value */}
            <div className="flex items-center justify-between mt-1 pt-2.5 border-t border-gray-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 min-w-0">
                    {phone ? (
                        <button 
                            type="button"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                const phoneNumber = phone.replace(/[^0-9]/g, '');
                                window.open(`https://wa.me/${phoneNumber}`, '_blank');
                            }}
                            title={`Chat on WhatsApp (${phone})`}
                            className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 p-1.5 rounded-lg transition-colors flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/50 cursor-pointer shadow-2xs shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                            </svg>
                        </button>
                    ) : null}
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        <User className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[100px]">{deal.owner?.name?.split(' ')[0] || 'System'}</span>
                    </div>
                </div>

                <div className="text-xs font-bold text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-700/80 shadow-2xs shrink-0">
                    {currencySymbol}{deal.value?.toLocaleString() || '0'}
                </div>
            </div>
        </div>
    );
}

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};
