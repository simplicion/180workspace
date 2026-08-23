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
    const borderStyle = node.style?.borderStyle || 'solid';
    
    return (
        <div ref={setNodeRef} style={style} onClick={handleClick} className={`flex items-center justify-center cursor-pointer ${wrapperClass} ${isVertical ? 'h-full w-auto min-w-[24px] px-2' : 'w-full h-auto min-h-[24px] py-2'}`}>
            {renderControls()}
            {renderPaddingControls()}
            <div style={{
                width: isVertical ? '0px' : '100%',
                height: isVertical ? '100%' : '0px',
                borderTopWidth: isVertical ? '0px' : thickness,
                borderLeftWidth: isVertical ? thickness : '0px',
                borderColor: color,
                borderStyle: borderStyle,
            }} />
        </div>
    );
}
