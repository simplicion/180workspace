"use client";

import React, { useState } from 'react';
import { Trash2, Edit3, List, Key } from 'lucide-react';
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
  const isValueInPresets = presets.some(p => p.value === condition.value);

  // If value is not one of presets (e.g. custom typed), allow custom input mode
  const [isCustomMode, setIsCustomMode] = useState<boolean>(!isValueInPresets && condition.value !== '');

  const handleTypeChange = (newType: string) => {
    onUpdate(index, 'type', newType);
    if (newType === 'header' || newType === 'query_param') {
      onUpdate(index, 'key', condition.key || '');
    }
    const newPresets = getPresetsForType(newType);
    if (newPresets.length > 0) {
      onUpdate(index, 'value', newPresets[0].value);
      setIsCustomMode(false);
    } else {
      onUpdate(index, 'value', '');
      setIsCustomMode(true);
    }
  };

  const handlePresetSelect = (val: string) => {
    if (val === '__custom_mode__') {
      setIsCustomMode(true);
      return;
    }
    setIsCustomMode(false);
    onUpdate(index, 'value', val);
  };

  const quickGeos = [
    { label: '🇺🇸 US', val: 'US' },
    { label: '🇮🇳 IN', val: 'IN' },
    { label: '🇬🇧 GB', val: 'GB' },
    { label: '🇨🇦 CA', val: 'CA' },
    { label: '🇦🇺 AU', val: 'AU' },
    { label: '🇩🇪 DE', val: 'DE' },
    { label: '🇦🇪 AE', val: 'AE' },
    { label: '🇸🇬 SG', val: 'SG' }
  ];

  const quickRegions = [
    { label: '🇮🇳 DL (Delhi)', val: 'DL' },
    { label: '🇮🇳 MH (Mumbai)', val: 'MH' },
    { label: '🇮🇳 KA (Bangalore)', val: 'KA' },
    { label: '🇮🇳 TG (Hyderabad)', val: 'TG' },
    { label: '🇺🇸 CA (California)', val: 'CA' },
    { label: '🇺🇸 TX (Texas)', val: 'TX' },
    { label: '🇺🇸 NY (New York)', val: 'NY' },
    { label: '🇬🇧 ENG (England)', val: 'ENG' }
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
    { label: '📸 Instagram', val: 'instagram.com' },
    { label: '🎵 TikTok', val: 'tiktok.com' },
    { label: '📘 Facebook', val: 'facebook.com' },
    { label: '🔍 Google Ads', val: 'google.com' },
    { label: '▶️ YouTube', val: 'youtube.com' },
    { label: '🔗 Direct', val: 'direct' }
  ];

  const quickBrowsers = [
    { label: 'Chrome', val: 'chrome' },
    { label: 'Safari', val: 'safari' },
    { label: '📸 Instagram In-App', val: 'instagram' },
    { label: '🎵 TikTok In-App', val: 'tiktok' },
    { label: '📘 Facebook In-App', val: 'facebook' },
    { label: '👻 Snapchat In-App', val: 'snapchat' }
  ];

  const quickAsns = [
    { label: '📘 Meta (FB/IG)', val: 'META' },
    { label: '🎵 ByteDance (TikTok)', val: 'BYTEDANCE' },
    { label: '📦 AWS', val: 'AWS' },
    { label: '🔍 Google Cloud', val: 'GOOGLE_CLOUD' },
    { label: '🪟 Azure', val: 'AZURE' }
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
              label: `[${opt.group}] ${opt.label}`
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
          <label className="flex items-center gap-1 text-[11px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
            <span>Target Value to Match</span>
            {condition.type === 'geo_postal_code' && (
              <span className="text-[10px] lowercase text-purple-600 dark:text-purple-400 font-normal">
                (supports PIN/ZIP lists e.g. 110001, 400001, 90210, SW1A)
              </span>
            )}
          </label>

          {isPresetSupported && (
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              {isCustomMode ? (
                <>
                  <List className="w-3 h-3" /> Use Preset Options
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3" /> Enter Custom Value
                </>
              )}
            </button>
          )}
        </div>

        {/* Render Preset Select or Custom Text Input */}
        {isPresetSupported && !isCustomMode ? (
          <CustomSelect
            value={condition.value}
            onChange={(e: any) => handlePresetSelect(e.target.value)}
            options={[
              ...presets.map(p => ({
                value: p.value,
                label: p.badge ? `${p.label} [${p.badge}]` : p.label
              })),
              { value: '__custom_mode__', label: '✏️ Enter Custom / Multi-Value...' }
            ]}
          />
        ) : (
          <div>
            <input
              type="text"
              placeholder={
                condition.type === 'geo_country'
                  ? 'e.g. US, IN, GB, CA, AU (or single ISO code)'
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
                  : 'Enter matching value'
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
            {quickGeos.map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => {
                  onUpdate(index, 'value', item.val);
                  setIsCustomMode(false);
                }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                  condition.value === item.val
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {condition.type === 'geo_region' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Top Regions:</span>
            {quickRegions.map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => {
                  onUpdate(index, 'value', item.val);
                  setIsCustomMode(false);
                }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                  condition.value === item.val
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {condition.type === 'geo_city' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Top Cities:</span>
            {quickCities.map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => {
                  onUpdate(index, 'value', item.val);
                  setIsCustomMode(false);
                }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                  condition.value === item.val
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {condition.type === 'referrer' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Top Ad Sources:</span>
            {quickReferrers.map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => {
                  onUpdate(index, 'value', item.val);
                  setIsCustomMode(false);
                }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                  condition.value === item.val
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {condition.type === 'browser' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Popular:</span>
            {quickBrowsers.map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => {
                  onUpdate(index, 'value', item.val);
                  setIsCustomMode(false);
                }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                  condition.value === item.val
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {condition.type === 'asn_provider' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">Reviewers:</span>
            {quickAsns.map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => {
                  onUpdate(index, 'value', item.val);
                  setIsCustomMode(false);
                }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition cursor-pointer ${
                  condition.value === item.val
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Helpful Tips for Postal/PIN Code */}
        {condition.type === 'geo_postal_code' && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            💡 Tip: Use <code className="text-purple-600 dark:text-purple-400 font-semibold">in</code> operator with comma-separated PINs (<code className="font-mono">110001, 560001, 400001</code>) or <code className="text-purple-600 dark:text-purple-400 font-semibold">starts_with</code> (<code className="font-mono">1100*</code> for Delhi NCR, <code className="font-mono">5600*</code> for Bangalore).
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
