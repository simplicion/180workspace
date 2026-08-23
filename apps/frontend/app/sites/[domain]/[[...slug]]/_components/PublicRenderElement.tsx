'use client';
import React from 'react';
import { ElementNode } from '@/app/dashboard/(advertising-app)/advertising/[id]/edit/types';
import { BuilderElement } from '@/app/dashboard/(advertising-app)/advertising/[id]/edit/BuilderElement';

interface PublicRenderElementProps {
    node: ElementNode;
    brand?: any;
}

export function PublicRenderElement({ node, brand }: PublicRenderElementProps) {
    if (!node) return null;
    return <BuilderElement node={node} brand={brand} isReadOnly={true} />;
}
