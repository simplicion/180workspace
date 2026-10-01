import React from 'react';
import { ElementProps, containerTag, animationAttrs, cx, safeHref } from './shared';

/** Wrapper carries layout (width, margins, alignment); the inner `a.site-btn` carries the visual style (compiled). */
export function ButtonElement({ node, setNodeRef, style, className, wrapperClass, handleClick, renderControls, renderPaddingControls, isReadOnly, animationProps, animKey }: ElementProps) {
    const ButtonContainerTag = containerTag(animationProps);

    return (
        <ButtonContainerTag
            key={animKey}
            ref={setNodeRef as any}
            data-element-type="button"
            style={style}
            onClick={isReadOnly ? undefined : handleClick}
            className={cx(className, wrapperClass)}
            {...animationAttrs(animationProps)}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            <a
                className="site-btn"
                href={safeHref(node.data?.link)}
                target={node.data?.openInNewTab ? '_blank' : '_self'}
                rel={node.data?.openInNewTab ? 'noopener noreferrer' : undefined}
                onClick={isReadOnly ? undefined : (e) => { e.preventDefault(); e.stopPropagation(); handleClick?.(e); }}
            >
                {node.data?.content || 'Click Me'}
            </a>
        </ButtonContainerTag>
    );
}
