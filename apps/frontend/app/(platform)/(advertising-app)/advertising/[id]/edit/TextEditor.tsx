'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
    AlignJustify, Palette, Type, ChevronDown, Minus, Plus, List, ListOrdered,
    Link, Unlink
} from 'lucide-react';

interface TextEditorProps {
    /** Anchor element ref (the contentEditable element) */
    anchorRef: React.RefObject<HTMLElement | null>;
    /** Whether toolbar is visible */
    visible: boolean;
    /** Hide the toolbar */
    onClose: () => void;
}

const FONT_WEIGHTS = [
    { label: 'Thin', value: '100' },
    { label: 'Extra Light', value: '200' },
    { label: 'Light', value: '300' },
    { label: 'Regular', value: '400' },
    { label: 'Medium', value: '500' },
    { label: 'Semi Bold', value: '600' },
    { label: 'Bold', value: '700' },
    { label: 'Extra Bold', value: '800' },
    { label: 'Black', value: '900' },
];

const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96];

const HEADING_OPTIONS = [
    { label: 'Normal', tag: 'P', value: '' },
    { label: 'Heading 1', tag: 'H1', value: 'h1' },
    { label: 'Heading 2', tag: 'H2', value: 'h2' },
    { label: 'Heading 3', tag: 'H3', value: 'h3' },
    { label: 'Heading 4', tag: 'H4', value: 'h4' },
    { label: 'Heading 5', tag: 'H5', value: 'h5' },
    { label: 'Heading 6', tag: 'H6', value: 'h6' },
];

const PRESET_COLORS = [
    '#000000', '#FFFFFF', '#EF4444', '#F97316', '#EAB308', '#22C55E',
    '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#1E293B', '#7C3AED'
];

