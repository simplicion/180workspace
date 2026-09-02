'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PieChart, Plus, Search, MoreHorizontal, Calendar, ArrowUpCircle, AlertCircle, DollarSign, GripVertical, ExternalLink, Trash2, Eye, CheckCircle, Download, Upload, Settings, CheckSquare, Target, User, Phone, Mail, Hash, PhoneCall, Building, ArrowRight, Zap } from 'lucide-react';
import { Skeleton , LogoLoader } from "@workspace/ui";
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ConfirmModal } from "@workspace/ui";
import LeadPipelineDrawer from '@/app/(platform)/(crm-and-sales-app)/components/LeadPipelineDrawer';
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
    'ClosedWon': 'Won (Ready to Convert)',
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

export default function LeadPipelinesKanbanPage() {
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
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
            if (overOpp) newStage = overOpp.status;
        }

        if (opp.status === newStage) return;

        // Optimistic UI update
        setleadPipelines(prev => prev.map(o => o.id === activeId ? { ...o, status: newStage } : o));

        try {
            await api.put(`/api/sales/leads/${activeId}`, { status: newStage });
            toast.success('Lead stage updated');
        } catch (error) {
            toast.error('Failed to move leadPipeline');
            fetchleadPipelines(); // Revert on failure
        }
    };

    const handleDeleteleadPipeline = async () => {
        if (!showDeleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/api/sales/leads/${showDeleteConfirm.id}`);
            toast.success('Lead deleted');
            setleadPipelines(prev => prev.filter(o => o.id !== showDeleteConfirm.id));
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
            const { data } = await api.get('/api/sales/leads');
            setleadPipelines(data.leads || data.opportunities || data.leadPipelines || (Array.isArray(data) ? data : []));
        } catch (err) {
            setError('Failed to load leadPipelines');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchleadPipelines();
    }, []);

    const filteredOpps = leadPipelines.filter(o => (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    // KPI Metrics
    const totalLeads = leadPipelines.length;
    const wonLeads = leadPipelines.filter(l => l.status === 'ClosedWon').length;
    const lostLeads = leadPipelines.filter(l => l.status === 'ClosedLost').length;
    const openLeads = totalLeads - wonLeads - lostLeads;
    const pipelineValue = leadPipelines
        .filter(l => l.stage !== 'ClosedWon' && l.stage !== 'ClosedLost')
        .reduce((sum, l) => sum + (Number(l.value) || 0), 0);
    const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    const handleExportCSV = () => {
        if (leadPipelines.length === 0) {
            toast.error("No leads to export");
            return;
        }
        const headers = ["Title", "Stage", "Value", "Company", "Contact", "Email", "Phone", "Score"];
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + leadPipelines.map(e => [
                `"${((o as any).name || '').replace(/"/g, '""')}"`,
                `"${((o as any).status || '').replace(/"/g, '""')}"`,
                (o as any).value || 0,
                `"${((o as any).companyName || '').replace(/"/g, '""')}"`,
                `"${((o as any).name || '').replace(/"/g, '""')}"`,
                `"${((o as any).email || '').replace(/"/g, '""')}"`,
                `"${((o as any).phone || '').replace(/"/g, '""')}"`,
                (o as any).leadScore || 0
            ].join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported successfully");
    };

    // Group by stage
    const grouped = STAGES.reduce((acc, stage) => {
        acc[stage] = filteredOpps.filter(o => o.status === stage)
            // Sort by leadScore (highest first), then by value
            .sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0) || (b.value || 0) - (a.value || 0));
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
            {/* Top Bar with Title, KPIs and Main Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">Leads</h1>
                            <p className="text-xs text-gray-500 font-medium">Your sales pipeline</p>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-gray-100 h-10">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Open</span>
                            <span className="text-sm font-black text-gray-900">{openLeads}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-100" />
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Pipeline</span>
                            <span className="text-sm font-black text-indigo-600">{currencySymbol}{pipelineValue.toLocaleString()}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-100" />
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Won / mo</span>
                            <span className="text-sm font-black text-emerald-600">{wonLeads}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-100" />
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Win Rate</span>
                            <span className="text-sm font-black text-emerald-600">{winRate}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button 
                        onClick={() => {
                            setEditingleadPipeline(null);
                            setIsModalOpen(true);
                        }}
                        className="btn flex items-center gap-1.5 px-4 py-1.5 rounded-lg shadow-sm border border-transparent hover:scale-105 transition-all text-xs font-bold text-white"
                        style={{ backgroundColor: 'var(--theme-color)' }}
                    >
                        <Plus className="w-4 h-4" />
                        New Lead
                    </button>
                </div>
            </div>

            {/* Utility Bar with Search and Import/Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search leads..."
                        className="input pl-9 w-full bg-white text-sm py-2"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <button className="btn btn-secondary px-3 py-2 bg-white rounded-lg text-xs font-semibold flex items-center gap-1.5" onClick={() => toast('Import dialog opened')}>
                        <Upload className="w-3.5 h-3.5" /> Import
                    </button>
                    <button className="btn btn-secondary px-3 py-2 bg-white rounded-lg text-xs font-semibold flex items-center gap-1.5" onClick={handleExportCSV}>
                        <Download className="w-3.5 h-3.5" /> Export
                    </button>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 ml-2">
                        Active leads <span className="text-gray-900 font-bold ml-1">{openLeads}</span>
                    </div>
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
                    <div className="flex gap-4 overflow-x-auto pb-6 h-full hidden-scrollbar items-stretch">
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

            <LeadPipelineDrawer
                open={isModalOpen}
                pipelineType="LEAD"
                onClose={() => setIsModalOpen(false)}
                onSuccess={(deletedId?: string) => {
                    if (deletedId) {
                        // Live removal without refetch
                        setleadPipelines(prev => prev.filter(o => o.id !== deletedId));
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
            className={clsx('rounded-2xl border-t-4 p-3 min-w-[280px] flex-1 min-h-[420px] flex flex-col', styles.bg, styles.color)}
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
                        Drop leads here
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
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';

    if (!opp) return null;

    const dotColor = opp.leadScore >= 80 ? 'bg-orange-500' : opp.leadScore >= 50 ? 'bg-indigo-500' : 'bg-gray-400';

    return (
        <div 
            className={clsx(
                "card p-3.5 hover:shadow-xl transition-all cursor-default relative group flex flex-col gap-2 bg-white",
                isDragging && "shadow-2xl ring-2 ring-indigo-500/10 cursor-grabbing rotate-2"
            )}
            {...dragHandleProps}
            onClick={() => onEdit && onEdit(opp)}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                    <span className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', dotColor)} />
                    <p className="text-sm font-bold text-gray-900 leading-snug">{opp.name}</p>
                </div>
            </div>
            
            <div className="flex flex-col gap-1 mt-1">
                {(opp.companyName) && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{opp.companyName}</span>
                    </div>
                )}
                {opp.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="truncate">{opp.phone}</span>
                    </div>
                )}
                {opp.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="truncate">{opp.email}</span>
                    </div>
                )}
            </div>

            {/* Form Attribution & Tags */}
            {(() => {
                const isFormLead = opp.source?.toLowerCase().includes('form') || (Array.isArray(opp.tags) && opp.tags.some((t: any) => t?.type === 'form_submission' || t?.formId));
                const formTag = Array.isArray(opp.tags) ? opp.tags.find((t: any) => t?.type === 'form_submission' || t?.formId) : null;
                const formCode = formTag?.formCode || (opp.source?.includes('FORM-') ? opp.source.match(/FORM-[A-Z0-9_-]+/i)?.[0] : null);

                return (
                    <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-gray-100">
                        {isFormLead && (
                            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight">
                                <span>📋</span>
                                <span className="truncate">{opp.source || 'Web Form Submission'}</span>
                                {formCode && (
                                    <span className="ml-auto bg-emerald-200/70 text-emerald-900 px-1 rounded text-[9px] font-mono">
                                        {formCode}
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-gray-300" />
                                <span className="text-[10px] font-medium text-gray-400">Added by {opp.owner?.name?.split(' ')[0] || (isFormLead ? 'Form Engine' : 'System')}</span>
                            </div>
                            {!isFormLead && (
                                <div className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {opp.source || 'Other'}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (opp.phone) {
                                const phoneNumber = opp.phone.replace(/[^0-9]/g, '');
                                window.open(`https://wa.me/${phoneNumber}`, '_blank');
                            } else {
                                toast.error("No phone number available");
                            }
                        }}
                        title="Chat on WhatsApp"
                        className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 p-1.5 rounded-full transition-colors flex items-center justify-center shadow-sm border border-green-100"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                        </svg>
                    </button>
                </div>
                <div className="text-xs font-black text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    {currencySymbol}{opp.value?.toLocaleString() || '0'}
                </div>
            </div>

            {/* Convert to Deal Action for Won Leads */}
            {(opp.status === 'ClosedWon' || opp.stage === 'ClosedWon') && opp.status !== 'converted' && onConvert && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onConvert(opp.id); }}
                    className="w-full mt-2 py-1.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
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

