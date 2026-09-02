'use client';

import React from 'react';
import { UniversalAIDrawer } from '@workspace/ui';
import api from '@/lib/api';

export interface AIWebsiteDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    website: any;
    config?: any;
    onApplyConfig: (newConfig: any) => void;
}

export function AIWebsiteDrawer({
    isOpen,
    onClose,
    website,
    config,
    onApplyConfig
}: AIWebsiteDrawerProps) {
    return (
        <UniversalAIDrawer
            isOpen={isOpen}
            onClose={onClose}
            mode="website"
            entityId={website?.id}
            entityName={website?.name}
            stateContext={config}
            onApply={onApplyConfig}
            apiClient={api}
        />
    );
}

export default AIWebsiteDrawer;
