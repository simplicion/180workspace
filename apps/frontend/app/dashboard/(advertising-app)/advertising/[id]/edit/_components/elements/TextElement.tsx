import React from 'react';
import { ElementNode } from '../../types';
import { ImageIcon } from 'lucide-react';

export interface ElementProps {
    node: ElementNode;
    brand?: any;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    wrapperClass: string;
    handleClick: (e: React.MouseEvent) => void;
    renderControls: () => React.ReactNode;
    renderPaddingControls: () => React.ReactNode;
    renderChildren?: () => React.ReactNode;
    updateElement: (id: string, path: string, value: any) => void;
}

export function TextElement({ node, brand, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, updateElement }: ElementProps) {
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

    return (
        <div ref={setNodeRef} style={style} onClick={handleClick} className={wrapperClass}>
            {renderControls()}
            {renderPaddingControls()}
            <Tag
                style={textStyle}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onBlur={(e: React.FocusEvent<HTMLElement>) => {
                    // Note: if a user edits a node with an interpolated variable, the variable will be replaced with the static text.
                    updateElement(node.id, 'data.content', e.currentTarget.innerHTML);
                }}
                dangerouslySetInnerHTML={{ __html: displayContent }}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleClick(e); }}
            />
        </div>
    );
}
