'use client';
import React, { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { ElementNode, Breakpoint } from './types';
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { BoxElement } from './_components/elements/BoxElement';
import { RowElement } from './_components/elements/RowElement';
import { ColumnElement } from './_components/elements/ColumnElement';
import { TextElement } from './_components/elements/TextElement';
import { MediaElement } from './_components/elements/MediaElement';
import { ButtonElement } from './_components/elements/ButtonElement';
import { LineElement } from './_components/elements/LineElement';
import { FloatingElement } from './_components/elements/FloatingElement';
import CodeElement from './_components/elements/CodeElement';
import { MotionTag } from './_components/elements/MotionTag';
import { getAdvancedAnimationProps } from './_components/elements/animation';
import { nodeClassName, getEffectiveStyle } from './responsive-styles';

// Re-exported for existing importers (tests, legacy callers).
export { getAdvancedAnimationProps } from './_components/elements/animation';
export { normalizeStyle } from './responsive-styles';

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
    insertElementRelative?: (targetId: string, newType: string, position: 'left' | 'right' | 'top' | 'bottom' | 'inside', initialData?: any) => void;
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
    const bp: Breakpoint = viewMode;
    const isFloating = node.type === 'floating';

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
        disabled: isReadOnly || isFloating
    });

    // --- Outer Spacing (Margin) Drag Logic ---
    const startPosRef = useRef({ x: 0, y: 0 });
    const startMarginRef = useRef(0);
    const latestMarginRef = useRef<string | null>(null);
    const [draggingSide, setDraggingSide] = useState<string | null>(null);
    const [localMargin, setLocalMargin] = useState<Record<string, string> | null>(null);

    // Persisted styles are compiled into the node class (responsive-styles.ts). Inline style carries only
    // transient editor state: dnd transform/transition/opacity and the live margin-drag preview.
    const transientStyle: React.CSSProperties = {};
    if (!isReadOnly && !isFloating) {
        const t = CSS.Transform.toString(transform);
        if (t) transientStyle.transform = t;
        if (transition) transientStyle.transition = transition;
        if (isDragging) transientStyle.opacity = 0.5;
    }
    if (localMargin) Object.assign(transientStyle, localMargin);
    const style = Object.keys(transientStyle).length > 0 ? transientStyle : undefined;
    const nodeClass = nodeClassName(node.id);
    // Style as seen on the device being previewed (used by editor affordances only).
    const effectiveStyle = getEffectiveStyle(node, bp);
    const isSelected = !isReadOnly && selectedElementId === node.id;

    const handleMarginDragStart = (e: React.PointerEvent, side: string) => {
        if (isReadOnly || !updateElement) return;
        e.preventDefault();
        e.stopPropagation();

        const parseMargin = (val: any) => {
            if (val === undefined || val === null) return undefined;
            if (typeof val === 'number') return val;
            const parsed = parseFloat(String(val).replace('rem', '').replace('px', '').replace('em', ''));
            return isNaN(parsed) ? undefined : parsed;
        };

        const s = effectiveStyle;
        let currentMargin = 0;
        if (side === 'top') currentMargin = parseMargin(s.marginTop) ?? parseMargin(s.marginY) ?? parseMargin(s.margin) ?? 0;
        if (side === 'bottom') currentMargin = parseMargin(s.marginBottom) ?? parseMargin(s.marginY) ?? parseMargin(s.margin) ?? 0;
        if (side === 'left') currentMargin = parseMargin(s.marginLeft) ?? parseMargin(s.marginX) ?? parseMargin(s.margin) ?? 0;
        if (side === 'right') currentMargin = parseMargin(s.marginRight) ?? parseMargin(s.marginX) ?? parseMargin(s.margin) ?? 0;
        
        const currentMarginStr = `${currentMargin}rem`;
        const marginKey = `margin${side.charAt(0).toUpperCase() + side.slice(1)}`;
        // Desktop edits the base style; tablet/mobile edit that device's override.
        const targetPath = bp === 'desktop' ? `style.${marginKey}` : `responsive.${bp}.${marginKey}`;

        startPosRef.current = { x: e.clientX, y: e.clientY };
        startMarginRef.current = currentMargin;
        latestMarginRef.current = currentMarginStr;
        
        setDraggingSide(side);
        setLocalMargin({ [marginKey]: currentMarginStr });

        const handleEl = e.currentTarget as HTMLElement;
        const pointerId = e.pointerId;
        try { handleEl.setPointerCapture(pointerId); } catch { /* capture is best-effort */ }

        document.body.style.userSelect = 'none';
        document.body.style.cursor = (side === 'top' || side === 'bottom') ? 'ns-resize' : 'ew-resize';

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (moveEvent.pointerId !== pointerId) return;
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

        const handlePointerUp = (upEvent: PointerEvent) => {
            if (upEvent.pointerId !== pointerId) return;
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
            try { handleEl.releasePointerCapture(pointerId); } catch { /* already released */ }
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            setDraggingSide(null);
            
            if (latestMarginRef.current && upEvent.type === 'pointerup') {
                updateElement(node.id, targetPath, latestMarginRef.current);
            }
            
            setLocalMargin(null);
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);
    };
    const renderPaddingControls = () => {
        if (isReadOnly || !isSelected) return null;
        
        const stripeBg = {
            backgroundImage: `repeating-linear-gradient(45deg, rgba(99, 102, 241, 0.22), rgba(99, 102, 241, 0.22) 8px, rgba(99, 102, 241, 0.32) 8px, rgba(99, 102, 241, 0.32) 16px)`
        };

        const getMarginStr = (val: any) => val !== undefined ? (typeof val === 'number' ? `${val}rem` : String(val)) : undefined;
        const mtStr = localMargin?.marginTop || getMarginStr(effectiveStyle.marginTop) || getMarginStr(effectiveStyle.marginY) || getMarginStr(effectiveStyle.margin) || '0rem';
        const mbStr = localMargin?.marginBottom || getMarginStr(effectiveStyle.marginBottom) || getMarginStr(effectiveStyle.marginY) || getMarginStr(effectiveStyle.margin) || '0rem';
        const mlStr = localMargin?.marginLeft || getMarginStr(effectiveStyle.marginLeft) || getMarginStr(effectiveStyle.marginX) || getMarginStr(effectiveStyle.margin) || '0rem';
        const mrStr = localMargin?.marginRight || getMarginStr(effectiveStyle.marginRight) || getMarginStr(effectiveStyle.marginX) || getMarginStr(effectiveStyle.margin) || '0rem';

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
                    onPointerDown={(e) => handleMarginDragStart(e, 'top')}
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 cursor-ns-resize z-30 p-2 touch-none group/thandle flex items-center justify-center"
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
                    onPointerDown={(e) => handleMarginDragStart(e, 'bottom')}
                    className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 cursor-ns-resize z-30 p-2 touch-none group/bhandle flex items-center justify-center"
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
                    onPointerDown={(e) => handleMarginDragStart(e, 'left')}
                    className="absolute -left-3.5 top-1/2 -translate-y-1/2 cursor-ew-resize z-30 p-2 touch-none group/lhandle flex items-center justify-center"
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
                    onPointerDown={(e) => handleMarginDragStart(e, 'right')}
                    className="absolute -right-3.5 top-1/2 -translate-y-1/2 cursor-ew-resize z-30 p-2 touch-none group/rhandle flex items-center justify-center"
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
                <div className={`absolute -top-[21px] -left-[2px] z-50 pointer-events-none ${bgColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md rounded-br-md shadow-sm tracking-wide`}>
                    {node.name ? (
                        <>
                            <span className="font-normal opacity-90">{node.name}</span>
                            <span className="capitalize ml-1">{node.type}</span>
                        </>
                    ) : (
                        <span className="capitalize">{node.type}</span>
                    )}
                </div>

                <div className="absolute -top-[36px] -right-[2px] z-50 flex items-center gap-0.5 bg-gray-900 text-white rounded-t-md px-0.5 py-0.5 shadow-md border border-gray-700">
                    <div {...attributes} {...listeners} className="min-w-[32px] min-h-[32px] flex items-center justify-center touch-none hover:bg-gray-700 rounded cursor-grab active:cursor-grabbing text-gray-300 hover:text-white" title="Drag to reorder" aria-label="Drag to reorder">
                        <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {moveElementUp && (
                        <button onClick={(e) => { e.stopPropagation(); moveElementUp(node.id); }} type="button" className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-gray-700 rounded text-gray-300 hover:text-white" title="Move Up" aria-label="Move Up">
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {moveElementDown && (
                        <button onClick={(e) => { e.stopPropagation(); moveElementDown(node.id); }} type="button" className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-gray-700 rounded text-gray-300 hover:text-white" title="Move Down" aria-label="Move Down">
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {duplicateElement && (
                        <button onClick={(e) => { e.stopPropagation(); duplicateElement(node.id); }} type="button" className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-gray-700 rounded text-gray-300 hover:text-white" title="Duplicate" aria-label="Duplicate">
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {removeElement && (
                        <button onClick={(e) => { e.stopPropagation(); removeElement(node.id); }} type="button" className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-red-600 rounded text-gray-300 hover:text-white" title="Delete" aria-label="Delete">
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

        const dir = String(effectiveStyle.flexDirection || '');
        const horizontal = dir.startsWith('row') && (bp !== 'mobile' || !!node.responsive?.mobile?.flexDirection);
        const strategy = horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy;

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
        const isElement = e.dataTransfer.types.includes('application/vnd.builder.element');
        const isMedia = e.dataTransfer.types.includes('application/vnd.builder.media.url');
        
        if (isReadOnly || (!isElement && !isMedia)) return;
        
        e.preventDefault();
        e.stopPropagation();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const xThreshold = Math.min(24, rect.width * 0.25);
        const yThreshold = Math.min(24, rect.height * 0.25);

        let pos: 'left' | 'right' | 'top' | 'bottom' | 'inside' = 'inside';
        const isContainer = ['box', 'section', 'row', 'column', 'floating'].includes(node.type);
        
        if (x < xThreshold) pos = 'left';
        else if (x > rect.width - xThreshold) pos = 'right';
        else if (y < yThreshold) pos = 'top';
        else if (y > rect.height - yThreshold) pos = 'bottom';
        
        if (pos === 'inside') {
            if (isMedia && node.type === 'media') {
                // allow 'inside' for media drop onto media element
            } else if (!isContainer) {
                pos = 'bottom';
            }
        }

        setDragPosition(pos);
    };

    const handleDragLeave = () => {
        setDragPosition('none');
    };

    const handleDrop = (e: React.DragEvent) => {
        if (isReadOnly) return;
        
        const mediaUrl = e.dataTransfer.getData('application/vnd.builder.media.url');
        
        // 1. Handle media URL drop on an image/media element
        if (mediaUrl && (node.type === 'media' || node.type === 'image')) {
            if (updateElement) {
                e.preventDefault();
                e.stopPropagation();
                updateElement(node.id, 'data.imageUrl', mediaUrl);
                setDragPosition('none');
                return;
            }
        }

        // 2. Handle media URL drop on container elements
        if (mediaUrl && ['box', 'section', 'row', 'column', 'floating'].includes(node.type)) {
            if (dragPosition === 'inside' && insertElementRelative) {
                e.preventDefault();
                e.stopPropagation();
                insertElementRelative(node.id, 'media', 'inside', { imageUrl: mediaUrl });
                setDragPosition('none');
                return;
            } else if (['left', 'right', 'top', 'bottom'].includes(dragPosition) && insertElementRelative) {
                e.preventDefault();
                e.stopPropagation();
                insertElementRelative(node.id, 'media', dragPosition as 'left' | 'right' | 'top' | 'bottom', { imageUrl: mediaUrl });
                setDragPosition('none');
                return;
            }
        }

        if (!e.dataTransfer.types.includes('application/vnd.builder.element')) return;
        if (dragPosition === 'none') return;

        e.preventDefault();
        e.stopPropagation();
        
        const newType = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('newsectiontype') || e.dataTransfer.getData('text/plain');
        if (newType === 'floating') {
            // Floating element can never be nested inside or relative to any element
            // Redirect it directly to the root screen layer
            if (insertElementRelative) {
                insertElementRelative(node.id, 'floating', 'inside');
            }
            setDragPosition('none');
            return;
        }

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

    const animationProps = getAdvancedAnimationProps(node.animationConfig, node.animation) || {};
    const hasAnimation = Object.keys(animationProps).length > 0;
    const animKey = hasAnimation ? JSON.stringify(node.animationConfig || node.animation || "") : node.id;

    const props = {
        node,
        brand,
        setNodeRef: isReadOnly ? undefined : setNodeRef,
        style,
        className: nodeClass,
        wrapperClass,
        handleClick,
        renderControls,
        renderPaddingControls,
        renderChildren,
        updateElement,
        dragHandlers,
        isReadOnly,
        viewMode,
        animationProps,
        animKey
    };

    const ContainerTag: React.ElementType = hasAnimation ? MotionTag : 'div';

    if (node.type === 'section') {
        return (
            <ContainerTag 
                key={animKey}
                ref={isReadOnly ? undefined : (setNodeRef as any)} 
                data-element-type="section"
                style={style} 
                onClick={isReadOnly ? undefined : handleClick} 
                className={`${nodeClass} ${wrapperClass}`} 
                {...dragHandlers}
                {...(hasAnimation ? animationProps : {})}
            >
                {!isReadOnly && renderControls()}
                {!isReadOnly && renderPaddingControls()}
                {renderChildren()}
            </ContainerTag>
        );
    }

    switch (node.type) {
        case 'box': return <BoxElement {...props} />;
        case 'floating': return <FloatingElement {...props} />;
        case 'row': return <RowElement {...props} />;
        case 'column': return <ColumnElement {...props} />;
        case 'text': return <TextElement {...props} />;
        case 'media':
        case 'image': return <MediaElement {...props} />;
        case 'button': return <ButtonElement {...props} />;
        case 'line': return <LineElement {...props} />;
        case 'code':
            return (
                <ContainerTag 
                    key={animKey}
                    ref={isReadOnly ? undefined : (setNodeRef as any)} 
                    data-element-type="code"
                    style={style} 
                    onClick={isReadOnly ? undefined : handleClick} 
                    className={`${nodeClass} ${wrapperClass}`} 
                    {...dragHandlers}
                    {...(hasAnimation ? animationProps : {})}
                >
                    {!isReadOnly && renderControls()}
                    <CodeElement element={node} isReadOnly={isReadOnly} />
                </ContainerTag>
            );
        default:
            // Legacy/unknown types: never crash; keep any nested content visible.
            if (!node.children || node.children.length === 0) return null;
            return (
                <div
                    ref={isReadOnly ? undefined : (setNodeRef as any)}
                    data-element-type={String(node.type || 'unknown')}
                    style={style}
                    onClick={isReadOnly ? undefined : handleClick}
                    className={`${nodeClass} ${wrapperClass}`}
                    {...dragHandlers}
                >
                    {!isReadOnly && renderControls()}
                    {renderChildren()}
                </div>
            );
    }
}
