import React from 'react';
import { ElementProps } from './BoxElement';

export function LineElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, isReadOnly }: ElementProps) {
    const isVertical = node.style?.direction === 'vertical';
    const thickness = node.style?.thickness || '2px';
    const color = node.style?.backgroundColor || '#e5e7eb';
    const borderStyle = node.style?.borderStyle || 'solid';
    
    return (
        <div ref={setNodeRef} style={style} onClick={isReadOnly ? undefined : handleClick} className={`flex items-center justify-center ${isReadOnly ? '' : 'cursor-pointer'} ${wrapperClass} ${isVertical ? 'h-full w-auto min-w-[24px] px-2' : 'w-full h-auto min-h-[24px] py-2'}`}>
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
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
