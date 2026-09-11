'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
    label: string;
    value: string;
    displayLabel?: string;
}

export interface CustomSelectProps {
    value?: any;
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
    disabled?: boolean;
}

export default function CustomSelect({ 
    value, 
    onChange, 
    options = [], 
    placeholder = "Select an option", 
    error, 
    label,
    searchable = true, // Implicitly true for the combobox behavior
    creatable = false,
    className,
    children,
    id,
    title,
    required,
    disabled
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Normalize options to { label, value } objects
    const normalizedOptions: SelectOption[] = options.map(opt => 
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    // Extract options from children if provided
    if (children) {
        React.Children.toArray(children).forEach((child: any) => {
            if (React.isValidElement(child) && child.type === 'option') {
                const props = child.props as any;
                normalizedOptions.push({
                    value: props.value !== undefined ? props.value : String(props.children),
                    label: props.children as string
                });
            }
        });
    }

    const primitiveValue = value != null ? String(value) : '';
    const selectedOption = normalizedOptions.find(opt => opt.value === primitiveValue);
    const displayValue = selectedOption ? (selectedOption.displayLabel || selectedOption.label) : (primitiveValue || '');

    const handleSelect = (val: string) => {
        const hybridVal = new String(val) as any;
        hybridVal.target = { value: val };
        
        onChange(hybridVal);
        setIsOpen(false);
        setSearch('');
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (isOpen) {
                    if (creatable && search.trim() && search.trim() !== primitiveValue) {
                        handleSelect(search.trim());
                    } else {
                        setIsOpen(false);
                        setSearch('');
                    }
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, search, creatable, primitiveValue]);

    const query = search.trim().toLowerCase();
    const filteredOptions = query 
        ? normalizedOptions.filter(opt => 
            String(opt.label ?? '').toLowerCase().includes(query)
        ).sort((a, b) => {
            const labelA = String(a.label ?? '').toLowerCase();
            const labelB = String(b.label ?? '').toLowerCase();
            const aStarts = labelA.startsWith(query);
            const bStarts = labelB.startsWith(query);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return 0;
        })
        : normalizedOptions;

    const exactMatchExists = normalizedOptions.some(
        opt => String(opt.label ?? '').toLowerCase() === query
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setSearch(newVal);
        if (!isOpen) setIsOpen(true);
        if (creatable) {
            const hybridVal = new String(newVal) as any;
            hybridVal.target = { value: newVal };
            onChange(hybridVal);
        }
    };

    return (
        <div className={clsx("relative w-full", className)} ref={containerRef}>
            {label && <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">{label}</label>}
            
            {/* Trigger Input */}
            <div
                onClick={() => {
                    if (disabled) return;
                    if (!isOpen) {
                        setIsOpen(true);
                        setSearch('');
                    }
                    inputRef.current?.focus();
                }}
                className={clsx(
                    "flex items-center justify-between w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-left transition-all outline-none cursor-pointer",
                    isOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : "",
                    error ? "border-red-500" : "hover:border-gray-300",
                    disabled && "opacity-50 cursor-not-allowed bg-gray-50"
                )}
            >
                <input
                    ref={inputRef}
                    id={id}
                    title={title}
                    required={required}
                    disabled={disabled}
                    type="text"
                    placeholder={isOpen ? (displayValue || placeholder) : placeholder}
                    value={isOpen ? search : displayValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (!disabled) {
                            setIsOpen(true);
                            setSearch('');
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (search.trim()) {
                                const matched = filteredOptions.find(o => String(o.label).toLowerCase() === search.trim().toLowerCase());
                                if (matched) {
                                    handleSelect(matched.value);
                                } else if (creatable) {
                                    handleSelect(search.trim());
                                } else if (filteredOptions.length > 0) {
                                    handleSelect(filteredOptions[0].value);
                                }
                            } else if (filteredOptions.length > 0) {
                                handleSelect(filteredOptions[0].value);
                            }
                        } else if (e.key === 'Escape') {
                            setIsOpen(false);
                            setSearch('');
                        }
                    }}
                    className={clsx(
                        "w-full outline-none bg-transparent truncate cursor-text",
                        !primitiveValue && !isOpen && "text-gray-500"
                    )}
                />
                <ChevronDown 
                    className={clsx("w-4 h-4 text-gray-400 ml-2 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (disabled) return;
                        if (!isOpen) {
                            setIsOpen(true);
                            setSearch('');
                            inputRef.current?.focus();
                        } else {
                            setIsOpen(false);
                            setSearch('');
                        }
                    }} 
                />
            </div>
            
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="overflow-y-auto p-1 flex-1">
                        {filteredOptions.length > 0 && (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = primitiveValue === opt.value;
                                return (
                                    <button
                                        key={`${opt.value}-${opt.label}-${idx}`}
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors",
                                            isSelected ? "bg-indigo-50/70 text-indigo-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                                    </button>
                                );
                            })
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
