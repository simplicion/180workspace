import React from 'react';
import { ElementProps } from './BoxElement';

export function TextElement({ node, brand, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, updateElement, isReadOnly }: ElementProps) {
    const Tag = (node.style?.tagName || 'div') as React.ElementType;
    
    // Process variables like {{brand.companyName}}
    let displayContent = node.data?.content || 'Text';
    if (brand && typeof displayContent === 'string') {
        displayContent = displayContent.replace(/\{\{brand\.([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
            return brand[key] !== undefined ? brand[key] : match;
        });
    }

    const textStyle: React.CSSProperties = {
        fontSize: node.style?.fontSize,
        fontWeight: node.style?.fontWeight,
        fontFamily: node.style?.fontFamily,
        fontStyle: node.style?.fontStyle,
        textDecoration: node.style?.textDecoration,
        textTransform: node.style?.textTransform,
        lineHeight: node.style?.lineHeight,
        letterSpacing: node.style?.letterSpacing,
        textAlign: node.style?.textAlign,
        textShadow: node.style?.textShadow,
        color: node.style?.color,
        opacity: node.style?.opacity,
        marginBottom: node.style?.marginBottom,
        outline: 'none'
    };

    const isLink = !!node.data?.link;

    const textElement = (
        <Tag
            style={textStyle}
            contentEditable={!isReadOnly}
            suppressContentEditableWarning={true}
            onBlur={isReadOnly ? undefined : (e: React.FocusEvent<HTMLElement>) => {
                updateElement?.(node.id, 'data.content', e.currentTarget.innerHTML);
            }}
            dangerouslySetInnerHTML={{ __html: displayContent }}
            onClick={isReadOnly ? undefined : (e: React.MouseEvent) => { e.stopPropagation(); handleClick?.(e); }}
        />
    );

    return (
        <div ref={setNodeRef} style={style} onClick={isReadOnly ? undefined : handleClick} className={wrapperClass}>
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            {isLink && isReadOnly ? (
                <a
                    href={node.data.link}
                    target={node.data.openInNewTab ? '_blank' : '_self'}
                    rel={node.data.openInNewTab ? 'noopener noreferrer' : undefined}
                    className="no-underline text-inherit block"
                >
                    {textElement}
                </a>
            ) : (
                textElement
            )}
        </div>
    );
}
