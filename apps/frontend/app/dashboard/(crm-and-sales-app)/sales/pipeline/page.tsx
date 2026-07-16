'use client';


import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Filter, MoreVertical,
    MessageSquare, Clock, DollarSign, User,
    TrendingUp, Activity, Star, Loader2,
    Trash2, Edit, CheckSquare, Square, X,
    ChevronDown, AlertCircle, ArrowRight, Briefcase
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import AddLeadModal from '@/app/dashboard/(dashboard)/_components/AddLeadModal';
import { ConfirmModal } from "@workspace/ui";

const COLUMNS = [
    { id: 'new', title: 'New Leads', color: 'bg-blue-500' },
    { id: 'contacted', title: 'Contacted', color: 'bg-amber-500' },
    { id: 'qualified', title: 'Qualified', color: 'bg-emerald-500' },
    { id: 'converted', title: 'Converted', color: 'bg-indigo-500' },
    { id: 'lost', title: 'Lost', color: 'bg-red-500' }
];

interface Lead {
    _id: string;
    id?: string;
    name: string;
    company: string;
    value: number;
    status: string;
    leadScore: number;
    engagementScore: number;
    createdAt: string;
}

const hideScrollbarStyle = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

export default function PipelinePage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    
    // Confirmation States
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        message: string;
        variant: 'danger' | 'info';
        onConfirm: () => void;
    }>({
        open: false,
        title: '',
        message: '',
        variant: 'info',
        onConfirm: () => {}
    });

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/sales/leads');
            const leadsData = res.data.leads || res.data;
            setLeads(Array.isArray(leadsData) ? leadsData : []);
        } catch (error) {
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    };

    const getLeadsByStatus = (status: string) => {
        return leads.filter(l => 
            l.status === status && 
            ((l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
             (l.company || '').toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    const handleDragStart = (id: string) => {
        setDraggedLeadId(id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        if (!draggedLeadId) return;

        const lead = leads.find(l => l.id === draggedLeadId);
        if (!lead || lead.status === newStatus) return;

        // Special handling for the Converted column to ensure DB sync
        if (newStatus === 'converted') {
            handleConvertLead(draggedLeadId);
            setDraggedLeadId(null);
            return;
        }

        const originalLeads = [...leads];
        setLeads(current =>
            current.map(l => l.id === draggedLeadId ? { ...l, status: newStatus } : l)
        );

        try {
            const actualId = String(lead.id || lead.id);
            await api.put(`/api/sales/leads/${actualId}`, { status: newStatus });
            toast.success(`Lead moved to ${newStatus}`);
        } catch (error: any) {
            const message = error.response?.data?.error || 'Failed to update status';
            toast.error(message);
            setLeads(originalLeads);
        } finally {
            setDraggedLeadId(null);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedLeads(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectColumnLeads = (status: string) => {
        const columnLeads = getLeadsByStatus(status).map(l => l.id);
        const allSelected = columnLeads.every(id => selectedLeads.includes(id));
        
        if (allSelected) {
            setSelectedLeads(prev => prev.filter(id => !columnLeads.includes(id)));
        } else {
            setSelectedLeads(prev => Array.from(new Set([...prev, ...columnLeads])));
        }
    };

    const handleDeleteLead = (id: string) => {
        setConfirmState({
            open: true,
            title: 'Delete Lead?',
            message: 'This action cannot be undone. All data for this lead will be permanently removed.',
            variant: 'danger',
            onConfirm: async () => {
                setIsBulkLoading(true);
                try {
                    await api.delete(`/api/sales/leads/${id}`);
                    toast.success('Lead deleted');
                    fetchLeads();
                    setSelectedLeads(prev => prev.filter(i => i !== id));
                } catch (error) {
                    toast.error('Failed to delete lead');
                } finally {
                    setIsBulkLoading(false);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleBulkDelete = () => {
        setConfirmState({
            open: true,
            title: 'Bulk Delete?',
            message: `Are you sure you want to delete ${selectedLeads.length} leads? This action is permanent.`,
            variant: 'danger',
            onConfirm: async () => {
                setIsBulkLoading(true);
                try {
                    await Promise.all(selectedLeads.map(id => api.delete(`/api/sales/leads/${id}`)));
                    toast.success(`Deleted ${selectedLeads.length} leads`);
                    setSelectedLeads([]);
                    fetchLeads();
                } catch (error) {
                    toast.error('Failed to delete some leads');
                } finally {
                    setIsBulkLoading(false);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleBulkStatusUpdate = async (newStatus: string) => {
        setIsBulkLoading(true);
        try {
            await Promise.all(selectedLeads.map(id => api.put(`/api/sales/leads/${id}`, { status: newStatus })));
            toast.success(`Updated ${selectedLeads.length} items`);
            setSelectedLeads([]);
            fetchLeads();
        } catch (error) {
            toast.error('Update failed');
        } finally {
            setIsBulkLoading(false);
        }
    };

    const handleConvertLead = async (id: string) => {
        setIsBulkLoading(true);
        try {
            await api.post(`/api/sales/leads/${id}/convert`);
            toast.success('Lead converted to Account successfully!');
            fetchLeads();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Conversion failed');
        } finally {
            setIsBulkLoading(false);
        }
    };

    const handleBulkConvert = async () => {
        if (!selectedLeads.length) return;
        setIsBulkLoading(true);
        try {
            await Promise.all(selectedLeads.map(id => api.post(`/api/sales/leads/${id}/convert`)));
            toast.success(`Successfully converted ${selectedLeads.length} leads`);
            setSelectedLeads([]);
            fetchLeads();
        } catch (error) {
            toast.error('Failed to convert some leads');
        } finally {
            setIsBulkLoading(false);
        }
    };

    return (
        <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col relative overflow-hidden">
            <style>{hideScrollbarStyle}</style>
            {/* Custom Confirm Modal */}
            <ConfirmModal 
                isOpen={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
                loading={isBulkLoading}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-2 lg:px-4 mt-2">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Sales Pipeline</h1>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Real-time Lead Management</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-72 group">
                         <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Quick Search Leads..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white shadow-sm border border-gray-100 focus:ring-4 focus:ring-indigo-50/50 rounded-2xl text-[13px] font-medium transition-all outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-[#4F46E5] hover:bg-[#4338CA] text-white px-6 py-2.5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" />
                        New Lead
                    </button>
                </div>
            </div>

            {/* Stats Bar (180workspace Design) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 px-2 lg:px-4">
                {[
                    { label: 'Pipeline Value', value: `$${leads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Total Volume', value: leads.length, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Quality Score', value: leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + (lead.leadScore || 0), 0) / leads.length) : '0', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Conversion', value: `${leads.length > 0 ? Math.round((leads.filter(l => l.status === 'qualified').length / leads.length) * 100) : 0}%`, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-3.5 rounded-[22px] shadow-sm shadow-gray-100/50 flex items-center gap-3">
                        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 animate-in zoom-in duration-500", stat.bg)}>
                            <stat.icon className={clsx("w-4.5 h-4.5", stat.color)} />
                        </div>
                        <div className="min-w-0 pr-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-1">{stat.label}</p>
                            <p className="text-lg font-black text-gray-900 truncate tracking-tighter">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Compact Action Pill - Preserved */}
            <AnimatePresence>
                {selectedLeads.length > 0 && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center bg-[#0D121F] text-white p-2.5 rounded-full shadow-2xl ring-8 ring-black/5 backdrop-blur-md"
                    >
                        <div className="flex items-center pl-4 pr-6 border-r border-white/10">
                            <span className="bg-indigo-500 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center mr-3 ring-4 ring-indigo-500/20">{selectedLeads.length}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected</span>
                            <button onClick={() => setSelectedLeads([])} className="ml-4 hover:text-red-400 transform hover:rotate-90 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="flex items-center px-6 gap-2.5">
                            {COLUMNS.map(col => (
                                <button
                                    key={col.id}
                                    onClick={() => handleBulkStatusUpdate(col.id)}
                                    disabled={isBulkLoading}
                                    className={clsx(
                                        "w-3 h-3 rounded-full hover:scale-150 transition-all ring-2 ring-transparent hover:ring-white/20",
                                        col.color,
                                        isBulkLoading && "opacity-50"
                                    )}
                                    title={`Move to ${col.title}`}
                                />
                            ))}
                            <div className="w-px h-5 bg-white/10 mx-3" />
                            <button
                                onClick={handleBulkConvert}
                                disabled={isBulkLoading}
                                className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group"
                            >
                                <Briefcase className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>Convert All</span>
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkLoading}
                                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group"
                            >
                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                {isBulkLoading ? "..." : "Delete"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Kanban Columns (Professional Structured Layout) */}
            <div className="flex overflow-x-auto pb-10 scrollbar-hide flex-1 items-start px-2 lg:px-4 gap-6">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[340px] h-full px-4 animate-pulse">
                            <div className="h-full bg-gray-50/50 rounded-[35px]" />
                        </div>
                    ))
                ) : (
                    COLUMNS.map(col => (
                        <div key={col.id} className="flex-shrink-0 w-[320px] flex flex-col h-full max-h-full px-4">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center gap-3">
                                    <div className={clsx("w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]", col.color)} />
                                    <h3 className="font-black text-gray-900 uppercase tracking-tighter text-[11px]">{col.title}</h3>
                                    <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-2 py-0.5 rounded-lg border border-gray-100/50">{getLeadsByStatus(col.id).length}</span>
                                </div>
                                <button onClick={() => selectColumnLeads(col.id)} className="text-gray-300 hover:text-indigo-600 transition-colors p-1.5 hover:bg-white rounded-lg shadow-sm">
                                    <CheckSquare className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col.id)}
                                className="flex-1 overflow-y-auto scrollbar-hide space-y-2.5 pb-32"
                            >
                                {getLeadsByStatus(col.id).map(lead => (
                                    <div key={lead.id} draggable onDragStart={() => handleDragStart(lead.id)} onDragEnd={() => setDraggedLeadId(null)} className="group cursor-grab active:cursor-grabbing">
                                        <motion.div
                                            layoutId={lead.id}
                                            className={clsx(
                                                "relative bg-white p-3 rounded-[18px] shadow-sm transition-all flex flex-col gap-2 overflow-hidden border border-gray-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5",
                                                selectedLeads.includes(lead.id) ? "ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-100" :
                                                draggedLeadId === lead.id ? "opacity-30 scale-95" : ""
                                            )}
                                        >
                                            {/* Signature Left Accent Border */}
                                            <div className={clsx("absolute top-0 bottom-0 left-0 w-1", col.color)} />

                                            <div 
                                                onClick={(e) => { e.stopPropagation(); toggleSelect(lead.id); }}
                                                className={clsx(
                                                    "absolute top-2 right-2 z-10 p-1 rounded-lg transition-all cursor-pointer shadow-sm",
                                                    selectedLeads.includes(lead.id) ? "bg-indigo-600 text-white" : "bg-white text-gray-300 opacity-0 group-hover:opacity-100 border border-gray-50"
                                                )}
                                            >
                                                {selectedLeads.includes(lead.id) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                            </div>

                                            <div className="flex items-start justify-between min-h-[38px] relative z-1 pl-1">
                                                <div className="min-w-0 pr-4">
                                                    <h4 className="font-black text-gray-900 uppercase text-[11px] tracking-tight truncate mb-0.5 leading-none">{lead.name}</h4>
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3 h-3 text-gray-300" />
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">{lead.company}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pl-1">
                                                <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100/30">
                                                    <span className="text-[7.5px] text-gray-400 font-black uppercase tracking-widest block mb-0.5">Value</span>
                                                    <div className="text-[12px] font-black text-indigo-700 tracking-tight leading-none">${(lead.value || 0).toLocaleString()}</div>
                                                </div>
                                                <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100/30">
                                                    <span className="text-[7.5px] text-gray-400 font-black uppercase tracking-widest block mb-0.5">AI Score</span>
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="text-[10px] font-black text-gray-700 leading-none">{lead.leadScore || 0}%</span>
                                                        <div className="w-5 h-1 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                                            <div className={clsx("h-full", (lead.leadScore || 0) > 70 ? "bg-green-500" : (lead.leadScore || 0) > 40 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${lead.leadScore || 0}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2.5 border-t border-gray-50/80 pl-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Clock className="w-3 h-3 text-amber-500/80 shrink-0" />
                                                    <span className="text-[9px] text-gray-400 font-bold tracking-widest truncate">{new Date(lead.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleConvertLead(lead.id); }} 
                                                            className="p-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Convert to Account"
                                                        >
                                                            <Briefcase className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingLead(lead); }} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-all" title="Edit Lead"><Edit className="w-3.5 h-3.5" /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-all" title="Delete Lead"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                    <div className={clsx(
                                                        "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shrink-0",
                                                        col.color.replace('bg-', 'text-').replace('-500', '-600'),
                                                        col.color.replace('bg-', 'bg-').replace('-500', '-50'),
                                                        col.color.replace('bg-', 'border-').replace('-500', '-100')
                                                    )}>
                                                        {lead.status === 'qualified' ? 'PRIORITY' : 'ACTIVE'}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AddLeadModal
                isOpen={isAddModalOpen || !!editingLead}
                onClose={() => { setIsAddModalOpen(false); setEditingLead(null); }}
                onSuccess={fetchLeads}
                lead={editingLead}
            />
        </div>
    );
}

