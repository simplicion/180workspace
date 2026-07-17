'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Phone, Mail, Users, MessageSquare, CheckSquare, Calendar, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export default function LogActivityModal({ onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    
    // Form State
    const [type, setType] = useState('call');
    const [notes, setNotes] = useState('');
    const [relationType, setRelationType] = useState<'lead' | 'deal' | 'account' | 'contact'>('lead');
    const [selectedRelationId, setSelectedRelationId] = useState('');
    
    // Search Suggestions
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchTerm.length >= 2) {
                fetchSuggestions();
            } else {
                setSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm, relationType]);

    async function fetchSuggestions() {
        setFetchingData(true);
        try {
            let endpoint = '';
            if (relationType === 'lead') endpoint = '/api/sales/leads';
            else if (relationType === 'deal') endpoint = '/api/sales/opportunities';
            else if (relationType === 'account') endpoint = '/api/sales/accounts';
            else if (relationType === 'contact') endpoint = '/api/sales/contacts';

            const { data } = await api.get(endpoint);
            // The API returns { leads: [] } or { opportunities: [] }
            const list = data.leads || data.opportunities || data.accounts || data.contacts || [];
            
            const filtered = list.filter((item: any) => {
                const searchStr = (item.name || item.title || item.companyName || '').toLowerCase();
                return searchStr.includes(searchTerm.toLowerCase());
            });

            setSuggestions(filtered.slice(0, 5));
        } catch (err) {
            console.error('Failed to fetch suggestions', err);
        } finally {
            setFetchingData(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!notes.trim()) return toast.error('Please enter some notes');
        
        setLoading(true);
        try {
            const body: any = {
                type,
                notes,
                timestamp: new Date().toISOString()
            };

            if (selectedRelationId) {
                if (relationType === 'lead') body.relatedLead = selectedRelationId;
                else if (relationType === 'deal') body.relatedDeal = selectedRelationId;
                else if (relationType === 'account') body.relatedAccount = selectedRelationId;
                else if (relationType === 'contact') body.relatedContact = selectedRelationId;
            }

            await api.post('/api/sales/activities', body);
            toast.success('Activity logged successfully');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to log activity');
        } finally {
            setLoading(false);
        }
    }

    const activityTypes = [
        { id: 'call', icon: Phone, label: 'Call', color: 'bg-blue-50 text-blue-600' },
        { id: 'email', icon: Mail, label: 'Email', color: 'bg-orange-50 text-orange-600' },
        { id: 'meeting', icon: Users, label: 'Meeting', color: 'bg-purple-50 text-purple-600' },
        { id: 'note', icon: MessageSquare, label: 'Note', color: 'bg-emerald-50 text-emerald-600' },
        { id: 'task', icon: CheckSquare, label: 'Task', color: 'bg-rose-50 text-rose-600' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <PlusIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Log Sales Activity</h2>
                            <p className="text-xs text-gray-500 font-medium">Record an interaction with a client</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" aria-label="Close modal">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    {/* Activity Type Selection */}
                    <div>
                        <label className="label mb-3">Activity Type</label>
                        <div className="grid grid-cols-5 gap-2">
                            {activityTypes.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setType(item.id)}
                                    aria-label={`Select ${item.label} activity type`}
                                    className={clsx(
                                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                                        type === item.id 
                                            ? `${item.color} border-current shadow-sm scale-[1.02]` 
                                            : "border-gray-100 hover:bg-gray-50 text-gray-500"
                                    )}
                                >
                                    <item.icon className="w-5 h-5" aria-hidden="true" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Relation Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label htmlFor="relationSearch" className="label">Relate To</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['lead', 'deal'].map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => {
                                            setRelationType(r as any);
                                            setSelectedRelationId('');
                                            setSearchTerm('');
                                        }}
                                        aria-label={`Relate to ${r}`}
                                        className={clsx(
                                            "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all",
                                            relationType === r ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                                        )}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input
                                id="relationSearch"
                                type="text"
                                placeholder={`Search for a ${relationType}...`}
                                className="input pl-10 w-full"
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    if (selectedRelationId) setSelectedRelationId('');
                                }}
                            />
                            {fetchingData && <LogoLoader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" aria-label="Searching..." />}
                            
                            {/* Suggestions List */}
                            {suggestions.length > 0 && !selectedRelationId && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden">
                                    {suggestions.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedRelationId(s.id);
                                                setSearchTerm(s.name || s.title || s.companyName);
                                                setSuggestions([]);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                {(s.name || s.title || '?')[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{s.name || s.title || s.companyName}</div>
                                                <div className="text-[10px] text-gray-400 font-medium uppercase">{relationType}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label htmlFor="activityNotes" className="label">Activity Details</label>
                        <textarea
                            id="activityNotes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="What happened during this interaction? Any follow-up items?"
                            rows={4}
                            className="input min-h-[100px] resize-none"
                            required
                        />
                    </div>
                </form>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} type="button" className="btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading || (searchTerm && !selectedRelationId)} className="btn-primary flex items-center gap-2">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                        Log Activity
                    </button>
                </div>
            </div>
        </div>
    );
}

function PlusIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    );
}
