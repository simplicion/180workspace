'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  RotateCcw,
  Info,
  Lock,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setBlocks, addBlock, updateBlock, setDocumentDetails } from '@/redux/slices/documentSlice';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { DrawerMarkdown } from '@workspace/ui';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreamed?: boolean;
}

interface AIConfigStatus {
  isConfigured: boolean;
  provider: string;
  model: string;
  status: string;
  lastTested?: string | null;
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
  { label: 'Line Item Table with 18% Tax', prompt: 'Create an invoice line item table for software development with 18% GST' },
  { label: 'Bilateral Signatures', prompt: 'Insert dual signature slots for client and provider with date and title' },
  { label: 'Standard Terms & NDA', prompt: 'Add standard payment terms (Net 15) and mutual confidentiality clauses' },
  { label: 'Online Payment Button', prompt: 'Add a secure Razorpay / Stripe checkout button' },
  { label: 'Direct Bank Wire Details', prompt: 'Add corporate bank and wire transfer details with IFSC and account number' }
];

export function AIDocumentDrawer({
  isOpen,
  onClose,
  onStartGenerating,
  onFinishGenerating,
  abortControllerRef
}: AIDocumentDrawerProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentBlocks = useSelector((state: any) => state.document?.blocks || []);
  const documentDetails = useSelector((state: any) => state.document?.documentDetails || {});
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '👋 Hello! I am your **180 Workspace AI Document Architect**.\n\nI have full awareness of your document canvas and all available workspace elements. Ask me anything, or instruct me to generate invoices, proposals, milestones, payment buttons, or legal signatures.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // AI Config Status
  const [aiConfig, setAiConfig] = useState<AIConfigStatus>({
    isConfigured: true, // Optimistic default while checking
    provider: 'loading',
    model: 'Checking configuration...',
    status: 'checking'
  });
  const [isCheckingConfig, setIsCheckingConfig] = useState(false);

  // Width & Resizing State
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('180_ai_drawer_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 360 && parsed <= 960) {
          return parsed;
        }
      }
    }
    return 480;
  });
  const [isResizing, setIsResizing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resizing mouse move listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(Math.max(newWidth, 360), Math.min(960, window.innerWidth - 80));
      setDrawerWidth(clamped);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('180_ai_drawer_width', drawerWidth.toString());
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, drawerWidth]);

  const handleSetPresetWidth = (width: number) => {
    setDrawerWidth(width);
    localStorage.setItem('180_ai_drawer_width', width.toString());
  };

  // Check AI Config Status
  const checkAIConfig = async () => {
    try {
      setIsCheckingConfig(true);
      const res = await api.get('/api/180documents/ai-status').catch(() => 
        api.get('/api/v1/workspace-tools/documents/ai-status')
      );
      if (res && res.data) {
        setAiConfig({
          isConfigured: res.data.isConfigured !== false,
          provider: res.data.provider || 'none',
          model: res.data.model || 'Google Gemini 1.5 Flash',
          status: res.data.status || 'connected',
          lastTested: res.data.lastTested
        });
      }
    } catch (err) {
      console.warn('[AIDocumentDrawer] Could not fetch AI status, keeping default state');
    } finally {
      setIsCheckingConfig(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkAIConfig();
    }
  }, [isOpen]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && aiConfig.isConfigured) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, aiConfig.isConfigured]);

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

    if (!aiConfig.isConfigured) {
      toast.error('AI API Key is not configured. Please configure in Settings.');
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await api.post('/api/180documents/generate-ai', {
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
        const { intent, mode, blocks, newBlocks, explanation, documentDetails: newDetails } = response.data;

        // 1. Rollback / Clear Intent
        if (intent === 'delete' || mode === 'clear') {
          dispatch(setBlocks([]));
          const assistantReply: Message = {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: explanation || 'I have cleared the canvas blocks for you.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantReply]);
          toast.success('Canvas draft cleared', { icon: '🗑️', duration: 2000 });
        } 
        // 2. Pure Conversational / Clarifying Question Intent (Do not mutate canvas)
        else if (intent === 'chat' || intent === 'clarify' || mode === 'chat') {
          const assistantReply: Message = {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: explanation || 'Here is what you asked for.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantReply]);
        } 
        // 3. Document Building Actions (create / append / update)
        else {
          if (mode === 'append' && Array.isArray(newBlocks) && newBlocks.length > 0) {
            for (let i = 0; i < newBlocks.length; i++) {
              if (controller.signal.aborted) break;
              dispatch(addBlock(newBlocks[i]));
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } else if (Array.isArray(blocks) && blocks.length > 0) {
            dispatch(setBlocks([]));
            for (let i = 0; i < blocks.length; i++) {
              if (controller.signal.aborted) break;
              dispatch(addBlock(blocks[i]));
              await new Promise(resolve => setTimeout(resolve, 150));
            }
          }

          if (newDetails) {
            dispatch(setDocumentDetails({
              ...documentDetails,
              ...newDetails
            }));
          }

          const assistantReply: Message = {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: explanation || 'Successfully updated your document blocks on the canvas.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantReply]);
          toast.success('Document updated with AI!', { icon: '✨', duration: 2000 });
        }
      } else if (response.data?.code === 'AI_KEY_NOT_CONFIGURED' || response.data?.isConfigured === false) {
        setAiConfig(prev => ({ ...prev, isConfigured: false }));
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: '⚠️ **AI API Key Not Configured**: Your workspace administrator has not set an AI API Key. Please visit **Settings > AI Configuration** to configure Google Gemini, OpenAI, Claude, or a Custom endpoint.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error(response.data?.message || 'Failed to process AI request');
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
        const errMsg = err.response?.data?.message || err.message || 'An error occurred while communicating with the AI.';
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ **AI Error**: ${errMsg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        toast.error('AI request encountered an issue.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
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
        style={{ width: `${drawerWidth}px` }}
        className={clsx(
          "fixed top-0 bottom-0 right-0 h-screen bg-white dark:bg-zinc-950 shadow-2xl z-40 flex flex-col border-l border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out select-none",
          isOpen ? "translate-x-0" : "translate-x-full",
          isResizing && "cursor-col-resize pointer-events-auto"
        )}
      >
        {/* Left Edge Drag Resizer Handle */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          className={clsx(
            "absolute left-0 top-0 bottom-0 w-2.5 -translate-x-1/2 cursor-col-resize z-50",
            "group flex items-center justify-center transition-colors",
            isResizing ? "bg-indigo-500/40" : "hover:bg-indigo-500/20"
          )}
          title="Drag to resize drawer width"
        >
          <div className="w-1 h-8 rounded-full bg-zinc-400/50 dark:bg-zinc-600/50 group-hover:bg-indigo-500 transition-colors flex items-center justify-center">
            <div className="w-0.5 h-4 bg-white/70 rounded-full" />
          </div>
        </div>

        {/* Drawer Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-between flex-shrink-0 shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">AI Document Architect</h3>
                <span className="bg-white/20 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-white tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Conscious
                </span>
              </div>
              <p className="text-[11px] text-violet-100 font-normal truncate max-w-[220px]">
                {aiConfig.isConfigured ? aiConfig.model : 'Configuration Required'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Width Preset Buttons */}
            <div className="hidden sm:flex items-center bg-black/20 rounded-lg p-0.5 border border-white/10 text-[10px] font-semibold text-white/80 mr-1">
              <button
                type="button"
                onClick={() => handleSetPresetWidth(380)}
                className={clsx(
                  "px-1.5 py-0.5 rounded-md transition-colors",
                  drawerWidth <= 400 ? "bg-white/30 text-white shadow-xs" : "hover:text-white"
                )}
                title="Compact Width (380px)"
              >
                S
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetWidth(500)}
                className={clsx(
                  "px-1.5 py-0.5 rounded-md transition-colors",
                  drawerWidth > 400 && drawerWidth <= 600 ? "bg-white/30 text-white shadow-xs" : "hover:text-white"
                )}
                title="Standard Width (500px)"
              >
                M
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetWidth(720)}
                className={clsx(
                  "px-1.5 py-0.5 rounded-md transition-colors",
                  drawerWidth > 600 ? "bg-white/30 text-white shadow-xs" : "hover:text-white"
                )}
                title="Wide View (720px)"
              >
                L
              </button>
            </div>

            {/* Info Button */}
            <button
              onClick={() => setShowInfoModal(!showInfoModal)}
              className="p-1.5 text-violet-200 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
              title="AI Engine Information"
            >
              <Info className="w-4 h-4" />
            </button>
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

          {/* Info Popover Modal */}
          {showInfoModal && (
            <div className="absolute top-16 right-4 z-50 w-80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold">AI Engine Status</span>
                </div>
                <button onClick={() => setShowInfoModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Provider</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                    {aiConfig.provider !== 'none' ? aiConfig.provider : 'None (Disabled)'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Model Engine</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{aiConfig.model}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Element Capabilities</span>
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] block mt-0.5">
                    Pricing tables, 3-Phase Milestones, Stripe/Razorpay checkouts, Signatures, Grids, and Rich Callouts.
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setShowInfoModal(false);
                      router.push('/settings/ai');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <span>Configure in Settings</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Locked State if AI is not configured */}
        {!aiConfig.isConfigured ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/70">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              AI Document Architect Locked
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              To unlock intelligent conversational document drafting and automatic element synthesis, please configure your company&apos;s AI API Key (Google Gemini, OpenAI, Claude, or Custom) in Settings.
            </p>

            <button
              onClick={() => {
                onClose();
                router.push('/settings/ai');
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <span>Configure AI in Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
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
                          : "bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800 rounded-tl-none"
                      )}
                    >
                      <DrawerMarkdown content={msg.text} isUser={msg.sender === 'user'} />
                    </div>
                    <span className={clsx("text-[10px] text-gray-400 px-1", msg.sender === 'user' ? "text-right" : "text-left")}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing Loader */}
              {isLoading && (
                <div className="flex gap-2.5 mr-auto max-w-[80%] items-center animate-in fade-in">
                  <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="px-3.5 py-2 rounded-2xl bg-white border border-gray-200 text-xs text-gray-500 flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="ml-1 text-[11px] text-gray-400">Architect is thinking...</span>
                  </div>
                </div>
              )}

              {/* Quick Suggestion Chips */}
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Quick Element Prompts:</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {PROMPT_SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendPrompt(sug.prompt)}
                      disabled={isLoading}
                      className="text-left px-3 py-2 bg-white hover:bg-violet-50 hover:border-violet-300 border border-gray-200 rounded-lg text-xs text-gray-700 transition-all flex items-center justify-between group shadow-2xs cursor-pointer disabled:opacity-50"
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
                  placeholder="Ask a question or instruct: e.g. 'Add 3 milestone payments and signature slots'..."
                  rows={3}
                  className="w-full bg-transparent border-none text-xs text-gray-800 placeholder-gray-400 focus:outline-none resize-none"
                />

                <div className="flex items-center justify-between pt-1 border-t border-gray-100 mt-1">
                  <span className="text-[10px] text-gray-400">
                    Press <strong>Enter</strong> to send
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
          </>
        )}
      </div>
    </>
  );
}
