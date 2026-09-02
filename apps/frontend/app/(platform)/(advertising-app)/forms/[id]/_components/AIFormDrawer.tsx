'use client';

import React from 'react';
import { UniversalAIDrawer } from '@workspace/ui';
import api from '@/lib/api';

export interface AIFormDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    formId: string;
    formState?: {
        title: string;
        description: string;
        fields: any[];
        settings: any;
        pages: any[];
        activePageId?: string;
    };
    onApplyForm: (data: {
        title?: string;
        description?: string;
        fields?: any[];
        settings?: any;
        pages?: any[];
    }) => void;
}

export function AIFormDrawer({
    isOpen,
    onClose,
    formId,
    formState,
    onApplyForm
}: AIFormDrawerProps) {
    return (
        <UniversalAIDrawer
            isOpen={isOpen}
            onClose={onClose}
            mode="form"
            entityId={formId}
            entityName={formState?.title}
            stateContext={formState}
            onApply={onApplyForm}
            apiClient={api}
        />
    );
}

export default AIFormDrawer;
