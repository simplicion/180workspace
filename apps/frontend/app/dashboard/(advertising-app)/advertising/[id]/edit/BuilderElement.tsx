import React, { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { ElementNode } from './types';
import { GripVertical, Trash2 } from 'lucide-react';
import { BoxElement } from './_components/elements/BoxElement';
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
    appendElementToNode?: (parentId: string, type: string) => void;
    depth?: number;
}

export function BuilderElement({ node, selectedElementId, setSelectedElementId, updateElement, removeElement, appendElementToNode, depth = 0 }: BuilderElementProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: node.id, data: { type: node.type, node } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        ...node.style
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
        return (
            <>
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'top')}
                    className="absolute top-0 left-0 right-0 h-2 bg-indigo-500/20 hover:bg-indigo-500/50 cursor-ns-resize z-20 transition-colors opacity-0 group-hover/element:opacity-100"
                />
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'bottom')}
                    className="absolute bottom-0 left-0 right-0 h-2 bg-indigo-500/20 hover:bg-indigo-500/50 cursor-ns-resize z-20 transition-colors opacity-0 group-hover/element:opacity-100"
                />
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'left')}
                    className="absolute top-0 bottom-0 left-0 w-2 bg-indigo-500/20 hover:bg-indigo-500/50 cursor-ew-resize z-20 transition-colors opacity-0 group-hover/element:opacity-100"
                />
                <div
                    onMouseDown={(e) => handlePaddingDragStart(e, 'right')}
                    className="absolute top-0 bottom-0 right-0 w-2 bg-indigo-500/20 hover:bg-indigo-500/50 cursor-ew-resize z-20 transition-colors opacity-0 group-hover/element:opacity-100"
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
            <div className="absolute -top-8 right-0 z-50 flex gap-2 bg-white backdrop-blur shadow-lg rounded-lg p-1 border border-gray-100 items-center">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-gray-100 text-gray-400 rounded" title="Drag to reorder">
                    <GripVertical className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 py-1 text-center border-x border-gray-100">{node.type}</div>
                <button onClick={(e) => { e.stopPropagation(); removeElement(node.id); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded ml-1" title="Delete">
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
                        appendElementToNode={appendElementToNode}
                        depth={depth + 1}
                    />
                ))}
            </SortableContext>
        );
    };

    // Generic wrapper class for all elements
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        // We only allow dropping elements on 'box' and 'section'
        if (node.type !== 'box' && node.type !== 'section') return;

        // Only intercept if we are dragging an element, NOT a section
        if (e.dataTransfer.types.includes('application/vnd.builder.element')) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (node.type !== 'box' && node.type !== 'section') return;

        // We already checked in dragover, but just to be safe
        if (!e.dataTransfer.types.includes('application/vnd.builder.element')) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const newType = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('newsectiontype') || e.dataTransfer.getData('text/plain');
        if (newType && appendElementToNode) {
            appendElementToNode(node.id, newType);
        }
    };

    const dragHandlers = (node.type === 'section' || node.type === 'box') ? {
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop
    } : {};

    const wrapperClass = `relative group/element ring-inset transition-all ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-indigo-300'} ${isDragOver ? 'ring-2 ring-green-500 bg-green-50/10' : ''}`;


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
        case 'text': return <TextElement {...props} />;
        case 'media': return <MediaElement {...props} />;
        case 'button': return <ButtonElement {...props} />;
        case 'line': return <LineElement {...props} />;
        default: return null;
    }
    return null;
}
