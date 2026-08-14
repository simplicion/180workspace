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
    const contentRef = React.useRef<HTMLElement>(null);

    React.useEffect(() => {
        if (contentRef.current) {
            const currentHTML = contentRef.current.innerHTML;
            const targetHTML = node.data?.content || 'Text';
            // Only update DOM if the text actually differs from current DOM
            // This prevents React from resetting the caret to index 0 on every re-render while typing
            if (currentHTML !== targetHTML && document.activeElement !== contentRef.current) {
                contentRef.current.innerHTML = targetHTML;
            }
        }
    }, [node.data?.content]);

    return (
        <div ref={setNodeRef} style={style} onClick={handleClick} className={wrapperClass}>
            {renderControls()}
            {renderPaddingControls()}
            <Tag 
                ref={contentRef}
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
                    const newContent = e.currentTarget.innerHTML;
                    if (newContent !== node.data?.content) {
                        updateElement(node.id, 'data.content', newContent);
                    }
                }}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleClick(e); }}
            />
        </div>
    );
}
