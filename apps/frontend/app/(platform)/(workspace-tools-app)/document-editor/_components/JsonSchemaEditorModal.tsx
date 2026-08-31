'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    initializeDocument, 
    updateDesignSettings,
    updateDocumentDetails,
    Block
} from '@/redux/slices/documentSlice';
import { 
    Code2, 
    Copy, 
    Check, 
    Play, 
    Sparkles, 
    AlertCircle, 
    X, 
    RefreshCw,
    FileCode2,
    Bot,
    CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface JsonSchemaEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function JsonSchemaEditorModal({ isOpen, onClose }: JsonSchemaEditorModalProps) {
    const dispatch = useDispatch();
    const { blocks, documentDetails, designSettings, metaType } = useSelector((state: any) => state.document);

    const [jsonText, setJsonText] = useState('');
    const [copied, setCopied] = useState(false);
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [activeTab, setActiveTab] = useState<'editor' | 'ai_prompt'>('editor');

    // Debounced Validation for JSON Input
    useEffect(() => {
        if (!isOpen) return;

        setIsTyping(true);
        const handler = setTimeout(() => {
            try {
                if (jsonText.trim()) {
                    JSON.parse(jsonText);
                }
                setParseError(null);
            } catch (err: any) {
                setParseError(err.message || 'Invalid JSON syntax. Please check brackets and quotes.');
            }
            setIsTyping(false);
        }, 500);

        return () => clearTimeout(handler);
    }, [jsonText, isOpen]);

    // Generate formatted JSON representing current document state
    useEffect(() => {
        if (isOpen) {
            const currentSchema = {
                version: '1.0',
                metaType: metaType || 'general',
                documentDetails: documentDetails || {},
                designSettings: designSettings || {},
                blocks: blocks || []
            };
            setJsonText(JSON.stringify(currentSchema, null, 2));
            setParseError(null);
        }
    }, [isOpen, blocks, documentDetails, designSettings, metaType]);

    if (!isOpen) return null;

    // 1-Click Copy Raw JSON
    const handleCopyJson = () => {
        navigator.clipboard.writeText(jsonText);
        setCopied(true);
        toast.success('JSON copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    // 1-Click Copy ChatGPT / AI Prompt with Schema
    const handleCopyAiPrompt = () => {
        const promptText = `You are an expert AI business & legal document generator for the "180 Workspace Document Editor". 
Your task is to generate a complete, professional document in a strict JSON format based on the user's requirements.

=== INSTRUCTIONS ===
1. Wait for the user to provide their specific document requirements (e.g., "Create a freelance web dev contract" or "Make an invoice for 50 hours of work").
2. Once the user provides the requirements, generate a complete document adhering EXACTLY to the schema provided below.
3. OUTPUT ONLY RAW, VALID JSON. Do not wrap the JSON in markdown code blocks (\`\`\`json). Do not include any preamble or conversational text. The output MUST start with '{' and end with '}'.

=== 180 WORKSPACE DOCUMENT JSON SCHEMA ===
{
  "version": "1.0", // Always "1.0"
  "metaType": "general" | "quotation" | "invoice" | "contract",
  "documentDetails": {
    "title": "String - The document title",
    "clientName": "String - Client's full name or company",
    "clientEmail": "String - Optional",
    "clientCompany": "String - Optional",
    "currency": "USD" | "INR" | "EUR" | "GBP",
    "subtotal": "Number - Total before tax",
    "taxPercent": "Number - e.g., 18 for 18%",
    "taxAmount": "Number - Calculated tax",
    "grandTotal": "Number - Final amount including tax",
    "paymentTerms": "String - e.g., 'NET_30'",
    "dueDate": "String - YYYY-MM-DD"
  },
  "designSettings": {
    "primaryColor": "String - Hex color code (e.g. '#2563eb')",
    "fontFamily": "String - e.g. 'Inter', 'serif', 'mono'",
    "lineHeight": "Number - e.g. 1.5"
  },
  "blocks": [
    // Array of block objects. The order here determines the vertical rendering order.
    // Each block must have a unique "id" (String), a "type" (String), and "content" (Object).
    // Optional "styles" object can be applied: { "textAlign": "left"|"center"|"right", "alignment": "left"|"center"|"right", "fontSize": Number, "fontWeight": "normal"|"bold", "color": "Hex String", "backgroundColor": "Hex String", "padding": "String (e.g. '20px')", "borderRadius": "String (e.g. '8px')" }

    // 1. Text Block
    { "id": "uuid-1", "type": "text", "content": { "text": "HTML string allowed (e.g. <h1>Title</h1><p>Body</p>)", "level": "h1"|"h2"|"h3"|"p" } },
    
    // 2. Container Block (Flexbox layout for columns/rows)
    { "id": "uuid-2", "type": "container", "content": { "direction": "row"|"column", "justifyContent": "space-between"|"center"|"flex-start", "alignItems": "center"|"flex-start", "gap": 24, "children": [ /* Array of nested blocks (e.g., signatures side-by-side) */ ] } },
    
    // 3. Pricing Table Block (Used for invoices/quotations)
    { "id": "uuid-3", "type": "pricing_table", "content": { "currency": "USD", "items": [ { "id": "item-uuid", "description": "Item name", "quantity": 1, "rate": 5000, "taxRate": 18, "amount": 5000 } ], "subtotal": 5000, "taxAmount": 900, "grandTotal": 5900 } },
    
    // 4. Signature Block
    { "id": "uuid-4", "type": "signature", "content": { "label": "Client Signatory", "requireName": true } },
    
    // 5. Approval Buttons Block
    { "id": "uuid-5", "type": "approval_buttons", "content": { "title": "Client Sign-Off & Approval", "acceptLabel": "Approve Terms", "declineLabel": "Request Changes" } },
    
    // 6. Line/Divider Block
    { "id": "uuid-6", "type": "line", "content": { "isPageBreak": false }, "styles": { "borderWidth": 2, "borderStyle": "solid", "borderColor": "#cbd5e1" } },
    
    // 7. Image Block
    { "id": "uuid-7", "type": "image", "content": { "url": "https://example.com/logo.png", "caption": "Company Logo" } },

    // 8. List Block
    { "id": "uuid-8", "type": "list", "content": { "items": ["First item", "Second item"], "listStyle": "bullet" } },

    // 9. Box Block (Text inside a highlighted box)
    { "id": "uuid-9", "type": "box", "content": { "text": "Important note or highlighted text" } },

    // 10. Grid Block (Data table)
    { "id": "uuid-10", "type": "grid", "content": { "data": [["Header 1", "Header 2"], ["Row 1", "Row 2"]], "showTotals": false, "isCurrency": false, "hideBorders": false } },

    // 11. Payment Checkout Block
    { "id": "uuid-11", "type": "payment_checkout", "content": { "mode": "button", "paymentLink": "https://stripe.com/pay", "amount": 5000, "currency": "USD", "title": "Pay Advance" } }
  ]
}

Acknowledge these instructions and tell the user you are ready for their requirements. DO NOT generate the JSON yet.`;
        navigator.clipboard.writeText(promptText);
        setCopiedPrompt(true);
        toast.success('AI Prompt copied to clipboard');
        setTimeout(() => setCopiedPrompt(false), 2000);
    };

    // Apply JSON back to Editor Redux State
    const handleApplyJson = () => {
        if (parseError) {
            toast.error('Cannot apply changes. Please fix the JSON syntax errors first.');
            return;
        }

        try {
            const parsed = JSON.parse(jsonText);

            if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
                throw new Error('Invalid schema: Root object must contain a "blocks" array.');
            }

            dispatch(initializeDocument({
                blocks: parsed.blocks,
                documentDetails: parsed.documentDetails || { title: 'Imported Document' }
            }));

            if (parsed.designSettings) {
                dispatch(updateDesignSettings(parsed.designSettings));
            }

            toast.success('Document updated from JSON');
            onClose();
        } catch (err: any) {
            console.error('JSON Parse Error:', err);
            setParseError(err.message || 'Invalid JSON syntax. Please check brackets and quotes.');
            toast.error('Failed to parse JSON');
        }
    };

    // Format / Pretty Print JSON
    const handleFormatJson = () => {
        try {
            const parsed = JSON.parse(jsonText);
            setJsonText(JSON.stringify(parsed, null, 2));
            setParseError(null);
            toast.success('JSON formatted');
        } catch (err: any) {
            setParseError('Cannot format: ' + err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shadow-2xs">
                            <Code2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Document JSON Schema
                                </h3>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                                    Live Sync
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                View document structure, copy AI prompt template, or paste JSON to update the canvas.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Tab Switcher */}
                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setActiveTab('editor')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                                    activeTab === 'editor' 
                                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs" 
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                                )}
                            >
                                <FileCode2 className="w-3.5 h-3.5" /> Raw JSON
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('ai_prompt')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                                    activeTab === 'ai_prompt' 
                                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs" 
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                                )}
                            >
                                <Bot className="w-3.5 h-3.5" /> AI Prompt Template
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ml-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-3 bg-gray-50/50 dark:bg-slate-900/50">
                    {activeTab === 'editor' ? (
                        <>
                            {/* Toolbar */}
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">
                                    Document Payload ({blocks.length} elements)
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleFormatJson}
                                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> Prettify
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopyJson}
                                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? 'Copied' : 'Copy JSON'}
                                    </button>
                                </div>
                            </div>

                            {/* Error Alert */}
                            {parseError && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold block">Syntax Error:</span>
                                        <span className="font-mono text-[11px]">{parseError}</span>
                                    </div>
                                </div>
                            )}

                            {/* Code Area */}
                            <div className="flex-1 relative rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950 shadow-inner">
                                <textarea
                                    value={jsonText}
                                    onChange={(e) => {
                                        setJsonText(e.target.value);
                                    }}
                                    className="w-full h-full min-h-[380px] p-4 bg-transparent text-gray-800 dark:text-gray-200 font-mono text-xs leading-relaxed outline-none resize-none focus:ring-1 focus:ring-blue-500 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                    spellCheck={false}
                                    placeholder="Paste document JSON schema here..."
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-4 text-gray-700 dark:text-gray-300 text-xs">
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl space-y-1.5">
                                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs">
                                    <Sparkles className="w-4 h-4 text-blue-600" />
                                    How to generate documents with ChatGPT / Claude
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-xs">
                                    Copy the structured prompt below and paste it into ChatGPT, Claude, or any AI assistant. The AI will output valid JSON that you can paste directly into the <b>Raw JSON</b> tab.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-[11px]">
                                        Ready-to-use Master Prompt
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyAiPrompt}
                                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-blue-600/20 active:scale-98"
                                    >
                                        {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedPrompt ? 'Copied!' : 'Copy AI Prompt'}
                                    </button>
                                </div>
                                <pre className="p-4 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl font-mono text-[11px] text-gray-700 dark:text-gray-300 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] leading-relaxed max-h-[320px]">
{`You are an expert AI business & legal document generator for the "180 Workspace Document Editor". 
Your task is to generate a complete, professional document in a strict JSON format based on the user's requirements.

=== INSTRUCTIONS ===
1. Wait for the user to provide their specific document requirements.
2. Generate a complete document adhering EXACTLY to the schema provided.
3. OUTPUT ONLY RAW, VALID JSON. Do not wrap the JSON in markdown code blocks (\`\`\`json).

=== 180 WORKSPACE DOCUMENT JSON SCHEMA ===
{
  "version": "1.0",
  "metaType": "general" | "quotation" | "invoice" | "contract",
  "documentDetails": { ... },
  "designSettings": { ... },
  "blocks": [
    { "type": "text" },
    { "type": "container" },
    { "type": "pricing_table" },
    { "type": "signature" },
    { "type": "approval_buttons" },
    { "type": "line" },
    { "type": "image" },
    { "type": "list" },
    { "type": "box" },
    { "type": "grid" },
    { "type": "payment_checkout" }
  ]
}

Acknowledge these instructions and tell the user you are ready for their requirements. DO NOT generate the JSON yet.`}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[11px] text-gray-500">
                        {activeTab === 'editor' ? 'Paste valid document JSON schema to update the canvas.' : 'Generate document JSON with AI and paste it into the Raw JSON tab.'}
                    </span>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        {activeTab === 'editor' ? (
                            <button
                                type="button"
                                onClick={handleApplyJson}
                                disabled={!!parseError}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white flex items-center gap-2 transition-all shadow-sm shadow-blue-600/20 active:scale-95"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Apply & Render to Canvas
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleCopyAiPrompt}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-all shadow-sm shadow-blue-600/20 active:scale-95"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copy AI Prompt
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
