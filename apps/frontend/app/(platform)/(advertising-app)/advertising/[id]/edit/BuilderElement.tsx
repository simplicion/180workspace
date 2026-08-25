'use client';
import React, { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { ElementNode } from './types';
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { BoxElement } from './_components/elements/BoxElement';
import { RowElement } from './_components/elements/RowElement';
import { ColumnElement } from './_components/elements/ColumnElement';
import { TextElement } from './_components/elements/TextElement';
import { MediaElement } from './_components/elements/MediaElement';
import { ButtonElement } from './_components/elements/ButtonElement';
import { LineElement } from './_components/elements/LineElement';
import CodeElement from './_components/elements/CodeElement';
import { motion } from 'framer-motion';

const getAnimationProps = (animationType?: string) => {
    switch (animationType) {
        case 'fade-in':
            return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.6 } };
        case 'fade-up':
            return { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.6, ease: "easeOut" as const } };
        case 'fade-left':
            return { initial: { opacity: 0, x: -40 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.6, ease: "easeOut" as const } };
        case 'fade-right':
            return { initial: { opacity: 0, x: 40 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.6, ease: "easeOut" as const } };
        case 'scale-up':
            return { initial: { opacity: 0, scale: 0.8 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.5, type: 'spring' as const, bounce: 0.3 } };
        default:
            return {};
    }
};

const AnimatedWrapper = ({ animation, children, style, className }: any) => {
    if (!animation || animation === 'none') {
        return <>{children}</>;
    }
    const props = getAnimationProps(animation);
    return <motion.div {...(props as any)} style={style} className={className}>{children}</motion.div>;
};

function scaleMobileFontSize(val: any): string | undefined {
    if (!val) return undefined;
    const str = String(val).trim();
    
    if (str.endsWith('px')) {
        const num = parseFloat(str);
        if (isNaN(num)) return str;
        if (num >= 48) return '24px';
        if (num >= 40) return '21px';
        if (num >= 36) return '19px';
        if (num >= 32) return '18px';
        if (num >= 28) return '17px';
        if (num >= 24) return '16px';
        return str;
    }
    
    if (str.endsWith('rem')) {
        const num = parseFloat(str);
        if (isNaN(num)) return str;
        if (num >= 3) return '1.5rem';
        if (num >= 2.5) return '1.35rem';
        if (num >= 2) return '1.25rem';
        if (num >= 1.5) return '1.1rem';
        return str;
    }
    
    if (typeof val === 'number') {
        if (val >= 48) return '24px';
        if (val >= 40) return '21px';
        if (val >= 36) return '19px';
        if (val >= 32) return '18px';
        if (val >= 24) return '16px';
    }
    
    return str;
}

function toFluidFontSize(val: any): string | undefined {
    if (!val) return undefined;
    const str = String(val).trim();
    
    if (str.includes('clamp') || str.includes('calc') || str.includes('vw')) return str;
    
    if (str.endsWith('px')) {
        const num = parseFloat(str);
        if (isNaN(num) || num <= 24) return str;
        const minRem = Math.max(1.25, parseFloat((num * 0.55 / 16).toFixed(2)));
        const maxRem = parseFloat((num / 16).toFixed(2));
        return `clamp(${minRem}rem, 4vw + 0.5rem, ${maxRem}rem)`;
    }
    
    if (str.endsWith('rem')) {
        const num = parseFloat(str);
        if (isNaN(num) || num <= 1.5) return str;
        const minRem = Math.max(1.25, parseFloat((num * 0.6).toFixed(2)));
        return `clamp(${minRem}rem, 4vw + 0.5rem, ${num}rem)`;
    }
    
    if (str.endsWith('em')) {
        const num = parseFloat(str);
        if (isNaN(num) || num <= 1.5) return str;
        const minRem = Math.max(1.25, parseFloat((num * 0.6).toFixed(2)));
        return `clamp(${minRem}em, 4vw + 0.5em, ${num}em)`;
    }
    
    if (typeof val === 'number') {
        if (val > 24) {
            const minRem = Math.max(1.25, parseFloat((val * 0.55 / 16).toFixed(2)));
            const maxRem = parseFloat((val / 16).toFixed(2));
            return `clamp(${minRem}rem, 4vw + 0.5rem, ${maxRem}rem)`;
        }
    }
    
    return str;
}

