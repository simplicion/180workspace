'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Country } from 'country-state-city';
import { locationService } from '@/lib/location-service';
import { ChevronDown, Search, Check, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

export interface CountryData {
  name: string;
  isoCode: string;
  phonecode: string;
  flag?: string;
}

export interface CountryPhoneInputProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (fullNumber: string, details?: { countryCode: string; dialCode: string; nationalNumber: string; isValid: boolean }) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  companyCountry?: string; // Fallback country from form creator / company profile
  error?: string;
  autoDetectLocation?: boolean;
}

const POPULAR_ISO_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'NP', 'SG', 'DE', 'FR'];

export default function CountryPhoneInput({
  id,
  name,
  value = '',
  onChange,
  required = false,
  disabled = false,
  placeholder = '10-digit mobile number',
  className = '',
  companyCountry,
  error: externalError,
  autoDetectLocation = true
}: CountryPhoneInputProps) {
  // ── Load All Countries from country-state-city (Zero hardcoding) ───────────
  const allCountries: CountryData[] = useMemo(() => {
    return Country.getAllCountries().map(c => ({
      name: c.name,
      isoCode: c.isoCode,
      phonecode: c.phonecode.replace(/^\+/, ''),
      flag: c.flag
    }));
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(() => {
    return allCountries.find(c => c.isoCode === 'IN') || 
           allCountries.find(c => c.isoCode === 'US') || 
           allCountries[0];
  });

  const [nationalNumber, setNationalNumber] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isTouched, setIsTouched] = useState<boolean>(false);
  const [popoverDirection, setPopoverDirection] = useState<'down' | 'up'>('down');
  const [activeHighlightIndex, setActiveHighlightIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Parse Initial Value ───────────────────────────────────────────────────
  useEffect(() => {
    if (!value) return;

    if (value.startsWith('+')) {
      const trimmed = value.slice(1).trim();
      const matched = allCountries
        .filter(c => trimmed.startsWith(c.phonecode))
        .sort((a, b) => b.phonecode.length - a.phonecode.length)[0];

      if (matched) {
        setSelectedCountry(matched);
        const rest = trimmed.slice(matched.phonecode.length).replace(/\D/g, '').slice(0, 10);
        setNationalNumber(rest);
        return;
      }
    }

    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    setNationalNumber(digitsOnly);
  }, [value, allCountries]);

  // ── Auto-Detect Country from User IP / Location, then Company Country ───────
  useEffect(() => {
    let isMounted = true;

    async function detectCountry() {
      if (!autoDetectLocation) return;
      
      try {
        const userLoc = await locationService.getCurrentLocation();
        if (userLoc?.countryCode && isMounted) {
          const match = allCountries.find(c => c.isoCode.toUpperCase() === userLoc.countryCode.toUpperCase());
          if (match) {
            setSelectedCountry(match);
            return;
          }
        }
      } catch (err) {
        console.warn('User location detection fallback:', err);
      }

      if (companyCountry && isMounted) {
        const compClean = companyCountry.trim().toUpperCase();
        const compMatch = allCountries.find(c => 
          c.isoCode.toUpperCase() === compClean || 
          c.name.toUpperCase() === compClean
        );
        if (compMatch) {
          setSelectedCountry(compMatch);
        }
      }
    }

    detectCountry();

    return () => {
      isMounted = false;
    };
  }, [autoDetectLocation, companyCountry, allCountries]);

  // ── Smart Direction Detection (Pop UP if near screen bottom) ──────────────
  const updateDropdownPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 280 && rect.top > 280) {
      setPopoverDirection('up');
    } else {
      setPopoverDirection('down');
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updateDropdownPosition();
      setIsOpen(true);
      setActiveHighlightIndex(0);
    } else {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // ── Close Dropdown on Click Outside ───────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        containerRef.current && !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, []);

  // ── Focus Search Input When Dropdown Opens ────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // ── Search & Strict Dial Code Prioritization ──────────────────────────────
  // Solves the issue where searching "+91" matched Bolivia (+591) and Eritrea (+291)
  const filteredCountries = useMemo(() => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return allCountries;

    const q = rawQuery.toLowerCase();
    const isDialSearch = rawQuery.startsWith('+') || /^\d+$/.test(rawQuery);
    const dialDigits = rawQuery.replace(/\D/g, '');

    if (isDialSearch && dialDigits) {
      const exactMatches: CountryData[] = [];
      const prefixMatches: CountryData[] = [];
      const nameMatches: CountryData[] = [];

      for (const c of allCountries) {
        if (c.phonecode === dialDigits) {
          exactMatches.push(c);
        } else if (c.phonecode.startsWith(dialDigits)) {
          prefixMatches.push(c);
        } else if (c.name.toLowerCase().includes(q)) {
          nameMatches.push(c);
        }
      }

      // Exact matches come FIRST (e.g. +91 -> India (+91) is #1!)
      return [
        ...exactMatches.sort((a, b) => a.name.localeCompare(b.name)),
        ...prefixMatches.sort((a, b) => a.name.localeCompare(b.name)),
        ...nameMatches.sort((a, b) => a.name.localeCompare(b.name))
      ];
    }

    // Text name / ISO code search
    return allCountries
      .filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase() === q ||
        c.isoCode.toLowerCase().startsWith(q) ||
        c.phonecode.startsWith(q)
      )
      .sort((a, b) => {
        // Exact ISO match first (e.g. "IN" -> India)
        if (a.isoCode.toLowerCase() === q && b.isoCode.toLowerCase() !== q) return -1;
        if (b.isoCode.toLowerCase() === q && a.isoCode.toLowerCase() !== q) return 1;

        // Name starts with query first
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        return a.name.localeCompare(b.name);
      });
  }, [allCountries, searchQuery]);

  // ── Keyboard Navigation (Arrow keys, Enter, Escape) ───────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        toggleDropdown();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveHighlightIndex(prev => Math.min(filteredCountries.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveHighlightIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCountries[activeHighlightIndex]) {
        handleSelectCountry(filteredCountries[activeHighlightIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
      phoneInputRef.current?.focus();
    }
  };

  // ── Format Display Number (e.g. 5 digits space 5 digits) ─────────────────
  const formatDisplayDigits = (digits: string): string => {
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  };

  // ── Validation: Exactly 10 digits required ────────────────────────────────
  const isValid = nationalNumber.length === 10;
  const hasFormatError = isTouched && nationalNumber.length > 0 && nationalNumber.length < 10;
  const showError = Boolean(externalError) || hasFormatError;
  const isComplete = isValid && !externalError;
  const errorMessage = externalError || (hasFormatError ? `Please enter a 10-digit mobile number after country code (${nationalNumber.length}/10 digits entered).` : '');

  // ── Handle Number Input Change ────────────────────────────────────────────
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const clean10 = raw.slice(0, 10);
    setNationalNumber(clean10);

    const fullVal = clean10 ? `+${selectedCountry.phonecode} ${clean10}` : '';
    if (onChange) {
      onChange(fullVal, {
        countryCode: selectedCountry.isoCode,
        dialCode: `+${selectedCountry.phonecode}`,
        nationalNumber: clean10,
        isValid: clean10.length === 10
      });
    }
  };

  // ── Handle Country Selection ──────────────────────────────────────────────
  const handleSelectCountry = (country: CountryData) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery('');

    const fullVal = nationalNumber ? `+${country.phonecode} ${nationalNumber}` : '';
    if (onChange) {
      onChange(fullVal, {
        countryCode: country.isoCode,
        dialCode: `+${country.phonecode}`,
        nationalNumber,
        isValid: nationalNumber.length === 10
      });
    }

    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 50);
  };

  // ── Flag Component with Crisp High-Res Image + Emoji Fallback ─────────────
  const renderFlag = (iso: string, emoji?: string, className = "w-5 h-3.5") => {
    const lowerIso = iso.toLowerCase();
    return (
      <span className={clsx("inline-flex items-center justify-center shrink-0 overflow-hidden rounded-[2px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs", className)}>
        <img
          src={`https://flagcdn.com/w40/${lowerIso}.png`}
          alt={iso}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <span className="text-xs select-none leading-none font-mono hidden">{emoji || iso}</span>
      </span>
    );
  };

  return (
    <div className={clsx("w-full space-y-1.5 relative", className)} ref={containerRef}>
      <div 
        className={clsx(
          "relative flex items-center rounded-xl transition-all border",
          disabled && "opacity-60 pointer-events-none bg-zinc-100 dark:bg-zinc-800",
          showError 
            ? "border-red-400 dark:border-red-500/80 bg-red-50/30 dark:bg-red-950/20 ring-2 ring-red-500/20" 
            : isComplete
              ? "border-emerald-400 dark:border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10"
              : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white dark:focus-within:bg-zinc-800"
        )}
      >
        {/* ── COUNTRY SELECTOR BUTTON (Beside the number field) ── */}
        <button
          type="button"
          disabled={disabled}
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          className={clsx(
            "h-11 px-3 flex items-center gap-2 border-r border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100/80 dark:hover:bg-zinc-700/60 transition-colors rounded-l-xl focus:outline-none select-none shrink-0 cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200"
          )}
          title={`Country: ${selectedCountry.name} (+${selectedCountry.phonecode})`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {renderFlag(selectedCountry.isoCode, selectedCountry.flag)}
          <span className="font-bold text-[11px] text-zinc-600 dark:text-zinc-300 font-mono tracking-tight">
            {selectedCountry.isoCode}
          </span>
          <span className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
            +{selectedCountry.phonecode}
          </span>
          <ChevronDown className={clsx("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        {/* ── 10-DIGIT NUMBER INPUT FIELD ── */}
        <div className="relative flex-1 flex items-center min-w-0">
          <input
            ref={phoneInputRef}
            id={id}
            name={name}
            type="tel"
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            value={formatDisplayDigits(nationalNumber)}
            onChange={handleNumberChange}
            onBlur={() => setIsTouched(true)}
            maxLength={11} // Accounts for 1 space separator in 10 digits
            className="w-full h-11 px-3.5 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none font-medium tracking-wide"
          />

        </div>
      </div>

      {/* ── FULL-WIDTH INTEGRATED COUNTRY DROPDOWN POPOVER ── */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={clsx(
            "absolute left-0 right-0 z-[9999] w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-black/25 dark:shadow-black/70 overflow-hidden animate-in fade-in zoom-in-95 duration-150",
            popoverDirection === 'up' ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
          role="listbox"
        >
          {/* Search Header */}
          <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-850/90 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search country name or code (e.g. +91, India)..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Suggestion Chips (When search is empty) */}
          {!searchQuery && (
            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mr-1 shrink-0">Popular:</span>
              {POPULAR_ISO_CODES.map(iso => {
                const c = allCountries.find(x => x.isoCode === iso);
                if (!c) return null;
                const isCurrent = c.isoCode === selectedCountry.isoCode;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    className={clsx(
                      "px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer",
                      isCurrent 
                        ? "bg-indigo-600 text-white font-bold shadow-xs" 
                        : "bg-white dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    {renderFlag(c.isoCode, c.flag, "w-4 h-3")}
                    <span>+{c.phonecode}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Country List */}
          <div 
            ref={listRef}
            className="max-h-64 sm:max-h-72 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin divide-y divide-zinc-50 dark:divide-zinc-800/40"
          >
            {filteredCountries.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">No countries match &quot;{searchQuery}&quot;</p>
                <p className="text-[11px] text-zinc-400 mt-1">Try searching by dialing code like &quot;+91&quot; or country name</p>
              </div>
            ) : (
              filteredCountries.map((c, idx) => {
                const isSelected = c.isoCode === selectedCountry.isoCode;
                const isHighlighted = idx === activeHighlightIndex;
                return (
                  <button
                    key={`${c.isoCode}-${c.phonecode}`}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    onMouseEnter={() => setActiveHighlightIndex(idx)}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2.5 text-left text-xs rounded-xl transition-all cursor-pointer min-h-[42px]",
                      isSelected 
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold" 
                        : isHighlighted
                          ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {renderFlag(c.isoCode, c.flag, "w-5 h-3.5")}
                      <span className="truncate text-xs font-medium">{c.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0 font-semibold uppercase">({c.isoCode})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-zinc-800 dark:text-zinc-200 font-bold text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        +{c.phonecode}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── INLINE VALIDATION MESSAGE ── */}
      {showError && errorMessage && (
        <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 pl-1 animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
