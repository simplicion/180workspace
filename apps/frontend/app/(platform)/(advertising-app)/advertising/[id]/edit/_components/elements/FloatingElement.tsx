'use client';
import React from 'react';
import { ElementProps, containerTag, animationAttrs, cx, renderKids, safeHref } from './shared';
import { Anchor } from 'lucide-react';

export function FloatingElement(props: ElementProps) {
    const {
        node,
        setNodeRef,
        style,
        className,
        wrapperClass,
        handleClick,
        renderControls,
        renderPaddingControls,
        dragHandlers = {},
        isReadOnly,
        animationProps,
        animKey
    } = props;
    const FloatingTag = containerTag(animationProps);
    
    // Position type preset (default: 'bottom-right')
    const position = node.data?.position || 'bottom-right';
    const linkUrl = node.data?.linkUrl ? safeHref(node.data.linkUrl) : undefined;
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

    // Anchoring stays inline (fixed on the site, absolute in the editor); everything else is in the compiled class.
    const combinedStyle: React.CSSProperties = {
        ...style,
        ...positionStyle,
    };

    // Editor visual guide class
    const editorGuideClass = !isReadOnly
        ? 'ring-1 ring-indigo-400/80 shadow-lg shadow-indigo-500/10 hover:ring-2 hover:ring-indigo-500'
        : 'shadow-xl';

    const navigate = () => {
        if (!linkUrl || linkUrl === '#') return;
        if (openInNewTab) window.open(linkUrl, '_blank', 'noopener,noreferrer');
        else window.location.href = linkUrl;
    };

    const content = (
        <FloatingTag
            key={animKey}
            ref={setNodeRef as any}
            data-element-type="floating"
            style={combinedStyle}
            onClick={isReadOnly ? navigate : handleClick}
            className={cx(className, 'transition-all duration-200', editorGuideClass, linkUrl && isReadOnly && 'cursor-pointer hover:scale-105 active:scale-95', wrapperClass)}
            {...(isReadOnly ? {} : dragHandlers)}
            {...(isReadOnly && linkUrl ? {
                role: 'link',
                tabIndex: 0,
                onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(); } },
            } : {})}
            {...animationAttrs(animationProps)}
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
                renderKids(props)
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
