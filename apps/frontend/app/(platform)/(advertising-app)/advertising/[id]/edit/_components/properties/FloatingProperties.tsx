'use client';
import React, { useState } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import { 
    Anchor, MessageSquare, Phone, Globe, ExternalLink, 
    Sparkles, Layout, ShieldCheck, ChevronRight
} from 'lucide-react';
import PaddingControl from './PaddingControl';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
}

export default function FloatingProperties({ selectedElement, onUpdate }: Props) {
    if (selectedElement?.type !== 'floating') return null;

    const [linkMode, setLinkMode] = useState<'whatsapp' | 'phone' | 'url'>(
        selectedElement.data?.linkType || 
        (selectedElement.data?.linkUrl?.includes('wa.me') ? 'whatsapp' : 
         selectedElement.data?.linkUrl?.startsWith('tel:') ? 'phone' : 'url')
    );

    const [waPhone, setWaPhone] = useState(selectedElement.data?.waPhone || '');
    const [waText, setWaText] = useState(selectedElement.data?.waText || '');

    // Preset configurations
    const applyPreset = (presetType: 'fab-whatsapp' | 'bottom-bar' | 'top-banner' | 'card' | 'fab-call') => {
        switch (presetType) {
            case 'fab-whatsapp':
                onUpdate('data.position', 'bottom-right');
                onUpdate('data.linkType', 'whatsapp');
                onUpdate('style.width', '56px');
                onUpdate('style.height', '56px');
                onUpdate('style.borderRadius', '9999px');
                onUpdate('style.backgroundColor', '#25D366');
                onUpdate('style.color', '#ffffff');
                onUpdate('style.boxShadow', '0 10px 25px -5px rgba(37, 211, 102, 0.4)');
                onUpdate('style.offsetX', '1.5rem');
                onUpdate('style.offsetY', '1.5rem');
                onUpdate('style.display', 'flex');
                onUpdate('style.alignItems', 'center');
                onUpdate('style.justifyContent', 'center');
                break;
            case 'bottom-bar':
                onUpdate('data.position', 'bottom-bar');
                onUpdate('style.width', '100%');
                onUpdate('style.height', 'auto');
                onUpdate('style.borderRadius', '0px');
                onUpdate('style.backgroundColor', '#111827');
                onUpdate('style.color', '#ffffff');
                onUpdate('style.boxShadow', '0 -10px 25px -5px rgba(0, 0, 0, 0.15)');
                onUpdate('style.paddingTop', '0.75rem');
                onUpdate('style.paddingBottom', '0.75rem');
                onUpdate('style.paddingLeft', '1.5rem');
                onUpdate('style.paddingRight', '1.5rem');
                onUpdate('style.display', 'flex');
                onUpdate('style.alignItems', 'center');
                onUpdate('style.justifyContent', 'space-between');
                break;
            case 'top-banner':
                onUpdate('data.position', 'top-bar');
                onUpdate('style.width', '100%');
                onUpdate('style.height', 'auto');
                onUpdate('style.borderRadius', '0px');
                onUpdate('style.backgroundColor', '#4f46e5');
                onUpdate('style.color', '#ffffff');
                onUpdate('style.boxShadow', '0 4px 15px rgba(0, 0, 0, 0.1)');
                onUpdate('style.paddingTop', '0.5rem');
                onUpdate('style.paddingBottom', '0.5rem');
                onUpdate('style.paddingLeft', '1rem');
                onUpdate('style.paddingRight', '1rem');
                onUpdate('style.display', 'flex');
                onUpdate('style.alignItems', 'center');
                onUpdate('style.justifyContent', 'center');
                break;
            case 'card':
                onUpdate('data.position', 'bottom-right');
                onUpdate('style.width', 'auto');
                onUpdate('style.maxWidth', '360px');
                onUpdate('style.height', 'auto');
                onUpdate('style.borderRadius', '1rem');
                onUpdate('style.backgroundColor', '#ffffff');
                onUpdate('style.color', '#111827');
                onUpdate('style.boxShadow', '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)');
                onUpdate('style.paddingTop', '1rem');
                onUpdate('style.paddingBottom', '1rem');
                onUpdate('style.paddingLeft', '1rem');
                onUpdate('style.paddingRight', '1rem');
                onUpdate('style.border', '1px solid #f3f4f6');
                break;
            case 'fab-call':
                onUpdate('data.position', 'bottom-left');
                onUpdate('data.linkType', 'phone');
                onUpdate('style.width', '56px');
                onUpdate('style.height', '56px');
                onUpdate('style.borderRadius', '9999px');
                onUpdate('style.backgroundColor', '#3b82f6');
                onUpdate('style.color', '#ffffff');
                onUpdate('style.boxShadow', '0 10px 25px -5px rgba(59, 130, 246, 0.4)');
                onUpdate('style.offsetX', '1.5rem');
                onUpdate('style.offsetY', '1.5rem');
                onUpdate('style.display', 'flex');
                onUpdate('style.alignItems', 'center');
                onUpdate('style.justifyContent', 'center');
                break;
        }
    };

    const updateWhatsAppLink = (phone: string, text: string) => {
        setWaPhone(phone);
        setWaText(text);
        onUpdate('data.waPhone', phone);
        onUpdate('data.waText', text);
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
        const url = cleanPhone ? `https://wa.me/${cleanPhone}${encodedText}` : '';
        onUpdate('data.linkUrl', url);
        onUpdate('data.linkType', 'whatsapp');
    };

    const currentPosition = selectedElement.data?.position || 'bottom-right';

    return (
        <div className="space-y-6">
            {/* Quick Presets */}
            <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Quick Presets
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => applyPreset('fab-whatsapp')}
                        className="p-2.5 text-left border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-[#25D366] shrink-0" />
                            <span className="text-xs font-bold text-gray-800 group-hover:text-emerald-700">WhatsApp FAB</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Floating circle bottom-right</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => applyPreset('bottom-bar')}
                        className="p-2.5 text-left border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-xl transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-3.5 h-1.5 rounded-sm bg-gray-900 shrink-0" />
                            <span className="text-xs font-bold text-gray-800 group-hover:text-indigo-700">Bottom Strip</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Full width sticky bottom bar</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => applyPreset('top-banner')}
                        className="p-2.5 text-left border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-xl transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-3.5 h-1.5 rounded-sm bg-indigo-600 shrink-0" />
                            <span className="text-xs font-bold text-gray-800 group-hover:text-indigo-700">Top Banner</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Sticky announcement header</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => applyPreset('card')}
                        className="p-2.5 text-left border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-xl transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-3 h-3 rounded-md bg-white border border-gray-300 shadow-xs shrink-0" />
                            <span className="text-xs font-bold text-gray-800 group-hover:text-indigo-700">Floating Card</span>
                        </div>
                        <p className="text-[10px] text-gray-500">Corner popup badge/pill</p>
                    </button>
                </div>
            </div>

            {/* Position Anchoring */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                    <Anchor className="w-3.5 h-3.5" />
                    Screen Position
                </h4>

                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Anchor Mode</label>
                    <CustomSelect
                        value={currentPosition}
                        onChange={(e: any) => onUpdate('data.position', e.target.value)}
                        className="w-full text-xs font-medium"
                    >
                        <option value="bottom-right">Bottom Right (FAB / Pill)</option>
                        <option value="bottom-left">Bottom Left (FAB / Pill)</option>
                        <option value="bottom-bar">Bottom Bar (Full Width Strip)</option>
                        <option value="top-bar">Top Bar (Full Width Banner)</option>
                        <option value="top-right">Top Right Corner</option>
                        <option value="top-left">Top Left Corner</option>
                        <option value="middle-right">Middle Right Side Tab</option>
                        <option value="middle-left">Middle Left Side Tab</option>
                        <option value="custom">Custom Position</option>
                    </CustomSelect>
                </div>

                {/* Offset Sliders (when not full bar) */}
                {!currentPosition.includes('bar') && currentPosition !== 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-semibold text-gray-600 mb-1 block">
                                Side Offset ({selectedElement.style?.offsetX || '1.5rem'})
                            </label>
                            <input
                                type="text"
                                value={selectedElement.style?.offsetX || '1.5rem'}
                                onChange={(e) => onUpdate('style.offsetX', e.target.value)}
                                placeholder="e.g. 1.5rem or 24px"
                                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-gray-600 mb-1 block">
                                Vertical Offset ({selectedElement.style?.offsetY || '1.5rem'})
                            </label>
                            <input
                                type="text"
                                value={selectedElement.style?.offsetY || '1.5rem'}
                                onChange={(e) => onUpdate('style.offsetY', e.target.value)}
                                placeholder="e.g. 1.5rem or 24px"
                                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                )}

                {currentPosition === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Top</label>
                            <input
                                type="text"
                                value={selectedElement.style?.top || ''}
                                onChange={(e) => onUpdate('style.top', e.target.value)}
                                placeholder="e.g. 20px"
                                className="w-full border border-gray-200 rounded px-2 py-1"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Bottom</label>
                            <input
                                type="text"
                                value={selectedElement.style?.bottom || ''}
                                onChange={(e) => onUpdate('style.bottom', e.target.value)}
                                placeholder="e.g. 20px"
                                className="w-full border border-gray-200 rounded px-2 py-1"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Left</label>
                            <input
                                type="text"
                                value={selectedElement.style?.left || ''}
                                onChange={(e) => onUpdate('style.left', e.target.value)}
                                placeholder="e.g. 20px"
                                className="w-full border border-gray-200 rounded px-2 py-1"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Right</label>
                            <input
                                type="text"
                                value={selectedElement.style?.right || ''}
                                onChange={(e) => onUpdate('style.right', e.target.value)}
                                placeholder="e.g. 20px"
                                className="w-full border border-gray-200 rounded px-2 py-1"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Geometry & Sizing */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Geometry & Shape</h4>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Width</label>
                        <input
                            type="text"
                            value={selectedElement.style?.width || (currentPosition.includes('bar') ? '100%' : 'auto')}
                            onChange={(e) => onUpdate('style.width', e.target.value)}
                            placeholder="auto / 56px / 100%"
                            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Height</label>
                        <input
                            type="text"
                            value={selectedElement.style?.height || 'auto'}
                            onChange={(e) => onUpdate('style.height', e.target.value)}
                            placeholder="auto / 56px"
                            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                        <span>Border Radius</span>
                        <span className="text-gray-400 font-mono text-[11px]">{selectedElement.style?.borderRadius || '0px'}</span>
                    </label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onUpdate('style.borderRadius', '0px')}
                            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 font-medium"
                        >
                            Square (0)
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdate('style.borderRadius', '12px')}
                            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 font-medium"
                        >
                            Rounded (12px)
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdate('style.borderRadius', '9999px')}
                            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 font-medium text-emerald-600"
                        >
                            Circle / Pill
                        </button>
                    </div>
                </div>
            </div>

            {/* Colors & Appearance */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Appearance & Style</h4>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Background Color</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={selectedElement.style?.backgroundColor?.startsWith('#') ? selectedElement.style.backgroundColor : '#25D366'}
                                onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                                className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
                            />
                            <input
                                type="text"
                                value={selectedElement.style?.backgroundColor || '#25D366'}
                                onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                                placeholder="#25D366"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Shadow</label>
                        <CustomSelect
                            value={selectedElement.style?.boxShadow || '0 10px 25px -5px rgba(0, 0, 0, 0.15)'}
                            onChange={(e: any) => onUpdate('style.boxShadow', e.target.value)}
                            className="w-full text-xs"
                        >
                            <option value="none">No Shadow</option>
                            <option value="0 4px 6px -1px rgba(0, 0, 0, 0.1)">Small (SM)</option>
                            <option value="0 10px 15px -3px rgba(0, 0, 0, 0.1)">Medium (MD)</option>
                            <option value="0 20px 25px -5px rgba(0, 0, 0, 0.15)">Large (LG)</option>
                            <option value="0 25px 50px -12px rgba(0, 0, 0, 0.25)">Extra Large (2XL)</option>
                            <option value="0 10px 25px -5px rgba(37, 211, 102, 0.4)">WhatsApp Green Glow</option>
                        </CustomSelect>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Z-Index (Layer Order)</label>
                    <input
                        type="number"
                        value={selectedElement.style?.zIndex !== undefined ? selectedElement.style.zIndex : 50}
                        onChange={(e) => onUpdate('style.zIndex', e.target.value)}
                        className="w-24 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5"
                    />
                </div>
            </div>

            {/* Link & Action Builder */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Click Action & Link
                </h4>

                <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => {
                            setLinkMode('whatsapp');
                            onUpdate('data.linkType', 'whatsapp');
                        }}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                            linkMode === 'whatsapp' ? 'bg-white text-emerald-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setLinkMode('phone');
                            onUpdate('data.linkType', 'phone');
                        }}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                            linkMode === 'phone' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setLinkMode('url');
                            onUpdate('data.linkType', 'url');
                        }}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                            linkMode === 'url' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Custom URL
                    </button>
                </div>

                {linkMode === 'whatsapp' && (
                    <div className="space-y-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                        <div>
                            <label className="text-xs font-semibold text-emerald-900 mb-1 block">
                                WhatsApp Phone Number (with country code)
                            </label>
                            <input
                                type="text"
                                value={waPhone}
                                onChange={(e) => updateWhatsAppLink(e.target.value, waText)}
                                placeholder="e.g. 1234567890 (no spaces or +)"
                                className="w-full text-xs bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-emerald-900 mb-1 block">
                                Pre-filled Message (Optional)
                            </label>
                            <input
                                type="text"
                                value={waText}
                                onChange={(e) => updateWhatsAppLink(waPhone, e.target.value)}
                                placeholder="e.g. Hi! I'd like to ask a question..."
                                className="w-full text-xs bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        {selectedElement.data?.linkUrl && (
                            <p className="text-[10px] text-emerald-700 font-mono break-all">
                                Target: {selectedElement.data.linkUrl}
                            </p>
                        )}
                    </div>
                )}

                {linkMode === 'phone' && (
                    <div className="space-y-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <label className="text-xs font-semibold text-blue-900 mb-1 block">
                            Phone Number to Call
                        </label>
                        <input
                            type="text"
                            value={selectedElement.data?.linkUrl?.replace('tel:', '') || ''}
                            onChange={(e) => {
                                const clean = e.target.value.trim();
                                onUpdate('data.linkUrl', clean ? `tel:${clean}` : '');
                                onUpdate('data.linkType', 'phone');
                            }}
                            placeholder="e.g. +1 (555) 000-0000"
                            className="w-full text-xs bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 focus:border-blue-500 outline-none"
                        />
                    </div>
                )}

                {linkMode === 'url' && (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">Link URL or Section Anchor</label>
                            <input
                                type="text"
                                value={selectedElement.data?.linkUrl || ''}
                                onChange={(e) => {
                                    onUpdate('data.linkUrl', e.target.value);
                                    onUpdate('data.linkType', 'url');
                                }}
                                placeholder="https://... or #order-section"
                                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="openInNewTab"
                                checked={selectedElement.data?.openInNewTab !== false}
                                onChange={(e) => onUpdate('data.openInNewTab', e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="openInNewTab" className="text-xs text-gray-600 font-medium cursor-pointer">
                                Open link in new tab
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Padding Controls */}
            <PaddingControl selectedElement={selectedElement} onUpdate={onUpdate} />
        </div>
    );
}
