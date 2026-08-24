import React from 'react';
import { ElementNode } from '../../types';

export interface ElementProps {
    node: ElementNode;
    brand?: any;
    setNodeRef?: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    wrapperClass: string;
    handleClick?: (e: React.MouseEvent) => void;
    renderControls?: () => React.ReactNode;
    renderPaddingControls?: () => React.ReactNode;
    renderChildren?: () => React.ReactNode;
    updateElement?: (id: string, path: string, value: any) => void;
    dragHandlers?: any;
    isReadOnly?: boolean;
    viewMode?: 'desktop' | 'tablet' | 'mobile';
}

export function BoxElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {}, isReadOnly, viewMode }: ElementProps) {
    const isMobileView = viewMode === 'mobile';
    const isRowBox = node.style?.flexDirection === 'row' || (node.style?.display === 'flex' && !node.style?.flexDirection);
    const responsiveClass = `w-full max-w-full box-border ${isRowBox ? (isMobileView ? 'flex flex-col' : 'flex flex-col md:flex-row is-row-container') : ''} ${wrapperClass}`;

    return (
        <div 
            ref={setNodeRef} 
            data-element-type="box"
            style={style} 
            onClick={isReadOnly ? undefined : handleClick} 
            className={responsiveClass} 
            {...(isReadOnly ? {} : dragHandlers)}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            {node.children && node.children.length > 0 ? (
                renderChildren?.()
            ) : isReadOnly ? null : (
                <div className="p-4 border-2 border-dashed border-gray-300 bg-gray-50/50 text-center text-gray-400 text-sm font-bold rounded-lg min-h-[100px] flex items-center justify-center">
                    Empty Container - Drop items here
                </div>
            )}
        </div>
    );
}