export function normalizeStyle(rawStyle: any = {}, isMobileView: boolean = false): React.CSSProperties {
    if (!rawStyle) return {};
    const style: any = { ...rawStyle };

    // Fluid typography scaling for headings and large text
    if (style.fontSize) {
        style.fontSize = isMobileView ? scaleMobileFontSize(style.fontSize) : toFluidFontSize(style.fontSize);
    }

    // Always decompose shorthand 'padding' into individual longhands to prevent React conflicting property warnings
    if (style.padding !== undefined) {
        const p = String(style.padding).trim();
        delete style.padding;
        
        if (style.paddingTop === undefined || style.paddingBottom === undefined || style.paddingLeft === undefined || style.paddingRight === undefined) {
            const parts = p.split(/\s+/);
            let top = p, right = p, bottom = p, left = p;
            if (parts.length === 1) {
                top = right = bottom = left = parts[0];
            } else if (parts.length === 2) {
                top = bottom = parts[0];
                right = left = parts[1];
            } else if (parts.length === 3) {
                top = parts[0];
                right = left = parts[1];
                bottom = parts[2];
            } else if (parts.length >= 4) {
                top = parts[0];
                right = parts[1];
                bottom = parts[2];
                left = parts[3];
            }
            if (style.paddingTop === undefined) style.paddingTop = top;
            if (style.paddingRight === undefined) style.paddingRight = right;
            if (style.paddingBottom === undefined) style.paddingBottom = bottom;
            if (style.paddingLeft === undefined) style.paddingLeft = left;
        }
    }

    if (style.paddingY !== undefined) {
        const val = typeof style.paddingY === 'number' ? `${style.paddingY}rem` : style.paddingY;
        if (style.paddingTop === undefined) style.paddingTop = val;
        if (style.paddingBottom === undefined) style.paddingBottom = val;
        delete style.paddingY;
    }
    if (style.paddingX !== undefined) {
        const val = typeof style.paddingX === 'number' ? `${style.paddingX}rem` : style.paddingX;
        if (style.paddingLeft === undefined) style.paddingLeft = val;
        if (style.paddingRight === undefined) style.paddingRight = val;
        delete style.paddingX;
    }

    // Always decompose shorthand 'margin' if any longhand or axis is present or might be toggled
    if (style.margin !== undefined && (style.marginTop !== undefined || style.marginBottom !== undefined || style.marginLeft !== undefined || style.marginRight !== undefined || style.marginY !== undefined || style.marginX !== undefined)) {
        const m = String(style.margin).trim();
        delete style.margin;
        const parts = m.split(/\s+/);
        let top = m, right = m, bottom = m, left = m;
        if (parts.length === 1) {
            top = right = bottom = left = parts[0];
        } else if (parts.length === 2) {
            top = bottom = parts[0];
            right = left = parts[1];
        } else if (parts.length === 3) {
            top = parts[0];
            right = left = parts[1];
            bottom = parts[2];
        } else if (parts.length >= 4) {
            top = parts[0];
            right = parts[1];
            bottom = parts[2];
            left = parts[3];
        }
        if (style.marginTop === undefined) style.marginTop = top;
        if (style.marginRight === undefined) style.marginRight = right;
        if (style.marginBottom === undefined) style.marginBottom = bottom;
        if (style.marginLeft === undefined) style.marginLeft = left;
    }
    if (style.marginY !== undefined) {
        const val = typeof style.marginY === 'number' ? `${style.marginY}rem` : style.marginY;
        if (style.marginTop === undefined) style.marginTop = val;
        if (style.marginBottom === undefined) style.marginBottom = val;
        delete style.marginY;
    }
    if (style.marginX !== undefined) {
        const val = typeof style.marginX === 'number' ? `${style.marginX}rem` : style.marginX;
        if (style.marginLeft === undefined) style.marginLeft = val;
        if (style.marginRight === undefined) style.marginRight = val;
        delete style.marginX;
    }

    // Mobile specific spacing caps
    if (isMobileView) {
        const capSpacing = (v: any, maxRem: number = 1.25) => {
            if (!v) return v;
            const str = String(v).trim();
            if (str.endsWith('rem')) {
                const n = parseFloat(str);
                return !isNaN(n) && n > maxRem ? `${maxRem}rem` : v;
            }
            if (str.endsWith('px')) {
                const n = parseFloat(str);
                const maxPx = maxRem * 16;
                return !isNaN(n) && n > maxPx ? `${maxPx}px` : v;
            }
            return v;
        };

        style.paddingLeft = capSpacing(style.paddingLeft, 1);
        style.paddingRight = capSpacing(style.paddingRight, 1);
        style.marginLeft = capSpacing(style.marginLeft, 0.5);
        style.marginRight = capSpacing(style.marginRight, 0.5);
    }

    // Ensure layout containment defaults
    style.maxWidth = '100%';
    style.boxSizing = 'border-box';

    return style;
}

