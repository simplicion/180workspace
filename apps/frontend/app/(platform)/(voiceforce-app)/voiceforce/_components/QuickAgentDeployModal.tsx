"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bot, Phone, Sparkles, X, ArrowRight, ShieldCheck, CheckCircle2, 
  HelpCircle, User, Briefcase, FileText
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlatformModal } from '@workspace/ui';
import clsx from 'clsx';

interface QuickAgentDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumbers?: Array<{ id: string; e164Number: string; friendlyName?: string; assignedAgentId?: string | null }>;
}

export function QuickAgentDeployModal({ isOpen, onClose, phoneNumbers = [] }: QuickAgentDeployModalProps) {
  const router = useRouter();
  const [deploying, setDeploying] = useState(false);

  const [form, setForm] = useState({
    name: '',
    role: '',
    systemPrompt: `You are an autonomous AI voice employee for this company. You are warm, professional, empathetic, and efficient.
When customers call or when reaching out to leads, actively assist with their requests, verify catalog pricing, check availability, and use your permitted business tools. Keep spoken answers concise (under 2 sentences) for natural pacing.`,
    assignedPhoneId: ''
  });

  const availableNumbers = phoneNumbers.filter(n => !n.assignedAgentId);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter an employee name');
      return;
    }
    if (!form.role.trim()) {
      toast.error('Please enter a job role / title');
      return;
    }

    try {
      setDeploying(true);
      const res = await api.post('/api/v1/voiceforce/agents', {
        name: form.name.trim(),
        role: form.role.trim(),
        systemPrompt: form.systemPrompt.trim(),
        firstMessage: `Hello! This is ${form.name.trim()} from our team. How may I help you today?`,
        voiceProvider: 'cartesia',
        voiceId: '694f12bc-9263-4416-a1d8-0402e1c6e1d2', // Maya / High-quality natural voice
        language: 'en-US',
        allowBargeIn: true,
        isActive: true,
        assignedPhoneId: form.assignedPhoneId || undefined,
        enabledToolNames: ['search_knowledge_base', 'check_product_price', 'create_crm_client', 'book_appointment', 'create_task']
      });

      if (res.data?.success && res.data.data?.id) {
        const agentId = res.data.data.id;
        toast.success(`🎉 AI Employee "${form.name}" deployed and active!`);
        onClose();
        router.push(`/voiceforce/agents/${agentId}`);
      } else {
        throw new Error(res.data?.error || 'Failed to deploy agent');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <PlatformModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Deploy Custom AI Employee"
      icon={Sparkles}
      iconColorClass="text-purple-600 dark:text-purple-400"
      iconBgClass="bg-purple-50 dark:bg-purple-950/50"
      subHeader="Enter minimal details to immediately activate your autonomous voice employee."
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={deploying}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeploy}
            disabled={deploying}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
          >
            {deploying ? (
              <span>Deploying & Activating...</span>
            ) : (
              <>
                <span>Deploy & Activate Employee</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      }
    >
      <form onSubmit={handleDeploy} className="space-y-4 text-xs">
        {/* Step 1: Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Employee Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Maya, Alex, Marcus"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 px-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Job Role / Specialty *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Order & Reservation Assistant"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 px-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </div>

        {/* Step 2: Dedicated Phone Number */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Assign Dedicated Direct Phone Line
            </span>
            <span className="text-[10px] text-gray-400 font-normal lowercase">(optional)</span>
          </label>
          <select
            value={form.assignedPhoneId}
            onChange={(e) => setForm({ ...form, assignedPhoneId: e.target.value })}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 px-3 text-xs text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
          >
            <option value="">No Direct Number Now (Assign later)</option>
            {phoneNumbers.map((num) => (
              <option key={num.id} value={num.id}>
                {num.e164Number} {num.friendlyName ? `(${num.friendlyName})` : ''} {num.assignedAgentId ? '[Already Assigned]' : '[Available]'}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Customers dialing this number will reach this AI employee directly.
          </p>
        </div>

        {/* Step 3: Core Business Instructions */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Core Business Instructions & Mission
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Editable anytime in detail page</span>
          </label>
          <textarea
            rows={4}
            value={form.systemPrompt}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
            placeholder="Describe what this AI should do, how it speaks, and what tools it should use..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2 px-3 text-xs font-mono text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all leading-relaxed"
          />
        </div>

        {/* Activation Seal Note */}
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-3 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
            Once deployed, your agent is <strong>immediately active</strong>. You will be redirected to its dedicated command space to view real-time KPIs, assign outbound work, test via softphone, and fine-tune guardrails.
          </p>
        </div>
      </form>
    </PlatformModal>
  );
}
