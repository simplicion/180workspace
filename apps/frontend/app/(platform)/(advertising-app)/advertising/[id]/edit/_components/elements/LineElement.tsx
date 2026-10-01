import React from 'react';
import { ElementProps, containerTag, animationAttrs, cx } from './shared';

export function LineElement({ node, setNodeRef, style, className, wrapperClass, handleClick, renderControls, renderPaddingControls, isReadOnly, animationProps, animKey }: ElementProps) {
    const isVertical = node.style?.direction === 'vertical';
    const thickness = node.style?.thickness || '2px';
    const color = node.style?.backgroundColor || '#e5e7eb';
    const borderStyle = node.style?.borderStyle || 'solid';
    const LineContainerTag = containerTag(animationProps);

    return (
        <LineContainerTag
            key={animKey}
            ref={setNodeRef as any}
            data-element-type="line"
            style={style}
            onClick={isReadOnly ? undefined : handleClick}
            className={cx(className, !isReadOnly && 'cursor-pointer', wrapperClass)}
            {...animationAttrs(animationProps)}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            <div
                role="separator"
                aria-orientation={isVertical ? 'vertical' : 'horizontal'}
                style={{
                    width: isVertical ? '0px' : '100%',
                    height: isVertical ? '100%' : '0px',
                    borderTopWidth: isVertical ? '0px' : thickness,
                    borderLeftWidth: isVertical ? thickness : '0px',
                    borderColor: color,
                    borderStyle: borderStyle,
                }}
            />
        </LineContainerTag>
    );
}
