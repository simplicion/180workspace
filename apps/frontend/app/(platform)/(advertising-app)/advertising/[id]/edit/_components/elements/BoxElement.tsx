import React from 'react';
import { ElementNode } from '../../types';
import { motion } from 'framer-motion';

export interface ElementProps {
    node: ElementNode;
    brand?: any;
    setNodeRef?: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    wrapperClass: string;
    handleClick?: (e: React.MouseEvent) => void;
    renderControls?: () => React.ReactNode;
    renderPaddingControls?: () => React.ReactNode;
    renderChildren?: () => React.ReactNode;
    updateElement?: (id: string, path: string, value: any) => void;
    dragHandlers?: any;
    isReadOnly?: boolean;
    viewMode?: 'desktop' | 'tablet' | 'mobile';
    animationProps?: any;
    animKey?: string;
}

export function BoxElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, renderChildren, dragHandlers = {}, isReadOnly, viewMode, animationProps, animKey }: ElementProps) {
    const isMobileView = viewMode === 'mobile';
    const isRowBox = node.style?.flexDirection === 'row' || (node.style?.display === 'flex' && !node.style?.flexDirection);
    const responsiveClass = `w-full max-w-full box-border ${isRowBox ? (isMobileView ? 'flex flex-col' : 'flex flex-col md:flex-row is-row-container') : ''} ${wrapperClass}`;
    const hasAnimation = animationProps && Object.keys(animationProps).length > 0;
    const BoxTag = hasAnimation ? motion.div : 'div';

    return (
        <BoxTag 
            key={animKey}
            ref={setNodeRef as any} 
            data-element-type="box"
            style={style} 
            onClick={isReadOnly ? undefined : handleClick} 
            className={responsiveClass} 
            {...(isReadOnly ? {} : dragHandlers)}
            {...(hasAnimation ? animationProps : {})}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            {node.children && node.children.length > 0 ? (
                renderChildren?.()
            ) : isReadOnly ? null : (
                <div className="p-4 border-2 border-dashed border-gray-300 bg-gray-50/50 text-center text-gray-400 text-sm font-bold rounded-lg min-h-[100px] flex items-center justify-center">
                    Empty Container - Drop items here
                </div>
            )}
        </BoxTag>
    );
}
