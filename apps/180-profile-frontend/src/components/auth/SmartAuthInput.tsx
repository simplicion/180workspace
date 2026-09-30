'use strict';
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Phone,
  Mail,
  Search,
  ChevronDown,
  Check,
  Smartphone,
  Sparkles,
  MessageSquare,
  Globe,
} from 'lucide-react';

export interface CountryInfo {
  code: string; // ISO 2-letter
  name: string;
  dialCode: string; // e.g. "+91"
  flag: string; // emoji flag
  format?: string; // placeholder format
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', format: '98765 43210' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', format: '(555) 000-0000' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', format: '7911 123456' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', format: '(555) 000-0000' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', format: '50 123 4567' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', format: '8123 4567' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', format: '412 345 678' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', format: '151 23456789' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', format: '6 12 34 56 78' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', format: '50 123 4567' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', format: '3312 3456' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', format: '5123 4567' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', format: '9123 4567' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', format: '3600 1234' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', format: '984 1234567' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', format: '1712 345678' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', format: '71 234 5678' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', format: '300 1234567' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', format: '12 345 6789' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', format: '812 3456 7890' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', format: '917 123 4567' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', format: '81 234 5678' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', format: '91 234 5678' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', format: '90 1234 5678' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', format: '10 1234 5678' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', format: '138 0000 0000' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', format: '9123 4567' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼', format: '912 345 678' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', format: '21 123 4567' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', format: '71 234 5678' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', format: '802 123 4567' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', format: '712 345678' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', format: '10 1234 5678' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', format: '11 91234 5678' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', format: '55 1234 5678' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', format: '312 345 6789' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', format: '612 34 56 78' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', format: '6 12345678' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', format: '78 123 45 67' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', format: '70 123 45 67' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', format: '412 34 567' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', format: '20 12 34 56' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', format: '83 123 4567' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱', format: '512 345 678' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', format: '912 345 678' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷', format: '691 234 5678' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', format: '501 234 5678' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', format: '50 123 4567' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', format: '912 345-67-89' },
];

/**
 * Infer Country from Timezone or Browser Locale
 */
export function detectLocalCountry(): CountryInfo {
  if (typeof window === 'undefined') {
    return COUNTRIES[0]; // Default India
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const tzLower = tz.toLowerCase();

    if (tzLower.includes('calcutta') || tzLower.includes('kolkata') || tzLower.includes('india')) {
      return COUNTRIES.find((c) => c.code === 'IN') || COUNTRIES[0];
    }
    if (tzLower.includes('kathmandu') || tzLower.includes('nepal')) {
      return COUNTRIES.find((c) => c.code === 'NP') || COUNTRIES[0];
    }
    if (tzLower.includes('dhaka')) {
      return COUNTRIES.find((c) => c.code === 'BD') || COUNTRIES[0];
    }
    if (tzLower.includes('colombo')) {
      return COUNTRIES.find((c) => c.code === 'LK') || COUNTRIES[0];
    }
    if (tzLower.includes('dubai')) {
      return COUNTRIES.find((c) => c.code === 'AE') || COUNTRIES[0];
    }
    if (tzLower.includes('riyadh')) {
      return COUNTRIES.find((c) => c.code === 'SA') || COUNTRIES[0];
    }
    if (tzLower.includes('singapore')) {
      return COUNTRIES.find((c) => c.code === 'SG') || COUNTRIES[0];
    }
    if (tzLower.includes('london')) {
      return COUNTRIES.find((c) => c.code === 'GB') || COUNTRIES[0];
    }
    if (tzLower.includes('paris')) {
      return COUNTRIES.find((c) => c.code === 'FR') || COUNTRIES[0];
    }
    if (tzLower.includes('berlin')) {
      return COUNTRIES.find((c) => c.code === 'DE') || COUNTRIES[0];
    }
    if (tzLower.includes('sydney') || tzLower.includes('melbourne') || tzLower.includes('perth') || tzLower.includes('brisbane')) {
      return COUNTRIES.find((c) => c.code === 'AU') || COUNTRIES[0];
    }
    if (tzLower.includes('auckland')) {
      return COUNTRIES.find((c) => c.code === 'NZ') || COUNTRIES[0];
    }
    if (tzLower.includes('tokyo')) {
      return COUNTRIES.find((c) => c.code === 'JP') || COUNTRIES[0];
    }
    if (tzLower.includes('seoul')) {
      return COUNTRIES.find((c) => c.code === 'KR') || COUNTRIES[0];
    }
    if (
      tzLower.includes('new_york') ||
      tzLower.includes('chicago') ||
      tzLower.includes('los_angeles') ||
      tzLower.includes('denver') ||
      tzLower.includes('phoenix') ||
      tzLower.includes('detroit')
    ) {
      return COUNTRIES.find((c) => c.code === 'US') || COUNTRIES[0];
    }
    if (tzLower.includes('toronto') || tzLower.includes('vancouver') || tzLower.includes('montreal')) {
      return COUNTRIES.find((c) => c.code === 'CA') || COUNTRIES[0];
    }

    // Locale fallback (e.g. en-IN, en-US, en-GB)
    const lang = (navigator.language || '').toUpperCase();
    for (const c of COUNTRIES) {
      if (lang.endsWith(`-${c.code}`)) {
        return c;
      }
    }
  } catch (_) {}

  return COUNTRIES[0]; // Default India (+91)
}

