'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateContractMutation } from '@/redux/api/contractApi';
import { ArrowLeft, FileText, Code, PenTool, LayoutTemplate, Shield, Megaphone, Presentation } from 'lucide-react';
import toast from 'react-hot-toast';

const templates = [
    { id: 'Blank', name: 'Blank Contract', icon: FileText, desc: 'Start from scratch with an empty document.' },
    { id: 'Web Development', name: 'Web Development', icon: Code, desc: 'Standard contract for website or app development.' },
    { id: 'Freelance Service', name: 'Freelance Service', icon: PenTool, desc: 'Generic agreement for freelance services.' },
    { id: 'NDA', name: 'Non-Disclosure Agreement', icon: Shield, desc: 'Mutual confidentiality agreement for sharing sensitive info.' },
    { id: 'Marketing Retainer', name: 'Marketing Retainer', icon: Megaphone, desc: 'Monthly services retainer for marketing or SEO.' },
    { id: 'Sales Proposal', name: 'Sales Proposal', icon: Presentation, desc: 'Pitch template with scope, pricing, and signature.' }
];

export default function NewContractPage() {
    const router = useRouter();
    const [createContract, { isLoading }] = useCreateContractMutation();
    const [title, setTitle] = useState('');

    const handleSelectTemplate = async (templateId: string) => {
        try {
            const res = await createContract({
                title: title || `${templateId} Contract`,
                template: templateId
            }).unwrap();
            
            toast.success('Contract created');
            router.push(`/documents/contract/${res.contract._id}/edit`);
        } catch (error) {
            toast.error('Failed to create contract');
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="max-w-4xl mx-auto space-y-8">
                <button 
                    onClick={() => router.push('/documents')}
                    className="flex items-center text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Documents
                </button>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                        <LayoutTemplate className="w-8 h-8 text-indigo-500" />
                        Create New Contract
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Select a template to start building your proposal or contract.</p>
                </div>

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Contract Title (Optional)</label>
                    <input 
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Acme Corp Redesign Proposal"
                        className="w-full max-w-md px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {templates.map((tpl) => (
                        <button
                            key={tpl.id}
                            onClick={() => handleSelectTemplate(tpl.id)}
                            disabled={isLoading}
                            className="flex flex-col items-start p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 transition-all text-left group disabled:opacity-50"
                        >
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                                <tpl.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{tpl.name}</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{tpl.desc}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
