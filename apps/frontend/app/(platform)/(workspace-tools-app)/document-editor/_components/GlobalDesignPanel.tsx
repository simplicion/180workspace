'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  updateDesignSettings, 
  setHeaderBlocks, 
  setFooterBlocks 
} from '@/redux/slices/documentSlice';
import { 
  Type, 
  Palette, 
  LayoutTemplate,
  SlidersHorizontal
} from 'lucide-react';
import { GoogleFontPicker } from './GoogleFontPicker';
import CustomSelect from '@/components/ui/CustomSelect';
import { HEADER_TEMPLATES, FOOTER_TEMPLATES } from '../../_components/headerFooterTemplates';

const PADDING_POINTS = [16, 24, 32, 40, 48, 56, 64];

export function GlobalDesignPanel() {
  const dispatch = useDispatch();
  const designSettings = useSelector((state: any) => state.document?.designSettings || {});

  // Parse current padding number (default 40)
  const currentPaddingNum = parseInt(designSettings.pagePadding || '40', 10) || 40;

  const handlePaddingSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    // Find closest snap point
    const closest = PADDING_POINTS.reduce((prev, curr) => 
      Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
    );
    dispatch(updateDesignSettings({ pagePadding: `${closest}px` }));
  };

  return (
    <div className="space-y-5">
      {/* 1. Universal Typography with Google Fonts API */}
      <div>
        <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
          Universal Font Family
        </label>
        <GoogleFontPicker
          value={designSettings.fontFamily || 'Inter, sans-serif'}
          onChange={font => dispatch(updateDesignSettings({ fontFamily: font }))}
        />
      </div>

      {/* 2. Document Page Theme (Background Color & Margins) */}
      <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
        {/* Page Background Color */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
              Page Background
            </label>
            <span className="text-[10px] font-mono text-gray-400">{designSettings.pageBackground || '#FFFFFF'}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-2xs flex-shrink-0 cursor-pointer">
              <input 
                type="color" 
                value={designSettings.pageBackground || '#FFFFFF'} 
                onChange={e => dispatch(updateDesignSettings({ pageBackground: e.target.value }))} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              <div className="w-full h-full border border-black/5" style={{ backgroundColor: designSettings.pageBackground || '#FFFFFF' }} />
            </div>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {[
                { name: 'Pure White', value: '#FFFFFF' },
                { name: 'Warm Ivory', value: '#FAFAF9' },
                { name: 'Cool Slate', value: '#F8FAFC' },
                { name: 'Soft Cream', value: '#FFFBEB' },
                { name: 'Light Gray', value: '#F1F5F9' },
                { name: 'Dark Slate', value: '#0F172A' },
              ].map(item => (
                <button
                  key={item.value}
                  type="button"
                  title={item.name}
                  onClick={() => dispatch(updateDesignSettings({ pageBackground: item.value }))}
                  className={`w-6 h-6 rounded-lg border shadow-2xs transition-all hover:scale-110 ${
                    (designSettings.pageBackground || '#FFFFFF') === item.value 
                      ? 'border-blue-500 ring-2 ring-blue-500/20' 
                      : 'border-gray-200 dark:border-slate-700'
                  }`}
                  style={{ backgroundColor: item.value }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Page Margins & Padding Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
              Page Margins & Padding
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
              {designSettings.pagePadding || '40px'}
            </span>
          </div>

          <div className="px-1 py-1">
            <input
              type="range"
              min="16"
              max="64"
              step="8"
              value={currentPaddingNum}
              onChange={handlePaddingSliderChange}
              className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            {/* Defined snap points labels */}
            <div className="flex justify-between text-[9px] text-gray-400 dark:text-slate-500 mt-1 font-mono">
              <span>16px</span>
              <span>24px</span>
              <span>32px</span>
              <span className="font-bold text-blue-600">40px</span>
              <span>48px</span>
              <span>56px</span>
              <span>64px</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Header & Footer Template Pickers */}
      <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
        {/* Header Template */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
            Header Template
          </label>
          <div className="border border-gray-200 dark:border-slate-700 rounded-xl flex items-center px-3 bg-white dark:bg-slate-800 hover:border-gray-300 transition-colors shadow-2xs">
            <LayoutTemplate className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <CustomSelect 
              value={designSettings.selectedHeaderId || 'header-corporate'} 
              onChange={e => {
                const val = e.target.value;
                dispatch(updateDesignSettings({ selectedHeaderId: val }));
                if (val !== 'none') {
                  const template = HEADER_TEMPLATES.find(t => t.id === val);
                  if (template) {
                    const newBlocks = JSON.parse(JSON.stringify(template.blocks)).map((b: any) => ({ 
                      ...b, 
                      id: 'header-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6) 
                    }));
                    dispatch(setHeaderBlocks(newBlocks));
                  }
                } else {
                  dispatch(setHeaderBlocks([]));
                }
              }} 
              className="w-full text-xs font-semibold py-2.5 bg-transparent focus:outline-none cursor-pointer text-gray-800 dark:text-slate-200"
            >
              <option value="none">None (No Header)</option>
              {HEADER_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </CustomSelect>
          </div>
        </div>

        {/* Footer Template */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
            Footer Template
          </label>
          <div className="border border-gray-200 dark:border-slate-700 rounded-xl flex items-center px-3 bg-white dark:bg-slate-800 hover:border-gray-300 transition-colors shadow-2xs">
            <LayoutTemplate className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <CustomSelect 
              value={designSettings.selectedFooterId || 'footer-corporate'} 
              onChange={e => {
                const val = e.target.value;
                dispatch(updateDesignSettings({ selectedFooterId: val }));
                if (val !== 'none') {
                  const template = FOOTER_TEMPLATES.find(t => t.id === val);
                  if (template) {
                    const newBlocks = JSON.parse(JSON.stringify(template.blocks)).map((b: any) => ({ 
                      ...b, 
                      id: 'footer-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6) 
                    }));
                    dispatch(setFooterBlocks(newBlocks));
                  }
                } else {
                  dispatch(setFooterBlocks([]));
                }
              }} 
              className="w-full text-xs font-semibold py-2.5 bg-transparent focus:outline-none cursor-pointer text-gray-800 dark:text-slate-200"
            >
              <option value="none">None (No Footer)</option>
              {FOOTER_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </CustomSelect>
          </div>
        </div>
      </div>
    </div>
  );
}
