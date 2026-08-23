import React, { useState, useEffect, useRef } from 'react';
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


function normalizeStyle(rawStyle: any = {}): React.CSSProperties {
    if (!rawStyle) return {};
    const style: any = { ...rawStyle };

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

    return style;
}

interface BuilderElementProps {
    node: ElementNode;
    brand?: any;
    selectedElementId: string | null;
    setSelectedElementId: (id: string | null) => void;
    updateElement: (id: string, path: string, value: any) => void;
    removeElement: (id: string) => void;
    duplicateElement?: (id: string) => void;
    moveElementUp?: (id: string) => void;
    moveElementDown?: (id: string) => void;
    insertElementRelative?: (targetId: string, type: string, position: 'left' | 'right' | 'top' | 'bottom' | 'inside') => void;
    depth?: number;
}

export function BuilderElement({ node, brand, selectedElementId, setSelectedElementId, updateElement, removeElement, duplicateElement, moveElementUp, moveElementDown, insertElementRelative, depth = 0 }: BuilderElementProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: node.id, data: { type: node.type, node } });

    let display = node.style?.display;
    let flexDirection = node.style?.flexDirection;
    let flexWrap = node.style?.flexWrap;

    if (node.type === 'row') {
        display = 'flex';
        flexDirection = 'row';
        flexWrap = 'wrap';
    } else if (node.type === 'column') {
        display = 'flex';
        flexDirection = 'column';
    } else if (node.type === 'box') {
        display = display || 'flex';
    } else if (node.type === 'section') {
        display = display || 'block';
    }

    // --- Padding Drag Logic ---
    const startPosRef = useRef({ x: 0, y: 0 });
    const startPaddingRef = useRef(0);
    const latestPaddingRef = useRef<string | null>(null);
    const [draggingSide, setDraggingSide] = useState<string | null>(null);
    const [localPadding, setLocalPadding] = useState<Record<string, string> | null>(null);

    const rawStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        ...node.style,
        ...(display && { display }),
        ...(flexDirection && { flexDirection }),
        ...(flexWrap && { flexWrap }),
        ...(localPadding || {})
    };

    const style = normalizeStyle(rawStyle);

    const isSelected = selectedElementId === node.id;

    // Stop propagation so clicking a child doesn't select the parent

    const handlePaddingDragStart = (e: React.MouseEvent, side: string) => {
        e.preventDefault();
        e.stopPropagation();

        const parsePad = (val: any) => {
            if (val === undefined || val === null) return undefined;
            if (typeof val === 'number') return val;
            const parsed = parseFloat(String(val).replace('rem', '').replace('px', '').replace('em', ''));
            return isNaN(parsed) ? undefined : parsed;
        };

        let currentPad = 0;
        if (side === 'top') currentPad = parsePad(node.style?.paddingTop) ?? parsePad(node.style?.paddingY) ?? parsePad(node.style?.padding) ?? 0;
        if (side === 'bottom') currentPad = parsePad(node.style?.paddingBottom) ?? parsePad(node.style?.paddingY) ?? parsePad(node.style?.padding) ?? 0;
        if (side === 'left') currentPad = parsePad(node.style?.paddingLeft) ?? parsePad(node.style?.paddingX) ?? parsePad(node.style?.padding) ?? 0;
        if (side === 'right') currentPad = parsePad(node.style?.paddingRight) ?? parsePad(node.style?.paddingX) ?? parsePad(node.style?.padding) ?? 0;
        
        let currentPadStr = `${currentPad}rem`;

        const paddingKey = `padding${side.charAt(0).toUpperCase() + side.slice(1)}`;

        startPosRef.current = { x: e.clientX, y: e.clientY };
        startPaddingRef.current = currentPad;
        latestPaddingRef.current = currentPadStr;
        
        setDraggingSide(side);
        setLocalPadding({ [paddingKey]: currentPadStr });

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startPosRef.current.x;
            const deltaY = moveEvent.clientY - startPosRef.current.y;

            let deltaRem = 0;
            if (side === 'top') deltaRem = deltaY / 16;
            if (side === 'bottom') deltaRem = -deltaY / 16;
            if (side === 'left') deltaRem = deltaX / 16;
            if (side === 'right') deltaRem = -deltaX / 16;

            const newPadding = Math.max(0, startPaddingRef.current + deltaRem);
            const newPaddingStr = `${newPadding}rem`;
            
            latestPaddingRef.current = newPaddingStr;
            setLocalPadding({ [paddingKey]: newPaddingStr });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            setDraggingSide(null);
            
            // Commit to global config
            if (latestPaddingRef.current) {
                if (side === 'top') updateElement(node.id, 'style.paddingTop', latestPaddingRef.current);
                if (side === 'bottom') updateElement(node.id, 'style.paddingBottom', latestPaddingRef.current);
                if (side === 'left') updateElement(node.id, 'style.paddingLeft', latestPaddingRef.current);
                if (side === 'right') updateElement(node.id, 'style.paddingRight', latestPaddingRef.current);
            }
            
            setLocalPadding(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const renderPaddingControls = () => {
        if (!isSelected) return null;
        
        const stripeBg = {
            backgroundImage: `repeating-linear-gradient(45deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.2) 8px, rgba(99, 102, 241, 0.3) 8px, rgba(99, 102, 241, 0.3) 16px)`
        };
        
        const dragHandle = (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-1.5 rounded-full bg-white border border-indigo-500 shadow-sm" />
        );
        const dragHandleVertical = (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-4 rounded-full bg-white border border-indigo-500 shadow-sm" />
        );

        const getPadStr = (val: any) => val !== undefined ? (typeof val === 'number' ? `${val}rem` : val) : undefined;
        const ptStr = localPadding?.paddingTop || getPadStr(node.style?.paddingTop) || getPadStr(node.style?.paddingY) || getPadStr(node.style?.padding) || '0';
        const pbStr = localPadding?.paddingBottom || getPadStr(node.style?.paddingBottom) || getPadStr(node.style?.paddingY) || getPadStr(node.style?.padding) || '0';
        const plStr = localPadding?.paddingLeft || getPadStr(node.style?.paddingLeft) || getPadStr(node.style?.paddingX) || getPadStr(node.style?.padding) || '0';
        const prStr = localPadding?.paddingRight || getPadStr(node.style?.paddingRight) || getPadStr(node.style?.paddingX) || getPadStr(node.style?.padding) || '0';

        return (
            <>
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'top')}
                    style={{ ...stripeBg, height: ptStr }}
                    className="absolute top-0 left-0 right-0 min-h-[4px] cursor-ns-resize z-20 transition-opacity opacity-0 group-hover/element:opacity-100 flex items-center justify-center border-b border-indigo-500/30"
                >
                    {dragHandle}
                </div>
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'bottom')}
                    style={{ ...stripeBg, height: pbStr }}
                    className="absolute bottom-0 left-0 right-0 min-h-[4px] cursor-ns-resize z-20 transition-opacity opacity-0 group-hover/element:opacity-100 flex items-center justify-center border-t border-indigo-500/30"
                >
                    {dragHandle}
                </div>
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'left')}
                    style={{ ...stripeBg, width: plStr }}
                    className="absolute top-0 bottom-0 left-0 min-w-[4px] cursor-ew-resize z-20 transition-opacity opacity-0 group-hover/element:opacity-100 flex items-center justify-center border-r border-indigo-500/30"
                >
                    {dragHandleVertical}
                </div>
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'right')}
                    style={{ ...stripeBg, width: prStr }}
                    className="absolute top-0 bottom-0 right-0 min-w-[4px] cursor-ew-resize z-20 transition-opacity opacity-0 group-hover/element:opacity-100 flex items-center justify-center border-l border-indigo-500/30"
                >
                    {dragHandleVertical}
                </div>
            </>
        );
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedElementId(node.id);
    };

    const renderControls = () => {
        if (!isSelected) return null;
        
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
                <div className="absolute -top-10 right-0 z-50 flex gap-0.5 bg-gray-800 text-white shadow-lg rounded p-0.5 items-center">
                    <button onClick={(e) => { e.stopPropagation(); if (moveElementUp) moveElementUp(node.id); }} className="p-1 hover:bg-gray-700 rounded" title="Move Up">
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (moveElementDown) moveElementDown(node.id); }} className="p-1 hover:bg-gray-700 rounded" title="Move Down">
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-700 rounded" title="Drag to reorder">
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); if (duplicateElement) duplicateElement(node.id); }} className="p-1 hover:bg-gray-700 rounded" title="Duplicate">
                        <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeElement(node.id); }} className="p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </>
        );
    };

    const renderChildren = () => {
        if (!node.children) return null;

        const strategy = node.style?.flexDirection === 'row' ? horizontalListSortingStrategy : verticalListSortingStrategy;

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
                    />
                ))}
            </SortableContext>
        );
    };

    // Generic wrapper class for all elements
    const [dragPosition, setDragPosition] = useState<'none' | 'left' | 'right' | 'top' | 'bottom' | 'inside'>('none');

    const handleDragOver = (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('application/vnd.builder.element')) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Define edge thresholds based on element size, capped at 24px
        const xThreshold = Math.min(24, rect.width * 0.25);
        const yThreshold = Math.min(24, rect.height * 0.25);

        let pos: 'left' | 'right' | 'top' | 'bottom' | 'inside' = 'inside';
        const isContainer = ['box', 'section', 'row', 'column'].includes(node.type);
        
        if (x < xThreshold) pos = 'left';
        else if (x > rect.width - xThreshold) pos = 'right';
        else if (y < yThreshold) pos = 'top';
        else if (y > rect.height - yThreshold) pos = 'bottom';
        
        if (pos === 'inside' && !isContainer) {
            // Default to bottom for non-containers if not near an edge
            pos = 'bottom';
        }

        setDragPosition(pos);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        setDragPosition('none');
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('application/vnd.builder.element')) return;
        if (dragPosition === 'none') return;

        e.preventDefault();
        e.stopPropagation();
        
        const newType = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('newsectiontype') || e.dataTransfer.getData('text/plain');
        if (newType && insertElementRelative) {
            insertElementRelative(node.id, newType, dragPosition);
        }
        setDragPosition('none');
    };

    const dragHandlers = {
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop
    };

    let dragIndicatorClass = '';
    if (dragPosition === 'left') dragIndicatorClass = 'border-l-4 border-l-indigo-500';
    else if (dragPosition === 'right') dragIndicatorClass = 'border-r-4 border-r-indigo-500';
    else if (dragPosition === 'top') dragIndicatorClass = 'border-t-4 border-t-indigo-500';
    else if (dragPosition === 'bottom') dragIndicatorClass = 'border-b-4 border-b-indigo-500';
    else if (dragPosition === 'inside') dragIndicatorClass = 'ring-2 ring-indigo-500 bg-indigo-50/10';

    const wrapperClass = `relative group/element ring-inset transition-all ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-indigo-500/50'} ${dragIndicatorClass}`;


    const props = {
        node,
        brand,
        setNodeRef,
        style,
        wrapperClass,
        handleClick,
        renderControls,
        renderPaddingControls,
        renderChildren,
        updateElement,
        dragHandlers
    };

    if (node.type === 'section') {
        const finalStyle = { ...style };
        if (finalStyle.paddingY !== undefined) {
            if (finalStyle.paddingTop === undefined) finalStyle.paddingTop = `${finalStyle.paddingY}rem`;
            if (finalStyle.paddingBottom === undefined) finalStyle.paddingBottom = `${finalStyle.paddingY}rem`;
            delete finalStyle.paddingY;
        }
        if (finalStyle.paddingX !== undefined) {
            if (finalStyle.paddingLeft === undefined) finalStyle.paddingLeft = `${finalStyle.paddingX}rem`;
            if (finalStyle.paddingRight === undefined) finalStyle.paddingRight = `${finalStyle.paddingX}rem`;
            delete finalStyle.paddingX;
        }
        
        // Ensure section has a background if not specified or transparent, to avoid blending into dark canvas
        if (!finalStyle.backgroundColor || finalStyle.backgroundColor === 'transparent') {
            finalStyle.backgroundColor = '#ffffff';
        }

        return (
            <div ref={setNodeRef} style={finalStyle} onClick={handleClick} className={`w-full relative ${wrapperClass}`} {...dragHandlers}>
                {renderControls()}
                {renderPaddingControls()}
                {renderChildren()}
            </div>
        );
    }

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
                <div ref={setNodeRef} style={style} onClick={handleClick} className={wrapperClass} {...dragHandlers}>
                    {renderControls()}
                    <CodeElement element={node} />
                </div>
            );
        default: return null;
    }
}
