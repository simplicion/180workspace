'use client';

import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Search, Command, X, TrendingUp, FolderKanban, CheckSquare, Users, PieChart, Target, FileText, ChevronRight, Sparkles, Building2 } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
    id?: string;
    _id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    title?: string;
    companyName?: string;
    company?: string;
    email?: string;
    status?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    role?: string;
    stage?: string;
    industry?: string;
}

interface GroupedResults {
    leads?: SearchResult[];
    opportunities?: SearchResult[];
    projects?: SearchResult[];
    tasks?: SearchResult[];
    clients?: SearchResult[];
    companies?: SearchResult[];
    invoices?: SearchResult[];
    users?: SearchResult[];
}

export default function GlobalSearch() {
    const { platform } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GroupedResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Keyboard shortcut to open (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setQuery('');
            setResults(null);
        }
    }, [isOpen]);

    // Handle search
    useEffect(() => {
        if (query.length < 2) {
            setResults(null);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/api/search?q=${query}`);
                setResults(data.results || data);
                setSelectedIndex(0);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Get flat list of matches for keyboard navigation
    const getFlattenedResults = useCallback(() => {
        if (!results) return [];
        const flat: { id: string; type: string; label: string; sublabel?: string; href: string }[] = [];

        results.projects?.forEach(p => flat.push({ id: p.id || p.id!, type: 'Project', label: p.name!, sublabel: p.status, href: '/projects' }));
        results.tasks?.forEach(t => flat.push({ id: t.id || t.id!, type: 'Task', label: t.title!, sublabel: t.status, href: '/tasks' }));
        results.leads?.forEach(l => flat.push({ id: l.id || l.id!, type: 'Lead', label: l.name || `${l.firstName} ${l.lastName}`, sublabel: l.company, href: '/sales/deals' }));
        results.opportunities?.forEach(o => flat.push({ id: o.id || o.id!, type: 'Opportunity', label: o.title!, sublabel: o.stage, href: '/sales/leads-pipeline' }));
        results.clients?.forEach(c => flat.push({ id: c.id || c.id!, type: 'Client', label: c.name!, sublabel: c.company, href: '/clients' }));
        results.companies?.forEach(c => flat.push({ id: c.id || c.id!, type: 'Company', label: c.companyName || c.name!, sublabel: c.industry, href: '/clients' }));
        results.invoices?.forEach(i => flat.push({ id: i.id || i.id!, type: 'Invoice', label: i.invoiceNumber!, sublabel: `$${i.totalAmount}`, href: '/invoices' }));
        results.users?.forEach(u => flat.push({ id: u.id || u.id!, type: 'Member', label: u.name!, sublabel: u.role, href: '/employees' }));

        return flat;
    }, [results]);

    const flatResults = getFlattenedResults();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || flatResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % flatResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
        } else if (e.key === 'Enter') {
            const selected = flatResults[selectedIndex];
            if (selected) {
                router.push(selected.href);
                setIsOpen(false);
            }
        }
    };

    // Auto-scroll to selected item
    useEffect(() => {
        if (resultsRef.current && selectedIndex >= 0) {
            const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                aria-label="Open search"
                title="Search (Ctrl+K)"
                className="flex items-center gap-3 px-3 sm:px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-white hover:shadow-sm transition-all group w-full sm:w-64"
            >
                <Search className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" aria-hidden="true" />
                <span className="text-sm font-medium flex-1 text-left hidden sm:block">Quick Search...</span>
                <span className="text-sm font-medium flex-1 text-left sm:hidden">Search...</span>
                <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-gray-200/50 rounded text-[10px] font-bold text-gray-500" aria-hidden="true">
                    <Command className="w-2.5 h-2.5" />
                    <span>K</span>
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex sm:items-start justify-center sm:pt-[15vh] px-0 sm:px-4" role="dialog" aria-modal="true" aria-labelledby="search-modal-title">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 bg-gray-900/20 backdrop-blur-md"
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                        />

                        {/* Modal Container */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="relative w-full sm:max-w-2xl h-full sm:h-auto bg-white/95 backdrop-blur-3xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-white/50 flex flex-col overflow-hidden"
                        >
                            <h2 id="search-modal-title" className="sr-only">Global Search</h2>
                            
                            {/* Search Input Area */}
                            <div className="flex items-center px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/80 backdrop-blur-xl shrink-0 sticky top-0 z-10">
                                <Search className={clsx(
                                    "w-5 h-5 transition-colors duration-300",
                                    loading ? "text-indigo-500" : "text-gray-400"
                                )} aria-hidden="true" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search your company (projects, tasks, leads...)"
                                    aria-label="Search term"
                                    className="flex-1 bg-transparent border-none focus:ring-0 outline-none focus:outline-none text-gray-900 text-lg sm:text-base ml-4 placeholder:text-gray-400 font-medium w-full"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoComplete="off"
                                />
                                {loading ? (
                                    <LogoLoader className="w-5 h-5 text-indigo-500 animate-spin ml-3" aria-hidden="true" />
                                ) : (
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        aria-label="Close search"
                                        className="p-1.5 hover:bg-gray-200 text-gray-500 rounded-xl transition-colors ml-3"
                                    >
                                        <X className="w-5 h-5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>

                            {/* Results Area */}
                            <div
                                className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-20 sm:pb-2"
                                ref={resultsRef}
                            >
                                {!query && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="p-8 text-center space-y-4 my-8"
                                    >
                                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl flex items-center justify-center mx-auto text-indigo-500 shadow-inner border border-indigo-100/50">
                                            <Sparkles className="w-8 h-8 text-indigo-600 drop-shadow-sm" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <h3 className="text-gray-900 font-bold text-lg">What are you looking for?</h3>
                                            <p className="text-gray-500 text-sm font-medium mt-1">Search through anything in your company.</p>
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2 pt-4 max-w-sm mx-auto">
                                            {['Leads', 'Projects', 'Tasks', 'Finance', 'Clients', 'Employees'].map((tag, i) => (
                                                <motion.button 
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.1 + (i * 0.05) }}
                                                    key={tag} 
                                                    onClick={() => {
                                                        setQuery(tag);
                                                        inputRef.current?.focus();
                                                    }}
                                                    className="px-4 py-2 bg-white hover:bg-indigo-50 border border-gray-100 hover:border-indigo-100 rounded-xl text-xs font-bold text-gray-600 hover:text-indigo-600 tracking-tight transition-all shadow-sm hover:shadow active:scale-95"
                                                >
                                                    {tag}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {query.length > 0 && query.length < 2 && (
                                    <div className="p-12 text-center text-gray-400 text-sm font-medium animate-pulse">
                                        Keep typing...
                                    </div>
                                )}

                                {query.length >= 2 && flatResults.length === 0 && !loading && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-12 text-center"
                                    >
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-400 mb-3 border border-gray-100">
                                            <Search className="w-6 h-6" />
                                        </div>
                                        <p className="text-gray-500 font-medium">No results found for <span className="text-gray-900 font-bold">&quot;{query}&quot;</span></p>
                                    </motion.div>
                                )}

                                {flatResults.length > 0 && (
                                    <div className="space-y-1 p-2" role="listbox" aria-label="Search results">
                                        {flatResults.map((item, index) => {
                                            const isSelected = index === selectedIndex;
                                            return (
                                                <div
                                                    key={`${item.type}-${item.id}`}
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    className={clsx(
                                                        "flex items-center gap-4 p-3 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 border",
                                                        isSelected 
                                                            ? "bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-200 text-white translate-x-1" 
                                                            : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100 text-gray-900"
                                                    )}
                                                    onClick={() => {
                                                        router.push(item.href);
                                                        setIsOpen(false);
                                                    }}
                                                    onMouseEnter={() => setSelectedIndex(index)}
                                                >
                                                    <div className={clsx(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300",
                                                        isSelected ? "bg-indigo-500/50 text-white" : "bg-gray-100 text-gray-500"
                                                    )}>
                                                        {item.type === 'Project' && <FolderKanban className="w-5 h-5" aria-hidden="true" />}
                                                        {item.type === 'Task' && <CheckSquare className="w-5 h-5" aria-hidden="true" />}
                                                        {item.type === 'Lead' && <Target className="w-5 h-5" aria-hidden="true" />}
                                                        {item.type === 'Opportunity' && <TrendingUp className="w-5 h-5" aria-hidden="true" />}
                                                        {item.type === 'Client' && <Building2 className="w-5 h-5" aria-hidden="true" />}
                                                        {item.type === 'Invoice' && <FileText className="w-5 h-5" aria-hidden="true" />}
                                                        {item.type === 'Member' && <Users className="w-5 h-5" aria-hidden="true" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className={clsx(
                                                                "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                                                                isSelected ? "bg-indigo-400 text-white" : "bg-gray-200 text-gray-500"
                                                            )}>
                                                                {item.type}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-bold text-sm truncate leading-tight">{item.label}</h4>
                                                        {item.sublabel && (
                                                            <p className={clsx(
                                                                "text-[11px] font-medium truncate mt-0.5",
                                                                isSelected ? "text-indigo-100" : "text-gray-400"
                                                            )}>{item.sublabel}</p>
                                                        )}
                                                    </div>
                                                    {isSelected && (
                                                        <motion.div 
                                                            layoutId="enter-button"
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500 rounded-lg text-[10px] font-bold shadow-sm shrink-0" 
                                                            aria-hidden="true"
                                                        >
                                                            <span className="hidden sm:inline">Enter</span>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </motion.div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer instructions */}
                            <div className="hidden sm:flex px-6 py-4 bg-gray-50/80 backdrop-blur-md border-t border-gray-100 items-center justify-between shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="flex items-center gap-2">
                                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded-md text-[9px] font-bold text-gray-500 shadow-sm font-sans">ESC</kbd>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Close</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded-md text-[9px] font-bold text-gray-500 shadow-sm font-sans">↑↓</kbd>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Navigate</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded-md text-[9px] font-bold text-gray-500 shadow-sm font-sans">↵</kbd>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Select</span>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                                    <span>Powered by {platform?.platformName || 'System'} Search</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
