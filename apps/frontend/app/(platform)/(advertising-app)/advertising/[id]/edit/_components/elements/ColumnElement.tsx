import React from 'react';
import { ElementProps, containerTag, animationAttrs, cx, renderKids } from './shared';

export function ColumnElement(props: ElementProps) {
    const { node, setNodeRef, style, className, wrapperClass, handleClick, renderControls, renderPaddingControls, dragHandlers = {}, isReadOnly, animationProps, animKey } = props;
    const ColTag = containerTag(animationProps);

    return (
        <ColTag
            key={animKey}
            ref={setNodeRef as any}
            data-element-type="column"
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
                <div className="p-4 border-2 border-dashed border-teal-300 bg-teal-50/50 text-center text-teal-400 text-sm font-bold rounded-lg min-h-[120px] flex flex-col items-center justify-center w-full">
                    Empty Column - Drop items here
                </div>
            )}
        </ColTag>
    );
}
