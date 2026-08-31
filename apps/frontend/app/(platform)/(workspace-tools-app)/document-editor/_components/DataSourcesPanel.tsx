'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateDocumentDetails } from '@/redux/slices/documentSlice';
import { useGetClientsQuery } from '@/redux/api/clientApi';
import { Building2, Calendar, DollarSign, FolderGit2, Clock, CheckCircle, ChevronDown, Database, Users, Tag } from 'lucide-react';

const COMMON_CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', 
    SGD: 'S$', CHF: 'CHF', MYR: 'RM', JPY: '¥', CNY: '¥'
};

export function DataSourcesPanel() {
    const dispatch = useDispatch();
    const documentDetails = useSelector((state: any) => state.document?.documentDetails || {});
    const { data: clientsData, isLoading: loadingClients } = useGetClientsQuery({});
    const [currencies, setCurrencies] = useState<string[]>(['INR', 'USD', 'EUR', 'GBP']);

    useEffect(() => {
        fetch('/api/data/currencies')
            .then(res => res.json())
            .then(data => {
                if (data?.rates) {
                    setCurrencies(Object.keys(data.rates));
                }
            })
            .catch(err => console.error('Failed to fetch currencies:', err));
    }, []);

    const clients = clientsData?.clients || [];

    const handleClientChange = (clientId: string) => {
        if (!clientId) {
            dispatch(updateDocumentDetails({
                clientId: '',
                clientName: '',
                clientEmail: '',
                clientCompany: '',
                clientAddress: ''
            }));
            return;
        }

        const selected = clients.find((c: any) => c.id === clientId || c._id === clientId);
        if (selected) {
            dispatch(updateDocumentDetails({
                clientId: selected.id || selected._id,
                clientName: selected.name || selected.companyName || 'Valued Client',
                clientEmail: selected.email || '',
                clientCompany: selected.companyName || '',
                clientAddress: selected.billingAddress || selected.address || ''
            }));
        }
    };

    const handleTermsChange = (term: string) => {
        const now = new Date();
        let days = 0;
        if (term === 'NET_15') days = 15;
        else if (term === 'NET_30') days = 30;
        else if (term === 'NET_60') days = 60;

        const due = new Date(now.setDate(now.getDate() + days));

        dispatch(updateDocumentDetails({
            paymentTerms: term,
            dueDate: due.toISOString().split('T')[0]
        }));
    };

    const termsPresets = [
        { id: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
        { id: 'NET_15', label: 'Net 15' },
        { id: 'NET_30', label: 'Net 30' },
        { id: 'NET_60', label: 'Net 60' },
    ];

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                        <Database className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        Document Data Sources
                    </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Live Linked
                </span>
            </div>

            {/* CRM Client Selection */}
            <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-600" /> CRM Client Source
                </label>
                <div className="relative">
                    <select
                        value={documentDetails.clientId || ''}
                        onChange={(e) => handleClientChange(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                    >
                        <option value="">-- Select Client from CRM --</option>
                        {clients.map((c: any) => (
                            <option key={c.id || c._id} value={c.id || c._id}>
                                {c.name || c.companyName} {c.companyName ? `(${c.companyName})` : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {documentDetails.clientName && (
                    <p className="mt-1 text-[11px] text-slate-500">
                        Populating tags for: <span className="font-semibold text-slate-700 dark:text-slate-300">{documentDetails.clientName}</span> ({documentDetails.clientEmail || 'No email'})
                    </p>
                )}
            </div>

            {/* Payment Terms Chips */}
            <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" /> Commercial Payment Terms
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                    {termsPresets.map((t) => {
                        const isSelected = documentDetails.paymentTerms === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => handleTermsChange(t.id)}
                                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                                    isSelected
                                        ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-2xs'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                }`}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Due Date & Currency */}
            <div className="grid grid-cols-2 gap-2.5">
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Due Date
                    </label>
                    <input
                        type="date"
                        value={documentDetails.dueDate ? documentDetails.dueDate.split('T')[0] : ''}
                        onChange={(e) => dispatch(updateDocumentDetails({ dueDate: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Currency
                    </label>
                    <select
                        value={documentDetails.currency || 'INR'}
                        onChange={(e) => dispatch(updateDocumentDetails({ currency: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                        {currencies.map(c => (
                            <option key={c} value={c}>
                                {COMMON_CURRENCY_SYMBOLS[c] || c} {c}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Linked Project (Optional) */}
            <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <FolderGit2 className="w-3 h-3 text-emerald-600" /> Linked Project Source
                </label>
                <input
                    type="text"
                    placeholder="e.g. Website Redesign Q3"
                    value={documentDetails.projectName || ''}
                    onChange={(e) => dispatch(updateDocumentDetails({ projectName: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
            </div>
        </div>
    );
}
