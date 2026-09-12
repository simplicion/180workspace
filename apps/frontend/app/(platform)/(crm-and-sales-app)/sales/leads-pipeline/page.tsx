'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
    PieChart, Plus, Search, MoreHorizontal, Calendar, ArrowUpCircle, 
    AlertCircle, DollarSign, GripVertical, ExternalLink, Trash2, Eye, 
    CheckCircle, Download, Upload, Settings, CheckSquare, Target, 
    User, Phone, Mail, Hash, PhoneCall, Building, ArrowRight, Zap, 
    Check, ListFilter, ArrowRightLeft, Square, CheckSquare2
} from 'lucide-react';
import { Skeleton, LogoLoader, ConfirmModal, BulkActionBar } from "@workspace/ui";
import clsx from 'clsx';
import toast from 'react-hot-toast';
import LeadPipelineDrawer from '@/app/(platform)/(crm-and-sales-app)/components/LeadPipelineDrawer';
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

const STAGES = ['Lead', 'Contacted', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'];
const STAGE_LABELS: Record<string, string> = {
    'Lead': 'New Leads',
    'Contacted': 'Contacted',
    'Qualified': 'Qualified',
    'Demo': 'Demo/Meeting',
    'Proposal': 'Proposal',
    'Negotiation': 'Negotiating',
    'ClosedWon': 'Won (Ready to Convert)',
    'ClosedLost': 'Lost'
};

const STAGE_STYLES: Record<string, { color: string, bg: string, badge: string, valueBadge: string, dot: string }> = {
    'Lead': { 
        color: 'border-gray-300', 
        bg: 'bg-gray-50/60 dark:bg-slate-900/40', 
        badge: 'badge-gray',
        valueBadge: 'text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700',
        dot: 'bg-gray-400'
    },
    'Contacted': { 
        color: 'border-cyan-400', 
        bg: 'bg-cyan-50/60 dark:bg-cyan-950/20', 
        badge: 'badge-cyan',
        valueBadge: 'text-cyan-800 dark:text-cyan-300 bg-cyan-100/80 dark:bg-cyan-900/50 border-cyan-300/70 dark:border-cyan-800/60',
        dot: 'bg-cyan-500'
    },
    'Qualified': { 
        color: 'border-blue-400', 
        bg: 'bg-blue-50/60 dark:bg-blue-950/20', 
        badge: 'badge-blue',
        valueBadge: 'text-blue-800 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/50 border-blue-300/70 dark:border-blue-800/60',
        dot: 'bg-blue-500'
    },
    'Demo': { 
        color: 'border-indigo-400', 
        bg: 'bg-indigo-50/60 dark:bg-indigo-950/20', 
        badge: 'badge-indigo',
        valueBadge: 'text-indigo-800 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/50 border-indigo-300/70 dark:border-indigo-800/60',
        dot: 'bg-indigo-500'
    },
    'Proposal': { 
        color: 'border-purple-400', 
        bg: 'bg-purple-50/60 dark:bg-purple-950/20', 
        badge: 'badge-purple',
        valueBadge: 'text-purple-800 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-900/50 border-purple-300/70 dark:border-purple-800/60',
        dot: 'bg-purple-500'
    },
    'Negotiation': { 
        color: 'border-orange-400', 
        bg: 'bg-orange-50/60 dark:bg-orange-950/20', 
        badge: 'badge-orange',
        valueBadge: 'text-orange-800 dark:text-orange-300 bg-orange-100/80 dark:bg-orange-900/50 border-orange-300/70 dark:border-orange-800/60',
        dot: 'bg-orange-500'
    },
    'ClosedWon': { 
        color: 'border-green-400', 
        bg: 'bg-green-50/60 dark:bg-green-950/20', 
        badge: 'badge-green',
        valueBadge: 'text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 border-emerald-300/70 dark:border-emerald-800/60',
        dot: 'bg-emerald-500'
    },
    'ClosedLost': { 
        color: 'border-red-400', 
        bg: 'bg-red-50/60 dark:bg-red-950/20', 
        badge: 'badge-red',
        valueBadge: 'text-red-800 dark:text-red-300 bg-red-100/80 dark:bg-red-900/50 border-red-300/70 dark:border-red-800/60',
        dot: 'bg-red-500'
    }
};

export default function LeadPipelinesKanbanPage() {
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    const [leadPipelines, setleadPipelines] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLeadPipeline, setEditingleadPipeline] = useState<any>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Multi-selection state
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
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

        const activeId = active.id as string;
        const overId = over.id as string;

        const opp = leadPipelines.find(o => o.id === activeId);
        if (!opp) return;

        let newStage = overId;
        if (!STAGES.includes(newStage)) {
            const overOpp = leadPipelines.find(o => o.id === overId);
            if (overOpp) {
                newStage = (overOpp.status === 'new' || !overOpp.status) ? 'Lead' : overOpp.status;
            }
        }

        if (!STAGES.includes(newStage)) return;

        const currentStage = (opp.status === 'new' || !opp.status) ? 'Lead' : opp.status;
        if (currentStage === newStage) return;

        // Optimistic UI update
        setleadPipelines(prev => prev.map(o => o.id === activeId ? { ...o, status: newStage } : o));

        try {
            await api.put(`/api/sales/leads/${activeId}`, { status: newStage });
            swrCacheRef.current.clear();
            toast.success(`Lead moved to ${STAGE_LABELS[newStage] || newStage}`);
        } catch (error) {
            toast.error('Failed to move lead');
            fetchleadPipelines(); // Revert on failure
        }
    };

    const handleDeleteleadPipeline = async () => {
        if (!showDeleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/api/sales/leads/${showDeleteConfirm.id}`);
            toast.success('Lead deleted');
            swrCacheRef.current.clear();
            setleadPipelines(prev => prev.filter(o => o.id !== showDeleteConfirm.id));
            setSelectedLeadIds(prev => prev.filter(id => id !== showDeleteConfirm.id));
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete lead');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(null);
        }
    };

    const handleConvertToDeal = async (id: string) => {
        setConvertingId(id);
        try {
            await api.post(`/api/sales/leads/${id}/convert`, {});
            toast.success('Converted to Deal!');
            swrCacheRef.current.clear();
            fetchleadPipelines();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to convert to deal');
        } finally {
            setConvertingId(null);
        }
    };

    // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    const fetchleadPipelines = async () => {
        const cacheKey = 'crm:leads:all';
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            setleadPipelines(cached.data || []);
            setLoading(false);
        } else {
            setLoading(true);
        }

        try {
            const [leadsRes, catRes] = await Promise.allSettled([
                api.get('/api/sales/leads'),
                api.get('/api/sales/leads/categories')
            ]);

            let fetched: any[] = [];
            if (leadsRes.status === 'fulfilled') {
                const data = leadsRes.value.data;
                fetched = data.leads || data.opportunities || data.leadPipelines || (Array.isArray(data) ? data : []);
                setleadPipelines(fetched);
                swrCacheRef.current.set(cacheKey, {
                    data: fetched,
                    timestamp: Date.now()
                });
            }

            const allCats = new Set<string>();
            if (catRes.status === 'fulfilled' && catRes.value.data?.categories) {
                catRes.value.data.categories.forEach((c: string) => allCats.add(c));
            }
            fetched.forEach(item => {
                if (item.category) allCats.add(item.category);
            });
            setCategories(Array.from(allCats).sort());
        } catch (err) {
            if (!cached) setError('Failed to load leadPipelines');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchleadPipelines();
    }, []);

    const filteredOpps = leadPipelines.filter(o => {
        const matchesSearch = (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (o.companyName || o.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (o.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (o.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || !selectedCategory ? true : o.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Selection Handlers
    const handleToggleSelectLead = (id: string) => {
        setSelectedLeadIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllLeads = () => {
        setSelectedLeadIds(filteredOpps.map(o => o.id));
    };

    const handleDeselectAllLeads = () => {
        setSelectedLeadIds([]);
    };

    const handleSelectAmount = (amount: number) => {
        const targetAmount = Math.min(amount, filteredOpps.length);
        const selectedSlice = filteredOpps.slice(0, targetAmount).map(o => o.id);
        setSelectedLeadIds(selectedSlice);
        toast.success(`Selected first ${selectedSlice.length} leads`);
    };

    const handleToggleStageSelection = (stage: string) => {
        const stageLeadIds = filteredOpps
            .filter(o => ((o.status === 'new' || !o.status) ? 'Lead' : o.status) === stage)
            .map(o => o.id);

        if (stageLeadIds.length === 0) return;

        const allInStageSelected = stageLeadIds.every(id => selectedLeadIds.includes(id));
        if (allInStageSelected) {
            // Deselect all in this stage
            setSelectedLeadIds(prev => prev.filter(id => !stageLeadIds.includes(id)));
        } else {
            // Select all in this stage
            setSelectedLeadIds(prev => Array.from(new Set([...prev, ...stageLeadIds])));
            toast.success(`Selected all ${stageLeadIds.length} leads in ${STAGE_LABELS[stage] || stage}`);
        }
    };

    // Bulk Delete Action
    const handleBulkDeleteSelected = async () => {
        if (selectedLeadIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            await api.post('/api/sales/leads/bulk-delete', { ids: selectedLeadIds });
            toast.success(`Successfully deleted ${selectedLeadIds.length} leads`);
            
            // Instant optimistic update
            setleadPipelines(prev => prev.filter(o => !selectedLeadIds.includes(o.id)));
            swrCacheRef.current.clear();
            setSelectedLeadIds([]);
        } catch (error: any) {
            // Fallback to individual deletes if batch endpoint is unavailable
            try {
                await Promise.all(selectedLeadIds.map(id => api.delete(`/api/sales/leads/${id}`)));
                toast.success(`Deleted ${selectedLeadIds.length} leads`);
                setleadPipelines(prev => prev.filter(o => !selectedLeadIds.includes(o.id)));
                swrCacheRef.current.clear();
                setSelectedLeadIds([]);
            } catch (fallbackError: any) {
                toast.error(error.response?.data?.error || 'Failed to delete selected leads');
            }
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Bulk Move Stage Action
    const handleBulkMoveStage = async (newStage: string) => {
        if (selectedLeadIds.length === 0) return;
        setIsBulkMoving(true);
        setIsMoveStageMenuOpen(false);
        try {
            await api.post('/api/sales/leads/bulk-status', { 
                ids: selectedLeadIds, 
                status: newStage 
            });
            toast.success(`Moved ${selectedLeadIds.length} leads to ${STAGE_LABELS[newStage] || newStage}`);
            
            // Optimistic update
            setleadPipelines(prev => prev.map(o => 
                selectedLeadIds.includes(o.id) ? { ...o, status: newStage } : o
            ));
            swrCacheRef.current.clear();
            setSelectedLeadIds([]);
        } catch (error: any) {
            toast.error('Failed to move selected leads');
            fetchleadPipelines();
        } finally {
            setIsBulkMoving(false);
        }
    };

    // Bulk Export Selected to CSV
    const handleExportSelectedCSV = () => {
        const targetLeads = selectedLeadIds.length > 0 
            ? leadPipelines.filter(o => selectedLeadIds.includes(o.id))
            : leadPipelines;

        if (targetLeads.length === 0) {
            toast.error("No leads to export");
            return;
        }

        const headers = ["Title", "Stage", "Category", "Value", "Company", "Contact", "Email", "Phone", "Score"];
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + targetLeads.map((o: any) => [
                `"${(o.name || '').replace(/"/g, '""')}"`,
                `"${((o.status === 'new' || !o.status) ? 'Lead' : o.status).replace(/"/g, '""')}"`,
                `"${(o.category || '').replace(/"/g, '""')}"`,
                o.value || 0,
                `"${(o.companyName || '').replace(/"/g, '""')}"`,
                `"${(o.name || '').replace(/"/g, '""')}"`,
                `"${(o.email || '').replace(/"/g, '""')}"`,
                `"${(o.phone || '').replace(/"/g, '""')}"`,
                o.leadScore || 0
            ].join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `leads_export_${selectedLeadIds.length > 0 ? 'selected_' : ''}${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${targetLeads.length} leads successfully`);
    };

    // KPI Metrics
    const totalLeads = leadPipelines.length;
    const wonLeads = leadPipelines.filter(l => l.status === 'ClosedWon').length;
    const lostLeads = leadPipelines.filter(l => l.status === 'ClosedLost').length;
    const openLeads = totalLeads - wonLeads - lostLeads;
    const pipelineValue = leadPipelines
        .filter(l => l.stage !== 'ClosedWon' && l.stage !== 'ClosedLost')
        .reduce((sum, l) => sum + (Number(l.value) || 0), 0);
    const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // Selected pipeline value sum
    const selectedPipelineValue = leadPipelines
        .filter(l => selectedLeadIds.includes(l.id))
        .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

    const handleExportCSV = () => {
        handleExportSelectedCSV();
    };

    // Group by stage
    const grouped = STAGES.reduce((acc, stage) => {
        acc[stage] = filteredOpps.filter(o => {
            const normalizedStatus = (o.status === 'new' || !o.status) ? 'Lead' : o.status;
            return normalizedStatus === stage;
        })
            .sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0) || (b.value || 0) - (a.value || 0));
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="flex flex-col gap-4 pb-20">
            {/* Top Bar with Title, KPIs and Main Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">Leads</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Your sales pipeline</p>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-gray-100 dark:border-slate-800 h-10">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Open</span>
                            <span className="text-sm font-black text-gray-900 dark:text-gray-100">{openLeads}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-100 dark:bg-slate-800" />
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Pipeline</span>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{currencySymbol}{pipelineValue.toLocaleString()}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-100 dark:bg-slate-800" />
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Won / mo</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{wonLeads}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-100 dark:bg-slate-800" />
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Win Rate</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{winRate}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button 
                        onClick={() => {
                            setEditingleadPipeline(null);
                            setIsModalOpen(true);
                        }}
                        className="btn flex items-center gap-1.5 px-4 py-1.5 rounded-lg shadow-sm border border-transparent hover:scale-105 transition-all text-xs font-bold text-white cursor-pointer"
                        style={{ backgroundColor: 'var(--theme-color)' }}
                    >
                        <Plus className="w-4 h-4" />
                        New Lead
                    </button>
                </div>
            </div>

            {/* Utility Bar with Search, Category Filter, Amount Selection, and Import/Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 flex-1 max-w-xl">
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            className="input pl-9 w-full bg-white dark:bg-slate-900 text-sm py-2"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Lead Category Filter */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <ListFilter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer pr-1"
                        >
                            <option value="all">All Categories ({leadPipelines.length})</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat} ({leadPipelines.filter(l => l.category === cat).length})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick Select Buttons */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-0.5">
                        <button
                            onClick={selectedLeadIds.length === filteredOpps.length && filteredOpps.length > 0 ? handleDeselectAllLeads : handleSelectAllLeads}
                            className={clsx(
                                "px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer",
                                selectedLeadIds.length === filteredOpps.length && filteredOpps.length > 0
                                     ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                            )}
                            title={selectedLeadIds.length === filteredOpps.length ? "Deselect all" : "Select all matching leads"}
                        >
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>{selectedLeadIds.length === filteredOpps.length && filteredOpps.length > 0 ? "Deselect" : "Select All"}</span>
                        </button>
                    </div>

                    <button className="btn btn-secondary px-3 py-2 bg-white dark:bg-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer" onClick={() => toast('Import dialog opened')}>
                        <Upload className="w-3.5 h-3.5" /> Import
                    </button>
                    <button className="btn btn-secondary px-3 py-2 bg-white dark:bg-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer" onClick={handleExportCSV}>
                        <Download className="w-3.5 h-3.5" /> {selectedLeadIds.length > 0 ? `Export (${selectedLeadIds.length})` : 'Export'}
                    </button>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Active leads <span className="text-gray-900 dark:text-gray-100 font-bold ml-1">{openLeads}</span>
                    </div>
                </div>
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
                                title={stage.replace(/([A-Z])/g, ' $1').trim()}
                                leadPipelines={grouped[stage]}
                                selectedLeadIds={selectedLeadIds}
                                onToggleSelect={handleToggleSelectLead}
                                onToggleStageSelect={() => handleToggleStageSelection(stage)}
                                onEdit={(opp) => {
                                    setEditingleadPipeline(opp);
                                    setIsModalOpen(true);
                                }}
                                onDelete={(opp) => setShowDeleteConfirm(opp)}
                                onConvert={handleConvertToDeal}
                            />
                        ))}
                    </div>

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeId ? (
                            <DealCard
                                opp={leadPipelines.find(o => o.id === activeId)}
                                isSelected={selectedLeadIds.includes(activeId)}
                                isDragging
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Floating Bulk Action Bar */}
            <BulkActionBar
                selectedCount={selectedLeadIds.length}
                totalCount={filteredOpps.length}
                itemLabel="leads"
                sublabel={selectedPipelineValue > 0 ? `${currencySymbol}${selectedPipelineValue.toLocaleString()} selected value` : undefined}
                presetAmounts={[5, 10, 25, 50]}
                onSelectAll={handleSelectAllLeads}
                onDeselectAll={handleDeselectAllLeads}
                onSelectAmount={handleSelectAmount}
                onDeleteSelected={handleBulkDeleteSelected}
                isDeleting={isBulkDeleting}
                deleteModalTitle={`Delete ${selectedLeadIds.length} Selected Leads`}
                deleteModalMessage={`Are you sure you want to permanently delete these ${selectedLeadIds.length} leads? This action cannot be undone.`}
                customActions={[
                    {
                        id: 'export-selected',
                        label: 'Export CSV',
                        icon: Download,
                        variant: 'secondary',
                        onClick: handleExportSelectedCSV
                    }
                ]}
            >
                {/* Stage Mover Popover */}
                <div className="relative" ref={moveStageMenuRef}>
                    <button
                        onClick={() => setIsMoveStageMenuOpen(prev => !prev)}
                        disabled={isBulkMoving}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all cursor-pointer"
                        title="Move all selected leads to another stage"
                    >
                        {isBulkMoving ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                        <span>Move Stage</span>
                        <MoreHorizontal className="w-3 h-3" />
                    </button>

                    {isMoveStageMenuOpen && (
                        <div className="absolute left-0 bottom-full mb-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Move Selected To
                            </div>
                            {STAGES.map(stage => (
                                <button
                                    key={stage}
                                    onClick={() => handleBulkMoveStage(stage)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 rounded-lg transition-colors flex items-center justify-between"
                                >
                                    <span>{STAGE_LABELS[stage] || stage}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </BulkActionBar>

            <LeadPipelineDrawer
                open={isModalOpen}
                pipelineType="LEAD"
                onClose={() => setIsModalOpen(false)}
                onSuccess={(deletedId?: string) => {
                    swrCacheRef.current.delete('crm:leads:all');
                    if (deletedId) {
                        setleadPipelines(prev => prev.filter(o => o.id !== deletedId));
                        setSelectedLeadIds(prev => prev.filter(id => id !== deletedId));
                    } else {
                        fetchleadPipelines();
                    }
                }}
                editingLeadPipeline={editingLeadPipeline}
            />
            
            <ConfirmModal
                isOpen={!!showDeleteConfirm}
                title="Delete Lead"
                message={`Are you sure you want to delete "${showDeleteConfirm?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                onConfirm={handleDeleteleadPipeline}
                onCancel={() => setShowDeleteConfirm(null)}
                loading={deleting}
                variant="danger"
            />
        </div>
    );
}

interface ColumnProps {
    id: string;
    title: string;
    leadPipelines: any[];
    selectedLeadIds: string[];
    currencySymbol?: string;
    onToggleSelect: (id: string) => void;
    onToggleStageSelect: () => void;
    onEdit: (opp: any) => void;
    onDelete: (opp: any) => void;
    onConvert: (id: string) => void;
}

function Column({ 
    id, 
    title, 
    leadPipelines, 
    selectedLeadIds, 
    currencySymbol = '$',
    onToggleSelect, 
    onToggleStageSelect,
    onEdit, 
    onDelete, 
    onConvert 
}: ColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: {
            type: 'Column',
            stage: id,
        },
    });
    const styles = STAGE_STYLES[id] || STAGE_STYLES['Lead'];
    const stageTotalValue = leadPipelines.reduce((sum, o) => sum + (Number(o.value) || 0), 0);

    const allInStageSelected = leadPipelines.length > 0 && leadPipelines.every(o => selectedLeadIds.includes(o.id));
    const someInStageSelected = leadPipelines.some(o => selectedLeadIds.includes(o.id));

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
            {/* Column Header with Title, Count, and Column Select Checkbox */}
            <div className="flex items-center justify-between mb-3 shrink-0 gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    {/* Stage Checkbox */}
                    {leadPipelines.length > 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleStageSelect();
                            }}
                            title={allInStageSelected ? "Deselect column" : `Select all ${leadPipelines.length} in ${title}`}
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
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{STAGE_LABELS[id] || title}</span>
                    <span className={clsx('badge text-[11px] px-1.5 py-0.5 font-bold', styles.badge)}>{leadPipelines.length}</span>
                </div>

                <div className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-lg border shadow-2xs shrink-0', styles.valueBadge)}>
                    {currencySymbol}{stageTotalValue.toLocaleString()}
                </div>
            </div>

            <div className="flex flex-col gap-2.5 pb-4 flex-1 h-full">
                <SortableContext items={leadPipelines.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {leadPipelines.map(opp => (
                        <SortableDealCard 
                            key={opp.id} 
                            opp={opp} 
                            isSelected={selectedLeadIds.includes(opp.id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit} 
                            onDelete={onDelete}
                            onConvert={onConvert}
                        />
                    ))}
                </SortableContext>

                {leadPipelines.length === 0 && (
                    <div className={clsx(
                        "flex-1 flex flex-col items-center justify-center text-xs select-none py-12 border-2 border-dashed rounded-2xl transition-all duration-150 m-1 min-h-[140px]",
                        isOver 
                            ? "border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold" 
                            : "border-gray-200/80 dark:border-slate-800 text-gray-400 dark:text-gray-500"
                    )}>
                        <span className="text-xl mb-1 opacity-60">📥</span>
                        <span className="font-medium">{isOver ? "Drop leads here" : "No leads in this stage"}</span>
                        <span className="text-[10px] text-gray-400/80 dark:text-gray-600 mt-0.5">Drag and drop cards here</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function SortableDealCard({ opp, isSelected, onToggleSelect, onEdit, onDelete, onConvert }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: opp.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div ref={setNodeRef} style={style as React.CSSProperties} className="opacity-30">
                <DealCard opp={opp} isSelected={isSelected} />
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style as React.CSSProperties}>
            <DealCard 
                opp={opp} 
                isSelected={isSelected}
                onToggleSelect={onToggleSelect}
                dragHandleProps={{ ...attributes, ...listeners }} 
                isDragging={isDragging}
                onEdit={onEdit}
                onDelete={onDelete}
                onConvert={onConvert}
            />
        </div>
    );
}

function DealCard({ opp, isSelected, onToggleSelect, dragHandleProps, isDragging, onEdit, onDelete, onConvert }: any) {
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';

    if (!opp) return null;

    const dotColor = opp.leadScore >= 80 ? 'bg-emerald-500' : opp.leadScore >= 50 ? 'bg-indigo-500' : 'bg-gray-400';
    const isFormLead = opp.source?.toLowerCase().includes('form') || (Array.isArray(opp.tags) && opp.tags.some((t: any) => t?.type === 'form_submission' || t?.formId));
    const formTag = Array.isArray(opp.tags) ? opp.tags.find((t: any) => t?.type === 'form_submission' || t?.formId) : null;
    const formCode = formTag?.formCode || (opp.source?.includes('FORM-') ? opp.source.match(/FORM-[A-Z0-9_-]+/i)?.[0] : null);

    const clientName = opp.contactName || opp.client?.name || opp.client?.contactPersonName || null;
    const rawCompanyName = opp.companyName || opp.company || opp.client?.companyName || null;
    const companyName = rawCompanyName && rawCompanyName !== clientName && rawCompanyName !== opp.name ? rawCompanyName : null;

    return (
        <div 
            className={clsx(
                "p-3.5 hover:shadow-lg transition-all cursor-default relative group flex flex-col gap-2.5 bg-white dark:bg-slate-900 border rounded-2xl",
                isSelected 
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs" 
                    : "border-gray-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/80 shadow-2xs",
                isDragging && "shadow-2xl ring-2 ring-indigo-500/40 cursor-grabbing rotate-1 scale-[1.02]"
            )}
            {...dragHandleProps}
            onClick={() => onEdit && onEdit(opp)}
        >
            {/* Header Row: Selection Checkbox + Lead Score Dot + Title */}
            <div className="flex items-start gap-2.5">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleSelect) onToggleSelect(opp.id);
                    }}
                    className="mt-0.5 p-0.5 -ml-0.5 -mt-0.5 rounded cursor-pointer transition-colors"
                    title={isSelected ? "Deselect" : "Select lead"}
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
                    <span className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', dotColor)} title={`Lead Score: ${opp.leadScore || 0}`} />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {opp.name}
                    </h4>
                </div>
            </div>

            {/* Badges & Tags Row */}
            <div className="flex flex-wrap items-center gap-1.5">
                {opp.category && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 max-w-full truncate">
                        <span>🏷️</span>
                        <span className="truncate">{opp.category}</span>
                    </span>
                )}
                {isFormLead && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50 px-2 py-0.5 rounded-md text-[10px] font-bold">
                        <span>📋</span>
                        <span className="truncate">{opp.source || 'Form'}</span>
                        {formCode && <span className="text-[9px] font-mono opacity-80">({formCode})</span>}
                    </span>
                )}
                {!isFormLead && opp.source && (!opp.category || !opp.category.toLowerCase().includes(opp.source.toLowerCase())) && (
                    <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                        {opp.source}
                    </span>
                )}
            </div>

            {/* Contact Details (Client Name, Company, Phone, Email) */}
            <div className="flex flex-col gap-1 text-xs">
                {clientName && (
                    <div className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200 truncate">
                        <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{clientName}</span>
                        <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.2 rounded border border-indigo-100 dark:border-indigo-800/50 shrink-0">Client</span>
                    </div>
                )}
                {companyName && (
                    <div className="flex items-center gap-1.5 font-medium text-gray-600 dark:text-gray-400 truncate">
                        <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{companyName}</span>
                    </div>
                )}
                {opp.phone && (
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 truncate">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{opp.phone}</span>
                    </div>
                )}
                {opp.email && !opp.phone && (
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{opp.email}</span>
                    </div>
                )}
            </div>

            {/* Single Cohesive Footer Row: Assignee + WhatsApp Button + Formatted Value */}
            <div className="flex items-center justify-between mt-1 pt-2.5 border-t border-gray-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 min-w-0">
                    {opp.phone ? (
                        <button 
                            type="button"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                const phoneNumber = opp.phone.replace(/[^0-9]/g, '');
                                window.open(`https://wa.me/${phoneNumber}`, '_blank');
                            }}
                            title={`Chat on WhatsApp (${opp.phone})`}
                            className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 p-1.5 rounded-lg transition-colors flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/50 cursor-pointer shadow-2xs shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                            </svg>
                        </button>
                    ) : null}
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        <User className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[100px]">{opp.assignedSalesRep?.name?.split(' ')[0] || opp.owner?.name?.split(' ')[0] || 'System'}</span>
                    </div>
                </div>

                <div className="text-xs font-bold text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-700/80 shadow-2xs shrink-0">
                    {currencySymbol}{opp.value?.toLocaleString() || '0'}
                </div>
            </div>

            {/* Convert to Deal Action for Won Leads */}
            {(opp.status === 'ClosedWon' || opp.stage === 'ClosedWon') && opp.status !== 'converted' && onConvert && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onConvert(opp.id); }}
                    className="w-full mt-2 py-1.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                    <span>⚡ Convert to Deals Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            )}

            {opp.status === 'converted' && (
                <div className="w-full mt-2 py-1 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold rounded-xl flex items-center justify-between">
                    <span>✓ Converted to Deal</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold underline cursor-pointer hover:text-emerald-700">View Deal →</span>
                </div>
            )}
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
