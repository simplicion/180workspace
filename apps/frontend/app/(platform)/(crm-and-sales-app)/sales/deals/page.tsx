'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import api from '@/lib/api';
import {
    Search, Plus, CheckCircle2, GripVertical, FileUp, Edit, Zap, ArrowRight
} from 'lucide-react';
import { Skeleton } from "@workspace/ui";
import clsx from 'clsx';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { ConfirmModal } from "@workspace/ui";
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

const STAGE_STYLES: Record<string, { color: string, bg: string, badge: string }> = {
    'ContractPending': { color: 'border-amber-400', bg: 'bg-amber-50', badge: 'badge-amber' },
    'ContractSigned': { color: 'border-blue-400', bg: 'bg-blue-50', badge: 'badge-blue' },
    'InDelivery': { color: 'border-indigo-400', bg: 'bg-indigo-50', badge: 'badge-indigo' },
    'Invoiced': { color: 'border-purple-400', bg: 'bg-purple-50', badge: 'badge-purple' },
    'ClosedPaid': { color: 'border-emerald-400', bg: 'bg-emerald-50', badge: 'badge-emerald' }
};


export default function DealsPage() {
    const { user } = useAuth();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
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

    // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    const loadLeads = () => {
        const cacheKey = 'crm:deals:all';
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            // Instant 0ms Paint
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

                // Track Visit (Phase 6)
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
            toast.success('Deal deleted successfully');
        } catch (err) {
            toast.error('Failed to delete deal');
        } finally {
            setIsDeleting(false);
            setDeletingId(null);
        }
    };

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

        // Find the deal and the new status
        const deal = leads.find(o => o.id === draggedId);
        if (!deal) return;

        let newStatus = overId;
        if (!STAGES.includes(newStatus)) {
            // If dropped over a card instead of a column, find the column of that card
            const overDeal = leads.find(o => o.id === overId);
            if (overDeal) newStatus = normalizeStage(overDeal.stage || overDeal.status || 'ContractPending');
        }

        if (!STAGES.includes(newStatus)) return;
        if (deal.stage === newStatus) return;

        // Optimistic UI update
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
            loadLeads(); // Revert on failure
        }
    };

    const filteredLeads = leads.filter(deal => 
        (deal.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         deal.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const normalizeStage = (status: string) => {
        if (STAGES.includes(status)) return status;
        if (status === 'Qualified' || status === 'Demo' || status === 'Proposal' || status === 'Negotiation') return 'ContractPending';
        if (status === 'ClosedWon' || status === 'converted' || status === 'Won') return 'ContractSigned';
        return 'ContractPending';
    };

    // Group by stage
    const grouped = STAGES.reduce((acc, stage) => {
        acc[stage] = filteredLeads.filter(o => {
            let s = normalizeStage(o.stage || o.status || 'ContractPending');
            return s === stage;
        })
            // Sort by priorityScore (highest first), then by value
            .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0) || (b.value || 0) - (a.value || 0));
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="flex flex-col gap-4 pb-12">
            <div className="page-header flex justify-between items-start shrink-0 mb-0">
                <div>
                    <h1 className="page-title text-indigo-900 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                        Deals Pipeline
                    </h1>
                    <p className="page-subtitle mt-1">Manage active deals, client contracts & revenue fulfillment.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search deals..."
                            className="input pl-10 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="btn bg-white border-2 border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50 flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold shadow-sm text-sm"
                    >
                        <FileUp className="w-4 h-4" />
                        {importing ? 'Importing...' : 'Import CSV'}
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 shrink-0">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>Post-Sale Execution:</strong> Deals enter this pipeline automatically when Won leads are converted in your Leads Pipeline.</span>
                </div>
                <button
                    onClick={() => router.push('/sales/leads-pipeline')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
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
                        <div key={i} className="min-w-[280px] w-[280px] lg:min-w-[300px] lg:w-[300px] bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col min-h-[calc(100vh-220px)] border-dashed p-4 gap-4">
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
                                onDelete={(id) => setDeletingId(id)}
                            />
                        ))}
                    </div>

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeId ? (
                            <DealCard
                                deal={leads.find(o => o.id === activeId)}
                                isDragging
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

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
    onDelete: (id: string) => void;
}

function Column({ id, title, deals, onDelete }: ColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: {
            type: 'Column',
            stage: id,
        },
    });
    const styles = STAGE_STYLES[id] || STAGE_STYLES['new'];

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
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-700">{title}</span>
                    <span className={clsx('badge text-xs', styles.badge)}>{deals.length}</span>
                </div>
            </div>

            <div className="flex flex-col gap-2.5 pb-4 flex-1 h-full">
                <SortableContext items={deals.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {deals.map(deal => (
                        <SortableDealCard 
                            key={deal.id} 
                            deal={deal} 
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

function SortableDealCard({ deal, onDelete }: any) {
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
                dragHandleProps={{ ...attributes, ...listeners }} 
                isDragging={isDragging}
                onDelete={onDelete}
            />
        </div>
    );
}

function DealCard({ deal, dragHandleProps, isDragging, onDelete }: any) {
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';

    if (!deal) return null;

    const dotColor = deal.priorityScore >= 80 ? 'bg-orange-500' : deal.priorityScore >= 50 ? 'bg-indigo-500' : 'bg-gray-400';

    return (
        <div 
            className={clsx(
                'card p-3 cursor-pointer hover:shadow-md transition-all select-none group',
                isDragging && 'opacity-40 scale-95 border-indigo-200'
            )}
            {...dragHandleProps}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2">
                    <span className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', dotColor)} />
                    <p className="text-sm font-medium text-gray-900 leading-snug">{deal.title}</p>
                </div>
                {onDelete && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            
            <p className="text-xs text-gray-500 mb-3 truncate">
                {deal.client?.name || deal.client?.companyName || 'Unknown Company'}
            </p>

            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                    {deal.owner ? (
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold" title={deal.owner.name}>
                            {(deal.owner.name || '').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                    ) : <div />}
                </div>
                <div className="text-xs font-bold text-gray-400">
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

const TrashIcon = (props: any) => (
    <svg 
        {...props} 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
);
