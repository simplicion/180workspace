"use client";

import { useState } from 'react';
import { 
  Play, X, Smartphone, Bot, Clock, ArrowRight, CheckCircle2, 
  AlertTriangle, ShieldAlert, Sparkles, RefreshCw, Volume2, 
  Headphones, PhoneCall
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ForwardingSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: any | null;
}

export function ForwardingSimulationModal({
  isOpen,
  onClose,
  rule
}: ForwardingSimulationModalProps) {
  const [callerPhone, setCallerPhone] = useState('+14155551234');
  const [simulateBusyHop, setSimulateBusyHop] = useState(false);
  const [forceAfterHours, setForceAfterHours] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen || !rule) return null;

  const handleRunSimulation = async () => {
    try {
      setSimulating(true);
      const res = await api.post(`/api/v1/voiceforce/forwarding/${rule.id}/simulate`, {
        callerPhone,
        simulateBusyHop: simulateBusyHop ? 0 : null,
        forceAfterHours
      });
      setResult(res.data?.data);
      toast.success('Simulation completed!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const resetSimulation = () => {
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-850/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60">
              <Play className="w-5 h-5 fill-indigo-600 dark:fill-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Pipeline Simulation Tester
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  ₹0 Telecom Cost
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Testing rule: <span className="font-semibold text-gray-800 dark:text-gray-200">{rule.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Test Parameters */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Simulation Inputs
            </h4>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Simulated Inbound Caller Phone Number
              </label>
              <input
                type="text"
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
                placeholder="+14155551234"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateBusyHop}
                  onChange={(e) => setSimulateBusyHop(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-white">Simulate Line 1 Busy</div>
                  <div className="text-[11px] text-gray-500">Triggers waterfall cascade to Hop #2</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceAfterHours}
                  onChange={(e) => setForceAfterHours(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-white">Simulate After-Hours Call</div>
                  <div className="text-[11px] text-gray-500">Tests out-of-office schedule deflection</div>
                </div>
              </label>
            </div>

            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={simulating}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Routing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Execute Pipeline Simulation</span>
                </>
              )}
            </button>
          </div>

          {/* Trace Results */}
          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Routing Execution Trace</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {result.trace?.length || 0} Steps Evaluated
                  </span>
                </h4>
                <button
                  onClick={resetSimulation}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  Clear Results
                </button>
              </div>

              {/* Step Timeline */}
              <div className="space-y-2.5">
                {result.trace?.map((step: any, idx: number) => {
                  const isSuccess = step.status === 'success';
                  const isWarning = step.status === 'warning';
                  const isFailed = step.status === 'failed';

                  return (
                    <div 
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                        isSuccess 
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50' 
                          : isWarning
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                            : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs ${
                        isSuccess
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                          : isWarning
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                      }`}>
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                            {step.title}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isSuccess 
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40' 
                              : isWarning
                                ? 'text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40'
                                : 'text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-900/40'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Final Decision Highlight Card */}
              {result.finalDecision && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Final Telephony Handshake Decision</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Action</span>
                      <span className="font-bold text-gray-900 dark:text-white capitalize">
                        {result.finalDecision.action?.replace('_', ' ')}
                      </span>
                    </div>
                    {result.finalDecision.destinationE164 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Bridged Target</span>
                        <span className="font-bold text-gray-900 dark:text-white font-mono">
                          {result.finalDecision.destinationE164}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Ring Timeout</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {result.finalDecision.timeoutSec}s
                      </span>
                    </div>
                  </div>
                  {result.finalDecision.whisperText && (
                    <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span>Whisper: "{result.finalDecision.whisperText}"</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Close Tester
          </button>
        </div>
      </div>
    </div>
  );
}
