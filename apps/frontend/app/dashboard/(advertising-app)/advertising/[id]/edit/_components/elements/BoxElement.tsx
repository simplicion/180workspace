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
}

export function BoxElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {}, isReadOnly }: ElementProps) {
    return (
        <div ref={setNodeRef} style={style} onClick={isReadOnly ? undefined : handleClick} className={wrapperClass} {...(isReadOnly ? {} : dragHandlers)}>
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