interface SmartAuthInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  showBadge?: boolean;
}

export const SmartAuthInput: React.FC<SmartAuthInputProps> = ({
  value,
  onChange,
  placeholder,
  label,
  required = true,
  autoFocus = false,
  disabled = false,
  id = 'smart-auth-input',
  className = '',
  showBadge = true,
}) => {
  // Selected Country for phone mode
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(COUNTRIES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detectedLocationName, setDetectedLocationName] = useState<string>('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect local country on mount
  useEffect(() => {
    const detected = detectLocalCountry();
    setSelectedCountry(detected);
    setDetectedLocationName(detected.name);
  }, []);

  // Determine if current text represents a phone number or email
  const isPhoneMode = useMemo(() => {
    const trimmed = (value || '').trim();
    if (!trimmed) return false;

    // If starts with + or has only digits, spaces, parentheses, hyphens
    if (trimmed.startsWith('+')) return true;
    if (/[a-zA-Z@]/.test(trimmed)) return false;
    return /^[\d\s\-().]+$/.test(trimmed);
  }, [value]);

  // Extract display value for input
  const displayValue = useMemo(() => {
    if (!isPhoneMode) return value;

    // If it starts with the selected dial code, strip it for a cleaner visual representation
    // OR if user typed raw digits, show them
    const dialDigits = selectedCountry.dialCode.replace(/[^\d]/g, '');
    const cleanDigits = value.replace(/[^\d]/g, '');

    if (value.startsWith(selectedCountry.dialCode)) {
      return value.slice(selectedCountry.dialCode.length).trim();
    }
    if (value.startsWith(`+${dialDigits}`)) {
      return value.slice(dialDigits.length + 1).trim();
    }
    if (cleanDigits.startsWith(dialDigits) && cleanDigits.length > dialDigits.length) {
      return cleanDigits.slice(dialDigits.length);
    }
    return value;
  }, [value, isPhoneMode, selectedCountry]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Filter countries by search
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Handle typing inside text input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // Check if user is typing phone digits
    const trimmed = rawVal.trim();
    const hasAlphaOrAt = /[a-zA-Z@]/.test(trimmed);

    if (trimmed.startsWith('+')) {
      // Check if user pasted an international number with a known country dial code
      const matchedCountry = COUNTRIES.find((c) => trimmed.startsWith(c.dialCode));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
      }
      onChange(rawVal);
      return;
    }

    if (!hasAlphaOrAt && /^\d+[\d\s\-().]*$/.test(trimmed)) {
      // User is typing phone numbers!
      // Normalize to full E.164 with selected dial code
      const cleanDigits = rawVal.replace(/[^\d]/g, '');
      const dialDigits = selectedCountry.dialCode.replace(/[^\d]/g, '');

      // If user typed dial code manually without +
      if (cleanDigits.startsWith(dialDigits) && cleanDigits.length > dialDigits.length) {
        onChange(`+${cleanDigits}`);
      } else {
        onChange(`${selectedCountry.dialCode}${cleanDigits}`);
      }
      return;
    }

    // Email or username mode
    onChange(rawVal);
  };

  // Switch to phone mode explicitly or change country
  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery('');

    // If there is existing phone value, update its country prefix
    if (isPhoneMode) {
      const cleanDigits = value.replace(/[^\d]/g, '');
      const oldDialDigits = selectedCountry.dialCode.replace(/[^\d]/g, '');
      let national = cleanDigits;

      if (cleanDigits.startsWith(oldDialDigits) && cleanDigits.length > oldDialDigits.length) {
        national = cleanDigits.slice(oldDialDigits.length);
      }
      onChange(`${country.dialCode}${national}`);
    }

    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-xs font-bold text-slate-700">
            {label}
          </label>
          {showBadge && (
            <div className="flex items-center gap-1.5">
              {isPhoneMode ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 animate-in fade-in duration-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                  <span>WhatsApp OTP</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                  <Mail className="w-3 h-3 text-blue-600" />
                  <span>Email / Phone</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input Box with Integrated Left-Side Country Selector */}
      <div className="relative flex items-center">
        {/* Country Code Trigger (Always visible or turns into selector) */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            aria-label="Select Country Code"
            className={`h-[42px] px-2.5 rounded-l-xl flex items-center gap-1.5 border border-r-0 transition-colors cursor-pointer select-none ${
              isPhoneMode
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 hover:bg-emerald-100/70'
                : 'bg-slate-100/90 border-slate-200 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <span className="text-base leading-none select-none">{selectedCountry.flag}</span>
            <span className="text-xs font-bold font-mono tracking-tight">{selectedCountry.dialCode}</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>

          {/* Searchable Country Dropdown Popover */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-[46px] z-50 w-72 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search country or code (e.g. India, +1)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Detected Location Quick Badge */}
              {detectedLocationName && (
                <div className="px-2 py-1 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-between text-[11px] text-blue-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>Detected: {detectedLocationName}</span>
                  </span>
                  <span className="font-mono font-bold">{selectedCountry.dialCode}</span>
                </div>
              )}

              {/* Country List */}
              <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1 divide-y divide-slate-100/50">
                {filteredCountries.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching countries found
                  </div>
                ) : (
                  filteredCountries.map((c) => {
                    const isSelected = c.code === selectedCountry.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className={`w-full px-2 py-1.5 rounded-xl flex items-center justify-between text-xs text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{c.flag}</span>
                          <span className="truncate">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <span className="font-mono text-slate-500 font-semibold">{c.dialCode}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Text Input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            placeholder={
              placeholder ||
              (isPhoneMode ? selectedCountry.format || '98765 43210' : 'name@company.com or mobile')
            }
            required={required}
            autoFocus={autoFocus}
            disabled={disabled}
            className={`w-full bg-slate-50/80 border border-slate-200 rounded-r-xl px-3.5 py-2.5 min-h-[42px] text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
              isPhoneMode ? 'font-mono' : ''
            }`}
          />

          {/* Icon hint inside right edge */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            {isPhoneMode ? (
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 animate-in fade-in" />
            ) : (
              <Mail className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Subtle WhatsApp delivery reassurance line */}
      {isPhoneMode && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium px-1 pt-0.5 animate-in fade-in duration-150">
          <MessageSquare className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>
            WhatsApp OTP will be delivered to <strong>{selectedCountry.dialCode} {displayValue || '...'}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
