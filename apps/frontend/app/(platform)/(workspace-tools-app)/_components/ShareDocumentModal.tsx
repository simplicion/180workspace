'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    X, 
    Copy, 
    Check, 
    Globe, 
    Lock, 
    Mail, 
    ExternalLink, 
    Send, 
    ShieldCheck, 
    Eye, 
    Users, 
    UserPlus, 
    Search, 
    ChevronDown, 
    Sparkles, 
    AlertCircle,
    CheckCircle2,
    Building2,
    Shield,
    Trash2,
    AtSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { LogoLoader } from '@workspace/ui';
import { useGetUsersQuery } from '../../../../redux/api/userApi';
import { useGetClientsQuery } from '../../../../redux/api/clientApi';
import clsx from 'clsx';

interface ShareDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    documentTitle: string;
    initialShareToken?: string;
    initialAccessType?: 'public' | 'restricted' | 'client_only';
    clientName?: string;
    clientEmail?: string;
    initialAllowedUserIds?: string[];
    initialAllowedEmails?: string[];
    onAccessTypeUpdated?: (newType: 'public' | 'restricted' | 'client_only') => void;
}

export default function ShareDocumentModal({
    isOpen,
    onClose,
    documentId,
    documentTitle,
    initialShareToken,
    initialAccessType = 'public',
    clientName,
    clientEmail,
    initialAllowedUserIds = [],
    initialAllowedEmails = [],
    onAccessTypeUpdated
}: ShareDocumentModalProps) {
    const [accessType, setAccessType] = useState<'public' | 'restricted' | 'client_only'>(
        initialAccessType === 'client_only' ? 'restricted' : initialAccessType
    );
    const [shareToken, setShareToken] = useState<string>(initialShareToken || '');
    const [loadingToken, setLoadingToken] = useState(false);
    const [savingAccess, setSavingAccess] = useState(false);
    const [copied, setCopied] = useState(false);

    // Selected Collaborators & Emails
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [customEmails, setCustomEmails] = useState<string[]>([]);
    const [emailInput, setEmailInput] = useState('');
    const [emailMessage, setEmailMessage] = useState(
        `Hi,\n\nPlease review and electronically sign the attached document: ${documentTitle}.\n\nThank you!`
    );
    const [isDispatching, setIsDispatching] = useState(false);

    // Search and Dropdown State
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch platform users and clients
    const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery({});
    const { data: clientsData, isLoading: isLoadingClients } = useGetClientsQuery({});

    const platformUsers = useMemo(() => {
        const raw = usersData?.users || usersData?.data || (Array.isArray(usersData) ? usersData : []);
        return raw.map((u: any) => ({
            id: u.id || u._id,
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User',
            email: u.email || '',
            role: u.role || 'Member',
            avatar: u.photoUrl || u.avatar || null,
            type: 'user'
        })).filter((u: any) => u.email);
    }, [usersData]);

    const platformClients = useMemo(() => {
        const raw = clientsData?.clients || clientsData?.data || (Array.isArray(clientsData) ? clientsData : []);
        return raw.map((c: any) => ({
            id: c.id || c._id,
            name: c.name || c.companyName || 'Client',
            email: c.email || '',
            role: 'Client',
            avatar: c.logoUrl || null,
            type: 'client'
        })).filter((c: any) => c.email);
    }, [clientsData]);

    const combinedDirectory = useMemo(() => {
        return [...platformUsers, ...platformClients];
    }, [platformUsers, platformClients]);

    // Filter directory by search query and exclude already selected
    const filteredDirectory = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const selectedIds = new Set(selectedUsers.map(u => u.id));
        const selectedEmailSet = new Set(customEmails.map(e => e.toLowerCase()));

        return combinedDirectory.filter(item => {
            if (selectedIds.has(item.id)) return false;
            if (selectedEmailSet.has(item.email.toLowerCase())) return false;
            if (!q) return true;
            return item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q);
        });
    }, [combinedDirectory, searchQuery, selectedUsers, customEmails]);

    useEffect(() => {
        if (isOpen) {
            setAccessType(initialAccessType === 'client_only' ? 'restricted' : (initialAccessType || 'public'));
            if (!shareToken && documentId) {
                fetchOrGenerateToken();
            }

            // Seed initial allowed custom emails if any
            if (initialAllowedEmails && initialAllowedEmails.length > 0) {
                setCustomEmails(initialAllowedEmails);
            } else if (clientEmail) {
                setCustomEmails([clientEmail]);
            }
        }
    }, [isOpen, documentId, initialShareToken, initialAccessType, clientEmail]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function fetchOrGenerateToken() {
        setLoadingToken(true);
        try {
            const res = await api.post(`/api/v1/workspace-tools/documents/${documentId}/share`);
            if (res.data?.shareToken) {
                setShareToken(res.data.shareToken);
            }
        } catch (err) {
            console.error('Failed to generate share link:', err);
        } finally {
            setLoadingToken(false);
        }
    }

    const shareUrl = typeof window !== 'undefined' && shareToken
        ? `${window.location.origin}/f/document/${shareToken}`
        : shareToken ? `/f/document/${shareToken}` : '';

    const viewerUrl = typeof window !== 'undefined' && documentId
        ? `${window.location.origin}/document-viewer?id=${documentId}`
        : `/document-viewer?id=${documentId}`;

    async function handleAccessTypeChange(newType: 'public' | 'restricted') {
        setAccessType(newType);
        setSavingAccess(true);
        try {
            await api.put(`/api/v1/workspace-tools/documents/${documentId}`, {
                accessType: newType
            });
            if (onAccessTypeUpdated) onAccessTypeUpdated(newType);
            toast.success(newType === 'public' 
                ? 'Public View Enabled: Anyone with link can view & sign without login' 
                : 'Restricted Access: Only authorized platform users and allowed emails can view'
            );
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to update access permission');
        } finally {
            setSavingAccess(false);
        }
    }

    function handleCopyLink() {
        const targetUrl = accessType === 'public' ? shareUrl : viewerUrl;
        if (!targetUrl) return;
        navigator.clipboard.writeText(targetUrl);
        setCopied(true);
        toast.success('Document link copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
    }

    // Add email chips from comma, space or enter
    const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['Enter', ',', 'Tab', ' '].includes(e.key)) {
            e.preventDefault();
            addCustomEmail(emailInput);
        }
    };

    const addCustomEmail = (rawText: string) => {
        const parts = rawText.split(/[,\s]+/).map(p => p.trim()).filter(Boolean);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validToAdd: string[] = [];

        for (const part of parts) {
            if (emailRegex.test(part)) {
                if (!customEmails.includes(part) && !selectedUsers.some(u => u.email.toLowerCase() === part.toLowerCase())) {
                    validToAdd.push(part.toLowerCase());
                }
            } else if (parts.length === 1) {
                toast.error(`"${part}" is not a valid email address.`);
            }
        }

        if (validToAdd.length > 0) {
            setCustomEmails(prev => [...prev, ...validToAdd]);
            setEmailInput('');
        }
    };

    const handleSelectUser = (user: any) => {
        setSelectedUsers(prev => [...prev, user]);
        // Also remove from custom emails if it existed there
        setCustomEmails(prev => prev.filter(e => e.toLowerCase() !== user.email.toLowerCase()));
        setSearchQuery('');
        setIsDropdownOpen(false);
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(prev => prev.filter(u => u.id !== userId));
    };

    const handleRemoveEmail = (email: string) => {
        setCustomEmails(prev => prev.filter(e => e !== email));
    };

    // Dispatch batch emails & sync permissions via BullMQ queue
    async function handleDispatchShare() {
        const totalRecipients = selectedUsers.length + customEmails.length;
        if (totalRecipients === 0) {
            return toast.error('Please add at least one user or email recipient.');
        }

        setIsDispatching(true);
        const toastId = toast.loading(`Enqueuing ${totalRecipients} document invitations via BullMQ...`);

        try {
            const payload = {
                accessType,
                recipientUserIds: selectedUsers.map(u => u.id),
                customEmails,
                message: emailMessage,
                documentUrl: accessType === 'public' ? shareUrl : viewerUrl
            };

            const res = await api.post(`/api/v1/workspace-tools/documents/${documentId}/dispatch-share`, payload);

            if (res.data?.success) {
                toast.success(`Success! Sent invitations to ${totalRecipients} recipients in queue.`, { id: toastId });
                onClose();
            } else {
                toast.success(`Document permissions updated and queued for ${totalRecipients} recipients.`, { id: toastId });
                onClose();
            }
        } catch (err: any) {
            console.error('Dispatch share error:', err);
            toast.error(err?.response?.data?.message || 'Failed to dispatch document share invitations.', { id: toastId });
        } finally {
            setIsDispatching(false);
        }
    }

    if (!isOpen) return null;

    const totalSelected = selectedUsers.length + customEmails.length;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                            <ShareDocumentIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                Share & Send Document
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    Google Drive Style
                                </span>
                            </h3>
                            <p className="text-xs text-gray-500 truncate max-w-sm font-medium">{documentTitle || 'Untitled Document'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body - Scrollable Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    
                    {/* Add People & Custom Emails Input Box */}
                    <div className="space-y-2 relative" ref={dropdownRef}>
                        <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-indigo-600" />
                                Add Platform Users & Custom Emails
                            </span>
                            <span className="text-[10px] text-gray-400 font-normal">
                                Type email & press comma / Enter
                            </span>
                        </label>

                        {/* Interactive Chip Input Container */}
                        <div className="min-h-[44px] p-2 rounded-xl border border-gray-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 bg-white flex flex-wrap gap-1.5 items-center transition-all shadow-2xs">
                            {/* Selected Platform Users Chips */}
                            {selectedUsers.map(user => (
                                <span 
                                    key={user.id} 
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs font-semibold shadow-2xs"
                                >
                                    <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-700 text-[10px] flex items-center justify-center font-bold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="max-w-[120px] truncate">{user.name}</span>
                                    <span className="text-[10px] text-indigo-500 font-normal">({user.role})</span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveUser(user.id)}
                                        className="text-indigo-400 hover:text-indigo-700 ml-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}

                            {/* Custom Email Chips */}
                            {customEmails.map(email => (
                                <span 
                                    key={email} 
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium shadow-2xs"
                                >
                                    <AtSign className="w-3 h-3 text-emerald-600" />
                                    <span className="max-w-[150px] truncate">{email}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveEmail(email)}
                                        className="text-emerald-400 hover:text-emerald-700 ml-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}

                            {/* Text Input */}
                            <input
                                type="text"
                                value={emailInput}
                                onChange={(e) => {
                                    setEmailInput(e.target.value);
                                    setSearchQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                onKeyDown={handleEmailInputKeyDown}
                                onBlur={() => {
                                    if (emailInput.trim()) addCustomEmail(emailInput);
                                }}
                                placeholder={totalSelected === 0 ? "Search employees/clients or type external email..." : "Add more..."}
                                className="flex-1 min-w-[160px] text-xs text-gray-800 focus:outline-none placeholder-gray-400 bg-transparent px-1 py-1"
                            />
                        </div>

                        {/* Search Autocomplete Dropdown */}
                        {isDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-gray-50 animate-in fade-in zoom-in-95 duration-100">
                                {isLoadingUsers || isLoadingClients ? (
                                    <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                                        <LogoLoader className="w-4 h-4 animate-spin text-indigo-600" />
                                        Loading directory...
                                    </div>
                                ) : filteredDirectory.length === 0 ? (
                                    <div className="p-3.5 text-center text-xs text-gray-500">
                                        {emailInput.includes('@') ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    addCustomEmail(emailInput);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="text-indigo-600 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
                                            >
                                                <Mail className="w-3.5 h-3.5" /> Add custom email &ldquo;{emailInput}&rdquo;
                                            </button>
                                        ) : (
                                            <span>No matching team member or client found</span>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Platform Directory
                                        </div>
                                        {filteredDirectory.slice(0, 8).map(user => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => handleSelectUser(user)}
                                                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-indigo-50/60 transition-colors text-left group"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-semibold text-gray-900 group-hover:text-indigo-600 truncate">
                                                            {user.name}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 truncate">
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 flex-shrink-0">
                                                    {user.role}
                                                </span>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Access Permissions Segmented Control (Public vs Restricted) */}
                    <div className="p-4 rounded-xl border border-gray-200/90 bg-slate-50/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                                General Access Permission
                            </span>
                            {savingAccess && (
                                <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                                    <LogoLoader className="w-3 h-3 animate-spin" /> Saving...
                                </span>
                            )}
                        </div>

                        <div className="space-y-2">
                            {/* Option 1: Anyone with link (Public) */}
                            <label className={clsx(
                                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150",
                                accessType === 'public'
                                    ? "bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500"
                                    : "bg-white border-gray-200 hover:border-gray-300"
                            )}>
                                <input
                                    type="radio"
                                    name="accessType"
                                    checked={accessType === 'public'}
                                    onChange={() => handleAccessTypeChange('public')}
                                    className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <Globe className="w-4 h-4 text-emerald-600" />
                                        <span className="text-xs font-bold text-gray-900">Anyone with the link (Public View)</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                                        Anyone on the internet with this link can view, review deliverables, and e-sign without requiring a 180 Workspace account.
                                    </p>
                                </div>
                            </label>

                            {/* Option 2: Restricted */}
                            <label className={clsx(
                                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150",
                                accessType === 'restricted'
                                    ? "bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500"
                                    : "bg-white border-gray-200 hover:border-gray-300"
                            )}>
                                <input
                                    type="radio"
                                    name="accessType"
                                    checked={accessType === 'restricted'}
                                    onChange={() => handleAccessTypeChange('restricted')}
                                    className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <Lock className="w-4 h-4 text-indigo-600" />
                                        <span className="text-xs font-bold text-gray-900">Restricted (Authorized People Only)</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                                        Only specifically selected platform users and added email addresses can open and interact with this document.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Personalized Note Message */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            Personalized Email Message
                        </label>
                        <textarea
                            rows={3}
                            value={emailMessage}
                            onChange={(e) => setEmailMessage(e.target.value)}
                            placeholder="Add a personalized message for your recipients..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-800 resize-none shadow-2xs"
                        />
                    </div>

                    {/* Copy Link Bar */}
                    <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={accessType === 'public' ? shareUrl : viewerUrl}
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[11px] font-mono text-gray-600 focus:outline-none select-all truncate"
                        />
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className={clsx(
                                "px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs flex-shrink-0",
                                copied
                                    ? "bg-emerald-600 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                        >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied' : 'Copy Link'}
                        </button>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-semibold text-gray-800">{totalSelected}</span> {totalSelected === 1 ? 'recipient' : 'recipients'} added
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/60 rounded-xl transition-colors"
                        >
                            Done
                        </button>
                        <button
                            type="button"
                            disabled={isDispatching || totalSelected === 0}
                            onClick={handleDispatchShare}
                            className={clsx(
                                "px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm",
                                isDispatching || totalSelected === 0
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95"
                            )}
                        >
                            {isDispatching ? (
                                <>
                                    <LogoLoader className="w-4 h-4 animate-spin text-white" />
                                    <span>Enqueuing (BullMQ)...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Send & Share ({totalSelected})</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShareDocumentIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
    );
}
