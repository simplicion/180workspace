import React from 'react';
import { ChevronRight, Check, Users } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';

export function PlanDetailsDrawer({ plan, isOpen, onClose, onSelect }: any) {
    if (!isOpen || !plan) return null;
    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={plan.planName}
            maxWidth="max-w-md"
        >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white relative rounded-2xl mb-6 shadow-lg shadow-indigo-100">
                <h3 className="text-2xl font-bold">{plan.planName}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black">₹{plan.price?.toLocaleString('en-IN')}</span>
                    <span className="text-indigo-100 opacity-80">/{plan.billingCycle || 'month'}</span>
                </div>
            </div>
            <div className="space-y-6">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">What's Included</p>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-3 text-slate-700">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <Users className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <span className="text-sm font-medium">Up to <strong>{plan.maxUsers}</strong> active users</span>
                        </div>
                        {plan.features?.map((f: string) => (
                            <div key={f} className="flex items-start gap-3 text-slate-600">
                                <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <Check className="w-3.5 h-3.5 text-indigo-500" />
                                </div>
                                <span className="text-sm">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={() => { onSelect(plan); onClose(); }}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200">
                    Choose This Plan
                </button>
            </div>
        </Drawer>
    );
}
