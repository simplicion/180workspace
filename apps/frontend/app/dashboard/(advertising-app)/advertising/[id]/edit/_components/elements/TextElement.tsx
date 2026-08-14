import React from 'react';
import { ElementNode } from '../../types';
import { ImageIcon } from 'lucide-react';

export interface ElementProps {
    node: ElementNode;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    wrapperClass: string;
    handleClick: (e: React.MouseEvent) => void;
    renderControls: () => React.ReactNode;
    renderPaddingControls: () => React.ReactNode;
    renderChildren?: () => React.ReactNode;
    updateElement: (id: string, path: string, value: any) => void;
}

export function TextElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, updateElement }: ElementProps) {
    const Tag = (node.style?.tagName || 'div') as keyof JSX.IntrinsicElements;
    return (
        <div ref={setNodeRef} style={style} onClick={handleClick} className={wrapperClass}>
            {renderControls()}
            {renderPaddingControls()}
            <Tag
                style={{
                    fontSize: node.style?.fontSize,
                    fontWeight: node.style?.fontWeight,
                    textAlign: node.style?.textAlign,
                    color: node.style?.color,
                    opacity: node.style?.opacity,
                    marginBottom: node.style?.marginBottom,
                    outline: 'none'
                }}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onBlur={(e: React.FocusEvent<HTMLElement>) => {
                    updateElement(node.id, 'data.content', e.currentTarget.innerHTML);
                }}
                dangerouslySetInnerHTML={{ __html: node.data?.content || 'Text' }}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleClick(e); }}
            />
        </div>
    );
}
