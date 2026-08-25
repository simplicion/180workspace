import React from 'react';
import { ElementProps } from './BoxElement';

export function RowElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {}, isReadOnly, viewMode }: ElementProps) {
    const isMobileView = viewMode === 'mobile';
    const responsiveClass = `w-full max-w-full flex ${isMobileView ? 'flex-col' : 'flex-col md:flex-row'} flex-wrap items-stretch gap-4 md:gap-6 ${wrapperClass}`;

    return (
        <div 
            ref={setNodeRef} 
            data-element-type="row"
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
                <div className="p-4 border-2 border-dashed border-indigo-300 bg-indigo-50/50 text-center text-indigo-400 text-sm font-bold rounded-lg min-h-[80px] flex items-center justify-center w-full">
                    Empty Row - Drop items here
                </div>
            )}
        </div>
    );
}
