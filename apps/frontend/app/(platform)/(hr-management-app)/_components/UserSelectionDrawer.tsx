'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { Search, X, Check, Users, Building2 } from 'lucide-react';
import api from '@/lib/api';
import clsx from 'clsx';
import { Drawer } from "@/components/ui/Drawer";

interface UserSelectionDrawerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (selectedIds: string[]) => void;
    currentIds: string[];
    type: 'employee' | 'client';
    title: string;
}

export default function UserSelectionDrawer({
    open,
    onClose,
    onSelect,
    currentIds = [],
    type,
    title
}: UserSelectionDrawerProps) {
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [selected, setSelected] = useState<string[]>(currentIds);
    const [loading, setLoading] = useState(false);

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
            } catch (error) {
                console.error('Failed to load items', error);
            } finally {
                setLoading(false);
            }
        };

        if (open) {
            setSelected(currentIds);
            loadItems();
        }
    }, [open, currentIds, type]);

    const toggleItem = (id: string) => {
        setSelected(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const filteredItems = items.filter(item =>
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        (type === 'client' && item.company?.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <Drawer open={open} onClose={onClose} title={title}>
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-50">
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

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <LogoLoader className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                            <p className="text-sm text-gray-400 font-medium">Loading items...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400">No results found</p>
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const isSelected = selected.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleItem(item.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border text-left group",
                                        isSelected
                                            ? "bg-indigo-50 border-indigo-100"
                                            : "hover:bg-gray-50 border-transparent"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold",
                                        isSelected ? "bg-indigo-500 shadow-sm" : "bg-gray-200"
                                    )}>
                                        {item.photoUrl ? (
                                            <img src={item.photoUrl} alt={item.name || 'User photo'} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            type === 'employee' ? <Users className="w-5 h-5" /> : <Building2 className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={clsx(
                                            "text-sm font-semibold truncate",
                                            isSelected ? "text-indigo-900" : "text-gray-700"
                                        )}>
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {type === 'employee' ? item.role : item.company || 'Individual Client'}
                                        </p>
                                    </div>
                                    <div className={clsx(
                                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                        isSelected ? "bg-indigo-500 border-indigo-500" : "bg-white border-gray-200 group-hover:border-indigo-300"
                                    )}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 mt-auto">
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
        </Drawer>
    );
}
