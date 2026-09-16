'use client';

import { 
    CheckCircle2, Clock, X, FileText, Printer, Mail, 
    Share2, Copy, Check, Download, ShieldCheck, 
    Building2, Award, ArrowUpRight, Send
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useSettings } from '@/lib/settings-context';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import { useState } from 'react';
import api from '@/lib/api';
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

export default function PayslipDrawer({ 
    open, 
    salary, 
    onClose 
}: { 
    open: boolean;
    salary: any; 
    onClose: () => void; 
}) {
    const { company, platform } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    const currencyName = company?.currency || 'USD';
    const companyName = company?.companyName || platform?.platformName || 'Enterprise Management';

    const [sendingEmail, setSendingEmail] = useState(false);
    const [copied, setCopied] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [downloadingDocx, setDownloadingDocx] = useState(false);

    if (!salary) return null;

    const employee = salary.employee || salary.employeeId || {};
    const empEmail = employee?.email;
    const empName = employee?.name || 'Employee';
    const monthText = salary.month || '';

    const getPayslipUrl = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/payslip/${salary.id}`;
        }
        return `/payslip/${salary.id}`;
    };

    const handleSendEmail = async () => {
        if (!empEmail) {
            toast.error('No email address configured for this employee. Use Copy Link or WhatsApp to share.');
            return;
        }

        setSendingEmail(true);
        try {
            const { data } = await api.post(`/api/salary/${salary.id}/send-email`);
            toast.success(data?.message || `Payslip successfully emailed to ${empEmail}!`, { duration: 4000 });
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to dispatch payslip email');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleCopyLink = () => {
        const url = getPayslipUrl();
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Sharable payslip link copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleShareWhatsApp = () => {
        const url = getPayslipUrl();
        const netAmt = `${currencySymbol}${Number(salary.netSalary || 0).toLocaleString()}`;
        const msg = encodeURIComponent(`📄 *Official Payslip Document*\nStaff: ${empName}\nMonth: ${monthText}\nNet Payout: ${netAmt}\n\nAccess your official payslip here:\n${url}`);
        window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
    };

    const handlePrint = () => {
        const printContent = document.getElementById('payslip-content');
        if (!printContent) return;

        const originalContent = document.body.innerHTML;
        const printStyles = `
            <style>
                @media print {
                    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff !important; }
                    .no-print { display: none !important; }
                    #payslip-content { width: 100% !important; max-width: none !important; box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
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

            const printContent = document.getElementById('payslip-content');
            if (!printContent) return;

            const origBorder = printContent.style.border;
            const origShadow = printContent.style.boxShadow;
            printContent.style.border = 'none';
            printContent.style.boxShadow = 'none';

            const canvas = await html2canvas(printContent, { scale: 2.5, useCORS: true });

            printContent.style.border = origBorder;
            printContent.style.boxShadow = origShadow;

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Payslip_${empName}_${salary.month}.pdf`);
            toast.success('Official PDF generated and downloaded!');
        } catch (err) {
            console.error(err);
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
                            text: `OFFICIAL PAYSLIP — ${monthText}`,
                            heading: HeadingLevel.HEADING_2,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 }
                        }),
                        new Paragraph({ text: `Employee Name: ${empName}` }),
                        new Paragraph({ text: `Staff ID: ${employee?.employeeId || 'N/A'}` }),
                        new Paragraph({ text: `Department: ${employee?.department || 'Staff'}` }),
                        new Paragraph({ text: `Designation: ${employee?.position || 'Associate'}` }),
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
            saveAs(blob, `Payslip_${empName}_${monthText}.docx`);
            toast.success('DOCX generated successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate DOCX');
        } finally {
            setDownloadingDocx(false);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Enterprise Payslip Document"
            description="Official salary statement with direct delivery & sharable online access"
            icon={<FileText className="w-5 h-5 text-indigo-600" />}
            size="lg"
        >
            <div className="flex flex-col h-full bg-zinc-100/50">
                {/* Control Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-zinc-200 bg-white sticky top-0 z-20 shrink-0 shadow-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                            {monthText}
                        </span>
                        <span className={clsx(
                            'px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1',
                            salary.status === 'paid' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                            {salary.status === 'paid' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                            {salary.status?.toUpperCase()}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Send Email Action */}
                        <button
                            onClick={handleSendEmail}
                            disabled={sendingEmail}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title={empEmail ? `Send Payslip to ${empEmail}` : 'No email configured'}
                        >
                            {sendingEmail ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                            <span>{sendingEmail ? 'Sending...' : 'Email Payslip'}</span>
                        </button>

                        {/* Copy Sharable Link Action */}
                        <button
                            onClick={handleCopyLink}
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Copy Sharable Link"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>

                        {/* WhatsApp Share */}
                        <button
                            onClick={handleShareWhatsApp}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Share on WhatsApp"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                        </button>

                        {/* Download Dropdown */}
                        <div className="relative group">
                            <button className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs">
                                <Download className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Export</span>
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-zinc-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col overflow-hidden z-30">
                                <button 
                                    onClick={handleDownloadPDF} 
                                    disabled={downloadingPdf}
                                    className="text-left px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center justify-between cursor-pointer"
                                >
                                    <span>As PDF</span>
                                    {downloadingPdf && <LogoLoader className="w-3 h-3 animate-spin" />}
                                </button>
                                <button 
                                    onClick={handleDownloadDOCX} 
                                    disabled={downloadingDocx}
                                    className="text-left px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 border-t border-zinc-100 flex items-center justify-between cursor-pointer"
                                >
                                    <span>As DOCX</span>
                                    {downloadingDocx && <LogoLoader className="w-3 h-3 animate-spin" />}
                                </button>
                            </div>
                        </div>

                        {/* Print */}
                        <button 
                            onClick={handlePrint} 
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Print Payslip"
                        >
                            <Printer className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Print</span>
                        </button>
                    </div>
                </div>

                {/* Payslip Document Canvas */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 max-w-3xl mx-auto overflow-hidden">
                        <div id="payslip-content" className="p-8 md:p-12 relative bg-white">
                            {/* Watermark */}
                            {((company as any)?.logoUrl || (company as any)?.logo) && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                    <img src={(company as any)?.logoUrl || (company as any)?.logo} alt="watermark" className="w-96 h-auto grayscale" />
                                </div>
                            )}

                            {/* Company Header */}
                            <div className="flex justify-between items-start mb-8 border-b border-zinc-200 pb-6 relative z-10">
                                <div>
                                    {((company as any)?.logoUrl || (company as any)?.logo) ? (
                                        <img src={(company as any)?.logoUrl || (company as any)?.logo} alt={companyName} className="h-12 w-auto mb-2 object-contain" />
                                    ) : (
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-black text-xs">
                                                {companyName.charAt(0)}
                                            </div>
                                            <h1 className="text-2xl font-black tracking-tight text-zinc-900">{companyName}</h1>
                                        </div>
                                    )}
                                    <p className="text-xs text-zinc-400 font-extrabold uppercase tracking-widest">{company?.tagline || 'Enterprise Workplace Portal'}</p>
                                </div>

                                <div className="text-right text-xs text-zinc-500 space-y-1">
                                    <p className="font-extrabold text-zinc-800 text-sm">{companyName}</p>
                                    <p>{company?.address || 'Corporate Headquarters'}</p>
                                    <p>{company?.city || 'Delhi'}, {company?.state || 'DL'} {company?.postalCode || ''}</p>
                                    <p>{company?.companyEmail || 'finance@enterprise.com'} {company?.phoneNumber ? `| ${company.phoneNumber}` : ''}</p>
                                    {company?.gstNumber && <p className="font-bold text-zinc-700 mt-1">Tax / GSTIN: {company.gstNumber}</p>}
                                </div>
                            </div>

                            {/* Payslip Header & Timestamps */}
                            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex justify-between items-center mb-8 relative z-10">
                                <div>
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Monthly Payroll Document</span>
                                    <h2 className="text-2xl font-black text-zinc-900 tracking-tight">SALARY STATEMENT</h2>
                                    <p className="text-xs text-zinc-600 font-semibold mt-0.5">Pay Period: <strong className="text-zinc-900">{monthText}</strong></p>
                                </div>

                                <div className="text-right space-y-1">
                                    <span className={clsx(
                                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
                                        salary.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                    )}>
                                        {salary.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                                        {salary.status?.toUpperCase()}
                                    </span>
                                    {salary.paidAt && (
                                        <p className="text-[10px] font-semibold text-zinc-500">
                                            Disbursed: {format(new Date(salary.paidAt), 'dd MMM yyyy, hh:mm a')}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-zinc-400">
                                        Generated: {format(new Date(salary.createdAt || new Date()), 'dd MMM yyyy, hh:mm a')}
                                    </p>
                                </div>
                            </div>

                            {/* Employee Details Grid */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8 text-xs relative z-10 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
                                <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                    <span className="text-zinc-500 font-medium">Employee Name:</span>
                                    <span className="font-bold text-zinc-900">{empName}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                    <span className="text-zinc-500 font-medium">Staff ID:</span>
                                    <span className="font-bold text-zinc-900">{employee?.employeeId || '—'}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                    <span className="text-zinc-500 font-medium">Department:</span>
                                    <span className="font-bold text-zinc-900">{employee?.department || 'Staff'}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                                    <span className="text-zinc-500 font-medium">Designation:</span>
                                    <span className="font-bold text-zinc-900">{employee?.position || 'Associate'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 font-medium">Staff Email:</span>
                                    <span className="font-bold text-zinc-900">{empEmail || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 font-medium">Bank Account:</span>
                                    <span className="font-bold text-zinc-900">
                                        {employee?.bankAccount ? `•••• ${String(employee.bankAccount).slice(-4)}` : 'On File'}
                                    </span>
                                </div>
                            </div>

                            {/* Attendance Velocity Summary */}
                            {salary.totalDays > 0 && (
                                <div className="mb-8 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 relative z-10">
                                    <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-2.5">Attendance & Leave Summary</h3>
                                    <div className="grid grid-cols-5 text-center divide-x divide-indigo-100 text-xs">
                                        <div>
                                            <p className="text-base font-black text-zinc-900">{salary.totalDays}</p>
                                            <p className="text-[8px] font-bold text-zinc-400 uppercase">Working Days</p>
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-emerald-600">{salary.presentDays || 0}</p>
                                            <p className="text-[8px] font-bold text-zinc-400 uppercase">Present</p>
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-indigo-600">{salary.paidLeaves || 0}</p>
                                            <p className="text-[8px] font-bold text-zinc-400 uppercase">Paid Leaves</p>
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-amber-600">{salary.halfDays || 0}</p>
                                            <p className="text-[8px] font-bold text-zinc-400 uppercase">Half Days</p>
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-rose-600">{salary.absentDays || salary.unpaidLeaves || 0}</p>
                                            <p className="text-[8px] font-bold text-zinc-400 uppercase">Loss Pay / Abs</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Earnings & Deductions Tables */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                                <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                                    <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200">
                                        <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Earnings</h3>
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody className="divide-y divide-zinc-100">
                                            <tr>
                                                <td className="px-4 py-2.5 text-zinc-700">Basic Monthly Salary</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-zinc-900">{currencySymbol}{Number(salary.baseSalary || 0).toLocaleString()}</td>
                                            </tr>
                                            {Number(salary.bonuses || 0) > 0 && (
                                                <tr>
                                                    <td className="px-4 py-2.5 text-zinc-700">Bonuses & Additions</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600">+{currencySymbol}{Number(salary.bonuses).toLocaleString()}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                                    <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200">
                                        <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Deductions</h3>
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody className="divide-y divide-zinc-100">
                                            {Number(salary.deductions || 0) > 0 ? (
                                                <tr>
                                                    <td className="px-4 py-2.5 text-zinc-700">Tax & PT Deductions</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-rose-600">-{currencySymbol}{Number(salary.deductions).toLocaleString()}</td>
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <td className="px-4 py-2.5 text-zinc-400 italic">No deductions applied</td>
                                                    <td className="px-4 py-2.5 text-right font-semibold text-zinc-900">{currencySymbol}0</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Net Payable Highlight */}
                            <div className="bg-zinc-900 rounded-xl p-5 text-white mb-6 flex justify-between items-center relative z-10 shadow-lg">
                                <div className="space-y-0.5">
                                    <p className="text-zinc-400 text-xs">Gross Earnings: <span className="font-bold text-white">{currencySymbol}{(Number(salary.baseSalary || 0) + Number(salary.bonuses || 0)).toLocaleString()}</span></p>
                                    <p className="text-zinc-400 text-xs">Total Deductions: <span className="font-bold text-rose-400">-{currencySymbol}{Number(salary.deductions || 0).toLocaleString()}</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Net Disbursed Payout</p>
                                    <p className="text-2xl font-black text-emerald-400 tracking-tight">{currencySymbol}{Number(salary.netSalary || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Amount in words & Notes */}
                            <div className="mb-10 relative z-10 space-y-2">
                                <p className="text-xs text-zinc-600">
                                    <span className="font-extrabold text-zinc-800 uppercase tracking-wider">Amount in words:</span> {numberToWords(salary.netSalary || 0)} {currencyName} Only.
                                </p>
                                {salary.notes && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                                        <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Remarks:</span>
                                        {salary.notes}
                                    </div>
                                )}
                            </div>

                            {/* Signatures */}
                            <div className="flex justify-between items-end pt-8 border-t border-zinc-200 relative z-10">
                                <div className="text-center w-44">
                                    <div className="h-12 border-b border-zinc-300 mb-1" />
                                    <p className="text-xs font-bold text-zinc-800">Employee Signature</p>
                                    <p className="text-[10px] text-zinc-400">Date: ____________</p>
                                </div>
                                <div className="text-center w-44">
                                    {company?.signatureImage ? (
                                        <img src={company.signatureImage} alt="Signature" className="h-14 mx-auto object-contain mb-1" />
                                    ) : (
                                        <div className="h-12 border-b border-zinc-300 mb-1 flex items-center justify-center">
                                            <Award className="w-5 h-5 text-indigo-400 opacity-50" />
                                        </div>
                                    )}
                                    <p className="text-xs font-bold text-zinc-900">{company?.authorizedSignatory || 'Authorized Officer'}</p>
                                    <p className="text-[10px] text-zinc-400">For {companyName}</p>
                                </div>
                            </div>

                            {/* Document Footer */}
                            <div className="mt-8 text-[9px] text-center text-zinc-400 uppercase tracking-widest relative z-10 border-t border-zinc-100 pt-3">
                                This is a computer-verified electronic document issued by {companyName}.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Drawer>
    );
}

