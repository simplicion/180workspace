'use client';

import React, { useState } from 'react';
import { UserCheck, UserX, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface EntitySelectorOption {
    id: string;
    title: string;
    subtitle?: string;
    avatar?: string;
    status?: string;
}

export interface EntitySelectorDirective {
    directive: 'entity_selector';
    entityType: 'employee' | 'lead' | 'project' | 'task';
    actionTarget: string;
    entityId?: string;
    message?: string;
    options: EntitySelectorOption[];
}

interface Props {
    directive: EntitySelectorDirective;
    onSelect: (option: EntitySelectorOption, actionTarget: string) => Promise<void> | void;
}

export function InteractiveEntitySelectorCard({ directive, onSelect }: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);

    const isTerminate = directive.actionTarget === 'terminate_employee';

    const handleConfirm = async (opt: EntitySelectorOption) => {
        setSelectedId(opt.id);
        setSubmitting(true);
        try {
            await onSelect(opt, directive.actionTarget);
            setCompleted(true);
        } catch (err: any) {
            console.error('Action error:', err);
            toast.error(err.message || 'Action failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (completed) {
        return (
            <div className="mt-3 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-sm font-medium">
                    Selection confirmed and executed successfully!
                </span>
            </div>
        );
    }

    return (
        <div className="mt-3.5 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-white shadow-xl max-w-xl">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isTerminate ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
                    {isTerminate ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </div>
                <div>
                    <h6 className="text-sm font-bold text-slate-100">
                        {directive.message || 'Select an item to continue:'}
                    </h6>
                    <p className="text-xs text-slate-400">
                        {isTerminate ? 'Click on an employee to process relieving & generate certificate' : 'Click to assign or dispatch action'}
                    </p>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {directive.options.map((opt) => {
                    const isSelected = selectedId === opt.id;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            disabled={submitting}
                            onClick={() => handleConfirm(opt)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all group ${
                                isSelected 
                                    ? 'bg-indigo-600/30 border-indigo-500 text-white' 
                                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600 text-slate-200'
                            }`}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow">
                                {opt.avatar || opt.title.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-slate-100 truncate group-hover:text-white">
                                    {opt.title}
                                </div>
                                {opt.subtitle && (
                                    <div className="text-[11px] text-slate-400 truncate">
                                        {opt.subtitle}
                                    </div>
                                )}
                            </div>
                            {isSelected && submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                            ) : (
                                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
