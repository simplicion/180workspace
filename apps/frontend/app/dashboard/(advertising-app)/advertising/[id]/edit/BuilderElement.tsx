import React, { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { ElementNode } from './types';
import { GripVertical, Trash2 } from 'lucide-react';
import { BoxElement } from './_components/elements/BoxElement';
import { RowElement } from './_components/elements/RowElement';
import { ColumnElement } from './_components/elements/ColumnElement';
import { TextElement } from './_components/elements/TextElement';
import { MediaElement } from './_components/elements/MediaElement';
import { ButtonElement } from './_components/elements/ButtonElement';
import { LineElement } from './_components/elements/LineElement';


interface BuilderElementProps {
    node: ElementNode;
    selectedElementId: string | null;
    setSelectedElementId: (id: string | null) => void;
    updateElement: (id: string, path: string, value: any) => void;
    removeElement: (id: string) => void;
    insertElementRelative?: (targetId: string, type: string, position: 'left' | 'right' | 'top' | 'bottom' | 'inside') => void;
    depth?: number;
}

export function BuilderElement({ node, selectedElementId, setSelectedElementId, updateElement, removeElement, insertElementRelative, depth = 0 }: BuilderElementProps) {
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

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        ...node.style,
        ...(display && { display }),
        ...(flexDirection && { flexDirection }),
        ...(flexWrap && { flexWrap })
    };

    const isSelected = selectedElementId === node.id;

    // Stop propagation so clicking a child doesn't select the parent

    // --- Padding Drag Logic ---
    const startPosRef = useRef({ x: 0, y: 0 });
    const startPaddingRef = useRef(0);
    const [draggingSide, setDraggingSide] = useState<string | null>(null);

    const handlePaddingDragStart = (e: React.MouseEvent, side: string) => {
        e.preventDefault();
        e.stopPropagation();

        let currentPadStr = '0';
        if (side === 'top') currentPadStr = node.style?.paddingTop || node.style?.paddingY || '0';
        if (side === 'bottom') currentPadStr = node.style?.paddingBottom || node.style?.paddingY || '0';
        if (side === 'left') currentPadStr = node.style?.paddingLeft || node.style?.paddingX || '0';
        if (side === 'right') currentPadStr = node.style?.paddingRight || node.style?.paddingX || '0';

        let currentPad = parseFloat(currentPadStr.toString().replace('rem', '').replace('px', ''));
        if (isNaN(currentPad)) currentPad = 0;

        startPosRef.current = { x: e.clientX, y: e.clientY };
        startPaddingRef.current = currentPad;
        setDraggingSide(side);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startPosRef.current.x;
            const deltaY = moveEvent.clientY - startPosRef.current.y;

            // 1 rem = 16px roughly. Let's make 16px drag = 1rem change
            let deltaRem = 0;

            if (side === 'top') deltaRem = deltaY / 16; // Inverted: Drag down (positive deltaY) increases top padding
            if (side === 'bottom') deltaRem = -deltaY / 16; // Inverted: Drag up (negative deltaY) increases bottom padding
            if (side === 'left') deltaRem = deltaX / 16; // Inverted: Drag right (positive deltaX) increases left padding
            if (side === 'right') deltaRem = -deltaX / 16; // Inverted: Drag left (negative deltaX) increases right padding

            const newPadding = Math.max(0, startPaddingRef.current + deltaRem);
            const newPaddingStr = `${newPadding}rem`;

            if (side === 'top') updateElement(node.id, 'style.paddingTop', newPaddingStr);
            if (side === 'bottom') updateElement(node.id, 'style.paddingBottom', newPaddingStr);
            if (side === 'left') updateElement(node.id, 'style.paddingLeft', newPaddingStr);
            if (side === 'right') updateElement(node.id, 'style.paddingRight', newPaddingStr);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            setDraggingSide(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const renderPaddingControls = () => {
        if (!isSelected) return null;
        
        const handleClass = "absolute w-3 h-3 bg-white border-2 border-cyan-400 rounded-full z-20 hover:scale-125 transition-transform";

        return (
            <>
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'top')}
                    className={`${handleClass} top-[-6px] left-1/2 -translate-x-1/2 cursor-ns-resize`}
                />
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'bottom')}
                    className={`${handleClass} bottom-[-6px] left-1/2 -translate-x-1/2 cursor-ns-resize`}
                />
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'left')}
                    className={`${handleClass} left-[-6px] top-1/2 -translate-y-1/2 cursor-ew-resize`}
                />
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'right')}
                    className={`${handleClass} right-[-6px] top-1/2 -translate-y-1/2 cursor-ew-resize`}
                />
            </>
        );
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedElementId(node.id);
    };

    const renderControls = () => {
        if (!isSelected) return null;

        return (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-slate-800 shadow-xl rounded-md px-2 py-1.5 items-center">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors" title="Drag to move">
                    <GripVertical className="w-4 h-4" />
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeElement(node.id); }} className="p-1.5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
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
                        insertElementRelative={insertElementRelative}
                        depth={depth + 1}
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
    if (dragPosition === 'left') dragIndicatorClass = 'border-l-4 border-l-cyan-400';
    else if (dragPosition === 'right') dragIndicatorClass = 'border-r-4 border-r-cyan-400';
    else if (dragPosition === 'top') dragIndicatorClass = 'border-t-4 border-t-cyan-400';
    else if (dragPosition === 'bottom') dragIndicatorClass = 'border-b-4 border-b-cyan-400';
    else if (dragPosition === 'inside') dragIndicatorClass = 'ring-2 ring-cyan-400 bg-cyan-50/10';

    const wrapperClass = `relative group/element ring-inset transition-all ${isSelected ? 'ring-2 ring-cyan-400' : 'hover:ring-1 hover:ring-cyan-400/50'} ${dragIndicatorClass}`;


    const props = {
        node,
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
            finalStyle.paddingTop = `${finalStyle.paddingY}rem`;
            finalStyle.paddingBottom = `${finalStyle.paddingY}rem`;
            delete finalStyle.paddingY;
        }
        if (finalStyle.paddingX !== undefined) {
            finalStyle.paddingLeft = `${finalStyle.paddingX}rem`;
            finalStyle.paddingRight = `${finalStyle.paddingX}rem`;
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
        default: return null;
    }
    return null;
}