export interface BuilderElementProps {
    node: ElementNode;
    brand?: any;
    selectedElementId?: string | null;
    setSelectedElementId?: (id: string | null) => void;
    updateElement?: (id: string, path: string, value: any) => void;
    removeElement?: (id: string) => void;
    duplicateElement?: (id: string) => void;
    moveElementUp?: (id: string) => void;
    moveElementDown?: (id: string) => void;
    insertElementRelative?: (targetId: string, newType: string, position: 'left' | 'right' | 'top' | 'bottom' | 'inside') => void;
    depth?: number;
    isReadOnly?: boolean;
    viewMode?: 'desktop' | 'tablet' | 'mobile';
}

export function BuilderElement({
    node,
    brand,
    selectedElementId,
    setSelectedElementId,
    updateElement,
    removeElement,
    duplicateElement,
    moveElementUp,
    moveElementDown,
    insertElementRelative,
    depth = 0,
    isReadOnly = false,
    viewMode = 'desktop'
}: BuilderElementProps) {
    const isMobileView = viewMode === 'mobile';

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id: node.id, 
        data: { type: node.type, node },
        disabled: isReadOnly 
    });

    let display = node.style?.display;
    let flexDirection = node.style?.flexDirection;
    let flexWrap = node.style?.flexWrap;

    if (node.type === 'row') {
        display = 'flex';
        flexDirection = isMobileView ? 'column' : (flexDirection || 'row');
        flexWrap = flexWrap || 'wrap';
    } else if (node.type === 'column') {
        display = 'flex';
        flexDirection = 'column';
    } else if (node.type === 'box') {
        display = display || 'flex';
        if (isMobileView && (flexDirection === 'row' || (!flexDirection && display === 'flex'))) {
            flexDirection = 'column';
        }
    } else if (node.type === 'section') {
        display = display || 'block';
    }

    // --- Outer Spacing (Margin) Drag Logic ---
    const startPosRef = useRef({ x: 0, y: 0 });
    const startMarginRef = useRef(0);
    const latestMarginRef = useRef<string | null>(null);
    const [draggingSide, setDraggingSide] = useState<string | null>(null);
    const [localMargin, setLocalMargin] = useState<Record<string, string> | null>(null);

    const rawStyle = {
        ...(isReadOnly ? {} : {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        }),
        ...node.style,
        ...(display && { display }),
        ...(flexDirection && { flexDirection }),
        ...(flexWrap && { flexWrap }),
        ...(localMargin || {})
    };

    if (isMobileView && (node.type === 'column' || node.type === 'row' || node.type === 'box')) {
        rawStyle.width = '100%';
        rawStyle.maxWidth = '100%';
    }

    const style = normalizeStyle(rawStyle, isMobileView);
    const isSelected = !isReadOnly && selectedElementId === node.id;

    const handleMarginDragStart = (e: React.MouseEvent, side: string) => {
        if (isReadOnly || !updateElement) return;
        e.preventDefault();
        e.stopPropagation();

        const parseMargin = (val: any) => {
            if (val === undefined || val === null) return undefined;
            if (typeof val === 'number') return val;
            const parsed = parseFloat(String(val).replace('rem', '').replace('px', '').replace('em', ''));
            return isNaN(parsed) ? undefined : parsed;
        };

        let currentMargin = 0;
        if (side === 'top') currentMargin = parseMargin(node.style?.marginTop) ?? parseMargin(node.style?.marginY) ?? parseMargin(node.style?.margin) ?? 0;
        if (side === 'bottom') currentMargin = parseMargin(node.style?.marginBottom) ?? parseMargin(node.style?.marginY) ?? parseMargin(node.style?.margin) ?? 0;
        if (side === 'left') currentMargin = parseMargin(node.style?.marginLeft) ?? parseMargin(node.style?.marginX) ?? parseMargin(node.style?.margin) ?? 0;
        if (side === 'right') currentMargin = parseMargin(node.style?.marginRight) ?? parseMargin(node.style?.marginX) ?? parseMargin(node.style?.margin) ?? 0;
        
        let currentMarginStr = `${currentMargin}rem`;
        const marginKey = `margin${side.charAt(0).toUpperCase() + side.slice(1)}`;

        startPosRef.current = { x: e.clientX, y: e.clientY };
        startMarginRef.current = currentMargin;
        latestMarginRef.current = currentMarginStr;
        
        setDraggingSide(side);
        setLocalMargin({ [marginKey]: currentMarginStr });

        document.body.style.userSelect = 'none';
        document.body.style.cursor = (side === 'top' || side === 'bottom') ? 'ns-resize' : 'ew-resize';

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startPosRef.current.x;
            const deltaY = moveEvent.clientY - startPosRef.current.y;

            let deltaRem = 0;
            if (side === 'top') deltaRem = deltaY / 16;
            if (side === 'bottom') deltaRem = -deltaY / 16;
            if (side === 'left') deltaRem = deltaX / 16;
            if (side === 'right') deltaRem = -deltaX / 16;

            const newMargin = Math.max(0, parseFloat((startMarginRef.current + deltaRem).toFixed(2)));
            const newMarginStr = `${newMargin}rem`;
            
            latestMarginRef.current = newMarginStr;
            setLocalMargin({ [marginKey]: newMarginStr });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            setDraggingSide(null);
            
            if (latestMarginRef.current) {
                if (side === 'top') updateElement(node.id, 'style.marginTop', latestMarginRef.current);
                if (side === 'bottom') updateElement(node.id, 'style.marginBottom', latestMarginRef.current);
                if (side === 'left') updateElement(node.id, 'style.marginLeft', latestMarginRef.current);
                if (side === 'right') updateElement(node.id, 'style.marginRight', latestMarginRef.current);
            }
            
            setLocalMargin(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const renderPaddingControls = () => {
        if (isReadOnly || !isSelected) return null;
        
        const stripeBg = {
            backgroundImage: `repeating-linear-gradient(45deg, rgba(99, 102, 241, 0.22), rgba(99, 102, 241, 0.22) 8px, rgba(99, 102, 241, 0.32) 8px, rgba(99, 102, 241, 0.32) 16px)`
        };

        const getMarginStr = (val: any) => val !== undefined ? (typeof val === 'number' ? `${val}rem` : String(val)) : undefined;
        const mtStr = localMargin?.marginTop || getMarginStr(node.style?.marginTop) || getMarginStr(node.style?.marginY) || getMarginStr(node.style?.margin) || '0rem';
        const mbStr = localMargin?.marginBottom || getMarginStr(node.style?.marginBottom) || getMarginStr(node.style?.marginY) || getMarginStr(node.style?.margin) || '0rem';
        const mlStr = localMargin?.marginLeft || getMarginStr(node.style?.marginLeft) || getMarginStr(node.style?.marginX) || getMarginStr(node.style?.margin) || '0rem';
        const mrStr = localMargin?.marginRight || getMarginStr(node.style?.marginRight) || getMarginStr(node.style?.marginX) || getMarginStr(node.style?.margin) || '0rem';

        const mtVal = parseFloat(mtStr) || 0;
        const mbVal = parseFloat(mbStr) || 0;
        const mlVal = parseFloat(mlStr) || 0;
        const mrVal = parseFloat(mrStr) || 0;

        return (
            <>
                {/* --- TOP OUTER SPACING (MARGIN) STRIPE PATTERN --- */}
                {mtVal > 0 && (
                    <div
                        style={{ ...stripeBg, height: mtStr }}
                        className="absolute bottom-full left-0 right-0 pointer-events-none border-t border-dashed border-indigo-400/60 z-20 flex items-center justify-center"
                    >
                        <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-xs">
                            Top: {mtStr}
                        </span>
                    </div>
                )}
                <div
                    onMouseDown={(e) => handleMarginDragStart(e, 'top')}
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 cursor-ns-resize z-30 p-1 group/thandle flex items-center justify-center"
                    title="Drag DOWN to increase outer top spacing, UP to decrease"
                >
                    <div className={`w-8 h-2 rounded-full border border-indigo-500 shadow-sm flex items-center justify-center transition-all ${
                        draggingSide === 'top' ? 'bg-indigo-600 scale-125 shadow-md' : 'bg-white hover:bg-indigo-50 hover:scale-110'
                    }`}>
                        <div className="w-3 h-0.5 bg-indigo-500 rounded-full" />
                    </div>
                    {draggingSide === 'top' && (
                        <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap z-50 pointer-events-none">
                            Outer Top: {mtStr}
                        </div>
                    )}
                </div>

                {/* --- BOTTOM OUTER SPACING (MARGIN) STRIPE PATTERN --- */}
                {mbVal > 0 && (
                    <div
                        style={{ ...stripeBg, height: mbStr }}
                        className="absolute top-full left-0 right-0 pointer-events-none border-b border-dashed border-indigo-400/60 z-20 flex items-center justify-center"
                    >
                        <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-xs">
                            Bottom: {mbStr}
                        </span>
                    </div>
                )}
                <div
                    onMouseDown={(e) => handleMarginDragStart(e, 'bottom')}
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 cursor-ns-resize z-30 p-1 group/bhandle flex items-center justify-center"
                    title="Drag UP to increase outer bottom spacing, DOWN to decrease"
                >
                    <div className={`w-8 h-2 rounded-full border border-indigo-500 shadow-sm flex items-center justify-center transition-all ${
                        draggingSide === 'bottom' ? 'bg-indigo-600 scale-125 shadow-md' : 'bg-white hover:bg-indigo-50 hover:scale-110'
                    }`}>
                        <div className="w-3 h-0.5 bg-indigo-500 rounded-full" />
                    </div>
                    {draggingSide === 'bottom' && (
                        <div className="absolute top-full mt-1 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap z-50 pointer-events-none">
                            Outer Bottom: {mbStr}
                        </div>
                    )}
                </div>

                {/* --- LEFT OUTER SPACING (MARGIN) STRIPE PATTERN --- */}
                {mlVal > 0 && (
                    <div
                        style={{ ...stripeBg, width: mlStr }}
                        className="absolute right-full top-0 bottom-0 pointer-events-none border-l border-dashed border-indigo-400/60 z-20 flex items-center justify-center"
                    >
                        <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-xs rotate-[-90deg]">
                            Left: {mlStr}
                        </span>
                    </div>
                )}
                <div
                    onMouseDown={(e) => handleMarginDragStart(e, 'left')}
                    className="absolute -left-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize z-30 p-1 group/lhandle flex items-center justify-center"
                    title="Drag RIGHT to increase outer left spacing, LEFT to decrease"
                >
                    <div className={`h-8 w-2 rounded-full border border-indigo-500 shadow-sm flex items-center justify-center transition-all ${
                        draggingSide === 'left' ? 'bg-indigo-600 scale-125 shadow-md' : 'bg-white hover:bg-indigo-50 hover:scale-110'
                    }`}>
                        <div className="h-3 w-0.5 bg-indigo-500 rounded-full" />
                    </div>
                    {draggingSide === 'left' && (
                        <div className="absolute right-full mr-1 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap z-50 pointer-events-none">
                            Outer Left: {mlStr}
                        </div>
                    )}
                </div>

                {/* --- RIGHT OUTER SPACING (MARGIN) STRIPE PATTERN --- */}
                {mrVal > 0 && (
                    <div
                        style={{ ...stripeBg, width: mrStr }}
                        className="absolute left-full top-0 bottom-0 pointer-events-none border-r border-dashed border-indigo-400/60 z-20 flex items-center justify-center"
                    >
                        <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-xs rotate-90">
                            Right: {mrStr}
                        </span>
                    </div>
                )}
                <div
                    onMouseDown={(e) => handleMarginDragStart(e, 'right')}
                    className="absolute -right-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize z-30 p-1 group/rhandle flex items-center justify-center"
                    title="Drag LEFT to increase outer right spacing, RIGHT to decrease"
                >
                    <div className={`h-8 w-2 rounded-full border border-indigo-500 shadow-sm flex items-center justify-center transition-all ${
                        draggingSide === 'right' ? 'bg-indigo-600 scale-125 shadow-md' : 'bg-white hover:bg-indigo-50 hover:scale-110'
                    }`}>
                        <div className="h-3 w-0.5 bg-indigo-500 rounded-full" />
                    </div>
                    {draggingSide === 'right' && (
                        <div className="absolute left-full ml-1 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap z-50 pointer-events-none">
                            Outer Right: {mrStr}
                        </div>
                    )}
                </div>
            </>
        );
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isReadOnly || !setSelectedElementId) return;
        e.stopPropagation();
        setSelectedElementId(node.id);
    };

    const renderControls = () => {
        if (isReadOnly || !isSelected) return null;
        const bgColor = 'bg-indigo-500';

        return (
            <>
                <div className={`absolute -top-[21px] -left-[2px] z-50 ${bgColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md rounded-br-md shadow-sm tracking-wide`}>
                    {node.name ? (
                        <>
                            <span className="font-normal opacity-90">{node.name}</span>
                            <span className="capitalize ml-1">{node.type}</span>
                        </>
                    ) : (
                        <span className="capitalize">{node.type}</span>
                    )}
                </div>

                <div className="absolute -top-[26px] -right-[2px] z-50 flex items-center gap-0.5 bg-gray-900 text-white rounded-t-md px-1 py-0.5 shadow-md border border-gray-700">
                    <div {...attributes} {...listeners} className="p-1 hover:bg-gray-700 rounded cursor-grab active:cursor-grabbing text-gray-300 hover:text-white" title="Drag to reorder">
                        <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {moveElementUp && (
                        <button onClick={(e) => { e.stopPropagation(); moveElementUp(node.id); }} className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white" title="Move Up">
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {moveElementDown && (
                        <button onClick={(e) => { e.stopPropagation(); moveElementDown(node.id); }} className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white" title="Move Down">
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {duplicateElement && (
                        <button onClick={(e) => { e.stopPropagation(); duplicateElement(node.id); }} className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white" title="Duplicate">
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {removeElement && (
                        <button onClick={(e) => { e.stopPropagation(); removeElement(node.id); }} className="p-1 hover:bg-red-600 rounded text-gray-300 hover:text-white" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </>
        );
    };

    const renderChildren = () => {
        if (!node.children || node.children.length === 0) return null;

        if (isReadOnly) {
            return node.children.map(child => (
                <BuilderElement
                    key={child.id}
                    node={child}
                    brand={brand}
                    depth={depth + 1}
                    isReadOnly={true}
                    viewMode={viewMode}
                />
            ));
        }

        const strategy = node.style?.flexDirection === 'row' && !isMobileView ? horizontalListSortingStrategy : verticalListSortingStrategy;

        return (
            <SortableContext items={node.children.map(c => c.id)} strategy={strategy}>
                {node.children.map(child => (
                    <BuilderElement
                        key={child.id}
                        node={child}
                        selectedElementId={selectedElementId}
                        setSelectedElementId={setSelectedElementId}
                        updateElement={updateElement}
                        removeElement={removeElement}
                        duplicateElement={duplicateElement}
                        moveElementUp={moveElementUp}
                        moveElementDown={moveElementDown}
                        insertElementRelative={insertElementRelative}
                        depth={depth + 1}
                        brand={brand}
                        isReadOnly={false}
                        viewMode={viewMode}
                    />
                ))}
            </SortableContext>
        );
    };

    // Generic wrapper class for all elements
    const [dragPosition, setDragPosition] = useState<'none' | 'left' | 'right' | 'top' | 'bottom' | 'inside'>('none');

    const handleDragOver = (e: React.DragEvent) => {
        if (isReadOnly || !e.dataTransfer.types.includes('application/vnd.builder.element')) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const xThreshold = Math.min(24, rect.width * 0.25);
        const yThreshold = Math.min(24, rect.height * 0.25);

        let pos: 'left' | 'right' | 'top' | 'bottom' | 'inside' = 'inside';
        const isContainer = ['box', 'section', 'row', 'column'].includes(node.type);
        
        if (x < xThreshold) pos = 'left';
        else if (x > rect.width - xThreshold) pos = 'right';
        else if (y < yThreshold) pos = 'top';
        else if (y > rect.height - yThreshold) pos = 'bottom';
        
        if (pos === 'inside' && !isContainer) {
            pos = 'bottom';
        }

        setDragPosition(pos);
    };

    const handleDragLeave = () => {
        setDragPosition('none');
    };

    const handleDrop = (e: React.DragEvent) => {
        if (isReadOnly || !e.dataTransfer.types.includes('application/vnd.builder.element')) return;
        if (dragPosition === 'none') return;

        e.preventDefault();
        e.stopPropagation();
        
        const newType = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('newsectiontype') || e.dataTransfer.getData('text/plain');
        if (newType && insertElementRelative) {
            insertElementRelative(node.id, newType, dragPosition);
        }
        setDragPosition('none');
    };

    const dragHandlers = isReadOnly ? {} : {
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop
    };

    let dragIndicatorClass = '';
    if (!isReadOnly) {
        if (dragPosition === 'left') dragIndicatorClass = 'border-l-4 border-l-indigo-500';
        else if (dragPosition === 'right') dragIndicatorClass = 'border-r-4 border-r-indigo-500';
        else if (dragPosition === 'top') dragIndicatorClass = 'border-t-4 border-t-indigo-500';
        else if (dragPosition === 'bottom') dragIndicatorClass = 'border-b-4 border-b-indigo-500';
        else if (dragPosition === 'inside') dragIndicatorClass = 'ring-2 ring-indigo-500 bg-indigo-50/10';
    }

    const wrapperClass = isReadOnly 
        ? 'relative max-w-full' 
        : `relative max-w-full group/element ring-inset transition-all ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-indigo-500/50'} ${dragIndicatorClass}`;

    const props = {
        node,
        brand,
        setNodeRef: isReadOnly ? undefined : setNodeRef,
        style,
        wrapperClass,
        handleClick,
        renderControls,
        renderPaddingControls,
        renderChildren,
        updateElement,
        dragHandlers,
        isReadOnly,
        viewMode
    };

    if (node.type === 'section') {
        const finalStyle = { ...style };
        if (finalStyle.paddingY !== undefined) {
            const pyVal = isMobileView ? Math.min(2.5, Number(finalStyle.paddingY)) : finalStyle.paddingY;
            if (finalStyle.paddingTop === undefined) finalStyle.paddingTop = `${pyVal}rem`;
            if (finalStyle.paddingBottom === undefined) finalStyle.paddingBottom = `${pyVal}rem`;
            delete finalStyle.paddingY;
        }
        if (finalStyle.paddingX !== undefined) {
            const pxVal = isMobileView ? Math.min(1, Number(finalStyle.paddingX)) : finalStyle.paddingX;
            if (finalStyle.paddingLeft === undefined) finalStyle.paddingLeft = `${pxVal}rem`;
            if (finalStyle.paddingRight === undefined) finalStyle.paddingRight = `${pxVal}rem`;
            delete finalStyle.paddingX;
        }
        
        if (!finalStyle.backgroundColor || finalStyle.backgroundColor === 'transparent') {
            finalStyle.backgroundColor = '#ffffff';
        }

        const sectionEl = (
            <div 
                ref={isReadOnly ? undefined : setNodeRef} 
                data-element-type="section"
                style={finalStyle} 
                onClick={isReadOnly ? undefined : handleClick} 
                className={`w-full max-w-full relative ${wrapperClass}`} 
                {...dragHandlers}
            >
                {!isReadOnly && renderControls()}
                {!isReadOnly && renderPaddingControls()}
                {renderChildren()}
            </div>
        );

        return (isReadOnly && node.animation && node.animation !== 'none') ? (
            <AnimatedWrapper animation={node.animation}>{sectionEl}</AnimatedWrapper>
        ) : sectionEl;
    }

    const renderElementComponent = () => {
        switch (node.type) {
            case 'box': return <BoxElement {...props} />;
            case 'row': return <RowElement {...props} />;
            case 'column': return <ColumnElement {...props} />;
            case 'text': return <TextElement {...props} />;
            case 'media': return <MediaElement {...props} />;
            case 'button': return <ButtonElement {...props} />;
            case 'line': return <LineElement {...props} />;
            case 'code':
                return (
                    <div 
                        ref={isReadOnly ? undefined : setNodeRef} 
                        data-element-type="code"
                        style={style} 
                        onClick={isReadOnly ? undefined : handleClick} 
                        className={`w-full max-w-full ${wrapperClass}`} 
                        {...dragHandlers}
                    >
                        {!isReadOnly && renderControls()}
                        <CodeElement element={node} />
                    </div>
                );
            default: return null;
        }
    };

    const rendered = renderElementComponent();
    if (isReadOnly && node.animation && node.animation !== 'none') {
        return <AnimatedWrapper animation={node.animation}>{rendered}</AnimatedWrapper>;
    }
    return rendered;
}
