'use client';
import React from 'react';
import { ElementProps } from './BoxElement';
import { Anchor, MessageSquare, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export function FloatingElement({
    node,
    setNodeRef,
    style,
    wrapperClass,
    handleClick,
    renderControls,
    renderPaddingControls,
    renderChildren,
    dragHandlers = {},
    isReadOnly,
    viewMode,
    animationProps,
    animKey
}: ElementProps) {
    const isMobileView = viewMode === 'mobile';
    const hasAnimation = animationProps && Object.keys(animationProps).length > 0;
    const FloatingTag = hasAnimation ? motion.div : 'div';
    
    // Position type preset (default: 'bottom-right')
    const position = node.data?.position || 'bottom-right';
    const linkUrl = node.data?.linkUrl;
    const openInNewTab = node.data?.openInNewTab !== false;

    // Calculate dynamic anchor styling
    const getPositionStyles = (): React.CSSProperties => {
        const basePos: React.CSSProperties = {
            position: isReadOnly ? 'fixed' : 'absolute',
            zIndex: node.style?.zIndex ? Number(node.style.zIndex) : (isReadOnly ? 50 : 45),
        };

        const offsetX = node.style?.offsetX || (position.includes('bar') ? '0' : '1.5rem');
        const offsetY = node.style?.offsetY || (position.includes('bar') ? '0' : '1.5rem');

        switch (position) {
            case 'bottom-right':
                return {
                    ...basePos,
                    bottom: offsetY,
                    right: offsetX,
                };
            case 'bottom-left':
                return {
                    ...basePos,
                    bottom: offsetY,
                    left: offsetX,
                };
            case 'bottom-bar':
                return {
                    ...basePos,
                    bottom: '0',
                    left: '0',
                    right: '0',
                    width: '100%',
                };
            case 'top-bar':
                return {
                    ...basePos,
                    top: '0',
                    left: '0',
                    right: '0',
                    width: '100%',
                };
            case 'top-right':
                return {
                    ...basePos,
                    top: offsetY,
                    right: offsetX,
                };
            case 'top-left':
                return {
                    ...basePos,
                    top: offsetY,
                    left: offsetX,
                };
            case 'middle-right':
                return {
                    ...basePos,
                    top: '50%',
                    right: '0',
                    transform: 'translateY(-50%)',
                };
            case 'middle-left':
                return {
                    ...basePos,
                    top: '50%',
                    left: '0',
                    transform: 'translateY(-50%)',
                };
            case 'custom':
                return {
                    ...basePos,
                    top: node.style?.top,
                    bottom: node.style?.bottom,
                    left: node.style?.left,
                    right: node.style?.right,
                };
            default:
                return {
                    ...basePos,
                    bottom: offsetY,
                    right: offsetX,
                };
        }
    };

    const positionStyle = getPositionStyles();

    // Default container styling
    const combinedStyle: React.CSSProperties = {
        ...style,
        ...positionStyle,
        display: node.style?.display || 'flex',
        alignItems: node.style?.alignItems || 'center',
        justifyContent: node.style?.justifyContent || 'center',
        flexDirection: node.style?.flexDirection || 'row',
        gap: node.style?.gap || '0.5rem',
        boxSizing: 'border-box',
    };

    // Editor visual guide class
    const editorGuideClass = !isReadOnly
        ? 'ring-1 ring-indigo-400/80 shadow-lg shadow-indigo-500/10 hover:ring-2 hover:ring-indigo-500'
        : 'shadow-xl';

    const content = (
        <FloatingTag
            key={animKey}
            ref={setNodeRef as any}
            data-element-type="floating"
            style={combinedStyle}
            onClick={isReadOnly ? (e: any) => {
                if (linkUrl) {
                    // Navigate or trigger link
                    if (openInNewTab) {
                        window.open(linkUrl, '_blank', 'noopener,noreferrer');
                    } else {
                        window.location.href = linkUrl;
                    }
                }
            } : handleClick}
            className={`transition-all duration-200 ${editorGuideClass} ${linkUrl && isReadOnly ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} ${wrapperClass}`}
            {...(isReadOnly ? {} : dragHandlers)}
            {...(hasAnimation ? animationProps : {})}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}

            {/* Editor-Only Floating Indicator Badge */}
            {!isReadOnly && (
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-40 px-1.5 py-0.2 bg-indigo-600 text-[9px] font-bold text-white rounded-full shadow-xs flex items-center gap-1 pointer-events-none whitespace-nowrap opacity-75 group-hover/element:opacity-100">
                    <Anchor className="w-2.5 h-2.5" />
                    <span>Floating ({position})</span>
                </div>
            )}

            {node.children && node.children.length > 0 ? (
                renderChildren?.()
            ) : isReadOnly ? null : (
                <div className="p-3 border-2 border-dashed border-indigo-300 bg-indigo-50/50 text-center text-indigo-500 text-xs font-bold rounded-lg min-h-[50px] min-w-[50px] flex items-center justify-center gap-1.5">
                    <Anchor className="w-3.5 h-3.5" />
                    <span>Drop content here</span>
                </div>
            )}
        </FloatingTag>
    );

    return content;
}
