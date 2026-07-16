'use client';

import React from 'react';
import { Ticket, Plus, Clock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const mockTickets = [
    { id: 'TKT-1049', subject: 'Cannot access billing page', status: 'Open', date: '2 hours ago', icon: AlertCircle, color: 'text-amber-500' },
    { id: 'TKT-1048', subject: 'How to add more seats?', status: 'Pending', date: 'Yesterday', icon: Clock, color: 'text-blue-500' },
    { id: 'TKT-1045', subject: 'Invoice not received for last month', status: 'Resolved', date: '3 days ago', icon: CheckCircle2, color: 'text-emerald-500' },
];

export default function TicketsPage() {
    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/dashboard/help-support" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        Back to Help & Support
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Support Tickets</h1>
                    <p className="text-gray-500 mt-2">Manage your support requests and communicate with our team.</p>
                </div>
                <button className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                    <Plus className="h-4 w-4" />
                    <span>Create Ticket</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 bg-white rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
                </div>
                <div className="p-0">
                    <div className="divide-y divide-gray-100">
                        {mockTickets.map((ticket) => (
                            <div key={ticket.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center space-x-4">
                                    <div className={`h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center ${ticket.color}`}>
                                        <ticket.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{ticket.subject}</h3>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className="text-xs font-medium text-gray-500">{ticket.id}</span>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-xs text-gray-500">{ticket.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        ticket.status === 'Open' ? 'bg-amber-100 text-amber-800' :
                                        ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {ticket.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        
                        {mockTickets.length === 0 && (
                            <div className="p-12 text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                    <Ticket className="h-6 w-6 text-gray-400" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-900">No support tickets</h3>
                                <p className="mt-1 text-sm text-gray-500">You don't have any open support requests.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
