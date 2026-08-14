import React, { useEffect, useRef } from 'react';
import { ElementNode } from '../../types';

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
}

export function LineElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls }: ElementProps) {
    const isVertical = node.style?.direction === 'vertical';
    const thickness = node.style?.thickness || '2px';
    const color = node.style?.backgroundColor || '#e5e7eb';
    
    return (
        <div ref={setNodeRef} style={style} onClick={handleClick} className={`flex items-center justify-center ${wrapperClass} ${isVertical ? 'h-full w-auto' : 'w-full h-auto'}`}>
            {renderControls()}
            {renderPaddingControls()}
            <div style={{
                backgroundColor: color,
                width: isVertical ? thickness : '100%',
                height: isVertical ? '100%' : thickness,
                minHeight: isVertical ? '20px' : thickness,
            }} />
        </div>
    );
}
