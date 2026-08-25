import React from 'react';
import { ElementProps } from './BoxElement';

export function ColumnElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {}, isReadOnly, viewMode }: ElementProps) {
    const isMobileView = viewMode === 'mobile';
    const responsiveClass = `w-full ${isMobileView ? 'w-full' : 'md:flex-1'} max-w-full flex flex-col box-border ${wrapperClass}`;

    return (
        <div 
            ref={setNodeRef} 
            data-element-type="column"
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
                <div className="p-4 border-2 border-dashed border-teal-300 bg-teal-50/50 text-center text-teal-400 text-sm font-bold rounded-lg min-h-[120px] flex flex-col items-center justify-center w-full">
                    Empty Column - Drop items here
                </div>
            )}
        </div>
    );
}
