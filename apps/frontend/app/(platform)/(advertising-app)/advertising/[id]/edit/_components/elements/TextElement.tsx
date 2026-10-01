import React from 'react';
import { ElementProps, containerTag, animationAttrs, cx, safeHref } from './shared';

const TEXT_TAGS = new Set(['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'label', 'small', 'strong', 'em']);

export function TextElement({ node, brand, setNodeRef, style, className, wrapperClass, handleClick, renderControls, renderPaddingControls, updateElement, isReadOnly, animationProps, animKey }: ElementProps) {
    const requestedTag = String(node.style?.tagName || 'div').toLowerCase();
    const Tag = (TEXT_TAGS.has(requestedTag) ? requestedTag : 'div') as React.ElementType;

    // Process variables like {{brand.companyName}}
    let displayContent = node.data?.content || 'Text';
    if (brand && typeof displayContent === 'string') {
        displayContent = displayContent.replace(/\{\{brand\.([a-zA-Z0-9_]+)\}\}/g, (match: string, key: string) => {
            return brand[key] !== undefined ? brand[key] : match;
        });
    }

    const isLink = !!node.data?.link;

    // Typography lives on the compiled wrapper class and is inherited (preflight resets heading/paragraph font + margins).
    const textElement = (
        <Tag
            className="max-w-full outline-none"
            contentEditable={!isReadOnly}
            suppressContentEditableWarning={true}
            onBlur={isReadOnly ? undefined : (e: React.FocusEvent<HTMLElement>) => {
                updateElement?.(node.id, 'data.content', e.currentTarget.innerHTML);
            }}
            dangerouslySetInnerHTML={{ __html: displayContent }}
            onClick={isReadOnly ? undefined : (e: React.MouseEvent) => { e.stopPropagation(); handleClick?.(e); }}
        />
    );

    const TextContainerTag = containerTag(animationProps);

    return (
        <TextContainerTag
            key={animKey}
            ref={setNodeRef as any}
            data-element-type="text"
            style={style}
            onClick={isReadOnly ? undefined : handleClick}
            className={cx(className, wrapperClass)}
            {...animationAttrs(animationProps)}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            {isLink && isReadOnly ? (
                <a
                    href={safeHref(node.data.link)}
                    target={node.data.openInNewTab ? '_blank' : '_self'}
                    rel={node.data.openInNewTab ? 'noopener noreferrer' : undefined}
                    className="no-underline text-inherit block max-w-full"
                >
                    {textElement}
                </a>
            ) : (
                textElement
            )}
        </TextContainerTag>
    );
}
