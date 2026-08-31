"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash2, Edit3, List, Key, Check, 
  ChevronDown, X, Search, Layers, CheckSquare, Square 
} from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  CONDITION_TYPE_OPTIONS,
  OPERATOR_OPTIONS,
  hasPresetOptions,
  getPresetsForType
} from './TargetingSignalPresets';

export interface ConditionItem {
  type: string;
  operator: string;
  key?: string;
  value: string;
}

interface ConditionRowProps {
  condition: ConditionItem;
  index: number;
  totalCount: number;
  onUpdate: (index: number, field: keyof ConditionItem, val: string) => void;
  onRemove: (index: number) => void;
}

export default function ConditionRow({
  condition,
  index,
  totalCount,
  onUpdate,
  onRemove
}: ConditionRowProps) {
  const isPresetSupported = hasPresetOptions(condition.type);
  const presets = getPresetsForType(condition.type);

  // Parse comma-separated values for multi-selection
  const rawValue = condition.value || '';
  const selectedValues = rawValue
    ? rawValue.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const isMultiValue = selectedValues.length > 1;
  const isValueInPresets = presets.some(p => p.value === condition.value) || selectedValues.some(val => presets.some(p => p.value === val));

  // Modes: 'single' | 'multi' | 'custom'
  const [mode, setMode] = useState<'single' | 'multi' | 'custom'>(() => {
    if (isMultiValue) return 'multi';
    if (!isPresetSupported) return 'custom';
    if (!isValueInPresets && condition.value !== '') return 'custom';
    return 'single';
  });

  const [isMultiDropdownOpen, setIsMultiDropdownOpen] = useState(false);
  const [multiSearch, setMultiSearch] = useState('');
  const multiDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (multiDropdownRef.current && !multiDropdownRef.current.contains(event.target as Node)) {
        setIsMultiDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTypeChange = (newType: string) => {
    onUpdate(index, 'type', newType);
    if (newType === 'header' || newType === 'query_param') {
      onUpdate(index, 'key', condition.key || '');
    }
    const newPresets = getPresetsForType(newType);
    if (newPresets.length > 0) {
      onUpdate(index, 'value', newPresets[0].value);
      setMode('single');
    } else {
      onUpdate(index, 'value', '');
      setMode('custom');
    }
  };

  const handlePresetSelect = (val: string) => {
    if (val === '__custom_mode__') {
      setMode('custom');
      return;
    }
    if (val === '__multi_mode__') {
      setMode('multi');
      return;
    }
    setMode('single');
    onUpdate(index, 'value', val);
  };

  const toggleMultiOption = (optVal: string) => {
    let updated: string[];
    if (selectedValues.includes(optVal)) {
      updated = selectedValues.filter(v => v !== optVal);
    } else {
      updated = [...selectedValues, optVal];
    }
    onUpdate(index, 'value', updated.join(','));
  };

  const removeTag = (tagVal: string) => {
    const updated = selectedValues.filter(v => v !== tagVal);
    onUpdate(index, 'value', updated.join(','));
  };

  const selectAllMulti = () => {
    const allVals = presets.map(p => p.value);
    onUpdate(index, 'value', allVals.join(','));
  };

  const clearAllMulti = () => {
    onUpdate(index, 'value', '');
  };

  const handleChipClick = (chipVal: string) => {
    if (mode === 'multi') {
      toggleMultiOption(chipVal);
    } else {
      onUpdate(index, 'value', chipVal);
      if (mode === 'custom') setMode('single');
    }
  };

  const filteredPresets = presets.filter(p => 
    p.label.toLowerCase().includes(multiSearch.toLowerCase()) ||
    p.value.toLowerCase().includes(multiSearch.toLowerCase()) ||
    (p.badge && p.badge.toLowerCase().includes(multiSearch.toLowerCase()))
  );

  const quickGeos = [
    { label: 'US', val: 'US' },
    { label: 'IN', val: 'IN' },
    { label: 'GB', val: 'GB' },
    { label: 'CA', val: 'CA' },
    { label: 'AU', val: 'AU' },
    { label: 'DE', val: 'DE' },
    { label: 'AE', val: 'AE' },
    { label: 'SG', val: 'SG' }
  ];

  const quickRegions = [
    { label: 'DL (Delhi)', val: 'DL' },
    { label: 'MH (Mumbai)', val: 'MH' },
    { label: 'KA (Bangalore)', val: 'KA' },
    { label: 'TG (Hyderabad)', val: 'TG' },
    { label: 'CA (California)', val: 'CA' },
    { label: 'TX (Texas)', val: 'TX' },
    { label: 'NY (New York)', val: 'NY' },
    { label: 'ENG (England)', val: 'ENG' }
  ];

  const quickCities = [
    { label: 'Mumbai', val: 'Mumbai' },
    { label: 'Delhi', val: 'Delhi' },
    { label: 'Bangalore', val: 'Bangalore' },
    { label: 'Hyderabad', val: 'Hyderabad' },
    { label: 'New York', val: 'New York' },
    { label: 'London', val: 'London' },
    { label: 'Dubai', val: 'Dubai' },
    { label: 'Singapore', val: 'Singapore' }
  ];

  const quickReferrers = [
    { label: 'Instagram', val: 'instagram.com' },
    { label: 'TikTok', val: 'tiktok.com' },
    { label: 'Facebook', val: 'facebook.com' },
    { label: 'Google Ads', val: 'google.com' },
    { label: 'YouTube', val: 'youtube.com' },
    { label: 'Direct', val: 'direct' }
  ];

  const quickBrowsers = [
    { label: 'Chrome', val: 'chrome' },
    { label: 'Safari', val: 'safari' },
    { label: 'Instagram In-App', val: 'instagram' },
    { label: 'TikTok In-App', val: 'tiktok' },
    { label: 'Facebook In-App', val: 'facebook' },
    { label: 'Snapchat In-App', val: 'snapchat' }
  ];

  const quickAsns = [
    { label: 'Meta (FB/IG)', val: 'META' },
    { label: 'ByteDance (TikTok)', val: 'BYTEDANCE' },
    { label: 'AWS', val: 'AWS' },
    { label: 'Google Cloud', val: 'GOOGLE_CLOUD' },
    { label: 'Azure', val: 'AZURE' }
  ];

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-3 transition-all hover:border-purple-300 dark:hover:border-purple-700/60">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Signal Type */}
        <div>
          <label className="block text-[11px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1 tracking-wider">
            Signal Criterion
          </label>
          <CustomSelect
            value={condition.type}
            onChange={(e: any) => handleTypeChange(e.target.value)}
            options={CONDITION_TYPE_OPTIONS.map(opt => ({
              value: opt.value,
              label: opt.label
            }))}
          />
        </div>

        {/* Operator */}
        <div>
          <label className="block text-[11px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1 tracking-wider">
            Match Operator
          </label>
          <CustomSelect
            value={condition.operator}
            onChange={(e: any) => onUpdate(index, 'operator', e.target.value)}
            options={OPERATOR_OPTIONS}
          />
        </div>
      </div>

      {/* Header / Query Param Key Input */}
      {(condition.type === 'header' || condition.type === 'query_param') && (
        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
            <Key className="w-3.5 h-3.5 text-purple-500" />
            <span>{condition.type === 'header' ? 'HTTP Header Key Name' : 'URL Query Parameter Key'}</span>
          </label>
          <input
            type="text"
            placeholder={condition.type === 'header' ? 'e.g. X-Custom-Header, CF-Ray, Authorization' : 'e.g. utm_source, fbclid, gclid, aff_id'}
            value={condition.key || ''}
            onChange={(e) => onUpdate(index, 'key', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
          {condition.type === 'query_param' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-gray-400">Quick keys:</span>
              {['utm_source', 'utm_campaign', 'fbclid', 'gclid', 'ttclid', 'subid', 'aff_id'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onUpdate(index, 'key', k)}
                  className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 cursor-pointer"
                >
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Target Value Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[11px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
            <span>Target Value to Match</span>
            {selectedValues.length > 1 && (
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/60">
                {selectedValues.length} Values
              </span>
            )}
          </label>

          {isPresetSupported && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setMode('single');
                  if (selectedValues.length > 1) {
                    onUpdate(index, 'value', selectedValues[0]);
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  mode === 'single'
                    ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-300 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setMode('multi')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  mode === 'multi'
                    ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-300 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Multi-Select {selectedValues.length > 1 ? `(${selectedValues.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  mode === 'custom'
                    ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-300 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Custom
              </button>
            </div>
          )}
        </div>

        {/* 1. Multi-Select Dropdown Mode */}
        {isPresetSupported && mode === 'multi' && (
          <div className="relative" ref={multiDropdownRef}>
            {/* Multi-Select Trigger Input Box */}
            <div
              onClick={() => setIsMultiDropdownOpen(!isMultiDropdownOpen)}
              className={`w-full min-h-[42px] p-1.5 rounded-xl border bg-white dark:bg-gray-800 text-xs flex flex-wrap items-center gap-1.5 cursor-pointer transition shadow-xs ${
                isMultiDropdownOpen 
                  ? 'border-purple-500 ring-2 ring-purple-500/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              {selectedValues.length === 0 ? (
                <span className="px-2 text-gray-400 py-1 select-none">
                  Select one or more options...
                </span>
              ) : (
                selectedValues.map(val => {
                  const preset = presets.find(p => p.value === val);
                  const label = preset ? preset.label : val;
                  return (
                    <span
                      key={val}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-medium text-xs shadow-2xs"
                    >
                      <span className="truncate max-w-[200px]">{label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(val);
                        }}
                        className="p-0.5 rounded-full hover:bg-purple-200/60 dark:hover:bg-purple-800/60 text-purple-600 dark:text-purple-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              )}

              <div className="ml-auto flex items-center gap-1.5 pr-1.5 shrink-0">
                {selectedValues.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    {selectedValues.length} selected
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isMultiDropdownOpen ? 'rotate-180 text-purple-600' : ''}`} />
              </div>
            </div>

            {/* Dropdown Menu Popover */}
            {isMultiDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[300px] flex flex-col">
                {/* Search Header */}
                <div className="p-2 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-800/70 flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search options..."
                      value={multiSearch}
                      onChange={(e) => setMultiSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllMulti();
                      }}
                      className="px-2 py-1 rounded text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllMulti();
                      }}
                      className="px-2 py-1 rounded text-[10px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Options List */}
                <div className="overflow-y-auto p-1 space-y-0.5 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {filteredPresets.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      No matching options found
                    </div>
                  ) : (
                    filteredPresets.map((p) => {
                      const isSelected = selectedValues.includes(p.value);
                      return (
                        <div
                          key={p.value}
                          onClick={() => toggleMultiOption(p.value)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition select-none ${
                            isSelected 
                              ? 'bg-purple-50 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 font-medium' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                              isSelected 
                                ? 'bg-purple-600 border-purple-600 text-white' 
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{p.label}</span>
                          </div>
                          {p.badge && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0 ml-2">
                              {p.badge}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Single Select Mode */}
        {isPresetSupported && mode === 'single' && (
          <CustomSelect
            value={condition.value}
            onChange={(e: any) => handlePresetSelect(e.target.value)}
            options={[
              ...presets.map(p => ({
                value: p.value,
                label: p.badge ? `${p.label} [${p.badge}]` : p.label
              })),
              { value: '__multi_mode__,', label: 'Switch to Multi-Select Mode...' },
              { value: '__custom_mode__', label: 'Enter Custom / Freeform Value...' }
            ]}
          />
        )}

        {/* 3. Custom Freeform Input Mode */}
        {(!isPresetSupported || mode === 'custom') && (
          <div>
            <input
              type="text"
              placeholder={
                condition.type === 'geo_country'
                  ? 'e.g. US, IN, GB, CA, AU (comma-separated supported)'
                  : condition.type === 'geo_postal_code'
                  ? 'e.g. 110001, 400001, 560001, 90210 or 110001* or SW1A*'
                  : condition.type === 'geo_city'
                  ? 'e.g. Mumbai, Delhi, Bangalore, New York, London'
                  : condition.type === 'geo_region'
                  ? 'e.g. DL, MH, KA, TG, CA, TX, NY'
                  : condition.type === 'geo_timezone'
                  ? 'e.g. Asia/Kolkata, America/New_York, Europe/London'
                  : condition.type === 'referrer'
                  ? 'e.g. instagram.com, tiktok.com, facebook.com'
                  : condition.type === 'ip_address'
                  ? 'e.g. 192.168.1.1, 10.0.0.0/24'
                  : condition.type === 'gpu_renderer'
                  ? 'e.g. swiftshader, llvmpipe, apple, adreno, mali'
                  : condition.type === 'language'
                  ? 'e.g. en, hi, es, fr, de, ar'
                  : 'Enter matching value (comma-separated for multiple)'
              }
              value={condition.value}
              onChange={(e) => onUpdate(index, 'value', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        )}

        {/* Quick Click Chips */}
        {condition.type === 'geo_country' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Popular Geos:</span>
            {quickGeos.map(item => {
              const isSelected = selectedValues.includes(item.val);
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleChipClick(item.val)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {condition.type === 'geo_region' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Top Regions:</span>
            {quickRegions.map(item => {
              const isSelected = selectedValues.includes(item.val);
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleChipClick(item.val)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {condition.type === 'geo_city' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Top Cities:</span>
            {quickCities.map(item => {
              const isSelected = selectedValues.includes(item.val);
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleChipClick(item.val)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {condition.type === 'referrer' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Top Ad Sources:</span>
            {quickReferrers.map(item => {
              const isSelected = selectedValues.includes(item.val);
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleChipClick(item.val)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {condition.type === 'browser' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Popular:</span>
            {quickBrowsers.map(item => {
              const isSelected = selectedValues.includes(item.val);
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleChipClick(item.val)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {condition.type === 'asn_provider' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Reviewers:</span>
            {quickAsns.map(item => {
              const isSelected = selectedValues.includes(item.val);
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleChipClick(item.val)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Helpful Tips for Postal/PIN Code */}
        {condition.type === 'geo_postal_code' && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Tip: Use <code className="text-purple-600 dark:text-purple-400 font-semibold">in</code> operator with comma-separated PINs (<code className="font-mono">110001, 560001, 400001</code>) or <code className="text-purple-600 dark:text-purple-400 font-semibold">starts_with</code> (<code className="font-mono">1100*</code> for Delhi NCR, <code className="font-mono">5600*</code> for Bangalore).
          </p>
        )}
      </div>

      {/* Remove Button */}
      {totalCount > 1 && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:text-rose-600 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove Condition
          </button>
        </div>
      )}
    </div>
  );
}
