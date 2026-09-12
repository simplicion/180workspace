'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
    CheckCircle2, Clock, FileText, Printer, Download, Share2, 
    Copy, Check, Building2, ShieldCheck, Mail, Calendar, 
    DollarSign, ArrowUpRight, Award, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { LogoLoader } from "@workspace/ui";

function numberToWords(num: number) {
    if (!num || num === 0) return 'Zero';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const regex = /^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/;
    const n = ('000000000' + Math.floor(num)).substr(-9).match(regex);
    if (!n) return '';
    let str = '';
    str += (n[1] !== '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
    str += (n[2] !== '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
    str += (n[3] !== '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
    str += (n[4] !== '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
    str += (n[5] !== '00') ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
    return str.trim();
}

export default function PublicPayslipPage() {
    const params = useParams();
    const salaryId = params?.id as string;

    const [salary, setSalary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [downloadingDocx, setDownloadingDocx] = useState(false);

    useEffect(() => {
        if (!salaryId) return;
        setLoading(true);
        // Try public route first, fall back to protected if user is logged in
        api.get(`/api/public/payslips/${salaryId}`)
            .then(({ data }) => {
                setSalary(data.salary);
            })
            .catch(() => {
                return api.get(`/api/salary/${salaryId}`)
                    .then(({ data }) => setSalary(data.salary))
                    .catch((err) => {
                        console.error('Failed to load payslip:', err);
                        setError(err?.response?.data?.error || 'Payslip statement not found or link has expired.');
                    });
            })
            .finally(() => setLoading(false));
    }, [salaryId]);

    const employee = salary?.employee || {};
    const company = salary?.company || salary?.companySettings || {};
    const currencySymbol = company?.currencySymbol || '$';
    const currencyName = company?.currency || 'USD';
    const companyName = company?.companyName || company?.name || '180workspace Enterprise';

    const handleCopyLink = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            toast.success('Payslip secure link copied to clipboard!');
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleShareWhatsApp = () => {
        if (typeof window === 'undefined' || !salary) return;
        const empName = employee?.name || 'Employee';
        const monthText = salary.month || '';
        const netAmt = `${currencySymbol}${Number(salary.netSalary || 0).toLocaleString()}`;
        const url = window.location.href;
        const msg = encodeURIComponent(`📄 *Official Payslip Document*\nEmployee: ${empName}\nPeriod: ${monthText}\nNet Disbursed: ${netAmt}\n\nView and download your official payslip here:\n${url}`);
        window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
    };

    const handlePrint = () => {
        const printContent = document.getElementById('public-payslip-canvas');
        if (!printContent) return;

        const originalContent = document.body.innerHTML;
        const printStyles = `
            <style>
                @media print {
                    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff !important; }
                    .no-print { display: none !important; }
                    #public-payslip-canvas { width: 100% !important; max-width: none !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
                }
            </style>
        `;

        document.body.innerHTML = printStyles + printContent.outerHTML;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    };

    const handleDownloadPDF = async () => {
        setDownloadingPdf(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const printContent = document.getElementById('public-payslip-canvas');
            if (!printContent) return;

            const canvas = await html2canvas(printContent, { scale: 2.5, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Payslip_${employee?.name || 'Staff'}_${salary.month}.pdf`);
            toast.success('Official PDF payslip downloaded!');
        } catch (err) {
            console.error('PDF error:', err);
            toast.error('Failed to generate PDF');
        } finally {
            setDownloadingPdf(false);
        }
    };

    const handleDownloadDOCX = async () => {
        setDownloadingDocx(true);
        try {
            const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } = await import('docx');
            const { saveAs } = await import('file-saver');

            const empName = employee?.name || 'Employee';
            const monthStr = salary.month || '';

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: companyName,
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            text: `OFFICIAL PAYSLIP — ${monthStr}`,
                            heading: HeadingLevel.HEADING_2,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 }
                        }),
                        new Paragraph({ text: `Employee Name: ${empName}` }),
                        new Paragraph({ text: `Staff ID: ${employee?.employeeId || 'N/A'}` }),
                        new Paragraph({ text: `Department: ${employee?.department || 'Staff'}` }),
                        new Paragraph({ text: `Designation: ${employee?.position || 'Team Member'}` }),
                        new Paragraph({ text: `Status: ${salary.status?.toUpperCase()}`, spacing: { after: 300 } }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Salary Head", bold: true })] })], margins: { top: 80, bottom: 80, left: 80 } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Amount (${currencySymbol})`, bold: true })] })], margins: { top: 80, bottom: 80, left: 80 } }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph("Base Salary")], margins: { top: 80, bottom: 80, left: 80 } }),
                                        new TableCell({ children: [new Paragraph(Number(salary.baseSalary || 0).toLocaleString())], margins: { top: 80, bottom: 80, left: 80 } }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph("Bonuses & Allowances")], margins: { top: 80, bottom: 80, left: 80 } }),
                                        new TableCell({ children: [new Paragraph(Number(salary.bonuses || 0).toLocaleString())], margins: { top: 80, bottom: 80, left: 80 } }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph("Deductions")], margins: { top: 80, bottom: 80, left: 80 } }),
                                        new TableCell({ children: [new Paragraph(`-${Number(salary.deductions || 0).toLocaleString()}`)], margins: { top: 80, bottom: 80, left: 80 } }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Net Disbursed", bold: true })] })], margins: { top: 80, bottom: 80, left: 80 } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${currencySymbol}${Number(salary.netSalary || 0).toLocaleString()}`, bold: true })] })], margins: { top: 80, bottom: 80, left: 80 } }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ text: `Amount in words: ${numberToWords(salary.netSalary || 0)} ${currencyName} Only.`, spacing: { before: 200, after: 300 } }),
                        new Paragraph({ text: `Authorized Signatory — ${company?.authorizedSignatory || companyName}`, alignment: AlignmentType.RIGHT })
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Payslip_${empName}_${monthStr}.docx`);
            toast.success('DOCX payslip downloaded successfully!');
        } catch (err) {
            console.error('DOCX error:', err);
            toast.error('Failed to generate DOCX');
        } finally {
            setDownloadingDocx(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white space-y-4 px-4">
                <LogoLoader className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Loading Official Payslip...</p>
            </div>
        );
    }

    if (error || !salary) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center text-white shadow-2xl">
                    <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight">Statement Unavailable</h2>
                    <p className="text-sm text-zinc-400 mt-2">{error || 'The requested payslip record could not be found.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Top Action Bar */}
                <div className="no-print bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/20">
                            {currencySymbol}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-black text-white tracking-tight">Official Payslip Statement</h1>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Verified
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400">
                                Period: <span className="font-bold text-zinc-200">{salary.month}</span> • Staff: <span className="font-bold text-zinc-200">{employee.name}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        <button
                            onClick={handleCopyLink}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Copy Sharable Link"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>

                        <button
                            onClick={handleShareWhatsApp}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Share via WhatsApp"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                        </button>

                        <button
                            onClick={handleDownloadPDF}
                            disabled={downloadingPdf}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                            title="Download PDF"
                        >
                            {downloadingPdf ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span>PDF</span>
                        </button>

                        <button
                            onClick={handlePrint}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Print Payslip"
                        >
                            <Printer className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Print</span>
                        </button>
                    </div>
                </div>

                {/* Printable Payslip Card */}
                <div 
                    id="public-payslip-canvas" 
                    className="bg-white text-zinc-900 rounded-3xl p-8 sm:p-12 shadow-2xl border border-zinc-200/80 relative overflow-hidden"
                >
                    {/* Watermark */}
                    {company?.logoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                            <img src={company.logoUrl} alt="watermark" className="w-96 h-auto grayscale" />
                        </div>
                    )}

                    {/* Company Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-zinc-200 pb-8 relative z-10">
                        <div>
                            {company?.logoUrl ? (
                                <img src={company.logoUrl} alt={companyName} className="h-12 w-auto mb-2 object-contain" />
                            ) : (
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-black text-sm">
                                        {companyName.charAt(0)}
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight text-zinc-900">{companyName}</h2>
                                </div>
                            )}
                            <p className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">{company?.tagline || 'Enterprise Management Portal'}</p>
                        </div>

                        <div className="text-left sm:text-right text-xs text-zinc-500 space-y-1">
                            <p className="font-extrabold text-zinc-800 text-sm">{companyName}</p>
                            <p>{company?.address || 'Corporate Headquarters'}</p>
                            <p>{company?.city || 'Central City'}, {company?.state || 'State'} {company?.postalCode || ''}</p>
                            <p>{company?.companyEmail || 'support@enterprise.com'} {company?.phoneNumber ? `| ${company.phoneNumber}` : ''}</p>
                            {company?.gstNumber && <p className="font-bold text-zinc-700 mt-1.5">Tax / GSTIN: {company.gstNumber}</p>}
                        </div>
                    </div>

                    {/* Title & Status Strip */}
                    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 my-8 relative z-10">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Monthly Compensation Document</span>
                            <h3 className="text-2xl font-black text-zinc-900 tracking-tight">SALARY STATEMENT</h3>
                            <p className="text-xs text-zinc-600 font-semibold mt-0.5">Pay Period: <span className="font-bold text-zinc-900">{salary.month}</span></p>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1">
                            <span className={clsx(
                                'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border',
                                salary.status === 'paid' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            )}>
                                {salary.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                                {salary.status?.toUpperCase()}
                            </span>
                            {salary.paidAt && (
                                <p className="text-[10px] font-semibold text-zinc-500 mt-1">
                                    Disbursed: {format(new Date(salary.paidAt), 'dd MMM yyyy, hh:mm a')}
                                </p>
                            )}
                            <p className="text-[10px] text-zinc-400">
                                Generated: {format(new Date(salary.createdAt || new Date()), 'dd MMM yyyy, hh:mm a')}
                            </p>
                        </div>
                    </div>

                    {/* Employee & Bank Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 text-xs relative z-10">
                        <div className="bg-zinc-50/70 p-4 rounded-xl border border-zinc-100 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Employee Details</p>
                            <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                <span className="text-zinc-500 font-medium">Name:</span>
                                <span className="font-bold text-zinc-900">{employee?.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                <span className="text-zinc-500 font-medium">Staff ID:</span>
                                <span className="font-bold text-zinc-900">{employee?.employeeId || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                <span className="text-zinc-500 font-medium">Department:</span>
                                <span className="font-bold text-zinc-900">{employee?.department || 'Staff'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500 font-medium">Designation:</span>
                                <span className="font-bold text-zinc-900">{employee?.position || 'Associate'}</span>
                            </div>
                        </div>

                        <div className="bg-zinc-50/70 p-4 rounded-xl border border-zinc-100 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Disbursement & Verification</p>
                            <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                <span className="text-zinc-500 font-medium">Email:</span>
                                <span className="font-bold text-zinc-900">{employee?.email || '—'}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                <span className="text-zinc-500 font-medium">Bank Account:</span>
                                <span className="font-bold text-zinc-900">
                                    {employee?.bankAccount ? `•••• ${String(employee.bankAccount).slice(-4)}` : 'Verified on File'}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                <span className="text-zinc-500 font-medium">Payment Mode:</span>
                                <span className="font-bold text-zinc-900">Direct Deposit / Bank Transfer</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500 font-medium">Verification ID:</span>
                                <span className="font-mono font-bold text-indigo-600 text-[11px]">{salary.id?.slice(0, 12)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Velocity Banner (if available) */}
                    {salary.totalDays > 0 && (
                        <div className="mb-8 p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 relative z-10">
                            <div className="flex items-center justify-between mb-2.5">
                                <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Attendance & Leave Velocity</h4>
                                <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                                    Pro-Rata Cycle
                                </span>
                            </div>
                            <div className="grid grid-cols-5 text-center divide-x divide-indigo-100">
                                <div>
                                    <p className="text-base font-black text-zinc-900">{salary.totalDays}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Working Days</p>
                                </div>
                                <div>
                                    <p className="text-base font-black text-emerald-600">{salary.presentDays || 0}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Present</p>
                                </div>
                                <div>
                                    <p className="text-base font-black text-indigo-600">{salary.paidLeaves || 0}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Paid Leaves</p>
                                </div>
                                <div>
                                    <p className="text-base font-black text-amber-600">{salary.halfDays || 0}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Half Days</p>
                                </div>
                                <div>
                                    <p className="text-base font-black text-rose-600">{salary.absentDays || salary.unpaidLeaves || 0}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Loss Pay / Abs</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Earnings & Deductions Tables */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                        {/* Earnings */}
                        <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
                            <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex justify-between items-center">
                                <span className="text-xs font-black text-zinc-700 uppercase tracking-wider">Earnings</span>
                                <span className="text-[10px] font-bold text-emerald-600">Credits (+)</span>
                            </div>
                            <table className="w-full text-xs">
                                <tbody className="divide-y divide-zinc-100">
                                    <tr>
                                        <td className="px-4 py-3 text-zinc-700">Basic Monthly Pay</td>
                                        <td className="px-4 py-3 text-right font-bold text-zinc-900">{currencySymbol}{Number(salary.baseSalary || 0).toLocaleString()}</td>
                                    </tr>
                                    {Number(salary.bonuses || 0) > 0 && (
                                        <tr>
                                            <td className="px-4 py-3 text-zinc-700">Performance Bonuses & Additions</td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">+{currencySymbol}{Number(salary.bonuses).toLocaleString()}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Deductions */}
                        <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
                            <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex justify-between items-center">
                                <span className="text-xs font-black text-zinc-700 uppercase tracking-wider">Deductions</span>
                                <span className="text-[10px] font-bold text-rose-600">Withholdings (-)</span>
                            </div>
                            <table className="w-full text-xs">
                                <tbody className="divide-y divide-zinc-100">
                                    {Number(salary.deductions || 0) > 0 ? (
                                        <tr>
                                            <td className="px-4 py-3 text-zinc-700">Tax, PT & Unpaid Leave Withholdings</td>
                                            <td className="px-4 py-3 text-right font-bold text-rose-600">-{currencySymbol}{Number(salary.deductions).toLocaleString()}</td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td className="px-4 py-3 text-zinc-400 italic">No deductions applied</td>
                                            <td className="px-4 py-3 text-right font-semibold text-zinc-900">{currencySymbol}0</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Net Payout Banner */}
                    <div className="bg-zinc-900 rounded-2xl p-6 text-white mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 shadow-xl">
                        <div className="space-y-1">
                            <p className="text-xs text-zinc-400 font-medium">Gross Outlay: <span className="font-bold text-white">{currencySymbol}{(Number(salary.baseSalary || 0) + Number(salary.bonuses || 0)).toLocaleString()}</span></p>
                            <p className="text-xs text-zinc-400 font-medium">Total Deductions: <span className="font-bold text-rose-400">-{currencySymbol}{Number(salary.deductions || 0).toLocaleString()}</span></p>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Net Disbursed Compensation</p>
                            <p className="text-3xl font-black text-emerald-400 tracking-tight">{currencySymbol}{Number(salary.netSalary || 0).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Amount in words & Notes */}
                    <div className="mb-10 relative z-10 space-y-3">
                        <p className="text-xs text-zinc-600">
                            <span className="font-extrabold text-zinc-800 uppercase tracking-wider">Amount in Words:</span> {numberToWords(salary.netSalary || 0)} {currencyName} Only.
                        </p>
                        {salary.notes && (
                            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-0.5">Payroll Remarks</p>
                                <p className="text-xs text-amber-900 font-medium">{salary.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between items-end pt-10 border-t border-zinc-200 relative z-10">
                        <div className="text-center w-44">
                            <div className="h-12 border-b border-zinc-300 mb-1.5" />
                            <p className="text-xs font-bold text-zinc-800">Employee Signature</p>
                            <p className="text-[10px] text-zinc-400">Acknowledgment</p>
                        </div>

                        <div className="text-center w-48">
                            {company?.signatureImage ? (
                                <img src={company.signatureImage} alt="Signature" className="h-14 mx-auto object-contain mb-1" />
                            ) : (
                                <div className="h-12 border-b border-zinc-300 mb-1.5 flex items-center justify-center">
                                    <Award className="w-6 h-6 text-indigo-500 opacity-40" />
                                </div>
                            )}
                            <p className="text-xs font-bold text-zinc-900">{company?.authorizedSignatory || 'Authorized Officer'}</p>
                            <p className="text-[10px] text-zinc-400">For {companyName}</p>
                        </div>
                    </div>

                    {/* Document Footnote */}
                    <div className="mt-8 text-[9px] text-center text-zinc-400 uppercase tracking-widest relative z-10 border-t border-zinc-100 pt-4">
                        This is an official system-verified electronic salary document issued by {companyName}.
                    </div>
                </div>
            </div>
        </div>
    );
}
