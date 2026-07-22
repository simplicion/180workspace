'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PieChart, Plus, Search, MoreHorizontal, Calendar, ArrowUpCircle, AlertCircle, DollarSign, GripVertical, ExternalLink, Trash2, Eye, CheckCircle } from 'lucide-react';
import { Skeleton , LogoLoader } from "@workspace/ui";
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ConfirmModal } from "@workspace/ui";
import ContextActions from '@/app/dashboard/(dashboard)/_components/ContextActions';
import LeadPipelineModal from '@/app/dashboard/(crm-and-sales-app)/components/LeadPipelineModal';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
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
    'ClosedWon': 'Won',
    'ClosedLost': 'Lost'
};

const STAGE_STYLES: Record<string, { color: string, bg: string, badge: string }> = {
    'Lead': { color: 'border-gray-300', bg: 'bg-gray-50', badge: 'badge-gray' },
    'Contacted': { color: 'border-cyan-400', bg: 'bg-cyan-50', badge: 'badge-cyan' },
    'Qualified': { color: 'border-blue-400', bg: 'bg-blue-50', badge: 'badge-blue' },
    'Demo': { color: 'border-indigo-400', bg: 'bg-indigo-50', badge: 'badge-indigo' },
    'Proposal': { color: 'border-purple-400', bg: 'bg-purple-50', badge: 'badge-purple' },
    'Negotiation': { color: 'border-orange-400', bg: 'bg-orange-50', badge: 'badge-orange' },
    'ClosedWon': { color: 'border-green-400', bg: 'bg-green-50', badge: 'badge-green' },
    'ClosedLost': { color: 'border-red-400', bg: 'bg-red-50', badge: 'badge-red' }
};

export default function leadPipelinesKanbanPage() {
    const { user } = useAuth();
    const [leadPipelines, setleadPipelines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLeadPipeline, setEditingleadPipeline] = useState<any>(null);
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

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the leadPipeline and the new stage
        const opp = leadPipelines.find(o => o.id === activeId);
        if (!opp) return;

        let newStage = overId;
        if (!STAGES.includes(newStage)) {
            // If dropped over a card instead of a column, find the column of that card
            const overOpp = leadPipelines.find(o => o.id === overId);
            if (overOpp) newStage = overOpp.stage;
        }

        if (opp.stage === newStage) return;

        // Optimistic UI update
        const updatedOpps = leadPipelines.map(o => 
            o.id === activeId ? { ...o, stage: newStage } : o
        );
        setleadPipelines(updatedOpps);

        try {
            await api.put(`/api/sales/leads-pipeline/${activeId}`, { stage: newStage });
            toast.success(`Moved to ${STAGE_LABELS[newStage]}`);
        } catch (error) {
            toast.error('Failed to move leadPipeline');
            fetchleadPipelines(); // Revert on failure
        }
    };

    const handleDeleteleadPipeline = async () => {
        if (!showDeleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/api/sales/leads-pipeline/${showDeleteConfirm.id}`);
            toast.success('leadPipeline deleted');
            setleadPipelines(prev => prev.filter(o => o.id !== showDeleteConfirm.id));
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete leadPipeline');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(null);
        }
    };

    const handleConvertToDeal = async (id: string) => {
        setConvertingId(id);
        try {
            await api.put(`/api/sales/leads-pipeline/${id}`, { convertToDeal: true });
            toast.success('Converted to Deal!');
            fetchleadPipelines();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to convert to deal');
        } finally {
            setConvertingId(null);
        }
    };

    const fetchleadPipelines = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/sales/leads-pipeline?pipelineType=DEAL');
            setleadPipelines(data.opportunities || data.leadPipelines || (Array.isArray(data) ? data : []));
        } catch (err) {
            setError('Failed to load leadPipelines');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchleadPipelines();
    }, []);

    const filteredOpps = leadPipelines.filter(o => o.title.toLowerCase().includes(searchTerm.toLowerCase()));

    // Group by stage
    const grouped = STAGES.reduce((acc, stage) => {
        acc[stage] = filteredOpps.filter(o => o.stage === stage)
            // Sort by priorityScore (highest first), then by value
            .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0) || (b.value || 0) - (a.value || 0));
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
            <div className="page-header flex justify-between items-start shrink-0 mb-0">
                <div>
                    <h1 className="page-title text-indigo-900 flex items-center gap-2">
                        <PieChart className="w-6 h-6 text-indigo-600" />
                        Lead Pipeline
                    </h1>
                    <p className="page-subtitle mt-1">Manage sales leads via Kanban board prioritized by algorithm.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            aria-label="Search leads"
                            className="input pl-10 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => {
                            setEditingleadPipeline(null);
                            setIsModalOpen(true);
                        }}
                        className="btn btn-primary flex items-center gap-2 px-5 py-2 rounded-xl shadow-lg shadow-indigo-100 border-2 border-transparent hover:scale-105 transition-all text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Lead
                    </button>
                </div>
            </div>

            {error && (
                <div className="text-red-600 bg-red-50 p-4 rounded-xl mb-6 shrink-0">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 h-full">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="min-w-[300px] w-[300px] bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col h-full border-dashed p-4 gap-4">
                            <Skeleton variant="text" height={24} width="120px" />
                            <Skeleton variant="rectangular" height={100} className="rounded-xl w-full" />
                            <Skeleton variant="rectangular" height={100} className="rounded-xl w-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 overflow-x-auto pb-6 h-full hidden-scrollbar items-start">
                        {STAGES.map(stage => (
                            <Column
                                key={stage}
                                id={stage}
                                title={stage.replace(/([A-Z])/g, ' $1').trim()}
                                leadPipelines={grouped[stage]}
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
                                isDragging
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            <LeadPipelineModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchleadPipelines}
                editingLeadPipeline={editingLeadPipeline}
            />
            <ConfirmModal
                isOpen={!!showDeleteConfirm}
                title="Delete leadPipeline"
                message={`Are you sure you want to delete "${showDeleteConfirm?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                onConfirm={handleDeleteleadPipeline}
                onCancel={() => setShowDeleteConfirm(null)}
                loading={deleting}
                variant="danger"
            />
        </div>
    );
}

