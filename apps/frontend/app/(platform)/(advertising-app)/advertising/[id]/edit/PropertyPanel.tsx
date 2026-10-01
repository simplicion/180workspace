import { Settings, X, Upload, Trash2, Monitor, Tablet, Smartphone, RotateCcw, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

import TextProperties from './_components/properties/TextProperties';
import ButtonProperties from './_components/properties/ButtonProperties';
import ImageProperties from './_components/properties/ImageProperties';
import ContainerProperties from './_components/properties/ContainerProperties';
import DividerProperties from './_components/properties/DividerProperties';
import PaddingControl from './_components/properties/PaddingControl';
import CodeProperties from './_components/properties/CodeProperties';
import FloatingProperties from './_components/properties/FloatingProperties';
import AnimationProperties from './_components/AnimationProperties';
import { getEffectiveStyle } from './responsive-styles';

interface PropertyPanelProps {
    selectedElement: any;
    brand?: any;
    onUpdateBrand?: (key: string, value: any) => void;
    onUpdate: (key: string, value: any) => void;
    onClose: () => void;
    website?: any;
    /** Device currently shown on the canvas. Tablet/mobile edits are written as `responsive.<bp>` overrides. */
    viewMode?: 'desktop' | 'tablet' | 'mobile';
}

type Device = 'desktop' | 'tablet' | 'mobile';

/** Style keys that are structural (not CSS), so they are never overridden per device. */
const DESKTOP_ONLY_STYLE_KEYS = new Set(['tagName']);

const DEVICE_LABEL: Record<Device, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };
const DEVICE_ICON: Record<Device, any> = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };

const humanizeKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const definedOnly = (o: any) => {
    const out: Record<string, any> = {};
    if (o && typeof o === 'object') for (const k of Object.keys(o)) if (o[k] !== undefined) out[k] = o[k];
    return out;
};


