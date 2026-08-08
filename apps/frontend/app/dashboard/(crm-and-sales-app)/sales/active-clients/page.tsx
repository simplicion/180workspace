'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PieChart, Plus, Search, MoreHorizontal, Calendar, ArrowUpCircle, AlertCircle, DollarSign, GripVertical, ExternalLink, Trash2, Eye, CheckCircle, Users } from 'lucide-react';
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

const STAGE_COLORS: Record<string, string> = {
    'Lead': 'bg-gray-100 text-gray-800 border-gray-200',
    'Contacted': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Qualified': 'bg-blue-50 text-blue-700 border-blue-200',
    'Demo': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Proposal': 'bg-purple-50 text-purple-700 border-purple-200',
    'Negotiation': 'bg-orange-50 text-orange-700 border-orange-200',
    'ClosedWon': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'ClosedLost': 'bg-red-50 text-red-700 border-red-200'
};

export default function OpportunitiesKanbanPage() {
    const { user } = useAuth();
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState<any>(null);
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

        // Find the opportunity and the new stage
        const opp = opportunities.find(o => o.id === activeId);
        if (!opp) return;

        let newStage = overId;
        if (!STAGES.includes(newStage)) {
            // If dropped over a card instead of a column, find the column of that card
            const overOpp = opportunities.find(o => o.id === overId);
            if (overOpp) newStage = overOpp.stage;
        }

        if (opp.stage === newStage) return;

        // Optimistic UI update
        const updatedOpps = opportunities.map(o => 
            o.id === activeId ? { ...o, stage: newStage } : o
        );
        setOpportunities(updatedOpps);

        try {
            await api.put(`/api/sales/leads-pipeline/${activeId}`, { stage: newStage });
            toast.success(`Moved to ${STAGE_LABELS[newStage]}`);
        } catch (error) {
            toast.error('Failed to move opportunity');
            fetchOpportunities(); // Revert on failure
        }
    };

    const handleDeleteOpportunity = async () => {
        if (!showDeleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/api/sales/leads-pipeline/${showDeleteConfirm.id}`);
            toast.success('Opportunity deleted');
            setOpportunities(prev => prev.filter(o => o.id !== showDeleteConfirm.id));
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete opportunity');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(null);
        }
    };

    const handleConvertToProject = async (id: string) => {
        setConvertingId(id);
        try {
            const { data } = await api.post(`/api/sales/leads-pipeline/${id}/convert`);
            toast.success(data.message || 'Project created successfully!');
            // Refresh list or redirect
            setOpportunities(prev => prev.map(o => o.id === id ? data.opportunity : o));
            if (confirm('Project created. Would you like to view it now?')) {
                router.push(`/dashboard/projects/${data.project.id}`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to convert to project');
        } finally {
            setConvertingId(null);
        }
    };

    const fetchOpportunities = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/sales/leads-pipeline?pipelineType=ACTIVE_CLIENT');
            setOpportunities(data.opportunities || data);
        } catch (err) {
            setError('Failed to load opportunities');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const filteredOpps = opportunities.filter(o => o.title.toLowerCase().includes(searchTerm.toLowerCase()));

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
                        <Users className="w-6 h-6 text-indigo-600" />
                        Active Client Pipeline
                    </h1>
                    <p className="page-subtitle mt-1">Manage active clients and onboarding via Kanban board.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search deals..."
                            aria-label="Search deals"
                            className="input pl-10 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => {
                            setEditingOpportunity(null);
                            setIsModalOpen(true);
                        }}
                        className="btn btn-primary flex items-center gap-2 px-5 py-2 rounded-xl shadow-lg shadow-indigo-100 border-2 border-transparent hover:scale-105 transition-all text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Active Client
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
                                title={STAGE_LABELS[stage]}
                                opportunities={grouped[stage]}
                                onEdit={(opp) => {
                                    setEditingOpportunity(opp);
                                    setIsModalOpen(true);
                                }}
                                onDelete={(opp) => setShowDeleteConfirm(opp)}
                                onConvert={handleConvertToProject}
                            />
                        ))}
                    </div>

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeId ? (
                            <DealCard
                                opp={opportunities.find(o => o.id === activeId)}
                                isDragging
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            <LeadPipelineModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchOpportunities}
                editingLeadPipeline={editingOpportunity}
                pipelineType="ACTIVE_CLIENT"
            />
            <ConfirmModal
                isOpen={!!showDeleteConfirm}
                title="Delete Opportunity"
                message={`Are you sure you want to delete "${showDeleteConfirm?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                onConfirm={handleDeleteOpportunity}
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
    opportunities: any[];
    onEdit: (opp: any) => void;
    onDelete: (opp: any) => void;
    onConvert: (id: string) => void;
}

function Column({ id, title, opportunities, onEdit, onDelete, onConvert }: ColumnProps) {
    const { setNodeRef } = useSortable({ id });

    return (
        <div className="min-w-[320px] flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-indigo-900 tracking-tight">{title}</h3>
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100">
                        {opportunities.length}
                    </span>
                </div>
                <div className="text-xs font-bold text-gray-400">
                    ${opportunities.reduce((sum, o) => sum + (o.value || 0), 0).toLocaleString()}
                </div>
            </div>

            <div ref={setNodeRef} className="flex flex-col gap-2.5 overflow-y-auto hidden-scrollbar pb-20 flex-1 min-h-[200px]">
                <SortableContext items={opportunities.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {opportunities.map(opp => (
                        <SortableDealCard 
                            key={opp.id} 
                            opp={opp} 
                            onEdit={onEdit} 
                            onDelete={onDelete}
                            onConvert={onConvert}
                        />
                    ))}
                </SortableContext>

                {opportunities.length === 0 && (
                    <div className="h-32 rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/30 flex flex-col items-center justify-center text-gray-400 text-xs italic gap-2 transition-colors hover:bg-gray-50/50">
                        <Plus className="w-4 h-4 opacity-20" />
                        Move deals here
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
                onEdit={onEdit}
                onDelete={onDelete}
                onConvert={onConvert}
            />
        </div>
    );
}

function DealCard({ opp, dragHandleProps, isDragging, onEdit, onDelete, onConvert }: any) {
    if (!opp) return null;

    return (
        <div className={clsx(
            "card p-3.5 hover:shadow-xl transition-all cursor-default relative group flex flex-col gap-2",
            isDragging && "shadow-2xl ring-2 ring-indigo-500/10 cursor-grabbing rotate-2"
        )}>
            {/* Color Strip */}
            <div className={clsx("absolute top-0 left-0 w-1.5 h-full rounded-l-2xl opacity-40 transition-opacity group-hover:opacity-100", 
                STAGE_COLORS[opp.stage]?.split(' ')[0] || 'bg-gray-200'
            )} />

            <div className="flex justify-between items-start mb-2 gap-4">
                <h4 className="font-bold text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors">{opp.title}</h4>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onEdit(opp)}
                        aria-label="Edit Deal"
                        className="p-1.5 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                    >
                        <Edit2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2 bg-gray-50/50 w-fit px-2 py-0.5 rounded-lg border border-gray-100/50">
                <span className="font-semibold text-gray-700">
                    {opp.accountId?.companyName || opp.accountId?.name || opp.companyName || opp.contactName || 'Private Deal'}
                </span>
            </div>

            <div className="mt-auto space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Value</span>
                        <div className="font-black text-gray-900 tracking-tight flex items-baseline gap-0.5">
                            <span className="text-xs text-gray-400">$</span>
                            {opp.value?.toLocaleString()}
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Score</span>
                        <div className={clsx(
                            "text-xs font-black px-2 py-0.5 rounded-md",
                            opp.priorityScore >= 80 ? "bg-orange-100 text-orange-700" :
                            opp.priorityScore >= 50 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"
                        )}>
                            {opp.priorityScore || 0}%
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex -space-x-2">
                        {opp.owner && (
                            <div className="w-7 h-7 rounded-full border-2 border-white bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm" title={opp.owner.name}>
                                {opp.owner.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2" {...dragHandleProps}>
                        <div 
                            aria-label="Drag to reorder"
                            className="p-1.5 text-gray-300 hover:text-indigo-400 cursor-grab active:cursor-grabbing transition-colors"
                        >
                            <GripVertical className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Footer - Context sensitive */}
            {opp.stage === 'ClosedWon' && !opp.projectId && (
                <button
                    onClick={() => onConvert(opp.id)}
                    aria-label={`Convert ${opp.title} to Project`}
                    className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-3 h-3" /> Convert to Project
                </button>
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

