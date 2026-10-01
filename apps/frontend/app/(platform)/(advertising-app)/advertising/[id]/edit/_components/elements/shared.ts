import type React from 'react';
import type { ElementNode } from '../../types';
import { MotionTag } from './MotionTag';

export interface ElementProps {
    node: ElementNode;
    brand?: any;
    setNodeRef?: (node: HTMLElement | null) => void;
    /** Transient inline style only (dnd transform, live margin-drag preview). Persisted styles come from `className`. */
    style?: React.CSSProperties;
    /** Compiled responsive class for this node (`n-<id>`, see responsive-styles.ts). */
    className?: string;
    /** Editor affordance classes (selection ring, drop indicator). */
    wrapperClass?: string;
    handleClick?: (e: React.MouseEvent) => void;
    renderControls?: () => React.ReactNode;
    renderPaddingControls?: () => React.ReactNode;
    /** Editor: renders children with dnd context. */
    renderChildren?: () => React.ReactNode;
    /** Public site: already-rendered children. Used when `renderChildren` is absent. */
    children?: React.ReactNode;
    updateElement?: (id: string, path: string, value: any) => void;
    dragHandlers?: any;
    isReadOnly?: boolean;
    viewMode?: 'desktop' | 'tablet' | 'mobile';
    animationProps?: any;
    animKey?: string;
}

export const hasAnimation = (animationProps: any) => !!animationProps && Object.keys(animationProps).length > 0;

/** `MotionTag` (client, framer-motion) only for animated nodes; a plain div otherwise. */
export const containerTag = (animationProps: any): React.ElementType => (hasAnimation(animationProps) ? MotionTag : 'div');

export const animationAttrs = (animationProps: any) => (hasAnimation(animationProps) ? animationProps : {});

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const renderKids = (p: Pick<ElementProps, 'renderChildren' | 'children'>) => (p.renderChildren ? p.renderChildren() : p.children);

/** Blocks script-capable URL schemes in user links. */
export function safeHref(link: unknown): string {
    if (typeof link !== 'string' || !link.trim()) return '#';
    const v = link.trim();
    return /^(javascript|vbscript|data):/i.test(v.replace(/[\s\u0000-\u001f]/g, '')) ? '#' : v;
}
