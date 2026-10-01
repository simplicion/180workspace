import React from 'react';
import { ElementProps, containerTag, animationAttrs, cx, renderKids } from './shared';

export type { ElementProps } from './shared';

export function BoxElement(props: ElementProps) {
    const { node, setNodeRef, style, className, wrapperClass, handleClick, renderControls, renderPaddingControls, dragHandlers = {}, isReadOnly, animationProps, animKey } = props;
    const BoxTag = containerTag(animationProps);

    return (
        <BoxTag
            key={animKey}
            ref={setNodeRef as any}
            data-element-type="box"
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
                <div className="p-4 border-2 border-dashed border-gray-300 bg-gray-50/50 text-center text-gray-400 text-sm font-bold rounded-lg min-h-[100px] w-full flex items-center justify-center">
                    Empty Container - Drop items here
                </div>
            )}
        </BoxTag>
    );
}
