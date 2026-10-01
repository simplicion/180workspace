import React from 'react';
import type { ElementNode } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/types';
import { nodeClassName } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/responsive-styles';
import { getAdvancedAnimationProps } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/animation';
import { MotionTag } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/MotionTag';
import { BoxElement } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/BoxElement';
import { RowElement } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/RowElement';
import { ColumnElement } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/ColumnElement';
import { TextElement } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/TextElement';
import { ButtonElement } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/ButtonElement';
import { LineElement } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/LineElement';
import { MediaElement } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/MediaElement';
import { FloatingElement } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/FloatingElement';
import CodeElement from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/elements/CodeElement';

/**
 * Lean, read-only renderer for published sites (server component).
 * Shares element markup with the editor, but no dnd-kit and no editor controls. Persisted styles come from the
 * compiled `<ResponsiveStyles>` class; framer-motion is only pulled in (via MotionTag) for nodes with an animation,
 * and only media / floating / code nodes hydrate as client components.
 */
export function SiteElement({ node, brand }: { node: ElementNode; brand?: any }): React.ReactElement | null {
    if (!node || typeof node !== 'object' || node.id === undefined || node.id === null) return null;

    const className = nodeClassName(node.id);
    const anim = getAdvancedAnimationProps(node.animationConfig, node.animation);
    const animationProps = anim && Object.keys(anim).length > 0 ? anim : undefined;
    const kids = Array.isArray(node.children)
        ? node.children.filter((c) => c && typeof c === 'object').map((child, i) => (
            <SiteElement key={child.id ?? i} node={child} brand={brand} />
        ))
        : null;

    const common = { node, className, isReadOnly: true, animationProps };

    switch (node.type) {
        case 'section':
        case 'code': {
            const Tag: React.ElementType = animationProps ? MotionTag : 'div';
            return (
                <Tag data-element-type={node.type} className={className} {...(animationProps || {})}>
                    {node.type === 'code' ? <CodeElement element={node} isReadOnly={true} /> : kids}
                </Tag>
            );
        }
        case 'box': return <BoxElement {...common}>{kids}</BoxElement>;
        case 'row': return <RowElement {...common}>{kids}</RowElement>;
        case 'column': return <ColumnElement {...common}>{kids}</ColumnElement>;
        case 'floating': return <FloatingElement {...common}>{kids}</FloatingElement>;
        case 'text': return <TextElement {...common} brand={brand} />;
        case 'button': return <ButtonElement {...common} brand={brand} />;
        case 'line': return <LineElement {...common} />;
        case 'media':
        case 'image': return <MediaElement {...common} />;
        default:
            // Legacy/unknown node types: never crash; keep nested content visible.
            return kids && kids.length > 0 ? <div data-element-type={String(node.type || 'unknown')} className={className}>{kids}</div> : null;
    }
}
