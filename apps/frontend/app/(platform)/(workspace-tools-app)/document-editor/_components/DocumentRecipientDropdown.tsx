'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateDocumentDetails, updateMetaType, MetaType } from '@/redux/slices/documentSlice';
import { useGetClientsQuery } from '@/redux/api/clientApi';
import api from '@/lib/api';
import { 
    Users, 
    Building2, 
    UserCheck, 
    Calendar, 
    Clock, 
    FolderGit2, 
    ChevronDown, 
    Check, 
    X, 
    Sparkles, 
    Briefcase,
    FileText,
    Receipt,
    FileCheck
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
const COMMON_CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
    JPY: '¥',
    AED: 'AED',
};
const currencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'AED'];

export function DocumentRecipientDropdown() {
    const dispatch = useDispatch();
    const documentDetails = useSelector((state: any) => state.document?.documentDetails || {});
    const metaType = useSelector((state: any) => state.document?.metaType || 'general');

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'client' | 'employee' | 'terms'>('client');
    const [employees, setEmployees] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch CRM Clients
    const { data: clientsData, isLoading: loadingClients } = useGetClientsQuery({});
    const clients = clientsData?.clients || [];

    // Fetch HR Employees and Projects on open
    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            try {
                setLoadingEmployees(true);
                const empRes = await api.get('/api/v1/hr-management/employees').catch(() => null);
                if (empRes?.data?.employees) {
                    setEmployees(empRes.data.employees);
                } else {
                    const userRes = await api.get('/api/v1/users').catch(() => null);
                    if (userRes?.data?.users) {
                        setEmployees(userRes.data.users);
                    }
                }
            } catch (err) {
                console.error('Failed to load employees', err);
            } finally {
                setLoadingEmployees(false);
            }

            try {
                setLoadingProjects(true);
                const projRes = await api.get('/api/v1/projects-and-tasks/projects').catch(() => null);
                if (projRes?.data?.projects) {
                    setProjects(projRes.data.projects);
                }
            } catch (err) {
                console.error('Failed to load projects', err);
            } finally {
                setLoadingProjects(false);
            }
        };

        fetchData();
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Handlers
    const handleSelectClient = (client: any) => {
        dispatch(updateDocumentDetails({
            clientId: client.id || client._id,
            clientName: client.name || client.companyName || 'Valued Client',
            clientEmail: client.email || '',
            clientCompany: client.companyName || '',
            clientAddress: client.billingAddress || client.address || '',
            employeeId: '',
            employeeName: '',
            employeeRole: '',
            employeeEmail: ''
        }));
        toast.success(`Linked to Client: ${client.name || client.companyName}`, { id: 'link-recipient' });
        setIsOpen(false);
    };

    const handleSelectEmployee = (emp: any) => {
        const name = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
        dispatch(updateDocumentDetails({
            employeeId: emp.id || emp._id,
            employeeName: name,
            employeeEmail: emp.email || '',
            employeeRole: emp.designation || emp.jobTitle || emp.role || 'Team Member',
            employeeDepartment: emp.department || '',
            clientId: '',
            clientName: '',
            clientEmail: '',
            clientCompany: '',
            clientAddress: ''
        }));
        toast.success(`Linked to Employee: ${name}`, { id: 'link-recipient' });
        setIsOpen(false);
    };

    const handleTermsPreset = (term: string) => {
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
        toast.success(`Payment terms set to ${term.replace('_', ' ')}`, { id: 'payment-terms' });
    };

    const handleClearRecipient = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(updateDocumentDetails({
            clientId: '',
            clientName: '',
            clientEmail: '',
            clientCompany: '',
            clientAddress: '',
            employeeId: '',
            employeeName: '',
            employeeRole: '',
            employeeEmail: '',
            selectedProjectId: '',
            projectName: ''
        }));
        toast('Recipient unlinked', { icon: 'ℹ️' });
    };

    // Filter items based on search
    const filteredClients = clients.filter((c: any) => 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredEmployees = employees.filter((e: any) => 
        (e.name || e.firstName || e.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.designation || e.role || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hasLinkedClient = Boolean(documentDetails.clientId || documentDetails.clientName);
    const hasLinkedEmployee = Boolean(documentDetails.employeeId || documentDetails.employeeName);
    const hasRecipient = hasLinkedClient || hasLinkedEmployee;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Recipient Trigger Badge */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-[0.98]",
                    hasLinkedClient
                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100/60"
                        : hasLinkedEmployee
                        ? "bg-indigo-50/80 border-indigo-200 text-indigo-800 hover:bg-indigo-100/60"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title="Link Document Recipient (Client or Employee)"
            >
                {hasLinkedClient ? (
                    <>
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="max-w-[140px] truncate font-bold">{documentDetails.clientName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200/60 text-emerald-900 font-bold uppercase">Client</span>
                        <div 
                            onClick={handleClearRecipient}
                            className="p-0.5 rounded-full hover:bg-emerald-200 text-emerald-700 ml-0.5"
                            title="Unlink Client"
                        >
                            <X className="w-3 h-3" />
                        </div>
                    </>
                ) : hasLinkedEmployee ? (
                    <>
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="max-w-[140px] truncate font-bold">{documentDetails.employeeName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-200/60 text-indigo-900 font-bold uppercase">Employee</span>
                        <div 
                            onClick={handleClearRecipient}
                            className="p-0.5 rounded-full hover:bg-indigo-200 text-indigo-700 ml-0.5"
                            title="Unlink Employee"
                        >
                            <X className="w-3 h-3" />
                        </div>
                    </>
                ) : (
                    <>
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>Link Recipient</span>
                        <ChevronDown className={clsx("w-3 h-3 text-gray-400 transition-transform", isOpen && "rotate-180")} />
                    </>
                )}
            </button>

            {/* Recipient Dropdown Popover */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[150] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                    {/* Header Tabs */}
                    <div className="flex border-b border-gray-100 bg-slate-50/80 p-1.5 gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('client')}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                                activeTab === 'client' 
                                    ? "bg-white text-emerald-700 shadow-xs border border-gray-200/60" 
                                    : "text-gray-500 hover:text-gray-800"
                            )}
                        >
                            <Building2 className="w-3.5 h-3.5" /> CRM Client
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('employee')}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                                activeTab === 'employee' 
                                    ? "bg-white text-indigo-700 shadow-xs border border-gray-200/60" 
                                    : "text-gray-500 hover:text-gray-800"
                            )}
                        >
                            <UserCheck className="w-3.5 h-3.5" /> HR Employee
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('terms')}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                                activeTab === 'terms' 
                                    ? "bg-white text-indigo-700 shadow-xs border border-gray-200/60" 
                                    : "text-gray-500 hover:text-gray-800"
                            )}
                        >
                            <Clock className="w-3.5 h-3.5" /> Terms & Due
                        </button>
                    </div>

                    {/* Search Bar (for client / employee tabs) */}
                    {(activeTab === 'client' || activeTab === 'employee') && (
                        <div className="p-3 border-b border-gray-100 bg-white">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={activeTab === 'client' ? "Search clients by name, company, email..." : "Search employees by name, role..."}
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Tab 1: CRM Clients */}
                    {activeTab === 'client' && (
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                            {loadingClients ? (
                                <p className="text-center py-6 text-xs text-gray-400">Loading clients from CRM...</p>
                            ) : filteredClients.length === 0 ? (
                                <div className="text-center py-6 text-xs text-gray-400">
                                    <p className="font-semibold text-gray-600 mb-1">No clients found</p>
                                    <p className="text-[11px]">Add clients in the CRM module to link them here.</p>
                                </div>
                            ) : (
                                filteredClients.map((client: any) => {
                                    const isSelected = documentDetails.clientId === (client.id || client._id);
                                    return (
                                        <button
                                            key={client.id || client._id}
                                            type="button"
                                            onClick={() => handleSelectClient(client)}
                                            className={clsx(
                                                "w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer",
                                                isSelected 
                                                    ? "bg-emerald-50 border border-emerald-200 text-emerald-950 font-semibold" 
                                                    : "hover:bg-gray-50 text-gray-700"
                                            )}
                                        >
                                            <div>
                                                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                                                    {client.name || client.companyName}
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                                </p>
                                                <p className="text-[11px] text-gray-500">
                                                    {client.companyName ? `${client.companyName} • ` : ''}{client.email || 'No email provided'}
                                                </p>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                                                Link
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Tab 2: HR Employees */}
                    {activeTab === 'employee' && (
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                            {loadingEmployees ? (
                                <p className="text-center py-6 text-xs text-gray-400">Loading team members...</p>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="text-center py-6 text-xs text-gray-400">
                                    <p className="font-semibold text-gray-600 mb-1">No employees found</p>
                                    <p className="text-[11px]">Add employees in the HR module to link them here.</p>
                                </div>
                            ) : (
                                filteredEmployees.map((emp: any) => {
                                    const isSelected = documentDetails.employeeId === (emp.id || emp._id);
                                    const name = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
                                    return (
                                        <button
                                            key={emp.id || emp._id}
                                            type="button"
                                            onClick={() => handleSelectEmployee(emp)}
                                            className={clsx(
                                                "w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer",
                                                isSelected 
                                                    ? "bg-indigo-50 border border-indigo-200 text-indigo-950 font-semibold" 
                                                    : "hover:bg-gray-50 text-gray-700"
                                            )}
                                        >
                                            <div>
                                                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                                                    {name}
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                                </p>
                                                <p className="text-[11px] text-gray-500">
                                                    {emp.designation || emp.role || 'Employee'} • {emp.email || 'No email'}
                                                </p>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold shrink-0">
                                                Link
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Tab 3: Payment Terms & Due Dates */}
                    {activeTab === 'terms' && (
                        <div className="p-4 space-y-4 text-xs">
                            <div>
                                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-2">
                                    Commercial Payment Terms
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { id: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
                                        { id: 'NET_15', label: 'Net 15 Days' },
                                        { id: 'NET_30', label: 'Net 30 Days' },
                                        { id: 'NET_60', label: 'Net 60 Days' },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => handleTermsPreset(t.id)}
                                            className={clsx(
                                                "py-2 px-2.5 rounded-xl font-bold border transition-all text-center cursor-pointer",
                                                documentDetails.paymentTerms === t.id
                                                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={documentDetails.dueDate || ''}
                                        onChange={(e) => dispatch(updateDocumentDetails({ dueDate: e.target.value }))}
                                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                        Currency
                                    </label>
                                    <select
                                        value={documentDetails.currency || 'INR'}
                                        onChange={(e) => dispatch(updateDocumentDetails({ currency: e.target.value }))}
                                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl font-medium bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                    >
                                        {currencies.map(c => (
                                            <option key={c} value={c}>
                                                {COMMON_CURRENCY_SYMBOLS[c] || c} {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1">
                                    Linked Project (Optional)
                                </label>
                                <select
                                    value={documentDetails.selectedProjectId || ''}
                                    onChange={(e) => {
                                        const p = projects.find((proj: any) => proj.id === e.target.value);
                                        dispatch(updateDocumentDetails({
                                            selectedProjectId: e.target.value,
                                            projectName: p?.name || p?.title || ''
                                        }));
                                    }}
                                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl font-medium bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                >
                                    <option value="">-- No Project Linked --</option>
                                    {projects.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name || p.title || `Project #${p.id}`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Footer Info */}
                    <div className="p-3 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="flex items-center gap-1 font-medium">
                            <Sparkles className="w-3 h-3 text-indigo-600" /> Auto-resolves <code className="text-[10px] bg-white px-1 py-0.5 rounded border border-gray-200">{'{{clientName}}'}</code> tags
                        </span>
                        {hasRecipient && (
                            <button
                                type="button"
                                onClick={handleClearRecipient}
                                className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                            >
                                Clear Link
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
