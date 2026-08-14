import React from 'react';
import { ElementNode } from '../../types';
import { ImageIcon } from 'lucide-react';

export interface ElementProps {
    node: ElementNode;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    wrapperClass: string;
    handleClick: (e: React.MouseEvent) => void;
    renderControls: () => React.ReactNode;
    renderPaddingControls: () => React.ReactNode;
    renderChildren?: () => React.ReactNode;
    updateElement: (id: string, path: string, value: any) => void;
    dragHandlers?: any;
    viewMode?: string;
}

export function BoxElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {}, viewMode = 'desktop' }: ElementProps) {
    
    // Auto-adjust layout for mobile if it was horizontal
    const finalStyle = { ...style };
    if (viewMode === 'mobile' && finalStyle.flexDirection === 'row') {
        finalStyle.flexDirection = 'column';
    }

    const isMobile = (node as any).viewMode === 'mobile';
    const originalFlexDirection = finalStyle.flexDirection || 'column';
    const effectiveFlexDirection = (isMobile && originalFlexDirection === 'row') ? 'column' : originalFlexDirection;

    return (
        <div ref={setNodeRef} style={{ ...finalStyle, flexDirection: effectiveFlexDirection }} onClick={handleClick} className={`w-full ${wrapperClass}`} {...(dragHandlers || {})}>
            {renderControls()}
            {renderPaddingControls()}
            {node.children && node.children.length > 0 ? (
                renderChildren?.()
            ) : (
                <div className="p-4 border-2 border-dashed border-gray-300 text-center text-gray-400 text-sm font-bold rounded-lg min-h-[100px] flex items-center justify-center">
                    Empty Box - Drop items here
                </div>
            )}
        </div>
    );
}
