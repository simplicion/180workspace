'use client';

import { CheckCircle, Clock, X, FileText, Printer } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useSettings } from '@/lib/settings-context';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';

function numberToWords(num: number) {
    if (num === 0) return 'Zero';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const regex = /^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/;
    const n = ('000000000' + num).substr(-9).match(regex);
    if (!n) return '';
    let str = '';
    str += (n[1] !== '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
    str += (n[2] !== '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
    str += (n[3] !== '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
    str += (n[4] !== '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
    str += (n[5] !== '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
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
    const brandColor = company?.brandColor || '#cf1d29';
    const currencySymbol = company?.currencySymbol || '$';
    const currencyName = company?.currency || 'Currency';

    const handlePrint = () => {
        const printContent = document.getElementById('payslip-content');
        if (!printContent) return;

        const originalContent = document.body.innerHTML;
        const printStyles = `
            <style>
                @media print {
                    body { margin: 0; padding: 20px; font-family: sans-serif; background: #fff !important; }
                    .no-print { display: none !important; }
                    .print-shadow { box-shadow: none !important; border: 1px solid #ccc !important; }
                    #payslip-content { width: 100% !important; max-width: none !important; }
                }
            </style>
        `;

        document.body.innerHTML = printStyles + printContent.outerHTML;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    };

    const handleDownloadPDF = async () => {
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const printContent = document.getElementById('payslip-content');
            if (!printContent) return;

            const origBorder = printContent.style.border;
            const origShadow = printContent.style.boxShadow;
            printContent.style.border = 'none';
            printContent.style.boxShadow = 'none';

            const canvas = await html2canvas(printContent, { scale: 2, useCORS: true });

            printContent.style.border = origBorder;
            printContent.style.boxShadow = origShadow;

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Payslip_${salary.employeeId?.name || 'Employee'}_${salary.month}.pdf`);
            toast.success('PDF generated successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate PDF');
        }
    };

    const handleDownloadDOCX = async () => {
        try {
            const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } = await import('docx');
            const { saveAs } = await import('file-saver');

            const empName = salary.employeeId?.name || 'Employee';
            const monthStr = format(new Date(salary.month), 'MMMM yyyy');
            const companyName = company?.companyName || platform?.platformName || 'Management System';

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
                            text: `Payslip for ${monthStr}`,
                            heading: HeadingLevel.HEADING_2,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),
                        new Paragraph({
                            children: [new TextRun({ text: "Employee Details", bold: true, size: 24 })],
                            spacing: { after: 200 }
                        }),
                        new Paragraph({ text: `Name: ${empName}` }),
                        new Paragraph({ text: `ID/Department: ${salary.employeeId?.employeeId || 'N/A'} | ${salary.employeeId?.department || 'N/A'}` }),
                        new Paragraph({ text: `Designation: ${salary.employeeId?.position || 'N/A'}` }),
                        new Paragraph({ text: `Status: ${salary.status?.toUpperCase()}`, spacing: { after: 400 } }),

                        new Paragraph({
                            children: [new TextRun({ text: "Salary Details", bold: true, size: 24 })],
                            spacing: { after: 200 }
                        }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })], margins: { top: 100, bottom: 100, left: 100 } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Amount (${currencySymbol})`, bold: true })] })], margins: { top: 100, bottom: 100, left: 100 } }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph("Base Salary")], margins: { top: 100, bottom: 100, left: 100 } }),
                                        new TableCell({ children: [new Paragraph(salary.baseSalary?.toString() || '0')], margins: { top: 100, bottom: 100, left: 100 } }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph("Allowances & Bonuses")], margins: { top: 100, bottom: 100, left: 100 } }),
                                        new TableCell({ children: [new Paragraph(((salary.allowances || 0) + (salary.bonuses || 0)).toString())], margins: { top: 100, bottom: 100, left: 100 } }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph("Deductions")], margins: { top: 100, bottom: 100, left: 100 } }),
                                        new TableCell({ children: [new Paragraph(`-${salary.deductions || 0}`)], margins: { top: 100, bottom: 100, left: 100 } }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Net Payable", bold: true })] })], margins: { top: 100, bottom: 100, left: 100 } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: salary.netSalary?.toString() || '0', bold: true })] })], margins: { top: 100, bottom: 100, left: 100 } }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ text: `Net Payable (in words): ${numberToWords(salary.netSalary || 0)} ${currencyName} Only.`, spacing: { before: 200, after: 400 } }),
                        new Paragraph({ text: company?.authorizedSignatory ? `Authorized Signatory: ${company.authorizedSignatory}` : "Authorized Signatory", alignment: AlignmentType.RIGHT })
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Payslip_${empName}_${salary.month}.docx`);
            toast.success('DOCX generated successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate DOCX');
        }
    };

    if (!salary) return null;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Payslip Document"
            description="View and print employee payslip"
            icon={<FileText className="w-5 h-5 text-indigo-600" />}
            size="lg"
        >
            <div className="flex flex-col h-full bg-gray-50/50">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">
                        Payslip — {format(new Date(salary.month), 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <button className="btn-secondary text-xs flex items-center gap-1.5 bg-white"><FileText className="w-3.5 h-3.5" />Download</button>
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col overflow-hidden">
                                <button onClick={handleDownloadPDF} className="text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">As PDF</button>
                                <button onClick={handleDownloadDOCX} className="text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 border-t border-gray-50">As DOCX</button>
                            </div>
                        </div>
                        <button onClick={handlePrint} className="btn-secondary text-xs flex items-center gap-1.5 bg-white"><Printer className="w-3.5 h-3.5" />Print</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-3xl mx-auto overflow-hidden">
                        {/* Printable Payslip Body */}
                        <div id="payslip-content" className="p-8 md:p-12 relative">
                            {company?.companyLogo && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                    <img src={company.companyLogo} alt="watermark" className="w-96 h-auto grayscale" />
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div>
                                    {company?.companyLogo ? (
                                        <img src={company.companyLogo} alt={company.companyName} className="h-14 w-auto mb-3" />
                                    ) : (
                                        <>
                                            <h1 className="company-title text-3xl font-black tracking-tighter mb-1">{company?.companyName || platform?.platformName || 'Management System'}</h1>
                                            <style jsx>{` .company-title { color: ${brandColor}; } `}</style>
                                        </>
                                    )}
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{company?.tagline || 'Precision in Management'}</p>
                                </div>
                                <div className="text-right text-xs text-gray-500 space-y-1">
                                    <p className="font-extrabold text-gray-800 text-sm">{company?.companyName || 'Company'}</p>
                                    <p>{company?.address || '123 Business Avenue'}</p>
                                    <p>{company?.city || 'New Delhi'}, {company?.state || 'DL'} {company?.postalCode || '110001'}</p>
                                    <p>{company?.companyEmail || 'support@company.com'} | {company?.phoneNumber || '+91 00000 00000'}</p>
                                    {company?.gstNumber && <p className="font-bold text-gray-600 mt-2">GSTIN: {company.gstNumber}</p>}
                                </div>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 flex justify-between items-center mb-10 relative z-10">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Payslip</h2>
                                    <p className="text-sm text-gray-500 mt-1">For the month of <span className="font-bold text-gray-800">{format(new Date(salary.month), 'MMMM yyyy')}</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Status</p>
                                    <div className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
                                        salary.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                                    )}>
                                        {salary.status === 'paid' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                        {salary.status?.toUpperCase()}
                                    </div>
                                    {salary.paidAt && <p className="text-[10px] text-gray-400 mt-1.5">Paid: {format(new Date(salary.paidAt), 'dd MMM yyyy')}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-10 text-sm relative z-10">
                                <div className="flex border-b border-gray-100 pb-2">
                                    <span className="w-32 text-gray-500 font-medium">Employee Name:</span>
                                    <span className="font-bold text-gray-900">{salary.employeeId?.name}</span>
                                </div>
                                <div className="flex border-b border-gray-100 pb-2">
                                    <span className="w-32 text-gray-500 font-medium">Employee ID:</span>
                                    <span className="font-bold text-gray-900">{salary.employeeId?.employeeId || '—'}</span>
                                </div>
                                <div className="flex border-b border-gray-100 pb-2">
                                    <span className="w-32 text-gray-500 font-medium">Department:</span>
                                    <span className="font-bold text-gray-900">{salary.employeeId?.department || '—'}</span>
                                </div>
                                <div className="flex border-b border-gray-100 pb-2">
                                    <span className="w-32 text-gray-500 font-medium">Designation:</span>
                                    <span className="font-bold text-gray-900">{salary.employeeId?.position || '—'}</span>
                                </div>
                            </div>

                            {salary.totalDays > 0 && (
                                <div className="mb-10 p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 relative z-10">
                                    <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-3">Attendance & Leave Summary</h3>
                                    <div className="grid grid-cols-5 gap-4 text-center">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{salary.totalDays}</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Working Days</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-emerald-600">{salary.presentDays}</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Present</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-indigo-600">{salary.paidLeaves}</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Paid Leaves</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-orange-600">{salary.halfDays}</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Half Days</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-red-600">{salary.absentDays + (salary.unpaidLeaves || 0)}</p>
                                            <p className="text-[9px] text-gray-500 uppercase">Unpaid/Abs</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6 mb-8 relative z-10">
                                <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest">Earnings</h3>
                                    </div>
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-gray-100">
                                            <tr>
                                                <td className="px-4 py-3 text-gray-700">Basic Salary</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">{currencySymbol}{salary.baseSalary?.toLocaleString('en-IN') || 0}</td>
                                            </tr>
                                            {salary.allowances > 0 && (
                                                <tr>
                                                    <td className="px-4 py-3 text-gray-700">Allowances</td>
                                                    <td className="px-4 py-3 text-right font-medium text-emerald-600">{currencySymbol}{salary.allowances.toLocaleString('en-IN')}</td>
                                                </tr>
                                            )}
                                            {salary.bonuses > 0 && (
                                                <tr>
                                                    <td className="px-4 py-3 text-gray-700">Bonuses</td>
                                                    <td className="px-4 py-3 text-right font-medium text-emerald-600">{currencySymbol}{salary.bonuses.toLocaleString('en-IN')}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest">Deductions</h3>
                                    </div>
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-gray-100">
                                            {salary.deductions > 0 ? (
                                                <tr>
                                                    <td className="px-4 py-3 text-gray-700">Tax & Deductions</td>
                                                    <td className="px-4 py-3 text-right font-medium text-red-600">{currencySymbol}{salary.deductions.toLocaleString('en-IN')}</td>
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <td className="px-4 py-3 text-gray-400 italic">No deductions</td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-900">{currencySymbol}0</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-gray-900 rounded-lg p-6 text-white mb-6 flex justify-between items-center relative z-10 shadow-lg">
                                <div className="space-y-1">
                                    <p className="text-gray-400 text-sm">Gross Earnings: <span className="font-medium text-white">{currencySymbol}{((salary.baseSalary || 0) + (salary.allowances || 0) + (salary.bonuses || 0)).toLocaleString('en-IN')}</span></p>
                                    <p className="text-gray-400 text-sm">Total Deductions: <span className="font-medium text-white">{currencySymbol}{(salary.deductions || 0).toLocaleString('en-IN')}</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Net Payable</p>
                                    <p className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: brandColor }}>{currencySymbol}{salary.netSalary?.toLocaleString('en-IN') || 0}</p>
                                </div>
                            </div>

                            <div className="mb-12 relative z-10">
                                <p className="text-xs text-gray-500">
                                    <span className="font-bold text-gray-700 uppercase tracking-widest">Amount in words:</span> {numberToWords(salary.netSalary || 0)} {currencyName} Only.
                                </p>
                                {salary.notes && (
                                    <div className="mt-4 p-4 bg-yellow-50/50 border border-yellow-100 rounded-lg">
                                        <p className="text-[10px] font-bold text-yellow-800 uppercase tracking-widest mb-1">Remarks</p>
                                        <p className="text-xs text-yellow-900">{salary.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end pt-8 border-t border-gray-200 relative z-10">
                                <div className="text-center w-48">
                                    <div className="h-12 border-b border-gray-300 mb-2" />
                                    <p className="text-xs font-bold text-gray-800">Employee Signature</p>
                                    <p className="text-[10px] text-gray-400 uppercase mt-0.5">Date: ____________</p>
                                </div>
                                <div className="text-center w-48">
                                    {company?.signatureImage ? (
                                        <img src={company.signatureImage} alt="Signature" className="h-16 mx-auto mix-multiply object-contain mb-1" />
                                    ) : (
                                        <div className="h-12 border-b border-gray-300 mb-1" />
                                    )}
                                    <p className="text-xs font-bold text-gray-800">{company?.authorizedSignatory || 'Authorized Signatory'}</p>
                                    <p className="text-[10px] text-gray-400 uppercase mt-0.5">For {company?.companyName || 'Company'}</p>
                                </div>
                            </div>

                            <div className="mt-8 text-[9px] text-center text-gray-400 uppercase tracking-widest relative z-10">
                                This is a computer generated document and does not require a physical signature unless specified otherwise.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Drawer>
    );
}
