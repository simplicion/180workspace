import React from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import { 
    Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, 
    AlignJustify, Link as LinkIcon, Plus, Minus, Type, Palette, Sparkles, 
    CaseUpper, CaseLower, CaseSensitive
} from 'lucide-react';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
    brand?: any;
}

const FONT_FAMILIES = [
    { label: 'Default (Inter)', value: 'inherit' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Poppins', value: 'Poppins, sans-serif' },
    { label: 'Outfit', value: 'Outfit, sans-serif' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans", sans-serif' },
    { label: 'Playfair Display (Serif)', value: '"Playfair Display", serif' },
    { label: 'JetBrains Mono (Code)', value: '"JetBrains Mono", monospace' },
    { label: 'System Sans', value: 'system-ui, -apple-system, sans-serif' }
];

const PRESET_COLORS = [
    '#000000', '#FFFFFF', '#EF4444', '#F97316', '#EAB308', '#22C55E',
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280', '#1E293B'
];

const FONT_SIZE_PRESETS = [
    { label: 'XS (0.75rem / 12px)', value: '0.75rem', num: 12 },
    { label: 'SM (0.875rem / 14px)', value: '0.875rem', num: 14 },
    { label: 'Base (1rem / 16px)', value: '1rem', num: 16 },
    { label: 'LG (1.125rem / 18px)', value: '1.125rem', num: 18 },
    { label: 'XL (1.25rem / 20px)', value: '1.25rem', num: 20 },
    { label: '2XL (1.5rem / 24px)', value: '1.5rem', num: 24 },
    { label: '3XL (1.875rem / 30px)', value: '1.875rem', num: 30 },
    { label: '4XL (2.25rem / 36px)', value: '2.25rem', num: 36 },
    { label: '5XL (3rem / 48px)', value: '3rem', num: 48 },
    { label: '6XL (3.75rem / 60px)', value: '3.75rem', num: 60 },
    { label: '7XL (4.5rem / 72px)', value: '4.5rem', num: 72 },
    { label: '8XL (6rem / 96px)', value: '6rem', num: 96 },
    { label: '9XL (8rem / 128px)', value: '8rem', num: 128 },
];

export default function TextProperties({ selectedElement, onUpdate, brand }: Props) {
    if (selectedElement.type !== 'text') return null;

    const style = selectedElement.style || {};
    const data = selectedElement.data || {};

    const isBold = style.fontWeight === '700' || style.fontWeight === '800' || style.fontWeight === '900' || style.fontWeight === 'bold';
    const isItalic = style.fontStyle === 'italic';
    const isUnderline = (style.textDecoration || '').includes('underline');
    const isStrikethrough = (style.textDecoration || '').includes('line-through');
    const textAlign = style.textAlign || 'left';
    const textTransform = style.textTransform || 'none';

    // Parse current font size for stepper
    const parseSizeNum = (val: any) => {
        if (!val) return 16;
        if (typeof val === 'number') return val;
        const str = String(val).trim();
        if (str.endsWith('rem')) return Math.round(parseFloat(str) * 16);
        if (str.endsWith('px')) return Math.round(parseFloat(str));
        const num = parseFloat(str);
        return isNaN(num) ? 16 : Math.round(num);
    };

    const currentSizePx = parseSizeNum(style.fontSize);

    const changeSizeBy = (delta: number) => {
        const nextPx = Math.max(8, Math.min(160, currentSizePx + delta));
        onUpdate('style.fontSize', `${(nextPx / 16).toFixed(3).replace(/\.?0+$/, '')}rem`);
    };

    const toggleDecoration = (type: 'underline' | 'line-through') => {
        const current = style.textDecoration || '';
        let next = '';
        if (type === 'underline') {
            if (isUnderline) {
                next = isStrikethrough ? 'line-through' : 'none';
            } else {
                next = isStrikethrough ? 'underline line-through' : 'underline';
            }
        } else if (type === 'line-through') {
            if (isStrikethrough) {
                next = isUnderline ? 'underline' : 'none';
            } else {
                next = isUnderline ? 'underline line-through' : 'line-through';
            }
        }
        onUpdate('style.textDecoration', next);
    };

    return (
        <div className="space-y-5 pt-4 border-t border-gray-100">
            {/* Header / Title */}
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" />
                    Text Editor & Typography
                </h4>
            </div>

            {/* Direct Text Content Editor */}
            <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                    <span>Text Content</span>
                    <span className="text-[10px] text-gray-400 font-normal">Supports HTML / Variables</span>
                </label>
                <textarea
                    rows={3}
                    value={data.content || ''}
                    onChange={(e) => onUpdate('data.content', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y font-mono text-gray-800 bg-gray-50/50"
                    placeholder="Enter your text here..."
                />
                
                {/* Brand Variable Quick Insert Pills */}
                {brand && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-gray-400 font-semibold self-center mr-1">Insert:</span>
                        <button
                            type="button"
                            onClick={() => onUpdate('data.content', `${data.content || ''} {{brand.companyName}}`)}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded border border-indigo-200/60 transition-colors"
                        >
                            + Company Name
                        </button>
                        {brand.phone && (
                            <button
                                type="button"
                                onClick={() => onUpdate('data.content', `${data.content || ''} {{brand.phone}}`)}
                                className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded border border-indigo-200/60 transition-colors"
                            >
                                + Phone
                            </button>
                        )}
                        {brand.email && (
                            <button
                                type="button"
                                onClick={() => onUpdate('data.content', `${data.content || ''} {{brand.email}}`)}
                                className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded border border-indigo-200/60 transition-colors"
                            >
                                + Email
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Tag & Heading Hierarchy */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Heading / HTML Tag</label>
                <CustomSelect 
                    value={style.tagName || 'div'} 
                    onChange={(e: any) => onUpdate('style.tagName', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="h1">Heading 1 (h1) — Main Page Title</option>
                    <option value="h2">Heading 2 (h2) — Section Headline</option>
                    <option value="h3">Heading 3 (h3) — Sub-headline</option>
                    <option value="h4">Heading 4 (h4) — Card Title</option>
                    <option value="h5">Heading 5 (h5) — Small Heading</option>
                    <option value="h6">Heading 6 (h6) — Sub-title</option>
                    <option value="p">Paragraph (p) — Body Text</option>
                    <option value="div">Div Block (div) — Standard Container</option>
                    <option value="span">Inline Span (span) — Inline Text</option>
                </CustomSelect>
            </div>

            {/* Font Family */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Font Family</label>
                <CustomSelect 
                    value={style.fontFamily || 'inherit'} 
                    onChange={(e: any) => onUpdate('style.fontFamily', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    {FONT_FAMILIES.map(f => (
                        <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                    ))}
                </CustomSelect>
            </div>

            {/* Quick Formatting Toolbar (B / I / U / S) */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Style & Formatting</label>
                <div className="flex items-center gap-1.5 bg-gray-100/80 p-1.5 rounded-lg border border-gray-200">
                    <button
                        type="button"
                        onClick={() => onUpdate('style.fontWeight', isBold ? '400' : '700')}
                        className={`flex-1 py-1.5 flex items-center justify-center rounded-md font-bold transition-all text-xs ${
                            isBold ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Bold"
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate('style.fontStyle', isItalic ? 'normal' : 'italic')}
                        className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all text-xs ${
                            isItalic ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Italic"
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleDecoration('underline')}
                        className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all text-xs ${
                            isUnderline ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Underline"
                    >
                        <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleDecoration('line-through')}
                        className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all text-xs ${
                            isStrikethrough ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Strikethrough"
                    >
                        <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Font Size (Stepper + Presets + Exact Value) */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center justify-between">
                    <span>Font Size</span>
                    <span className="text-xs font-mono font-bold text-indigo-600">{currentSizePx}px ({style.fontSize || '1rem'})</span>
                </label>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => changeSizeBy(-2)}
                            className="p-2 hover:bg-gray-200 text-gray-600 active:bg-gray-300 transition-colors"
                            title="Decrease Size"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-5 bg-gray-300"></div>
                        <button
                            type="button"
                            onClick={() => changeSizeBy(2)}
                            className="p-2 hover:bg-gray-200 text-gray-600 active:bg-gray-300 transition-colors"
                            title="Increase Size"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="flex-1">
                        <CustomSelect 
                            value={style.fontSize || '1rem'} 
                            onChange={(e: any) => onUpdate('style.fontSize', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        >
                            {FONT_SIZE_PRESETS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </CustomSelect>
                    </div>
                </div>
            </div>

            {/* Font Weight */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Font Weight</label>
                <CustomSelect 
                    value={style.fontWeight || '400'} 
                    onChange={(e: any) => onUpdate('style.fontWeight', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="100">Thin (100)</option>
                    <option value="200">Extra Light (200)</option>
                    <option value="300">Light (300)</option>
                    <option value="400">Regular / Normal (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semi Bold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extra Bold (800)</option>
                    <option value="900">Black (900)</option>
                </CustomSelect>
            </div>

            {/* Text Alignment */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Alignment</label>
                <div className="flex items-center gap-1.5 bg-gray-100/80 p-1.5 rounded-lg border border-gray-200">
                    <button
                        type="button"
                        onClick={() => onUpdate('style.textAlign', 'left')}
                        className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all ${
                            textAlign === 'left' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Align Left"
                    >
                        <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate('style.textAlign', 'center')}
                        className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all ${
                            textAlign === 'center' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Align Center"
                    >
                        <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate('style.textAlign', 'right')}
                        className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all ${
                            textAlign === 'right' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Align Right"
                    >
                        <AlignRight className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate('style.textAlign', 'justify')}
                        className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all ${
                            textAlign === 'justify' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Justify"
                    >
                        <AlignJustify className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Text Transform / Capitalization */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Transformation</label>
                <div className="grid grid-cols-4 gap-1.5 bg-gray-100/80 p-1.5 rounded-lg border border-gray-200">
                    <button
                        type="button"
                        onClick={() => onUpdate('style.textTransform', 'none')}
                        className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                            textTransform === 'none' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Normal / None"
                    >
                        None
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate('style.textTransform', 'uppercase')}
                        className={`py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                            textTransform === 'uppercase' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="UPPERCASE"
                    >
                        UPPER
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate('style.textTransform', 'lowercase')}
                        className={`py-1.5 text-xs font-semibold lowercase rounded-md transition-all ${
                            textTransform === 'lowercase' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="lowercase"
                    >
                        lower
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate('style.textTransform', 'capitalize')}
                        className={`py-1.5 text-xs font-semibold capitalize rounded-md transition-all ${
                            textTransform === 'capitalize' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
                        }`}
                        title="Capitalize"
                    >
                        Title
                    </button>
                </div>
            </div>

            {/* Line Height & Letter Spacing */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Line Height</label>
                    <CustomSelect
                        value={style.lineHeight || '1.5'}
                        onChange={(e: any) => onUpdate('style.lineHeight', e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="1">Tight (1.0)</option>
                        <option value="1.2">Snug (1.2)</option>
                        <option value="1.35">Normal (1.35)</option>
                        <option value="1.5">Relaxed (1.5)</option>
                        <option value="1.75">Loose (1.75)</option>
                        <option value="2">Double (2.0)</option>
                    </CustomSelect>
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Letter Spacing</label>
                    <CustomSelect
                        value={style.letterSpacing || 'normal'}
                        onChange={(e: any) => onUpdate('style.letterSpacing', e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="-0.05em">Tighter (-0.05em)</option>
                        <option value="-0.025em">Tight (-0.025em)</option>
                        <option value="normal">Normal (0)</option>
                        <option value="0.025em">Wide (0.025em)</option>
                        <option value="0.05em">Wider (0.05em)</option>
                        <option value="0.1em">Widest (0.1em)</option>
                    </CustomSelect>
                </div>
            </div>

            {/* Text Color & Palette Presets */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Color</label>
                
                {/* Preset Color Swatches */}
                <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                    {PRESET_COLORS.map(color => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => onUpdate('style.color', color)}
                            className={`h-6 rounded-md border transition-all hover:scale-105 ${
                                (style.color || '').toLowerCase() === color.toLowerCase()
                                    ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                                    : 'border-gray-300/80'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                        />
                    ))}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={style.color || '#000000'} 
                        onChange={(e) => onUpdate('style.color', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm shrink-0"
                    />
                    <input 
                        type="text" 
                        value={style.color || '#000000'} 
                        onChange={(e) => onUpdate('style.color', e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
                        placeholder="#000000"
                    />
                </div>
            </div>

            {/* Link / URL Action */}
            <div className="pt-2 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span>Link / Click URL (Optional)</span>
                </label>
                <input 
                    type="text" 
                    value={data.link || ''} 
                    onChange={(e) => onUpdate('data.link', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. https://example.com or #section"
                />
                {data.link && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.openInNewTab !== false}
                            onChange={(e) => onUpdate('data.openInNewTab', e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Open link in new tab</span>
                    </label>
                )}
            </div>
        </div>
    );
}
