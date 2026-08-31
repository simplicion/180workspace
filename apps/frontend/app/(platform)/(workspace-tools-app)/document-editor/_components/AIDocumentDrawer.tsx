'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Zap, 
  Layers, 
  FileText,
  RotateCcw
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setBlocks, addBlock, updateBlock, setDocumentDetails } from '@/redux/slices/documentSlice';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreamed?: boolean;
}

interface AIDocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGenerating: (status: string) => void;
  onFinishGenerating: () => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

const PROMPT_SUGGESTIONS = [
  { label: '3-Phase Milestone Schedule', prompt: 'Add a 3-phase milestone payment schedule with deliverables and due dates' },
  { label: 'Bilateral Signatures', prompt: 'Insert dual signature slots for client and provider with date and title' },
  { label: 'Standard Terms & NDA', prompt: 'Add standard payment terms (Net 15) and mutual confidentiality clauses' },
  { label: 'Line Item Table with 18% Tax', prompt: 'Create an invoice line item table for software development with 18% GST' }
];

export function AIDocumentDrawer({
  isOpen,
  onClose,
  onStartGenerating,
  onFinishGenerating,
  abortControllerRef
}: AIDocumentDrawerProps) {
  const dispatch = useDispatch();
  const currentBlocks = useSelector((state: any) => state.document?.blocks || []);
  const documentDetails = useSelector((state: any) => state.document?.documentDetails || {});
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your **180 Workspace AI Document Architect**. You can ask me to generate a new document from scratch, or instruct me to add milestones, pricing tables, terms, or signatures to your existing document.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: 'Chat history cleared. How can I help you draft or refine your document?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    // 1. Close drawer and trigger canvas blur / non-touchable mode
    onStartGenerating('AI is synthesizing document structure...');

    try {
      // Create new abort controller for this generation turn
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Call Centralized AI Document Generation endpoint
      const response = await api.post('/api/v1/workspace-tools/documents/generate-ai', {
        prompt: text,
        existingBlocks: currentBlocks,
        documentType: documentDetails?.documentType || 'INVOICE',
        clientId: documentDetails?.selectedClientId || undefined,
        employeeId: documentDetails?.selectedEmployeeId || undefined,
        sessionId
      }, {
        signal: controller.signal
      });

      if (response.data && response.data.success) {
        const { mode, blocks, newBlocks, explanation, documentDetails: newDetails } = response.data;

        // Progressive real-time AST block rendering on the canvas
        if (mode === 'append' && Array.isArray(newBlocks) && newBlocks.length > 0) {
          for (let i = 0; i < newBlocks.length; i++) {
            if (controller.signal.aborted) break;
            dispatch(addBlock(newBlocks[i]));
            // Stagger animation delay between block insertions
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        } else if (Array.isArray(blocks) && blocks.length > 0) {
          // New document synthesis
          dispatch(setBlocks([]));
          for (let i = 0; i < blocks.length; i++) {
            if (controller.signal.aborted) break;
            dispatch(addBlock(blocks[i]));
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        if (newDetails) {
          dispatch(setDocumentDetails({
            ...documentDetails,
            ...newDetails
          }));
        }

        // Assistant response message
        const assistantReply: Message = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: explanation || 'Successfully generated and structured your document blocks on the canvas.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantReply]);
      } else {
        throw new Error(response.data?.message || 'Failed to generate document AST');
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: 'Generation stopped. Existing changes were preserved.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        console.error('AI Document generation error:', err);
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: 'An error occurred while generating the document. Please try a different prompt.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        toast.error('AI generation encountered an issue.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      // Re-open drawer and unfreeze canvas
      onFinishGenerating();
    }
  };

  return (
    <>
      {/* Backdrop (visible only on mobile/tablet screens when drawer is open) */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 sm:hidden transition-opacity" 
        />
      )}

      {/* Slide-in Drawer */}
      <div 
        className={clsx(
          "fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">AI Document Builder</h3>
                <span className="bg-white/20 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-white tracking-wider">
                  Live Agent
                </span>
              </div>
              <p className="text-[11px] text-violet-100 font-normal">
                Company AI Engine & Context Aware
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              className="p-1.5 text-violet-200 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
              title="Clear conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-violet-200 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 hidden-scrollbar">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={clsx(
                "flex gap-2.5 max-w-[90%]",
                msg.sender === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div 
                className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs",
                  msg.sender === 'user' ? "bg-indigo-600 text-white" : "bg-violet-100 text-violet-700"
                )}
              >
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className="flex flex-col gap-1">
                <div 
                  className={clsx(
                    "px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs",
                    msg.sender === 'user'
                      ? "bg-indigo-600 text-white rounded-tr-none font-normal"
                      : "bg-white text-gray-800 border border-gray-200/80 rounded-tl-none prose prose-xs max-w-none"
                  )}
                  dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                />
                <span className={clsx("text-[10px] text-gray-400 px-1", msg.sender === 'user' ? "text-right" : "text-left")}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Quick Suggestion Chips */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Suggested Prompts:</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {PROMPT_SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(sug.prompt)}
                  className="text-left px-3 py-2 bg-white hover:bg-violet-50 hover:border-violet-300 border border-gray-200 rounded-lg text-xs text-gray-700 transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                >
                  <span className="font-medium">{sug.label}</span>
                  <Sparkles className="w-3 h-3 text-gray-400 group-hover:text-violet-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
          <div className="relative bg-gray-50 rounded-xl border border-gray-200 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 transition-all p-2">
            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              placeholder="e.g. Add 3 milestone payment stages and sign-off slots..."
              rows={3}
              className="w-full bg-transparent border-none text-xs text-gray-800 placeholder-gray-400 focus:outline-none resize-none"
            />

            <div className="flex items-center justify-between pt-1 border-t border-gray-100 mt-1">
              <span className="text-[10px] text-gray-400">
                Press <strong>Enter</strong> to generate
              </span>

              <button
                onClick={() => handleSendPrompt()}
                disabled={!inputPrompt.trim() || isLoading}
                className={clsx(
                  "p-2 rounded-lg text-white transition-all flex items-center justify-center cursor-pointer",
                  inputPrompt.trim() && !isLoading
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-sm"
                    : "bg-gray-300 cursor-not-allowed"
                )}
                title="Send Prompt"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
