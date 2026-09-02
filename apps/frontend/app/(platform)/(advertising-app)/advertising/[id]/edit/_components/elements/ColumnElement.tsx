import React from 'react';
import { ElementProps } from './BoxElement';
import { motion } from 'framer-motion';

export function ColumnElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {}, isReadOnly, viewMode, animationProps, animKey }: ElementProps) {
    const isMobileView = viewMode === 'mobile';
    const hasAnimation = animationProps && Object.keys(animationProps).length > 0;
    const ColTag = hasAnimation ? motion.div : 'div';
    
    return (
        <ColTag 
            key={animKey}
            ref={setNodeRef as any} 
            data-element-type="column"
            style={style} 
            onClick={isReadOnly ? undefined : handleClick} 
            className={`flex-1 flex flex-col ${isMobileView ? 'w-full !max-w-full' : ''} ${wrapperClass}`} 
            {...(isReadOnly ? {} : dragHandlers)}
            {...(hasAnimation ? animationProps : {})}
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
        </ColTag>
    );
}
