'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Type, ChevronDown, Check, Search } from 'lucide-react';
import clsx from 'clsx';

export const POPULAR_GOOGLE_FONTS = [
    'Inter',
    'Outfit',
    'Roboto',
    'Plus Jakarta Sans',
    'Poppins',
    'Montserrat',
    'Open Sans',
    'Lato',
    'Playfair Display',
    'Merriweather',
    'Raleway',
    'Nunito',
    'DM Sans',
    'Manrope',
    'Space Grotesk',
    'Fira Code',
    'Geist',
    'Cinzel',
    'Lora',
    'Work Sans'
];

interface GoogleFontPickerProps {
    value: string;
    onChange: (font: string) => void;
    className?: string;
}

export function GoogleFontPicker({ value, onChange, className }: GoogleFontPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [allFonts, setAllFonts] = useState<string[]>(POPULAR_GOOGLE_FONTS);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Fetch thousands of Google font families from Fontsource API
    useEffect(() => {
        setLoading(true);
        fetch('https://api.fontsource.org/v1/fonts')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const fetched = data.map((f: any) => f.family).filter(Boolean);
                    setAllFonts(Array.from(new Set([...POPULAR_GOOGLE_FONTS, ...fetched])).sort());
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Filter fonts based on user search
    const filtered = search.trim() === ''
        ? POPULAR_GOOGLE_FONTS
        : allFonts.filter(f => f.toLowerCase().includes(search.toLowerCase())).slice(0, 60);

    // Extract clean font family name for display (e.g. "Inter, sans-serif" -> "Inter")
    const cleanFontName = (value || 'Inter').split(',')[0].replace(/['"]/g, '').trim();

    // Dynamically inject Google Font into <head> when selected
    const handleSelectFont = (font: string) => {
        onChange(`'${font}', sans-serif`);
        setOpen(false);
        setSearch('');

        // Dynamically inject link tag for real-time preview
        const linkId = `google-font-${font.replace(/\s+/g, '-').toLowerCase()}`;
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
            document.head.appendChild(link);
        }
    };

    return (
        <div className={clsx("relative w-full", className)} ref={ref}>
            {/* Trigger Button */}
            <div
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xs cursor-pointer hover:border-blue-500 transition-colors"
            >
                <div className="flex items-center gap-2 truncate">
                    <Type className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span 
                        className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate"
                        style={{ fontFamily: `'${cleanFontName}', sans-serif` }}
                    >
                        {cleanFontName}
                    </span>
                </div>
                <ChevronDown className={clsx("w-3.5 h-3.5 text-gray-400 transition-transform duration-200", open && "rotate-180")} />
            </div>

            {/* Searchable Dropdown Menu */}
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-72 animate-in fade-in-50 duration-150">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search Google Fonts..."
                                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-slate-200 placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {/* Fonts List */}
                    <div className="overflow-y-auto flex-1 p-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {search.trim() === '' && (
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                Popular Fonts
                            </div>
                        )}
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">No fonts found</div>
                        ) : (
                            filtered.map(font => {
                                const isSelected = cleanFontName.toLowerCase() === font.toLowerCase();
                                return (
                                    <div
                                        key={font}
                                        onClick={() => handleSelectFont(font)}
                                        className={clsx(
                                            "px-3 py-2 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors",
                                            isSelected 
                                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold" 
                                                : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <span style={{ fontFamily: `'${font}', sans-serif` }}>
                                            {font}
                                        </span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