export default function PropertyPanel({ selectedElement: rawElement, brand, onUpdateBrand, onUpdate: rawUpdate, onClose, website, viewMode = 'desktop' }: PropertyPanelProps) {
    if (!rawElement) return null;

    const isHeader = rawElement.type === 'header';
    const isFooter = rawElement.type === 'footer';
    // Header/footer are site chrome rendered by the page shell; they have one style for every device.
    const supportsDevices = !isHeader && !isFooter;
    const bp: 'tablet' | 'mobile' | null = supportsDevices && viewMode !== 'desktop' ? viewMode : null;
    const overrides: Record<string, any> = bp ? definedOnly(rawElement.responsive?.[bp]) : {};
    const overrideKeys = Object.keys(overrides);

    // Controls read the effective (cascaded) value for the device being edited...
    const selectedElement = bp ? { ...rawElement, style: definedOnly(getEffectiveStyle(rawElement, bp)) } : rawElement;
    // ...and every `style.X` write is routed to `responsive.<bp>.X` while editing tablet/mobile.
    const onUpdate = (key: string, value: any) => {
        if (bp && key.startsWith('style.')) {
            const prop = key.slice('style.'.length);
            if (!DESKTOP_ONLY_STYLE_KEYS.has(prop.split('.')[0])) {
                rawUpdate(`responsive.${bp}.${prop}`, value);
                return;
            }
        }
        rawUpdate(key, value);
    };
    const hiddenOn = rawElement.hiddenOn || {};

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 backdrop-blur">
                <h3 className="font-bold flex items-center gap-2 text-sm text-gray-700 capitalize">
                    <Settings className="w-4 h-4 text-indigo-500" />
                    {selectedElement.type} Editor
                </h3>
                <button onClick={onClose} aria-label="Close editor" className="min-w-11 min-h-11 flex items-center justify-center hover:bg-gray-200 rounded-md text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {bp && (
                <div className="px-4 py-3 border-b border-amber-200 bg-amber-50 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                        {bp === 'tablet' ? <Tablet className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                        Editing {DEVICE_LABEL[bp]} overrides
                    </div>
                    <p className="text-[11px] leading-snug text-amber-700">
                        Style changes here only apply on {bp === 'tablet' ? 'tablets (and phones, unless a phone override exists)' : 'phones'}. Desktop stays as it is.
                    </p>
                    {overrideKeys.length > 0 ? (
                        <div className="space-y-1">
                            {overrideKeys.map((k) => (
                                <div key={k} className="flex items-center justify-between gap-2 text-[11px] bg-white/70 border border-amber-200 rounded-md pl-2">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden />
                                        <span className="font-semibold text-gray-700 truncate">{humanizeKey(k)}</span>
                                        <span className="text-gray-400 font-mono truncate">{typeof overrides[k] === 'object' ? '…' : String(overrides[k])}</span>
                                    </span>
                                    <button
                                        onClick={() => rawUpdate(`responsive.${bp}.${k}`, undefined)}
                                        className="min-w-11 min-h-11 flex items-center justify-center text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-md shrink-0"
                                        title={`Reset ${humanizeKey(k)} to the ${bp === 'mobile' ? 'tablet/desktop' : 'desktop'} value`}
                                        aria-label={`Reset ${humanizeKey(k)}`}
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => rawUpdate(`responsive.${bp}`, undefined)}
                                className="w-full min-h-11 text-xs font-bold text-amber-800 bg-white border border-amber-300 hover:bg-amber-100 rounded-md transition-colors"
                            >
                                Clear all {DEVICE_LABEL[bp]} overrides
                            </button>
                        </div>
                    ) : (
                        <p className="text-[11px] text-amber-700/80 italic">
                            No overrides yet: values below are inherited from {bp === 'mobile' ? 'tablet/desktop' : 'desktop'}.
                            {bp === 'mobile' && ' Automatic phone adjustments (stacked rows, scaled headings, tighter side padding) still apply until you set a value here.'}
                        </p>
                    )}
                </div>
            )}
            {!supportsDevices && viewMode !== 'desktop' && (
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-[11px] text-gray-500">
                    {isHeader ? 'Header' : 'Footer'} settings apply to every device.
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">

                {supportsDevices && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Visibility</h4>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => {
                                const Icon = DEVICE_ICON[d];
                                const hidden = !!hiddenOn[d];
                                return (
                                    <button
                                        key={d}
                                        onClick={() => rawUpdate(`hiddenOn.${d}`, hidden ? undefined : true)}
                                        aria-pressed={hidden}
                                        title={hidden ? `Show on ${DEVICE_LABEL[d]}` : `Hide on ${DEVICE_LABEL[d]}`}
                                        className={`min-h-11 px-1 flex flex-col items-center justify-center gap-0.5 rounded-lg border text-[10px] font-bold transition-colors ${hidden ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-400'}`}
                                    >
                                        {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                        {hidden ? `Hidden: ${DEVICE_LABEL[d]}` : `Hide on ${DEVICE_LABEL[d]}`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* Company Information (Header/Footer Only) */}
                {(isHeader || isFooter) && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Company Information</h4>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Company/Website Name</label>
                            <input 
                                type="text" 
                                value={brand?.companyName || selectedElement.title || ''} 
                                onChange={(e) => {
                                    onUpdateBrand?.('companyName', e.target.value);
                                    if (isHeader) onUpdate('title', e.target.value);
                                }}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. Acme Corp"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Address</label>
                            <input 
                                type="text" 
                                value={brand?.address || ''} 
                                onChange={(e) => onUpdateBrand?.('address', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. 123 Business Ave"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email</label>
                            <input 
                                type="email" 
                                value={brand?.email || ''} 
                                onChange={(e) => onUpdateBrand?.('email', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. hello@example.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Phone</label>
                            <input 
                                type="text" 
                                value={brand?.phone || ''} 
                                onChange={(e) => onUpdateBrand?.('phone', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. +1 234 567 8900"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Twitter URL</label>
                            <input 
                                type="text" 
                                value={brand?.twitter || ''} 
                                onChange={(e) => onUpdateBrand?.('twitter', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. https://twitter.com/acme"
                            />
                        </div>
                    </div>
                )}
                
                {/* Header Settings */}
                {isHeader && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Header Settings</h4>

                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-600 block">Sticky Header</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={selectedElement.style?.isSticky !== false}
                                    onChange={(e) => onUpdate('style.isSticky', e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                                <span>Logo Height</span>
                                <span className="text-indigo-600">{selectedElement.style?.logoHeight ?? 40}px</span>
                            </label>
                            <input 
                                type="range" 
                                min="20" max="100" step="1" 
                                value={selectedElement.style?.logoHeight ?? 40} 
                                onChange={(e) => onUpdate('style.logoHeight', parseInt(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Color</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={selectedElement.style?.color || '#000000'} 
                                    onChange={(e) => onUpdate('style.color', e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                                />
                                <input 
                                    type="text" 
                                    value={selectedElement.style?.color || ''} 
                                    onChange={(e) => onUpdate('style.color', e.target.value)}
                                    placeholder="Default"
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none uppercase font-mono"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Settings */}
                {isFooter && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Footer Settings</h4>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Layout</label>
                            <select 
                                value={selectedElement.style?.layout || 'centered'} 
                                onChange={(e) => onUpdate('style.layout', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option value="centered">Centered</option>
                                <option value="left-aligned">Left Aligned</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Copyright Text</label>
                            <input 
                                type="text" 
                                value={selectedElement.copyright || ''} 
                                onChange={(e) => onUpdate('copyright', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. © 2024 Acme Corp. All rights reserved."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Color</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={selectedElement.style?.color || '#000000'} 
                                    onChange={(e) => onUpdate('style.color', e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                                />
                                <input 
                                    type="text" 
                                    value={selectedElement.style?.color || ''} 
                                    onChange={(e) => onUpdate('style.color', e.target.value)}
                                    placeholder="Default"
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none uppercase font-mono"
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Dedicated Property Panels */}
                <FloatingProperties selectedElement={selectedElement} onUpdate={onUpdate} />
                <ContainerProperties selectedElement={selectedElement} onUpdate={onUpdate} />
                <ButtonProperties selectedElement={selectedElement} onUpdate={onUpdate} brand={brand} />
                <TextProperties selectedElement={selectedElement} onUpdate={onUpdate} brand={brand} />
                <ImageProperties selectedElement={selectedElement} onUpdate={onUpdate} website={website} />
                <DividerProperties selectedElement={selectedElement} onUpdate={onUpdate} />
                <CodeProperties selectedElement={selectedElement} onUpdate={onUpdate} />

                {/* Background Section */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Background</h4>
                    
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Color</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                value={selectedElement.style?.backgroundColor || '#ffffff'} 
                                onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                            />
                            <input 
                                type="text" 
                                value={selectedElement.style?.backgroundColor || '#ffffff'} 
                                onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none uppercase font-mono"
                            />
                        </div>
                    </div>

                    {selectedElement.type !== 'media' && (
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Image</label>
                        {selectedElement.style?.backgroundImage && selectedElement.style.backgroundImage !== 'none' ? (
                            <div className="relative group rounded-lg overflow-hidden border border-gray-200 h-24">
                                <div 
                                    className="w-full h-full bg-cover bg-center" 
                                    style={{ backgroundImage: selectedElement.style.backgroundImage }} 
                                />
                                <button 
                                    onClick={() => onUpdate('style.backgroundImage', 'none')}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded shadow-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-500 cursor-pointer transition-colors bg-gray-50">
                                <Upload className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-medium uppercase tracking-wider">Upload Bg Image</span>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        if (file.size > 5 * 1024 * 1024) {
                                            toast.error('Image size must be less than 5MB');
                                            return;
                                        }

                                        const toastId = toast.loading('Uploading image...');
                                        try {
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            if (website?.id) {
                                                formData.append('relatedId', website.id);
                                                formData.append('relatedModel', 'Website');
                                            }
                                            
                                            const res = await api.post('/api/files/upload', formData, {
                                                headers: { 'Content-Type': 'multipart/form-data' }
                                            });

                                            if (res.data.url || res.data.fileUrl) {
                                                const url = res.data.url || res.data.fileUrl;
                                                onUpdate('style.backgroundImage', `url(${url})`);
                                                toast.success('Upload complete', { id: toastId });
                                            } else {
                                                toast.error('Upload failed', { id: toastId });
                                            }
                                        } catch (err: any) {
                                            console.error('Upload error:', err);
                                            toast.error(err.response?.data?.error || 'Failed to upload image', { id: toastId });
                                        }
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        )}
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                            <span>Bg Size:</span>
                            <select 
                                value={selectedElement.style?.backgroundSize || 'cover'}
                                onChange={e => onUpdate('style.backgroundSize', e.target.value)}
                                className="bg-transparent border-none outline-none font-medium cursor-pointer"
                            >
                                <option value="cover">Cover</option>
                                <option value="contain">Contain</option>
                                <option value="auto">Auto</option>
                            </select>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                            <span>Bg Position:</span>
                            <select 
                                value={selectedElement.style?.backgroundPosition || 'center'}
                                onChange={e => onUpdate('style.backgroundPosition', e.target.value)}
                                className="bg-transparent border-none outline-none font-medium cursor-pointer"
                            >
                                <option value="center">Center</option>
                                <option value="top">Top</option>
                                <option value="bottom">Bottom</option>
                                <option value="left">Left</option>
                                <option value="right">Right</option>
                            </select>
                        </div>
                    </div>
                    )}
                </div>
                <PaddingControl selectedElement={selectedElement} onUpdate={onUpdate} />

                {/* Appearance Section */}
                <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Appearance</h4>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                            <span>Opacity</span>
                            <span className="text-indigo-600">{selectedElement.style?.opacity ?? 1}</span>
                        </label>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.1" 
                            value={selectedElement.style?.opacity ?? 1} 
                            onChange={(e) => onUpdate('style.opacity', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                </div>
                
                {/* Animation Section */}
                <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Animations</h4>
                    <AnimationProperties element={selectedElement} onUpdate={onUpdate} />
                </div>
            </div>
        </div>
    );
}
