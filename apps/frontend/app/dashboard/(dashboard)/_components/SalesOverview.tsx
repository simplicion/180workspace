'use client';

import React from 'react';
import { TrendingUp, Users, Target, PhoneCall, ChevronRight, AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

// Mock data for sales insights
const MOCK_SALES_DATA = {
    newLeads: 12,
    processingLeads: 28,
    convertedThisMonth: 8,
    conversionRate: 18.5,
    conversionTrend: '+2.4%',
    hotLeads: 3,
    recentActivity: [
        { id: 1, text: 'Acme Corp proposal viewed', time: '2 hrs ago', urgent: false },
        { id: 2, text: 'TechStart needs follow-up today', time: '5 hrs ago', urgent: true },
        { id: 3, text: 'Won contract with Global Inc.', time: '1 day ago', urgent: false },
    ]
};

export default function SalesOverview() {
    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            Sales Pipeline
                            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-emerald-50 text-emerald-600 rounded-full flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" /> {MOCK_SALES_DATA.conversionRate}% Conversion
                            </span>
                        </h3>
                        <p className="text-[11px] text-gray-400 font-medium">Real-time sales health and urgent actions</p>
                    </div>
                </div>
                <Link 
                    href="/dashboard/crm" 
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors self-start sm:self-auto border border-transparent hover:border-blue-100"
                >
                    View CRM <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            <div className="p-5">
                {/* Insights / Pipeline Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">New Leads</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-gray-900">{MOCK_SALES_DATA.newLeads}</span>
                            <span className="text-[10px] font-bold text-emerald-500">This week</span>
                        </div>
                    </div>
                    
                    <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Processing</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-gray-900">{MOCK_SALES_DATA.processingLeads}</span>
                            <span className="text-[10px] font-bold text-amber-500">Active</span>
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Won</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-gray-900">{MOCK_SALES_DATA.convertedThisMonth}</span>
                            <span className="text-[10px] font-bold text-emerald-500">This month</span>
                        </div>
                    </div>
                </div>

                {/* Valuable Insights / Urgent Action */}
                <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-blue-600" /> Actionable Insights
                        </h4>
                        {MOCK_SALES_DATA.hotLeads > 0 && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                                {MOCK_SALES_DATA.hotLeads} Hot Leads
                            </span>
                        )}
                    </div>
                    
                    <div className="space-y-2.5">
                        {MOCK_SALES_DATA.recentActivity.map(activity => (
                            <div key={activity.id} className="flex items-start gap-2.5">
                                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${activity.urgent ? 'bg-rose-500' : 'bg-blue-400'}`} />
                                <div className="flex-1">
                                    <p className={`text-xs font-medium ${activity.urgent ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                                        {activity.text}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{activity.time}</p>
                                </div>
                                {activity.urgent && (
                                    <button className="text-[10px] font-bold bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-50 transition-colors shrink-0">
                                        Follow Up
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
