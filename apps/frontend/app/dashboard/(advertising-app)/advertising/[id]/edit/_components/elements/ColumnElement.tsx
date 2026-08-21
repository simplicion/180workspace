import React from 'react';
import { ElementProps } from './BoxElement';

export function ColumnElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {} }: ElementProps) {
    return (
        <div ref={setNodeRef} style={style} onClick={handleClick} className={`w-full ${wrapperClass}`} {...dragHandlers}>
            {renderControls()}
            {renderPaddingControls()}
            {node.children && node.children.length > 0 ? (
                renderChildren?.()
            ) : (
                <div className="p-4 border-2 border-dashed border-teal-300 bg-teal-50/50 text-center text-teal-400 text-sm font-bold rounded-lg min-h-[120px] flex flex-col items-center justify-center w-full">
                    Empty Column - Drop items here
                </div>
            )}
        </div>
    );
}
