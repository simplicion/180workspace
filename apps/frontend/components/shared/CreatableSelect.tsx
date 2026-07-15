'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface CreatableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    error?: string;
    label?: string;
}

export default function CreatableSelect({ value, onChange, options: initialOptions, placeholder, error, label }: CreatableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [options, setOptions] = useState<string[]>(initialOptions);
    const containerRef = useRef<HTMLDivElement>(null);

    // Merge any existing value if it's not in the options
    useEffect(() => {
        if (value && !options.includes(value)) {
            setOptions(prev => [value, ...prev]);
        }
    }, [value, options]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(search.toLowerCase())
    );

    const showCreateOption = search.trim() !== '' && !options.some(opt => opt.toLowerCase() === search.trim().toLowerCase());

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    const handleCreate = () => {
        const newVal = search.trim();
        if (newVal) {
            setOptions(prev => [newVal, ...prev]);
            onChange(newVal);
            setIsOpen(false);
            setSearch('');
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {label && <label className="label mb-1">{label}</label>}
            
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center justify-between w-full input bg-white text-left",
                    error ? "border-red-500 focus:ring-red-500" : "focus:border-indigo-500 focus:ring-indigo-500/20",
                    !value && "text-gray-500"
                )}
            >
                <span className="truncate">{value || placeholder || "Select an option"}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
            </button>
            
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400 ml-1" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search or add new..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (filteredOptions.length > 0 && !showCreateOption) {
                                        handleSelect(filteredOptions[0]);
                                    } else if (showCreateOption) {
                                        handleCreate();
                                    }
                                }
                            }}
                            className="w-full text-sm outline-none bg-transparent placeholder-gray-400"
                        />
                    </div>
                    
                    <div className="overflow-y-auto p-1 flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleSelect(opt)}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <span className="text-gray-700">{opt}</span>
                                    {value === opt && <Check className="w-4 h-4 text-indigo-600" />}
                                </button>
                            ))
                        ) : (
                            !showCreateOption && <div className="p-3 text-sm text-gray-500 text-center">No options found</div>
                        )}
                        
                        {showCreateOption && (
                            <button
                                type="button"
                                onClick={handleCreate}
                                className="w-full text-left px-3 py-2 text-sm rounded-lg bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add <span className="font-semibold">&quot;{search.trim()}&quot;</span></span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
