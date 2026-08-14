'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConfirmModal } from "@workspace/ui";

type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

interface ModalOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ModalVariant;
    defaultValue?: string;
    placeholder?: string;
}

interface ModalContextType {
    confirm: (options: ModalOptions) => Promise<boolean>;
    alert: (options: ModalOptions) => Promise<void>;
    prompt: (options: ModalOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant: ModalVariant;
        type: 'confirm' | 'alert' | 'prompt';
        defaultValue?: string;
        placeholder?: string;
        resolve: (value: any) => void;
    } | null>(null);

    const confirm = (options: ModalOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setModalConfig({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText,
                cancelText: options.cancelText,
                variant: options.variant || 'danger',
                type: 'confirm',
                resolve,
            });
        });
    };

    const alert = (options: ModalOptions): Promise<void> => {
        return new Promise((resolve) => {
            setModalConfig({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText || 'OK',
                variant: options.variant || 'info',
                type: 'alert',
                resolve,
            });
        });
    };

    const prompt = (options: ModalOptions): Promise<string | null> => {
        return new Promise((resolve) => {
            setModalConfig({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText || 'Submit',
                cancelText: options.cancelText || 'Cancel',
                variant: options.variant || 'info',
                type: 'prompt',
                defaultValue: options.defaultValue,
                placeholder: options.placeholder,
                resolve,
            });
        });
    };

    const handleConfirm = (value?: string) => {
        if (modalConfig) {
            modalConfig.resolve(modalConfig.type === 'prompt' ? (value || '') : true);
            setModalConfig(null);
        }
    };

    const handleCancel = () => {
        if (modalConfig) {
            modalConfig.resolve(modalConfig.type === 'prompt' ? null : false);
            setModalConfig(null);
        }
    };

    const handleClose = () => {
        if (modalConfig) {
            modalConfig.resolve(undefined);
            setModalConfig(null);
        }
    };

    return (
        <ModalContext.Provider value={{ confirm, alert, prompt }}>
            {children}
            {modalConfig && (
                <ConfirmModal
                    isOpen={modalConfig.isOpen}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    confirmText={modalConfig.confirmText}
                    cancelText={modalConfig.cancelText}
                    variant={modalConfig.variant}
                    type={modalConfig.type}
                    defaultValue={modalConfig.defaultValue}
                    placeholder={modalConfig.placeholder}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}

