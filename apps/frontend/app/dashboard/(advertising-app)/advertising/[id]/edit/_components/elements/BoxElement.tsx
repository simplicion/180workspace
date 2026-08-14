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
    dragHandlers?: any;
}

export function BoxElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {} }: ElementProps) {
    return (
        <div ref={setNodeRef} style={style} onClick={handleClick} className={`w-full ${wrapperClass}`} {...dragHandlers}>
            {renderControls()}
            {renderPaddingControls()}
            {node.children && node.children.length > 0 ? (
                renderChildren?.()
            ) : (
                <div className="p-4 border-2 border-dashed border-gray-300 text-center text-gray-400 text-sm font-bold rounded-lg min-h-[100px] flex items-center justify-center">
                    Empty Box - Drop items here
                </div>
            )}
        </div>
    );
}
