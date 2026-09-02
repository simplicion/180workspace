'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface AIStatus {
    isConfigured: boolean;
    provider: string;
    model: string;
    status: 'connected' | 'ready' | 'unconfigured' | 'error';
    lastTested: string | null;
    companyName?: string;
}

export function useAI() {
    const [status, setStatus] = useState<AIStatus>({
        isConfigured: false,
        provider: 'none',
        model: 'None',
        status: 'unconfigured',
        lastTested: null
    });
    const [loading, setLoading] = useState<boolean>(true);

    const checkStatus = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/v1/ai/status').catch(() => api.get('/api/180documents/ai-status'));
            if (res?.data) {
                setStatus({
                    isConfigured: res.data.isConfigured !== false,
                    provider: res.data.provider || 'none',
                    model: res.data.model || 'Google Gemini 1.5 Flash',
                    status: res.data.status || 'connected',
                    lastTested: res.data.lastTested,
                    companyName: res.data.companyName
                });
            }
        } catch (err) {
            console.warn('[useAI] Failed to fetch AI status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const sendChat = async (prompt: string, mode: string = 'global', sessionId?: string) => {
        return await api.post('/api/v1/ai/chat', { prompt, mode, sessionId });
    };

    const generateDocument = async (params: {
        prompt: string;
        documentType?: string;
        clientId?: string;
        employeeId?: string;
        existingBlocks?: any[];
        sessionId?: string;
    }) => {
        return await api.post('/api/v1/ai/documents/generate', params);
    };

    const analyzeDocument = async (fileText: string, fileName: string, query: string) => {
        return await api.post('/api/v1/ai/documents/chat-file', { fileText, fileName, query });
    };

    return {
        status,
        loading,
        checkStatus,
        sendChat,
        generateDocument,
        analyzeDocument
    };
}
