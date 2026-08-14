'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Download, Printer, ArrowLeft, Receipt, CheckCircle, Clock } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import clsx from 'clsx';
import Link from 'next/link';

export default function QuoteViewerPage() {
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    const params = useParams();
    const router = useRouter();
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!params?.id) return;
        api.get(`/api/sales/quotes/${params.id}`)
            .then(res => setQuote(res.data.quote || res.data))
            .catch(() => toast.error('Failed to load quote'))
            .finally(() => setLoading(false));
    }, [params?.id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center min-h-screen text-indigo-600 font-semibold animate-pulse">Loading Quote...</div>;
    }

    if (!quote) {
        return (
            <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center">
                <Receipt className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-800">Quote Not Found</h2>
                <p className="text-gray-500 mt-2 mb-6">This quote might have been deleted or is unavailable.</p>
                <Link href="/dashboard/documents" className="btn-primary">Back to Documents</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12 print:bg-white print:p-0">
            {/* Header / Actions - Hidden when printing */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard/documents')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            Quote #{quote.quoteNumber}
                            <span className={clsx(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                quote.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                quote.status === 'Draft' ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                                'bg-amber-50 text-amber-600 border border-amber-100'
                            )}>
                                {quote.status}
                            </span>
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handlePrint} className="btn-secondary">
                        <Printer className="w-4 h-4" /> Print / PDF
                    </button>
                </div>
            </div>

            {/* Document Body */}
            <div className="max-w-4xl mx-auto mt-8 bg-white p-12 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 print:shadow-none print:border-none print:mt-0 print:p-8">
                
                {/* Company & Client Header */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                                <Receipt className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">180 Workspace</h2>
                                <p className="text-sm text-gray-500 font-medium">Business Quotation</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-4xl font-black text-gray-200 uppercase tracking-widest mb-4">QUOTE</h1>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-left">
                            <span className="text-gray-500 font-medium">Quote No:</span>
                            <span className="font-bold text-gray-900">#{quote.quoteNumber}</span>
                            
                            <span className="text-gray-500 font-medium">Date:</span>
                            <span className="font-bold text-gray-900">{new Date(quote.date || quote.createdAt).toLocaleDateString()}</span>
                            
                            {quote.validUntil && (
                                <>
                                    <span className="text-gray-500 font-medium">Valid Until:</span>
                                    <span className="font-bold text-gray-900">{new Date(quote.validUntil).toLocaleDateString()}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* To & From */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Prepared For</h3>
                        <p className="text-lg font-bold text-gray-900">{quote.client?.name || quote.clientName || 'Valued Client'}</p>
                        <p className="text-sm text-gray-600 mt-1">{quote.client?.email || quote.clientEmail}</p>
                        <p className="text-sm text-gray-600">{quote.client?.phone || quote.clientPhone}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Prepared By</h3>
                        <p className="text-lg font-bold text-gray-900">{quote.preparedBy?.name || '180 Workspace Representative'}</p>
                        <p className="text-sm text-gray-600 mt-1">{quote.preparedBy?.email || `contact@${process.env.NEXT_PUBLIC_ROOT_DOMAIN || ''}`}</p>
                    </div>
                </div>

                {/* Line Items */}
                <div className="mb-12">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-900 text-sm font-bold text-gray-900 uppercase tracking-wider">
                                <th className="pb-3 pl-2">Description</th>
                                <th className="pb-3 text-right">Qty</th>
                                <th className="pb-3 text-right">Unit Price</th>
                                <th className="pb-3 text-right pr-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {(quote.items || []).map((item: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-100 last:border-0">
                                    <td className="py-4 pl-2 font-medium text-gray-900">{item.description || item.name}</td>
                                    <td className="py-4 text-right text-gray-600">{item.quantity}</td>
                                    <td className="py-4 text-right text-gray-600">{currencySymbol}{Number(item.price || item.unitPrice || 0).toFixed(2)}</td>
                                    <td className="py-4 text-right font-bold text-gray-900 pr-2">{currencySymbol}{(item.quantity * Number(item.price || item.unitPrice || 0)).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-1/2">
                        <div className="flex justify-between py-2 text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-medium">{currencySymbol}{Number(quote.subtotal || quote.total || 0).toFixed(2)}</span>
                        </div>
                        {quote.tax > 0 && (
                            <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-100">
                                <span>Tax</span>
                                <span className="font-medium">{currencySymbol}{Number(quote.tax).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-4 text-xl font-black text-indigo-900 border-t-2 border-gray-900 mt-2">
                            <span>Total</span>
                            <span>{currencySymbol}{Number(quote.total).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes & Terms */}
                {quote.notes && (
                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notes & Terms</h3>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                )}
                
                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-gray-100 text-center text-sm font-medium text-gray-400">
                    <p>Thank you for considering our services.</p>
                    <p className="mt-1 text-xs">Generated via 180 Documents</p>
                </div>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: A4 portrait; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
                    nav, sidebar, header { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; }
                }
            `}</style>
        </div>
    );
}
