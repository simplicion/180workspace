import React from 'react';
import { ElementProps } from './BoxElement';
import { motion } from 'framer-motion';

export function ButtonElement({ node, brand, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, isReadOnly, viewMode, animationProps, animKey }: ElementProps) {
    const wrapperStyle = {
        transform: style.transform,
        transition: style.transition,
        opacity: style.opacity,
        display: style.display || 'inline-block',
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
        alignSelf: style.alignSelf,
        width: style.width,
        maxWidth: '100%'
    };

    const hasAnimation = animationProps && Object.keys(animationProps).length > 0;
    const ButtonContainerTag = hasAnimation ? motion.div : 'div';

    return (
        <ButtonContainerTag 
            key={animKey}
            ref={setNodeRef as any} 
            data-element-type="button"
            style={wrapperStyle} 
            onClick={isReadOnly ? undefined : handleClick} 
            className={`relative max-w-full ${wrapperClass} text-center`}
            {...(hasAnimation ? animationProps : {})}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            <a 
                href={node.data?.link || '#'}
                target={node.data?.openInNewTab ? '_blank' : '_self'}
                rel={node.data?.openInNewTab ? 'noopener noreferrer' : undefined}
                onClick={isReadOnly ? undefined : (e) => { e.preventDefault(); e.stopPropagation(); handleClick?.(e); }}
                style={{
                    fontSize: style.fontSize || node.style?.fontSize || '1rem',
                    fontFamily: node.style?.fontFamily || 'inherit',
                    backgroundColor: node.style?.backgroundColor || brand?.primaryColor || '#4f46e5',
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
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    minWidth: '120px',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                }}
            >
                {node.data?.content || 'Click Me'}
            </a>
        </ButtonContainerTag>
    );
}
