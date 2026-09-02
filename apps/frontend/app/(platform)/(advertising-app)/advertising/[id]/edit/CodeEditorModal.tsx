'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Code2, Sparkles, Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface CodeEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCode: string;
    onSave: (code: string) => void;
}

const QUICK_SNIPPETS = [
    {
        name: '+ Meta Lead Pixel',
        code: `<script>
  if (typeof fbq === 'function') {
    fbq('track', 'Lead', { content_name: 'Form Submission', status: true });
  }
</script>`
    },
    {
        name: '+ Meta Purchase Pixel',
        code: `<script>
  if (typeof fbq === 'function') {
    fbq('track', 'Purchase', { value: 99.00, currency: 'USD' });
  }
</script>`
    },
    {
        name: '+ Responsive Iframe',
        code: `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe src="https://example.com" style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
</div>`
    },
    {
        name: '+ Calendly Widget',
        code: `<!-- Calendly Widget -->
<div class="calendly-inline-widget" data-url="https://calendly.com/YOUR_LINK" style="min-width:320px;height:700px;"></div>
<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>`
    }
];

export default function CodeEditorModal({ isOpen, onClose, initialCode, onSave }: CodeEditorModalProps) {
    const [code, setCode] = useState(initialCode);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setCode(initialCode);
        }
    }, [isOpen, initialCode]);

    if (!isOpen || typeof document === 'undefined') return null;

    const handleScroll = () => {
        if (textareaRef.current && lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const val = e.currentTarget.value;
            const newCode = val.substring(0, start) + '  ' + val.substring(end);
            setCode(newCode);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                }
            }, 0);
        }
    };

    const handleInsertSnippet = (snippetCode: string) => {
        setCode((prev) => (prev.trim() ? `${prev}\n\n${snippetCode}` : snippetCode));
        toast.success('Snippet inserted');
    };

    const lines = code.split('\n');

    return createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-3.5 px-5 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2.5 text-gray-800">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                            <Code2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm text-gray-900">Embed Code & Tracking Editor</h2>
                            <p className="text-[11px] text-gray-500">Add HTML, Meta Pixel events, custom CSS, or JavaScript widgets</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => { onSave(code); onClose(); }} 
                            className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            Save Code
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Quick Presets Insert Toolbar */}
                <div className="px-4 py-2 bg-[#252526] border-b border-[#333] flex items-center gap-2 overflow-x-auto text-xs">
                    <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                        <Sparkles className="w-3 h-3 text-amber-400" /> Quick Insert:
                    </span>
                    {QUICK_SNIPPETS.map((item, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleInsertSnippet(item.code)}
                            className="px-2.5 py-1 bg-[#333] hover:bg-indigo-600 text-gray-200 hover:text-white rounded-md font-mono text-[11px] transition-colors shrink-0"
                        >
                            {item.name}
                        </button>
                    ))}
                </div>

                {/* Code Area */}
                <div className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
                    <div 
                        ref={lineNumbersRef}
                        className="w-12 bg-[#1e1e1e] text-[#858585] text-right pr-3 py-4 select-none overflow-hidden font-mono text-[13px] leading-relaxed border-r border-[#333]"
                    >
                        {lines.map((_, i) => (
                            <div key={i} className="leading-relaxed">{i + 1}</div>
                        ))}
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onScroll={handleScroll}
                        onKeyDown={handleKeyDown}
                        spellCheck={false}
                        className="flex-1 bg-transparent text-[#d4d4d4] p-4 font-mono text-[13px] leading-relaxed outline-none resize-none overflow-auto whitespace-pre font-normal"
                        placeholder="<!-- Type HTML, JavaScript, Meta Pixel conversion tracking code, or widgets here -->"
                    />
                </div>

                {/* Footer status bar */}
                <div className="px-4 py-1.5 bg-[#007acc] text-white text-[11px] font-mono flex justify-between items-center select-none">
                    <div className="flex items-center gap-4">
                        <span>Lines: {lines.length}</span>
                        <span>Length: {code.length} characters</span>
                    </div>
                    <div className="text-[11px] opacity-90">
                        HTML / JS / Tracking Pixel • UTF-8
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
