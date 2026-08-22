import React from 'react';
import { ElementProps } from './BoxElement';

export function RowElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {} }: ElementProps) {
    return (
        <div ref={setNodeRef} style={style} onClick={handleClick} className={wrapperClass} {...dragHandlers}>
            {renderControls()}
            {renderPaddingControls()}
            {node.children && node.children.length > 0 ? (
                renderChildren?.()
            ) : (
                <div className="p-4 border-2 border-dashed border-indigo-300 bg-indigo-50/50 text-center text-indigo-400 text-sm font-bold rounded-lg min-h-[80px] flex items-center justify-center w-full">
                    Empty Row - Drop items here
                </div>
            )}
        </div>
    );
}
