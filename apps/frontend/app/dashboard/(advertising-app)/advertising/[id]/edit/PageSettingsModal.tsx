'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';

export type PageModalConfigType = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    pageId?: string;
    name: string;
    metaTitle: string;
    metaDescription: string;
    isPublished: boolean;
    navVisibility: string;
} | null;

interface PageSettingsModalProps {
    config: PageModalConfigType;
    setConfig: (config: PageModalConfigType) => void;
    onSave: (newConfig: PageModalConfigType) => void;
}

export default function PageSettingsModal({ config, setConfig, onSave }: PageSettingsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!config?.isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4" style={{ zIndex: 99999 }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-black text-gray-800 flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-indigo-600" />
                        {config.mode === 'add' ? 'Add New Page' : 'Edit Page Settings'}
                    </h3>
                    <button onClick={() => setConfig(null)} className="text-gray-400 hover:text-gray-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Page Name</label>
                        <input 
                            type="text" 
                            value={config.name}
                            onChange={(e) => setConfig({...config, name: e.target.value})}
                            placeholder="e.g. About Us"
                            className="w-full text-sm p-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Meta Title</label>
                        <input 
                            type="text" 
                            value={config.metaTitle}
                            onChange={(e) => setConfig({...config, metaTitle: e.target.value})}
                            placeholder="SEO Title"
                            className="w-full text-sm p-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Meta Description</label>
                        <textarea 
                            value={config.metaDescription}
                            onChange={(e) => setConfig({...config, metaDescription: e.target.value})}
                            placeholder="SEO Description"
                            rows={3}
                            className="w-full text-sm p-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                        <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer mb-4">
                            <input 
                                type="checkbox" 
                                checked={config.isPublished}
                                onChange={(e) => setConfig({...config, isPublished: e.target.checked})}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            Publish Page (Active)
                        </label>
                        
                        <label className="block text-xs font-bold text-gray-700 mb-2">Show Link In Navbar/Footer</label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={config.navVisibility === 'both' || config.navVisibility === 'header'}
                                    onChange={(e) => {
                                        const isHeaderChecked = e.target.checked;
                                        const isFooterChecked = config.navVisibility === 'both' || config.navVisibility === 'footer';
                                        let newVisibility = 'none';
                                        if (isHeaderChecked && isFooterChecked) newVisibility = 'both';
                                        else if (isHeaderChecked) newVisibility = 'header';
                                        else if (isFooterChecked) newVisibility = 'footer';
                                        setConfig({...config, navVisibility: newVisibility});
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                Header Navigation
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={config.navVisibility === 'both' || config.navVisibility === 'footer'}
                                    onChange={(e) => {
                                        const isFooterChecked = e.target.checked;
                                        const isHeaderChecked = config.navVisibility === 'both' || config.navVisibility === 'header';
                                        let newVisibility = 'none';
                                        if (isHeaderChecked && isFooterChecked) newVisibility = 'both';
                                        else if (isHeaderChecked) newVisibility = 'header';
                                        else if (isFooterChecked) newVisibility = 'footer';
                                        setConfig({...config, navVisibility: newVisibility});
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                Footer Navigation
                            </label>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                    <button 
                        onClick={() => setConfig(null)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 text-sm font-bold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            if (!config.name.trim()) {
                                toast.error('Page name is required');
                                return;
                            }
                            onSave(config);
                            setConfig(null);
                        }}
                        className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        {config.mode === 'add' ? 'Create Page' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
