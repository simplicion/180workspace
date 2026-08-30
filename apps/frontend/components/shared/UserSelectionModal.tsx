'use client';

import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, Users, Building2 } from 'lucide-react';
import api from '@/lib/api';
import clsx from 'clsx';

interface UserSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (selectedIds: string[]) => void;
    currentIds: string[];
    type: 'employee' | 'client';
    title: string;
}

export default function UserSelectionModal({
    isOpen,
    onClose,
    onSelect,
    currentIds = [],
    type,
    title
}: UserSelectionModalProps) {
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [selected, setSelected] = useState<string[]>(currentIds);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const loadItems = async () => {
            setLoading(true);
            try {
                if (type === 'employee') {
                    const { data } = await api.get('/api/users');
                    setItems(data.users);
                } else {
                    const { data } = await api.get('/api/clients');
                    setItems(data.clients);
                }
            } catch (err) {
                console.error("Failed to load users for selection", err);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            loadItems();
            setSelected(currentIds);
        }
    }, [isOpen, type, currentIds]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const filteredItems = items.filter(item =>
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        (type === 'client' && item.company?.toLowerCase().includes(search.toLowerCase()))
    );

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-50 dark:border-gray-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={`Search ${type === 'employee' ? 'employees' : 'clients'}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-10"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <LogoLoader className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                            <p className="text-sm text-gray-400 font-medium">Loading items...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                            No {type === 'employee' ? 'team members' : 'clients'} found.
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const isSelected = selected.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelected(selected.filter(id => id !== item.id));
                                        } else {
                                            setSelected([...selected, item.id]);
                                        }
                                    }}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left group",
                                        isSelected ? "bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm",
                                            isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                        )}>
                                            {item.name?.[0] || (type === 'employee' ? <Users className="w-4 h-4" /> : <Building2 className="w-4 h-4" />)}
                                        </div>
                                        <div>
                                            <p className={clsx(
                                                "text-sm font-semibold truncate",
                                                isSelected ? "text-indigo-900 dark:text-indigo-200" : "text-gray-700 dark:text-gray-300"
                                            )}>
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">
                                                {type === 'employee' ? item.role : item.company || 'Individual Client'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                        isSelected ? "bg-indigo-500 border-indigo-500" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 group-hover:border-indigo-300"
                                    )}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-850 rounded-b-2xl">
                    <p className="text-xs text-gray-500 font-medium">
                        {selected.length} selected
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="btn-secondary py-2">Cancel</button>
                        <button
                            onClick={() => onSelect(selected)}
                            className="btn-primary py-2 px-6"
                            disabled={loading}
                        >
                            Confirm Selection
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
