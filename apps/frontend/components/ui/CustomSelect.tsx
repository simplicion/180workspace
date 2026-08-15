'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
    label: string;
    value: string;
}

export interface CustomSelectProps {
    value: any;
    onChange: any;
    options?: (string | SelectOption)[];
    placeholder?: string;
    error?: string;
    label?: string;
    searchable?: boolean;
    creatable?: boolean;
    className?: string;
    children?: React.ReactNode;
    id?: string;
    title?: string;
    required?: boolean;
}

export default function CustomSelect({ 
    value, 
    onChange, 
    options = [], 
    placeholder = "Select an option", 
    error, 
    label,
    searchable = false,
    creatable = false,
    className,
    children,
    id,
    title,
    required
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Normalize options to { label, value } objects
    let normalizedOptions: SelectOption[] = options.map(opt => 
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    // Extract options from children if provided (backwards compatibility for native <CustomSelect> replacements)
    if (children) {
        React.Children.toArray(children).forEach((child: any) => {
            if (React.isValidElement(child) && child.type === 'option') {
                normalizedOptions.push({
                    value: child.props.value !== undefined ? child.props.value : String(child.props.children),
                    label: child.props.children as string
                });
            }
        });
    }

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = normalizedOptions.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const exactMatchExists = normalizedOptions.some(
        opt => opt.label.toLowerCase() === search.toLowerCase()
    );

    const handleSelect = (val: string) => {
        // Create a hybrid object that acts as a string and an Event object
        // to support both onChange(val) and onChange(e => e.target.value)
        const hybridVal = new String(val) as any;
        hybridVal.target = { value: val };
        
        onChange(hybridVal);
        setIsOpen(false);
        setSearch('');
    };

    // Find the selected option to display its label.
    // Ensure we do a string comparison by coercing `value` to a primitive string!
    const primitiveValue = value != null ? String(value) : value;
    const selectedOption = normalizedOptions.find(opt => opt.value === primitiveValue);
    const displayValue = selectedOption ? selectedOption.label : (primitiveValue || placeholder);

    return (
        <div className={clsx("relative w-full", className)} ref={containerRef}>
            {label && <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">{label}</label>}
            
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setSearch('');
                }}
                className={clsx(
                    "flex items-center justify-between w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-left transition-all outline-none",
                    error ? "border-red-500 focus:ring-2 focus:ring-red-500/20" : "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
                    !primitiveValue && "text-gray-500"
                )}
            >
                <span className="truncate">{displayValue}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
            </button>
            
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col">
                    {searchable && (
                        <div className="p-2 border-b border-gray-100 flex items-center gap-2">
                            <Search className="w-4 h-4 text-gray-400 ml-1" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-sm outline-none bg-transparent placeholder-gray-400"
                            />
                        </div>
                    )}
                    
                    <div className="overflow-y-auto p-1 flex-1">
                        {filteredOptions.length > 0 && (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleSelect(opt.value)}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <span className={clsx("text-gray-700", primitiveValue === opt.value && "font-medium text-indigo-700")}>{opt.label}</span>
                                    {primitiveValue === opt.value && <Check className="w-4 h-4 text-indigo-600" />}
                                </button>
                            ))
                        )}
                        
                        {creatable && search.trim() !== '' && !exactMatchExists && (
                            <button
                                type="button"
                                onClick={() => handleSelect(search.trim())}
                                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-indigo-50 text-indigo-700 font-medium flex items-center gap-2"
                            >
                                <span className="opacity-75">Create</span> &quot;{search.trim()}&quot;
                            </button>
                        )}

                        {filteredOptions.length === 0 && (!creatable || search.trim() === '') && (
                            <div className="p-3 text-sm text-gray-500 text-center">No options found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
