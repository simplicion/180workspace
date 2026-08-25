import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Code2 } from 'lucide-react';

interface CodeEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCode: string;
    onSave: (code: string) => void;
}

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

    const lines = code.split('\n');

    return createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-800">
                        <Code2 className="w-5 h-5 text-indigo-500" />
                        <h2 className="font-bold">Embed Code Editor</h2>
                    </div>
                    <div className="flex flex-center gap-3">
                        <button 
                            onClick={() => { onSave(code); onClose(); }} 
                            className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Save Code
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
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
                        placeholder="<div>Hello World</div>"
                    />
                </div>
                <div className="p-2 bg-[#007acc] text-white text-xs font-mono flex justify-between">
                    <span>Lines: {lines.length}</span>
                    <span>Length: {code.length} characters</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
