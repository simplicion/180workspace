'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
    label: string;
    value: string;
    displayLabel?: string;
    icon?: React.ReactNode;
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
    name?: string;
    title?: string;
    style?: React.CSSProperties;
    required?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    activeHighlight?: boolean;
    clearable?: boolean;
    onClear?: () => void;
}

export default function CustomSelect({ 
    value, 
    onChange, 
    options = [], 
    placeholder = "Select an option", 
    error, 
    label,
    searchable = true,
    creatable = false,
    className,
    children,
    id,
    name,
    title,
    style,
    required,
    disabled,
    size = 'md',
    icon,
    activeHighlight = false,
    clearable = false,
    onClear,
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
    const isSelected = Boolean(primitiveValue && primitiveValue !== '' && primitiveValue !== '7d');

    const handleSelect = (val: string) => {
        const hybridVal = new String(val) as any;
        hybridVal.target = { value: val };
        
        onChange(hybridVal);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClear) {
            onClear();
        } else {
            handleSelect('');
        }
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

    const hasExplicitWidth = className && /(^|\s)(w-|min-w-|max-w-)/.test(className);

    return (
        <div className={clsx("relative", !hasExplicitWidth && "w-full", className)} ref={containerRef}>
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
                    "flex items-center justify-between w-full rounded-xl border text-left transition-all outline-none cursor-pointer select-none",
                    size === 'sm' ? "px-2.5 py-1.5 text-xs min-h-[34px]" : "px-3.5 py-2 text-sm min-h-[40px]",
                    isOpen 
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-900" 
                        : (activeHighlight && isSelected
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 font-medium shadow-2xs"
                            : "bg-white dark:bg-slate-900 border-gray-200/90 dark:border-slate-800 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50/60 dark:hover:bg-slate-800/60"
                        ),
                    error ? "border-red-500" : "",
                    disabled && "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-800/50"
                )}
            >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                    {icon && <span className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>}
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
                            "w-full outline-none bg-transparent truncate cursor-pointer",
                            !primitiveValue && !isOpen && "text-gray-400 dark:text-gray-500",
                            size === 'sm' ? "text-xs" : "text-sm"
                        )}
                    />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {clearable && isSelected && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                            title="Clear"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                    <ChevronDown 
                        className={clsx("w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} 
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
            </div>
            
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 min-w-full w-max max-w-[290px] left-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100">
                    <div className="overflow-y-auto p-1 flex-1">
                        {filteredOptions.length > 0 && (
                            filteredOptions.map((opt, idx) => {
                                const isOptSelected = primitiveValue === opt.value;
                                return (
                                    <button
                                        key={`${opt.value}-${opt.label}-${idx}`}
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        className={clsx(
                                            "w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors whitespace-nowrap cursor-pointer",
                                            isOptSelected ? "bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold" : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5 truncate">
                                            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                                            <span className="truncate">{opt.label}</span>
                                        </div>
                                        {isOptSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
                                    </button>
                                );
                            })
                        )}
                        
                        {creatable && search.trim() !== '' && !exactMatchExists && (
                            <button
                                type="button"
                                onClick={() => handleSelect(search.trim())}
                                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2 cursor-pointer"
                            >
                                <span className="opacity-75">Create</span> &quot;{search.trim()}&quot;
                            </button>
                        )}

                        {filteredOptions.length === 0 && (!creatable || search.trim() === '') && (
                            <div className="p-3 text-xs text-gray-500 dark:text-gray-400 text-center">No options found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
