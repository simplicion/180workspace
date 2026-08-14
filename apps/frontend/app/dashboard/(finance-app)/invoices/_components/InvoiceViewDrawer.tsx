import React, { useState } from 'react';
import { useSettings } from '@/lib/settings-context';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { X, Printer, Download, CreditCard } from 'lucide-react';
import { LogoLoader } from '@workspace/ui';
import clsx from 'clsx';
import { Drawer } from '@/components/ui/Drawer';

export function InvoiceViewDrawer({ invoice, onClose }: { invoice: any; onClose: () => void }) {
    const { company, platform } = useSettings();
    const brandColor = company?.brandColor || '#4f46e5';
    const currencySymbol = company?.currencySymbol || '$';

    const [paying, setPaying] = useState(false);

    const handlePayInvoice = async () => {
        setPaying(true);
        try {
            const { data } = await api.post(`/api/finance/invoices/${invoice.id}/payment-link`);
            if (data.linkData?.paymentLinkUrl) {
                window.open(data.linkData.paymentLinkUrl, '_blank');
                toast.success('Opening payment gateway...');
            } else {
                toast.error('Payment gateway not configured');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to initiate payment');
        } finally {
            setPaying(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        try {
            const [{ pdf }, { InvoicePDF }] = await Promise.all([
                import('@react-pdf/renderer'),
                import('@/components/pdf/InvoicePDF')
            ]);
            const blob = await pdf(<InvoicePDF invoice={invoice} company={company} platform={platform} />).toBlob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${invoice.invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            toast.error('Failed to download PDF');
        }
    };

    return (
        <Drawer
            isOpen={true}
            onClose={onClose}
            title={`Invoice — ${invoice.invoiceNumber}`}
            maxWidth="max-w-4xl"
        >
            <div className="flex gap-2 items-center mb-6 no-print justify-end">
                {invoice.status === 'sent' && (
                    <button
                        onClick={handlePayInvoice}
                        disabled={paying}
                        className="btn-primary text-xs py-1.5 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        {paying ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                        {paying ? 'Processing...' : 'Pay Online'}
                    </button>
                )}
                <button onClick={handlePrint} className="btn-secondary text-xs py-1.5 hover:bg-gray-100"><Printer className="w-3.5 h-3.5" />Print</button>
                <button onClick={handleDownloadPDF} className="btn-secondary text-xs py-1.5 bg-gray-50 hover:bg-gray-100 border-gray-200"><Download className="w-3.5 h-3.5" />PDF</button>
            </div>

            <div className="space-y-12 pb-12" id="invoice-print-content">
                {/* Header: Company and Invoice Info */}
                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        {company?.companyLogo ? (
                            <img src={company.companyLogo} alt={company.companyName} className="h-16 w-auto" />
                        ) : (
                            <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: brandColor }}>{company?.companyName || platform?.name || platform?.platformName || 'Pitchin180'}</h1>
                        )}
                        <div className="text-sm text-gray-500 max-w-xs leading-relaxed">
                            <p className="font-bold text-gray-800 text-base mb-1">{company?.companyName || platform?.name || 'Enterprise'}</p>
                            <p>{company?.address || ','}</p>
                            <p>Email: {company?.companyEmail || platform?.email || ''}</p>
                            {company?.phoneNumber && <p>Phone: {company.phoneNumber}</p>}
                        </div>
                    </div>
                    <div className="text-right space-y-1">
                        <h2 className="text-6xl font-black text-gray-100 uppercase tracking-tighter mb-4 select-none">Invoice</h2>
                        <p className="text-lg font-bold text-gray-900">#{invoice.invoiceNumber}</p>
                        <div className="text-sm space-y-1 mt-4">
                            <p className="text-gray-400">Issue Date: <span className="text-gray-900 font-semibold">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</span></p>
                            <p className="text-gray-400">Due Date: <span className="text-gray-900 font-semibold">{format(new Date(invoice.dueDate || invoice.issueDate), 'MMM d, yyyy')}</span></p>
                        </div>
                        <div className={clsx('inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase mt-4 tracking-widest',
                            invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600')}>
                            <div className={clsx('w-1.5 h-1.5 rounded-full', invoice.status === 'paid' ? 'bg-emerald-500' : 'bg-orange-500')} />
                            {invoice.status}
                        </div>
                    </div>
                </div>

                {/* Bill To Info */}
                <div className="grid grid-cols-2 gap-12">
                    <div className="p-8 rounded-3xl bg-gray-50/80 space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Bill To</h3>
                        <p className="text-2xl font-black text-gray-900 tracking-tight">{invoice.clientName || invoice.clientId?.name}</p>
                        <p className="text-sm text-gray-500 font-medium">{invoice.clientId?.email || ''}</p>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="space-y-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Quantity</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Unit Price</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50">
                            {invoice.lineItems?.map((item: any, i: number) => (
                                <tr key={i} className="group transition-colors hover:bg-gray-50/30">
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-gray-900 border-l-4 border-transparent group-hover:border-indigo-500 pl-2 transition-all">{item.description}</p>
                                    </td>
                                    <td className="px-6 py-5 text-center text-gray-600 font-medium">{item.quantity}</td>
                                    <td className="px-6 py-5 text-right text-gray-600 font-medium">{currencySymbol}{item.unitPrice?.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-5 text-right font-black text-gray-900">{currencySymbol}{(item.quantity * item.unitPrice).toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Area */}
                <div className="flex justify-between items-start pt-8 pb-12">
                    <div className="flex-1 space-y-6">
                        <div className="text-[10px] font-black text-gray-200 tracking-[0.3em] uppercase mt-20">
                            Thank you for your business!
                        </div>
                    </div>
                    
                    <div className="w-80 space-y-8">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-gray-400">Subtotal</span>
                                <span className="text-gray-900 font-bold">{currencySymbol}{invoice.subtotal?.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Total Amount</span>
                                <span className="text-4xl font-black tracking-tighter" style={{ color: brandColor }}>{currencySymbol}{invoice.totalAmount?.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* Digital Signature with Dashed Line */}
                        <div className="pt-12 text-center space-y-2">
                            <div className="w-full border-b border-dashed border-gray-200 mb-2" />
                            <p className="text-xs font-bold text-gray-900 tracking-tight">{company?.authorizedSignatory || 'Authorized Signatory'}</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{company?.designation || 'OWNER / PARTNER'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Drawer>
    );
}
