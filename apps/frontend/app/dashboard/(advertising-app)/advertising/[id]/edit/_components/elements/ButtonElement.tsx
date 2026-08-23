import React, { useEffect, useRef } from 'react';
import { ElementNode } from '../../types';

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

export function ButtonElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, updateElement }: ElementProps) {
    return (
        <div ref={setNodeRef} style={style} onClick={handleClick} className={`flex justify-center ${wrapperClass}`}>
            {renderControls()}
            {renderPaddingControls()}
            <a 
                href={node.data?.link || '#'}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClick(e); }}
                style={{
                    fontSize: node.style?.fontSize || '1rem',
                    fontFamily: node.style?.fontFamily || 'inherit',
                    backgroundColor: node.style?.backgroundColor || '#4f46e5',
                    color: node.style?.color || '#ffffff',
                    borderColor: node.style?.borderColor || 'transparent',
                    borderWidth: node.style?.borderWidth || '0px',
                    borderStyle: node.style?.borderStyle || 'solid',
                    paddingTop: node.style?.paddingTop || '0.75rem',
                    paddingBottom: node.style?.paddingBottom || '0.75rem',
                    paddingLeft: node.style?.paddingLeft || '1.5rem',
                    paddingRight: node.style?.paddingRight || '1.5rem',
                    borderRadius: node.style?.borderRadius || '0.5rem',
                    fontWeight: node.style?.fontWeight || 'bold',
                    textDecoration: 'none',
                    display: 'inline-block',
                    textAlign: 'center',
                    minWidth: '120px'
                }}
            >
                {node.data?.content || 'Click Me'}
            </a>
        </div>
    );
}
