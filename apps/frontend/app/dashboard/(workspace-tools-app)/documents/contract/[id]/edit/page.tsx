'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGetContractByIdQuery, useUpdateContractMutation, useGenerateShareLinkMutation } from '@/redux/api/contractApi';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Send, Share2, Plus, GripVertical, Trash2, Settings, Eye, Heading1, AlignLeft, List, Calendar, DollarSign, PenTool, ExternalLink, Download } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';

export default function ContractEditorPage() {
    const params = useParams();
    const id = params?.id;
    const router = useRouter();
    const { data: contractData, isLoading, refetch } = useGetContractByIdQuery(id);
    const [updateContract, { isLoading: isUpdating }] = useUpdateContractMutation();
    const [generateLink, { isLoading: isGenerating }] = useGenerateShareLinkMutation();

    const [contract, setContract] = useState<any>(null);
    const [dealsData, setDealsData] = useState<any[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (contractData?.contract) {
            setContract(contractData.contract);
        }
    }, [contractData]);

    useEffect(() => {
        api.get('/sales/deals').then(res => {
            setDealsData(res.data?.leads || res.data?.data || []);
        }).catch(err => console.log('Error fetching deals', err));
    }, []);

    const processVariables = (text: string) => {
        if (!text || !contract?.variables) return text;
        const vars = contract.variables;
        let processed = text;
        Object.keys(vars).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            processed = processed.replace(regex, vars[key] || '');
        });
        // Default fallbacks for common unreplaced vars
        processed = processed.replace(/{{clientName}}/g, contract.clientName || '[Client Name]');
        processed = processed.replace(/{{clientCompany}}/g, contract.variables?.clientCompany || '[Client Company]');
        processed = processed.replace(/{{dealAmount}}/g, contract.variables?.dealAmount || '[Amount]');
        return processed;
    };

    if (isLoading || !contract) return <div className="p-8 text-center text-zinc-500">Loading editor...</div>;

    const handleSave = async () => {
        try {
            await updateContract({ id, ...contract }).unwrap();
            toast.success('Saved successfully');
            refetch();
        } catch (error) {
            toast.error('Failed to save');
        }
    };

    const handleGenerateLink = async () => {
        try {
            await handleSave(); // save first
            const res = await generateLink(id).unwrap();
            setContract({ ...contract, shareToken: res.shareToken });
            setIsShareOpen(true);
            const url = `${window.location.origin}/f/contract/${res.shareToken}`;
            setShareUrl(url);
            toast.success('Share link generated');
            toast.success('Link generated!');
            refetch();
        } catch (error) {
            toast.error('Failed to generate link');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.success('Copied to clipboard');
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.getElementById('contract-pdf-element');
            if (!element) {
                toast.error('Could not find document preview element');
                return;
            }
            const opt = {
                margin: 0,
                filename: `${(contract.title || 'Contract').replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
            };
            await html2pdf().set(opt).from(element).save();
            toast.success('PDF downloaded successfully!');
        } catch (err) {
            console.error('Error generating PDF:', err);
            toast.error('Failed to generate PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const addBlock = (type: string) => {
        let newContent: any = '';
        if (type === 'Scope') newContent = [''];
        if (type === 'Timeline') newContent = [{ milestone: '', date: '' }];
        if (type === 'Signature') newContent = 'By signing below, the client agrees to the terms.';

        const newBlock = { id: Math.random().toString(36).substr(2, 9), type, content: newContent };
        setContract({ ...contract, blocks: [...contract.blocks, newBlock] });
    };

    const updateBlock = (index: number, newContent: any) => {
        const newBlocks = [...contract.blocks];
        newBlocks[index].content = newContent;
        setContract({ ...contract, blocks: newBlocks });
    };

    const removeBlock = (index: number) => {
        const newBlocks = [...contract.blocks];
        newBlocks.splice(index, 1);
        setContract({ ...contract, blocks: newBlocks });
    };

    // Rendering Helpers for Left Sidebar Editor
    const renderBlockEditor = (block: any, index: number) => {
        return (
            <div key={block.id} className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4 flex gap-4 transition-all hover:border-indigo-500/50">
                <div className="flex flex-col gap-2 text-zinc-400 cursor-grab items-center justify-start mt-2">
                    <GripVertical className="w-4 h-4" />
                    <button onClick={() => removeBlock(index)} className="hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-500">
                        {block.type}
                    </div>
                    
                    {block.type === 'Heading' && (
                        <input type="text" value={block.content} onChange={(e) => updateBlock(index, e.target.value)} placeholder="Heading text" className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 outline-none pb-1 font-bold text-lg text-zinc-900 dark:text-zinc-100" />
                    )}
                    {(block.type === 'Paragraph' || block.type === 'Terms') && (
                        <textarea value={block.content} onChange={(e) => updateBlock(index, e.target.value)} rows={3} placeholder="Enter text here..." className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 focus:border-indigo-500 outline-none text-zinc-700 dark:text-zinc-300 resize-y" />
                    )}
                    {block.type === 'Signature' && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
                            <textarea value={block.content} onChange={(e) => updateBlock(index, e.target.value)} rows={2} className="w-full bg-transparent border-none outline-none text-zinc-500 dark:text-zinc-400 text-sm mb-4" placeholder="Signature terms..." />
                            <div className="border-t border-zinc-300 dark:border-zinc-700 pt-4 mt-2 text-zinc-400 text-sm italic">
                                Client Signature Box will appear here in preview
                            </div>
                        </div>
                    )}
                    {block.type === 'Scope' && (
                        <div className="space-y-2">
                            {block.content.map((item: string, i: number) => (
                                <div key={i} className="flex gap-2">
                                    <span className="text-zinc-400 mt-1">•</span>
                                    <input type="text" value={item} onChange={(e) => {
                                        const newArr = [...block.content];
                                        newArr[i] = e.target.value;
                                        updateBlock(index, newArr);
                                    }} className="flex-1 bg-transparent border-b border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 outline-none text-zinc-700 dark:text-zinc-300" />
                                    <button onClick={() => {
                                        const newArr = [...block.content];
                                        newArr.splice(i, 1);
                                        updateBlock(index, newArr);
                                    }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                </div>
                            ))}
                            <button onClick={() => updateBlock(index, [...block.content, ''])} className="text-sm text-indigo-500 hover:text-indigo-600 font-medium flex items-center mt-2">
                                <Plus className="w-3 h-3 mr-1"/> Add Item
                            </button>
                        </div>
                    )}
                    {block.type === 'Timeline' && (
                        <div className="space-y-3">
                            {block.content.map((item: any, i: number) => (
                                <div key={i} className="flex gap-2 items-center bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                                    <input type="text" placeholder="Milestone" value={item.milestone} onChange={(e) => {
                                        const newArr = [...block.content];
                                        newArr[i].milestone = e.target.value;
                                        updateBlock(index, newArr);
                                    }} className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-700 dark:text-zinc-300" />
                                    <input type="text" placeholder="Date/Duration" value={item.date} onChange={(e) => {
                                        const newArr = [...block.content];
                                        newArr[i].date = e.target.value;
                                        updateBlock(index, newArr);
                                    }} className="w-32 bg-transparent border-l border-zinc-200 dark:border-zinc-700 pl-2 outline-none text-sm text-zinc-500" />
                                    <button onClick={() => {
                                        const newArr = [...block.content];
                                        newArr.splice(i, 1);
                                        updateBlock(index, newArr);
                                    }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                </div>
                            ))}
                            <button onClick={() => updateBlock(index, [...block.content, {milestone:'', date:''}])} className="text-sm text-indigo-500 hover:text-indigo-600 font-medium flex items-center mt-2">
                                <Plus className="w-3 h-3 mr-1"/> Add Milestone
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Client Preview Renderer
    const renderClientPreview = () => {
        return (
            <div id="contract-pdf-element" className="bg-white mx-auto shadow-2xl rounded-sm min-h-[842px] max-w-[595px] w-full p-8 md:p-12 text-zinc-900">
                <div className="mb-12 border-b border-zinc-200 pb-8">
                    <h1 className="text-4xl font-serif text-zinc-900 mb-4">{contract.title || 'Untitled Document'}</h1>
                    <div className="flex justify-between items-end">
                        <div className="text-sm text-zinc-500">
                            <p>Prepared for: <strong className="text-zinc-800">{contract.clientName || 'Client Name'}</strong></p>
                            <p>Date: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 text-zinc-700">
                    {contract.blocks.map((block: any, i: number) => {
                        if (block.type === 'Heading') return <h2 key={i} className="text-2xl font-serif text-zinc-900 mt-8 mb-4 border-b border-zinc-100 pb-2">{block.content || 'Heading'}</h2>;
                        if (block.type === 'Paragraph' || block.type === 'Terms') return <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{block.content}</p>;
                        if (block.type === 'Scope') return (
                            <ul key={i} className="list-disc pl-5 space-y-2 text-sm">
                                {block.content.map((li: string, idx: number) => <li key={idx}>{li || '...'}</li>)}
                            </ul>
                        );
                        if (block.type === 'Timeline') return (
                            <div key={i} className="border border-zinc-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-zinc-50 border-b border-zinc-200">
                                        <tr><th className="px-4 py-3 font-semibold">Milestone</th><th className="px-4 py-3 font-semibold text-right">Date / Duration</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {block.content.map((item: any, idx: number) => (
                                            <tr key={idx}><td className="px-4 py-3">{item.milestone || '...'}</td><td className="px-4 py-3 text-right text-zinc-500">{item.date || '...'}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                        if (block.type === 'Signature') return (
                            <div key={i} className="mt-16 pt-8 border-t border-zinc-200">
                                <p className="text-sm italic text-zinc-500 mb-12">{block.content}</p>
                                <div className="flex justify-between items-end gap-8">
                                    <div className="flex-1 border-b border-zinc-800 pb-2">
                                        {contract.status === 'Signed' ? (
                                            <div className="font-signature text-3xl text-indigo-600">{contract.signature?.signedBy}</div>
                                        ) : (
                                            <div className="text-zinc-300 italic">Client Signature</div>
                                        )}
                                    </div>
                                    <div className="w-32 border-b border-zinc-800 pb-2 text-right">
                                        {contract.status === 'Signed' ? (
                                            <div className="text-sm">{new Date(contract.signature?.signedAt).toLocaleDateString()}</div>
                                        ) : (
                                            <div className="text-zinc-300 italic">Date</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                        return null;
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard/documents')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <input type="text" value={contract.title} onChange={(e) => setContract({...contract, title: e.target.value})} className="text-xl font-bold bg-transparent outline-none text-zinc-900 dark:text-zinc-100" />
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${contract.status === 'Signed' ? 'bg-emerald-100 text-emerald-700' : contract.status === 'Sent' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-200 text-zinc-700'}`}>
                                {contract.status}
                            </span>
                            {contract.deal && <span className="text-xs text-zinc-500">Linked to Deal</span>}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSettingsOpen(true)} className="flex items-center px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                        <Settings className="w-4 h-4 mr-2" /> Settings
                    </button>
                    <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50">
                        <Download className="w-4 h-4 mr-2" /> {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                    <button onClick={handleSave} disabled={isUpdating} className="flex items-center px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50">
                        <Save className="w-4 h-4 mr-2" /> {isUpdating ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button onClick={handleGenerateLink} disabled={isGenerating || contract.status === 'Signed'} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 transition-all disabled:opacity-50">
                        <Send className="w-4 h-4 mr-2" /> Send to Client
                    </button>
                </div>
            </div>

            {shareUrl && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-200 dark:border-emerald-500/20 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center text-sm text-emerald-800 dark:text-emerald-400">
                        <CheckCircle className="w-4 h-4 mr-2" /> Link generated successfully!
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-mono bg-white dark:bg-zinc-900 px-3 py-1 rounded border border-emerald-200 dark:border-emerald-800 text-zinc-600 dark:text-zinc-400 select-all">
                            {shareUrl}
                        </span>
                        <button onClick={copyToClipboard} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center">
                            <Share2 className="w-4 h-4 mr-1" /> Copy Link
                        </button>
                        <a href={shareUrl} target="_blank" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center">
                            <ExternalLink className="w-4 h-4 mr-1" /> Open
                        </a>
                    </div>
                </div>
            )}

            {/* Split Screen */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Builder */}
                <div className="w-1/2 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/20 overflow-y-auto p-6">
                    <div className="max-w-2xl mx-auto w-full">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <PenTool className="w-5 h-5 text-indigo-500" />
                                Content Blocks
                            </h2>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            {contract.blocks.map((block: any, i: number) => renderBlockEditor(block, i))}
                        </div>

                        {/* Add Block Menu */}
                        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center">
                            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">Add a new block</h3>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button onClick={() => addBlock('Heading')} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 rounded-lg text-sm transition-colors flex items-center"><Heading1 className="w-4 h-4 mr-1.5"/> Heading</button>
                                <button onClick={() => addBlock('Paragraph')} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 rounded-lg text-sm transition-colors flex items-center"><AlignLeft className="w-4 h-4 mr-1.5"/> Paragraph</button>
                                <button onClick={() => addBlock('Scope')} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 rounded-lg text-sm transition-colors flex items-center"><List className="w-4 h-4 mr-1.5"/> Scope List</button>
                                <button onClick={() => addBlock('Timeline')} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 rounded-lg text-sm transition-colors flex items-center"><Calendar className="w-4 h-4 mr-1.5"/> Timeline</button>
                                <button onClick={() => addBlock('Signature')} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 rounded-lg text-sm transition-colors flex items-center"><PenTool className="w-4 h-4 mr-1.5"/> Signature</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Live Preview */}
                <div className="w-1/2 bg-zinc-100 dark:bg-zinc-950 overflow-y-auto p-8 relative">
                    <div className="absolute top-4 right-8 flex items-center gap-2 text-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <Eye className="w-4 h-4" /> <span className="text-xs font-medium uppercase tracking-wider">Live Client Preview</span>
                    </div>
                    {renderClientPreview()}
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="relative z-50">
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} aria-hidden="true" />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <div className="mx-auto max-w-sm rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full space-y-4">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Document Settings</h2>
                            
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Client Name</label>
                                <input type="text" value={contract.clientName || ''} onChange={(e) => setContract({...contract, clientName: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Client Email</label>
                                <input type="email" value={contract.clientEmail || ''} onChange={(e) => setContract({...contract, clientEmail: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Link to Deal (Optional)</label>
                                <CustomSelect value={contract.deal || ''} onChange={(e) => setContract({...contract, deal: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
                                    <option value="">None</option>
                                    {dealsData.map((d: any) => (
                                        <option key={d.id || d._id} value={d.id || d._id}>{d.title || d.name || 'Unnamed Deal'} {d.stage ? `(${d.stage})` : ''}</option>
                                    ))}
                                </CustomSelect>
                                <p className="text-xs text-zinc-500 mt-1">Linking a deal will automatically pull client details into variables like {'{{clientName}}'}</p>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-2">
                                <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg">Done</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isShareOpen && (
                <div className="relative z-50">
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsShareOpen(false)} aria-hidden="true" />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <div className="mx-auto max-w-sm rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full space-y-4">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Share Contract</h2>
                            
                            <div className="space-y-3">
                                <button onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/f/contract/${contract.shareToken}`);
                                    toast.success("Link copied!");
                                }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium rounded-xl transition-colors">
                                    <ExternalLink className="w-4 h-4" /> Copy Direct Link
                                </button>
                                
                                <button onClick={() => {
                                    const text = encodeURIComponent(`Hi ${contract.clientName || 'there'},\n\nI have prepared the contract "${contract.title}" for you to review and sign. You can securely access it here:\n${window.location.origin}/f/contract/${contract.shareToken}\n\nLet me know if you have any questions!`);
                                    window.open(`https://wa.me/?text=${text}`, '_blank');
                                }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors">
                                    Share on WhatsApp
                                </button>

                                <button onClick={() => {
                                    const subject = encodeURIComponent(`Contract Ready: ${contract.title}`);
                                    const body = encodeURIComponent(`Hi ${contract.clientName || 'there'},\n\nI have prepared the contract for you to review and sign. You can securely access it here:\n${window.location.origin}/f/contract/${contract.shareToken}`);
                                    window.open(`mailto:${contract.clientEmail || ''}?subject=${subject}&body=${body}`);
                                }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
                                    Send via Email
                                </button>
                            </div>
                            
                            <div className="pt-2 text-center">
                                <button onClick={() => setIsShareOpen(false)} className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// Icon for CheckCircle missing above
const CheckCircle = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
