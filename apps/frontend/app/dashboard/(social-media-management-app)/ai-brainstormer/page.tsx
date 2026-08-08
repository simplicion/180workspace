'use client';

import { useState } from 'react';
import { Sparkles, Brain, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AIBrainstormerPage() {
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [pillars, setPillars] = useState<any[]>([]);

    async function handleGenerate(e: React.FormEvent) {
        e.preventDefault();
        if (!topic) return;

        setLoading(true);
        try {
            const { data } = await api.post('/social-media/ai-brainstormer/pillars', {
                topic
            });
            if (data.success) {
                setPillars(data.pillars);
            }
        } catch (error) {
            toast.error('Failed to generate pillars');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-full">
            <div className="page-header">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Brain className="w-6 h-6 text-indigo-600" />
                        AI Brainstormer
                    </h1>
                    <p className="page-subtitle">Generate content pillars and post ideas for your niche</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto mt-8">
                <form onSubmit={handleGenerate} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        What is your business or topic about?
                    </label>
                    <div className="flex gap-4">
                        <input
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="e.g. B2B SaaS for HR professionals"
                            className="input flex-1"
                            required
                        />
                        <button 
                            type="submit" 
                            disabled={loading || !topic}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Generate Pillars
                        </button>
                    </div>
                </form>

                {pillars.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900">Your Content Pillars</h2>
                        <div className="grid gap-6">
                            {pillars.map((pillar, i) => (
                                <div key={i} className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{pillar.name}</h3>
                                    <p className="text-gray-600 text-sm mb-4">{pillar.description}</p>
                                    
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Post Ideas</h4>
                                        <ul className="space-y-2">
                                            {pillar.ideas.map((idea: string, j: number) => (
                                                <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                                                    <span className="text-indigo-500 mt-1">•</span>
                                                    {idea}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
