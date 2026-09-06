"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Bot, Utensils, HeartPulse, Car, Home, Wrench, 
  ArrowLeft, CheckCircle2, ArrowRight, ShieldCheck, Zap, Plus,
  Sliders, Phone
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { QuickAgentDeployModal } from '../_components/QuickAgentDeployModal';
import clsx from 'clsx';

export default function IndustryTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [instantiatingSlug, setInstantiatingSlug] = useState<string | null>(null);
  const [isQuickDeployOpen, setIsQuickDeployOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tplRes, numRes] = await Promise.all([
          api.get('/api/v1/voiceforce/templates'),
          api.get('/api/v1/voiceforce/numbers').catch(() => ({ data: { data: [] } }))
        ]);
        setTemplates(tplRes.data?.templates || []);
        setPhoneNumbers(numRes.data?.data || []);
      } catch {
        toast.error('Failed to load industry blueprints');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleHireTemplate = async (template: any) => {
    try {
      setInstantiatingSlug(template.slug);
      const res = await api.post(`/api/v1/voiceforce/templates/${template.slug}/instantiate`, {
        agentName: template.name
      });

      toast.success(`Hired ${template.name}! Ready to test.`);
      if (res.data?.agent?.id) {
        router.push(`/voiceforce/agents/${res.data.agent.id}`);
      } else {
        router.push('/voiceforce/agents');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to hire AI employee template');
    } finally {
      setInstantiatingSlug(null);
    }
  };

  const getIcon = (slug: string) => {
    switch (slug) {
      case 'restaurant': return <Utensils className="w-6 h-6 text-amber-500" />;
      case 'dental': return <HeartPulse className="w-6 h-6 text-rose-500" />;
      case 'automotive': return <Car className="w-6 h-6 text-blue-500" />;
      case 'real-estate': return <Home className="w-6 h-6 text-purple-500" />;
      case 'home-services': return <Wrench className="w-6 h-6 text-emerald-500" />;
      default: return <Bot className="w-6 h-6 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/voiceforce/agents" className="text-xs font-semibold text-gray-500 hover:text-purple-600 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to AI Employees
            </Link>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            Deploy an AI Voice Employee
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Select a pre-trained industry blueprint with vetted SOPs and guardrails, or build a custom employee from scratch.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickDeployOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Employee</span>
        </button>
      </div>

      {/* Blueprint Grid with Custom Employee Card Prepending */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Premier Card: Build Custom AI Employee */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-purple-500/5 via-white to-white dark:from-purple-950/20 dark:via-gray-900 dark:to-gray-900 border-2 border-purple-500/40 dark:border-purple-500/30 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 uppercase">
                Custom Architecture
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                Build Custom AI Employee
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Define a unique neural persona, tailored job title, proprietary system instructions, and connect a dedicated direct phone line.
              </p>
            </div>

            {/* Custom Highlights */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="text-[11px] font-semibold text-gray-500">Key Features:</div>
              <div className="flex flex-wrap gap-1.5">
                {['Proprietary Prompt', 'Cartesia Sonic Voice', 'Direct Phone Line', 'Custom Guardrails'].map((feature) => (
                  <span key={feature} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickDeployOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Create Custom Employee</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Blueprint Cards */}
        {templates.map(t => (
          <div
            key={t.id}
            className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/60">
                  {getIcon(t.slug)}
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 uppercase">
                  {t.category}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {t.description}
                </p>
              </div>

              {/* Default Tools */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="text-[11px] font-semibold text-gray-500">Enabled Capabilities:</div>
                <div className="flex flex-wrap gap-1.5">
                  {(t.suggestedTools || []).map((tool: string) => (
                    <span key={tool} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                      {tool.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleHireTemplate(t)}
              disabled={instantiatingSlug === t.slug}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{instantiatingSlug === t.slug ? 'Hiring Employee...' : 'Hire This AI Employee (1-Click)'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Quick Custom Agent Deploy Modal */}
      <QuickAgentDeployModal
        isOpen={isQuickDeployOpen}
        onClose={() => setIsQuickDeployOpen(false)}
        phoneNumbers={phoneNumbers}
      />
    </div>
  );
}
