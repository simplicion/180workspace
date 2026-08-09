'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { locationService, LocationResult, FormattedLocation } from '@/lib/location-service';

interface LocationSearchProps {
    value: string;
    onChange: (location: FormattedLocation) => void;
    placeholder?: string;
    className?: string;
}

export function LocationSearch({ value, onChange, placeholder = "Search location (e.g. Delhi, India)", className = "" }: LocationSearchProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<LocationResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [debouncedQuery, setDebouncedQuery] = useState(query);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 500);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        const fetchLocations = async () => {
            if (debouncedQuery.length < 3 || debouncedQuery === value) {
                setResults([]);
                setIsOpen(false);
                return;
            }
            setIsLoading(true);
            const data = await locationService.searchLocation(debouncedQuery);
            setResults(data);
            setIsOpen(data.length > 0);
            setIsLoading(false);
        };
        fetchLocations();
    }, [debouncedQuery, value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (result: LocationResult) => {
        const formatted = locationService.parseLocationResult(result);
        setQuery(formatted.address);
        setIsOpen(false);
        onChange(formatted);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    {results.map((result, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelect(result)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0 transition-colors"
                        >
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <span className="text-sm text-gray-700 line-clamp-2">
                                {result.display_name}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