export default function TextEditor({ anchorRef, visible, onClose }: TextEditorProps) {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [activeStates, setActiveStates] = useState({
        bold: false, italic: false, underline: false, strikethrough: false,
    });
    const [currentWeight, setCurrentWeight] = useState('400');
    const [currentSize, setCurrentSize] = useState('');
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentHeading, setCurrentHeading] = useState('');
    const [showWeightDropdown, setShowWeightDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);
    const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (visible) {
            setContainer(document.body);
        }
    }, [visible]);    // Update position based on selection or element
    const updatePosition = useCallback(() => {
        if (!anchorRef.current) return;
        
        let rect = anchorRef.current.getBoundingClientRect();
        
        // Try to position above the actual text selection
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const rangeRect = range.getBoundingClientRect();
            // Only use range rect if it has valid dimensions
            if (rangeRect.width > 0 && rangeRect.height > 0) {
                rect = rangeRect;
            }
        }

        const toolbarHeight = 44;
        const gap = 8;

        let top = rect.top - toolbarHeight - gap;
        let left = rect.left + rect.width / 2;

        // If toolbar would go off-screen top, put it below
        if (top < 10) {
            top = rect.bottom + gap;
        }
        // Clamp left
        left = Math.max(200, Math.min(left, window.innerWidth - 200));

        setPosition({ top, left });
    }, [anchorRef]);

    // Query active formatting states
    const queryStates = useCallback(() => {
        setActiveStates({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strikethrough: document.queryCommandState('strikeThrough'),
        });
        const fontSel = window.getSelection();
        if (fontSel && fontSel.anchorNode) {
            const parent = fontSel.anchorNode.nodeType === 3 ? fontSel.anchorNode.parentElement : fontSel.anchorNode as HTMLElement;
            if (parent) {
                const style = window.getComputedStyle(parent);
                // getComputedStyle returns font-weight as a string like "400" or "bold" (which is 700)
                let weight = style.fontWeight || '400';
                if (weight === 'bold') weight = '700';
                if (weight === 'normal') weight = '400';
                setCurrentWeight(weight);
            }
        }

        const sizeMap: Record<string, string> = { '1': '10', '2': '13', '3': '16', '4': '18', '5': '24', '6': '32', '7': '48' };
        const rawSize = document.queryCommandValue('fontSize');
        setCurrentSize(sizeMap[rawSize] || rawSize || '');

        const fgColor = document.queryCommandValue('foreColor');
        if (fgColor) {
            // Convert rgb to hex
            if (fgColor.startsWith('rgb')) {
                const match = fgColor.match(/\d+/g);
                if (match) {
                    const hex = '#' + match.slice(0, 3).map((n: string) => parseInt(n).toString(16).padStart(2, '0')).join('');
                    setCurrentColor(hex);
                }
            } else {
                setCurrentColor(fgColor);
            }
        }

        // Detect heading tag
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
            let node: Node | null = sel.anchorNode;
            while (node && node !== anchorRef.current) {
                if (node.nodeType === 1) {
                    const tag = (node as Element).tagName;
                    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) {
                        setCurrentHeading(tag.toLowerCase());
                        return;
                    }
                }
                node = node.parentNode;
            }
        }
        setCurrentHeading('');
    }, [anchorRef]);

    useEffect(() => {
        if (visible) {
            updatePosition();
            queryStates();
        }
    }, [visible, updatePosition, queryStates]);

    // Listen for selection changes to update states
    useEffect(() => {
        if (!visible) return;
        const handler = () => {
            queryStates();
            updatePosition();
        };
        document.addEventListener('selectionchange', handler);
        return () => document.removeEventListener('selectionchange', handler);
    }, [visible, queryStates, updatePosition]);

    // Close dropdowns on outside click
    useEffect(() => {
        if (!visible) return;
        const handler = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setShowWeightDropdown(false);
                setShowSizeDropdown(false);
                setShowHeadingDropdown(false);
                setShowColorPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [visible]);

    if (!visible) return null;

    const exec = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value);
        triggerInput();
        queryStates();
    };

    const applyHeading = (tag: string) => {
        applyWithSelectionRestored(() => {
            if (tag) {
                exec('formatBlock', `<${tag}>`);
            } else {
                exec('formatBlock', '<p>');
            }
        });
        setTimeout(() => setShowHeadingDropdown(false), 0);
    };

    const triggerInput = () => {
        if (anchorRef.current) {
            anchorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    const applyWithSelectionRestored = (applyFn: () => void) => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !anchorRef.current) {
            applyFn();
            return;
        }

        // Save current selection state
        const range = sel.getRangeAt(0);
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;

        // Execute the formatting function
        applyFn();

        // Attempt to restore selection. We wrap in try-catch because structural
        // DOM changes (like alignment wrappers) can invalidate the old nodes.
        try {
            const newRange = document.createRange();
            newRange.setStart(startContainer, startOffset);
            newRange.setEnd(endContainer, endOffset);
            sel.removeAllRanges();
            sel.addRange(newRange);
        } catch (e) {
            // Log failure but continue
            console.log('Failed to restore precise text selection after structural change.');
        } finally {
            // ALWAYS focus back to the editor to prevent onBlur timeouts from hiding the toolbar
            if (anchorRef.current) {
                anchorRef.current.focus();
            }
        }
    };

    const applyFontSize = (size: number) => {
        applyWithSelectionRestored(() => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                exec('fontSize', '7'); // Temp size
                const el = anchorRef.current;
                if (el) {
                    const fontElements = el.querySelectorAll('font[size="7"]');
                    fontElements.forEach((fontEl) => {
                        fontEl.removeAttribute('size');
                        (fontEl as HTMLElement).style.fontSize = `${size}px`;
                    });
                }
                triggerInput();
            }
        });
        setCurrentSize(String(size));
        setTimeout(() => setShowSizeDropdown(false), 0);
    };

    const applyFontWeight = (weight: string) => {
        applyWithSelectionRestored(() => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                exec('fontName', 'TempFontWeight'); // Temp font
                const el = anchorRef.current;
                if (el) {
                    const fontElements = Array.from(el.querySelectorAll('font[face="TempFontWeight"]'));
                    fontElements.forEach((fontEl) => {
                        fontEl.removeAttribute('face');
                        (fontEl as HTMLElement).style.fontWeight = weight;
                    });
                }
                triggerInput();
            }
        });
        setCurrentWeight(weight);
        setTimeout(() => setShowWeightDropdown(false), 0);
    };

    const applyColor = (color: string) => {
        applyWithSelectionRestored(() => {
            exec('foreColor', color);
            triggerInput();
        });
        setCurrentColor(color);
    };

    const insertLink = () => {
        const url = prompt('Enter URL:');
        if (url) {
            exec('createLink', url);
        }
    };

    const currentHeadingLabel = HEADING_OPTIONS.find(h => h.value === currentHeading)?.tag || 'P';

    if (!visible || !container) return null;

    return createPortal(
        <div
            ref={toolbarRef}
            className="fixed z-[10000] animate-in fade-in zoom-in-95 duration-150 flex items-center"
            style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <div className="bg-gray-900 text-white rounded-xl shadow-sm border border-gray-700/50 flex items-center divide-x divide-gray-700/50 overflow-visible h-9">
                
                {/* Heading Dropdown */}
                <div className="relative px-1 py-1">
                    <button
                        onClick={() => { setShowHeadingDropdown(!showHeadingDropdown); setShowWeightDropdown(false); setShowSizeDropdown(false); setShowColorPicker(false); }}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold hover:bg-white/10 rounded-lg transition-colors min-w-[42px] justify-center"
                    >
                        {currentHeadingLabel}
                        <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                    {showHeadingDropdown && (
                        <div className="absolute top-full left-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 min-w-[160px] z-10 max-h-60 overflow-y-auto">
                            {HEADING_OPTIONS.map((h) => (
                                <button
                                    key={h.value}
                                    onClick={() => applyHeading(h.value)}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors flex items-center gap-3 ${currentHeading === h.value ? 'text-indigo-400 bg-white/5' : 'text-gray-300'}`}
                                >
                                    <span className="font-mono text-[10px] text-gray-500 w-5">{h.tag}</span>
                                    <span className={h.value.startsWith('h') ? `font-bold ${h.value === 'h1' ? 'text-lg' : h.value === 'h2' ? 'text-base' : 'text-sm'}` : 'text-sm'}>
                                        {h.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Font Weight Dropdown */}
                <div className="relative px-1 py-1">
                    <button
                        onClick={() => { setShowWeightDropdown(!showWeightDropdown); setShowHeadingDropdown(false); setShowSizeDropdown(false); setShowColorPicker(false); }}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium hover:bg-white/10 rounded-lg transition-colors max-w-[100px] truncate"
                        title="Font Weight"
                    >
                        <Type className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        <span className="truncate">{FONT_WEIGHTS.find(w => w.value === currentWeight)?.label || 'Regular'}</span>
                        <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                    </button>
                    {showWeightDropdown && (
                        <div className="absolute top-full left-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 min-w-[140px] z-10 max-h-60 overflow-y-auto">
                            {FONT_WEIGHTS.map((weight) => (
                                <button
                                    key={weight.value}
                                    onClick={() => applyFontWeight(weight.value)}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors ${currentWeight === weight.value ? 'text-indigo-400 bg-white/5' : 'text-gray-300'}`}
                                    style={{ fontWeight: weight.value }}
                                >
                                    {weight.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Font Size */}
                <div className="relative flex items-center px-1 py-1 gap-0.5">
                    <button onClick={() => { const s = parseInt(currentSize) || 16; applyFontSize(Math.max(8, s - 1)); }} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors">
                        <Minus className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowWeightDropdown(false); setShowHeadingDropdown(false); setShowColorPicker(false); }}
                        className="px-1.5 py-1 text-xs font-mono font-semibold hover:bg-white/10 rounded-lg transition-colors min-w-[32px] text-center"
                    >
                        {currentSize || '16'}
                    </button>
                    <button onClick={() => { const s = parseInt(currentSize) || 16; applyFontSize(Math.min(120, s + 1)); }} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors">
                        <Plus className="w-3 h-3" />
                    </button>
                    {showSizeDropdown && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 min-w-[80px] z-10 max-h-48 overflow-y-auto">
                            {FONT_SIZES.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => applyFontSize(size)}
                                    className={`w-full text-center px-3 py-1.5 text-xs font-mono hover:bg-white/10 transition-colors ${currentSize === String(size) ? 'text-indigo-400 bg-white/5' : 'text-gray-300'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Text Formatting: B I U S */}
                <div className="flex items-center px-1 py-1 gap-0.5">
                    <button
                        onClick={() => applyWithSelectionRestored(() => exec('bold'))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${activeStates.bold ? 'bg-indigo-500 text-white' : 'hover:bg-white/10'}`}
                        title="Bold"
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => applyWithSelectionRestored(() => exec('italic'))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${activeStates.italic ? 'bg-indigo-500 text-white' : 'hover:bg-white/10'}`}
                        title="Italic"
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => applyWithSelectionRestored(() => exec('underline'))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${activeStates.underline ? 'bg-indigo-500 text-white' : 'hover:bg-white/10'}`}
                        title="Underline"
                    >
                        <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => applyWithSelectionRestored(() => exec('strikeThrough'))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${activeStates.strikethrough ? 'bg-indigo-500 text-white' : 'hover:bg-white/10'}`}
                        title="Strikethrough"
                    >
                        <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Font Color */}
                <div className="relative px-1 py-1">
                    <button
                        onClick={() => { setShowColorPicker(!showColorPicker); setShowWeightDropdown(false); setShowSizeDropdown(false); setShowHeadingDropdown(false); }}
                        className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors relative"
                        title="Text Color"
                    >
                        <Palette className="w-3.5 h-3.5" />
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full" style={{ backgroundColor: currentColor }} />
                    </button>
                    {showColorPicker && (
                        <div className="absolute top-full right-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 z-10 min-w-[200px]">
                            <div className="grid grid-cols-6 gap-1.5 mb-3">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => applyColor(c)}
                                        className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${currentColor.toLowerCase() === c.toLowerCase() ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-gray-600'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                                <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => applyColor(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                />
                                <input
                                    type="text"
                                    value={currentColor}
                                    onChange={(e) => applyColor(e.target.value)}
                                    className="flex-1 bg-gray-800 text-gray-300 border border-gray-600 rounded-lg px-2 py-1.5 text-xs font-mono uppercase"
                                    placeholder="#000000"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Alignment */}
                <div className="flex items-center px-1 py-1 gap-0.5">
                    <button onClick={() => applyWithSelectionRestored(() => exec('justifyLeft'))} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors" title="Align Left">
                        <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => applyWithSelectionRestored(() => exec('justifyCenter'))} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors" title="Align Center">
                        <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => applyWithSelectionRestored(() => exec('justifyRight'))} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors" title="Align Right">
                        <AlignRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Lists & Link */}
                <div className="flex items-center px-1 py-1 gap-0.5">
                    <button onClick={() => applyWithSelectionRestored(() => exec('insertUnorderedList'))} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors" title="Bullet List">
                        <List className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => applyWithSelectionRestored(() => exec('insertOrderedList'))} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors" title="Numbered List">
                        <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => applyWithSelectionRestored(insertLink)} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors" title="Insert Link">
                        <Link className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => exec('unlink')} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors" title="Remove Link">
                        <Unlink className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>,
        container
    );
}