// â”€â”€ Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ColumnProps {
    id: string;
    title: string;
    leadPipelines: any[];
    onEdit: (opp: any) => void;
    onDelete: (opp: any) => void;
    onConvert: (id: string) => void;
}

function Column({ id, title, leadPipelines, onEdit, onDelete, onConvert }: ColumnProps) {
    const { setNodeRef } = useSortable({ id });
    const styles = STAGE_STYLES[id] || STAGE_STYLES['Lead'];

    return (
        <div 
            ref={setNodeRef}
            className={clsx('rounded-2xl border-t-4 p-3 min-w-[280px] w-[280px] min-h-[420px] flex-shrink-0 flex flex-col', styles.bg, styles.color)}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-700">{title}</span>
                    <span className={clsx('badge text-xs', styles.badge)}>{leadPipelines.length}</span>
                </div>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto hidden-scrollbar pb-10 flex-1 min-h-[200px]">
                <SortableContext items={leadPipelines.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {leadPipelines.map(opp => (
                        <SortableDealCard 
                            key={opp.id} 
                            opp={opp} 
                            onEdit={onEdit} 
                            onDelete={onDelete}
                            onConvert={onConvert}
                        />
                    ))}
                </SortableContext>

                {leadPipelines.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-gray-300 text-xs select-none">
                        Drop deals here
                    </div>
                )}
            </div>
        </div>
    );
}

function SortableDealCard({ opp, onEdit, onDelete, onConvert }: any) {
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
                <DealCard opp={opp} />
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style as React.CSSProperties}>
            <DealCard 
                opp={opp} 
                dragHandleProps={{ ...attributes, ...listeners }} 
                isDragging={isDragging}
                onEdit={onEdit}
                onDelete={onDelete}
                onConvert={onConvert}
            />
        </div>
    );
}

function DealCard({ opp, dragHandleProps, isDragging, onEdit, onDelete, onConvert }: any) {
    if (!opp) return null;

    const dotColor = opp.priorityScore >= 80 ? 'bg-orange-500' : opp.priorityScore >= 50 ? 'bg-indigo-500' : 'bg-gray-400';

    return (
        <div 
            className={clsx(
                "card p-3.5 hover:shadow-xl transition-all cursor-default relative group flex flex-col gap-2",
                isDragging && "shadow-2xl ring-2 ring-indigo-500/10 cursor-grabbing rotate-2"
            )}
            {...dragHandleProps}
            onClick={() => onEdit && onEdit(opp)}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2">
                    <span className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', dotColor)} />
                    <p className="text-sm font-medium text-gray-900 leading-snug">{opp.title}</p>
                </div>
            </div>
            
            <p className="text-xs text-gray-500 mb-3 truncate">
                {opp.accountId?.companyName || opp.accountId?.name || opp.companyName || opp.contactName || 'Private Deal'}
            </p>

            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                    {opp.owner ? (
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold" title={opp.owner.name}>
                            {(opp.owner.name || '').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                    ) : <div />}
                    {opp.stage === 'ClosedWon' && onConvert && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onConvert(opp.id); }}
                            className="text-[10px] bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded shadow-sm font-semibold transition-colors"
                        >
                            Convert
                        </button>
                    )}
                </div>
                <div className="text-xs font-bold text-gray-400">
                    ${opp.value?.toLocaleString() || '0'}
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


// Missing Edit2 icon
const Edit2 = (props: any) => (
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
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
    </svg>
);

