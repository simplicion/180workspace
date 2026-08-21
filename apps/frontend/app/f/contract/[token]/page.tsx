'use client';
import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useGetContractByTokenQuery, useSignContractMutation } from '@/redux/api/contractApi';
import { PenTool, CheckCircle, Download, FileText } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast from 'react-hot-toast';

export default function PublicContractView() {
    const params = useParams();
    const token = params?.token;
    const { data: contractData, isLoading, refetch } = useGetContractByTokenQuery(token);
    const [signContract, { isLoading: isSigning }] = useSignContractMutation();
    
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [agreed, setAgreed] = useState(false);
    const sigCanvas = useRef<any>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    if (isLoading) return <div className="h-screen flex items-center justify-center text-zinc-500">Loading document...</div>;
    if (!contractData?.contract) return <div className="h-screen flex items-center justify-center text-zinc-500">Document not found or expired.</div>;

    const contract = contractData.contract;

    const handleSign = async () => {
        if (!clientName.trim()) return toast.error('Please enter your full name');
        if (!agreed) return toast.error('You must agree to the terms');
        if (sigCanvas.current?.isEmpty()) return toast.error('Please draw your signature');

        const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');

        try {
            await signContract({ token, data: { clientName, signatureData } }).unwrap();
            toast.success('Document signed successfully!');
            setIsSignModalOpen(false);
            refetch();
        } catch (error) {
            toast.error('Failed to sign document');
        }
    };


    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.getElementById('public-contract-pdf-element');
            if (!element) {
                window.print();
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
            window.print();
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 print:bg-white flex flex-col">
            {/* Header - Hidden in Print */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 print:hidden sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">Client Portal</span>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex items-center px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50">
                        <Download className="w-4 h-4 mr-2" /> {isDownloading ? 'Generating...' : 'Download PDF'}
                    </button>
                    {contract.status !== 'Signed' ? (
                        <button onClick={() => setIsSignModalOpen(true)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 transition-all">
                            <PenTool className="w-4 h-4 mr-2" /> Sign Document
                        </button>
                    ) : (
                        <div className="flex items-center px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg">
                            <CheckCircle className="w-4 h-4 mr-2" /> Signed
                        </div>
                    )}
                </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 p-8 md:p-12 print:p-0 overflow-y-auto">
                <div id="public-contract-pdf-element" className="bg-white mx-auto shadow-xl print:shadow-none rounded-sm min-h-[842px] max-w-[794px] w-full p-12 md:p-16 text-zinc-900">
                    <div className="mb-12 border-b border-zinc-200 pb-8">
                        <h1 className="text-4xl md:text-5xl font-serif text-zinc-900 mb-6">{contract.title || 'Untitled Document'}</h1>
                        <div className="flex justify-between items-end">
                            <div className="text-zinc-600">
                                <p className="text-sm uppercase tracking-wider font-semibold mb-1">Prepared For</p>
                                <p className="text-lg font-medium text-zinc-900">{contract.clientName || 'Client'}</p>
                                {contract.clientEmail && <p className="text-sm">{contract.clientEmail}</p>}
                            </div>
                            <div className="text-right text-zinc-600">
                                <p className="text-sm uppercase tracking-wider font-semibold mb-1">Date</p>
                                <p className="text-sm">{new Date(contract.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8 text-zinc-800">
                        {contract.blocks.map((block: any, i: number) => {
                            if (block.type === 'Heading') return <h2 key={i} className="text-2xl font-serif text-zinc-900 mt-12 mb-6 border-b border-zinc-100 pb-2">{block.content}</h2>;
                            if (block.type === 'Paragraph' || block.type === 'Terms') return <p key={i} className="text-base leading-relaxed whitespace-pre-wrap">{block.content}</p>;
                            if (block.type === 'Scope') return (
                                <ul key={i} className="list-disc pl-6 space-y-2 text-base">
                                    {block.content.map((li: string, idx: number) => <li key={idx}>{li}</li>)}
                                </ul>
                            );
                            if (block.type === 'Timeline') return (
                                <div key={i} className="border border-zinc-200 rounded-lg overflow-hidden mt-6 mb-6">
                                    <table className="w-full text-left">
                                        <thead className="bg-zinc-50 border-b border-zinc-200">
                                            <tr><th className="px-6 py-4 font-semibold text-zinc-900">Milestone</th><th className="px-6 py-4 font-semibold text-zinc-900 text-right">Date / Duration</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {block.content.map((item: any, idx: number) => (
                                                <tr key={idx}><td className="px-6 py-4 text-zinc-800">{item.milestone}</td><td className="px-6 py-4 text-right text-zinc-600">{item.date}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                            if (block.type === 'Signature') return (
                                <div key={i} className="mt-20 pt-12 border-t border-zinc-200">
                                    <p className="text-sm italic text-zinc-600 mb-16">{block.content}</p>
                                    <div className="flex justify-between items-end gap-12">
                                        <div className="flex-1">
                                            <div className="border-b-2 border-zinc-900 pb-2 mb-2 h-16 flex items-end">
                                                {contract.status === 'Signed' && (
                                                    contract.clientSignatureData ? (
                                                        <img src={contract.clientSignatureData} alt="Signature" className="h-12 object-contain" />
                                                    ) : (
                                                        <span className="font-signature text-4xl text-indigo-700">{contract.signature?.signedBy}</span>
                                                    )
                                                )}
                                            </div>
                                            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Client Signature</div>
                                        </div>
                                        <div className="w-48">
                                            <div className="border-b-2 border-zinc-900 pb-2 mb-2 h-16 flex items-end text-right justify-end">
                                                {contract.status === 'Signed' && (
                                                    <span className="text-lg text-zinc-900">{new Date(contract.signature?.signedAt).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 text-right">Date</div>
                                        </div>
                                    </div>
                                    {contract.status === 'Signed' && (
                                        <div className="mt-8 p-4 bg-zinc-50 rounded-lg text-xs text-zinc-500 font-mono">
                                            <p>Digitally signed by: {contract.signature?.signedBy}</p>
                                            <p>IP Address: {contract.signature?.ipAddress}</p>
                                            <p>Timestamp: {new Date(contract.signature?.signedAt).toISOString()}</p>
                                        </div>
                                    )}
                                </div>
                            );
                            return null;
                        })}
                    </div>
                </div>
            </div>

            {/* Signature Modal */}
            {isSignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSignModalOpen(false)} />
                    <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PenTool className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Sign Document</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">By typing your name, you are electronically signing this document.</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    value={clientName} 
                                    onChange={(e) => setClientName(e.target.value)} 
                                    placeholder="Enter your legal name"
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium" 
                                />
                                {clientName && (
                                    <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Draw Your Signature</p>
                                        <div className="border border-zinc-300 dark:border-zinc-600 bg-white rounded-lg overflow-hidden h-32 w-full relative">
                                            <SignatureCanvas 
                                                ref={sigCanvas} 
                                                penColor="black"
                                                canvasProps={{className: 'sigCanvas w-full h-full absolute inset-0'}} 
                                            />
                                        </div>
                                        <button onClick={() => sigCanvas.current?.clear()} className="mt-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">Clear Signature</button>
                                    </div>
                                )}
                            </div>
                            
                            <label className="flex items-start gap-3 mt-4 cursor-pointer">
                                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-600" />
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                    I agree that this electronic signature is the legally binding equivalent to my handwritten signature.
                                </span>
                            </label>
                        </div>
                        
                        <div className="pt-4 flex gap-3">
                            <button onClick={() => setIsSignModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSign} disabled={isSigning || !agreed || !clientName} className="flex-1 px-4 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50">
                                {isSigning ? 'Signing...' : 'Sign & Accept'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
