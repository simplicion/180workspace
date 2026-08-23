'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileCode2 } from 'lucide-react';

interface GlobalScriptsModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    brand: any;
    updateBrand: (key: string, value: any) => void;
}

export default function GlobalScriptsModal({ isOpen, setIsOpen, brand, updateBrand }: GlobalScriptsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4" style={{ zIndex: 99999 }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-black text-gray-800 flex items-center gap-2">
                        <FileCode2 className="w-5 h-5 text-indigo-600" />
                        Global Scripts
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Head Script <code>&lt;head&gt;</code>
                        </label>
                        <p className="text-xs text-gray-500 mb-3">Code placed here will be injected inside the <code>&lt;head&gt;</code> tag of every page. Good for Meta Pixel, Analytics, or external CSS.</p>
                        <textarea 
                            value={brand.headScript || ''}
                            onChange={(e) => updateBrand('headScript', e.target.value)}
                            className="w-full h-40 p-4 font-mono text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50"
                            placeholder="<!-- e.g. Facebook Pixel Code -->&#10;<script>&#10;  !function(f,b,e,v,n,t,s)&#10;...&#10;</script>"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Body Script <code>&lt;body&gt;</code>
                        </label>
                        <p className="text-xs text-gray-500 mb-3">Code placed here will be injected just before the closing <code>&lt;/body&gt;</code> tag. Good for chat widgets or slower scripts.</p>
                        <textarea 
                            value={brand.bodyScript || ''}
                            onChange={(e) => updateBrand('bodyScript', e.target.value)}
                            className="w-full h-40 p-4 font-mono text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50"
                            placeholder="<!-- e.g. Chat Widget Code -->&#10;<script src='...'></script>"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-xl">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
