import React from 'react';
import { ElementProps } from './BoxElement';

export function TextElement({ node, brand, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, updateElement, isReadOnly, viewMode }: ElementProps) {
    const Tag = (node.style?.tagName || 'div') as React.ElementType;
    const isMobileView = viewMode === 'mobile';
    
    // Process variables like {{brand.companyName}}
    let displayContent = node.data?.content || 'Text';
    if (brand && typeof displayContent === 'string') {
        displayContent = displayContent.replace(/\{\{brand\.([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
            return brand[key] !== undefined ? brand[key] : match;
        });
    }

    const textStyle: React.CSSProperties = {
        fontSize: style.fontSize || node.style?.fontSize,
        fontWeight: node.style?.fontWeight,
        fontFamily: node.style?.fontFamily,
        fontStyle: node.style?.fontStyle,
        textDecoration: node.style?.textDecoration,
        textTransform: node.style?.textTransform,
        lineHeight: isMobileView ? '1.3' : (node.style?.lineHeight || '1.4'),
        letterSpacing: node.style?.letterSpacing,
        textAlign: node.style?.textAlign,
        textShadow: node.style?.textShadow,
        color: node.style?.color,
        opacity: node.style?.opacity,
        marginBottom: node.style?.marginBottom,
        maxWidth: '100%',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
        boxSizing: 'border-box',
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
        <div 
            ref={setNodeRef} 
            data-element-type="text"
            style={style} 
            onClick={isReadOnly ? undefined : handleClick} 
            className={`w-full max-w-full ${wrapperClass}`}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            {isLink && isReadOnly ? (
                <a
                    href={node.data.link}
                    target={node.data.openInNewTab ? '_blank' : '_self'}
                    rel={node.data.openInNewTab ? 'noopener noreferrer' : undefined}
                    className="no-underline text-inherit block max-w-full"
                >
                    {textElement}
                </a>
            ) : (
                textElement
            )}
        </div>
    );
}
