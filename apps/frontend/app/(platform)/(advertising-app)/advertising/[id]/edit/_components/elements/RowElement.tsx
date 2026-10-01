import React from 'react';
import { ElementProps, containerTag, animationAttrs, cx, renderKids } from './shared';

export function RowElement(props: ElementProps) {
    const { node, setNodeRef, style, className, wrapperClass, handleClick, renderControls, renderPaddingControls, dragHandlers = {}, isReadOnly, animationProps, animKey } = props;
    const RowTag = containerTag(animationProps);

    return (
        <RowTag
            key={animKey}
            ref={setNodeRef as any}
            data-element-type="row"
            style={style}
            onClick={isReadOnly ? undefined : handleClick}
            className={cx(className, wrapperClass)}
            {...(isReadOnly ? {} : dragHandlers)}
            {...animationAttrs(animationProps)}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            {node.children && node.children.length > 0 ? (
                renderKids(props)
            ) : isReadOnly ? null : (
                <div className="p-4 border-2 border-dashed border-indigo-300 bg-indigo-50/50 text-center text-indigo-400 text-sm font-bold rounded-lg min-h-[80px] flex items-center justify-center w-full">
                    Empty Row - Drop items here
                </div>
            )}
        </RowTag>
    );
}
