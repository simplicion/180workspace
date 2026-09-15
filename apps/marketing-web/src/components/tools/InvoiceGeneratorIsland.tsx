import React, { useState, useEffect } from 'react';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

export interface CurrencyItem {
  code: string;
  symbol: string;
  name: string;
}

const THEME_COLORS = [
  { name: 'Emerald', hex: '#059669', bgClass: 'bg-emerald-600', ringClass: 'ring-emerald-500' },
  { name: 'Indigo', hex: '#4f46e5', bgClass: 'bg-indigo-600', ringClass: 'ring-indigo-500' },
  { name: 'Slate', hex: '#334155', bgClass: 'bg-slate-700', ringClass: 'ring-slate-500' },
  { name: 'Violet', hex: '#7c3aed', bgClass: 'bg-violet-600', ringClass: 'ring-violet-500' },
  { name: 'Rose', hex: '#e11d48', bgClass: 'bg-rose-600', ringClass: 'ring-rose-500' },
  { name: 'Amber', hex: '#d97706', bgClass: 'bg-amber-600', ringClass: 'ring-amber-500' },
];

const COMPREHENSIVE_WORLD_CURRENCIES: CurrencyItem[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AED', symbol: 'AED', name: 'United Arab Emirates Dirham' },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese Yuan' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Rial' },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'ZAR', symbol: 'ZAR', name: 'South African Rand' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'EGP', symbol: 'EGP', name: 'Egyptian Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'PKR', symbol: 'PKR', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'NPR', symbol: 'NPR', name: 'Nepalese Rupee' },
  { code: 'LKR', symbol: 'LKR', name: 'Sri Lankan Rupee' },
];

export default function InvoiceGeneratorIsland() {
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0]);
  const [currenciesList, setCurrenciesList] = useState<CurrencyItem[]>(COMPREHENSIVE_WORLD_CURRENCIES);
  const [currency, setCurrency] = useState<CurrencyItem>(COMPREHENSIVE_WORLD_CURRENCIES[0]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    // Graceful fetch from backend API if available
    fetch('/api/public/tools/currencies')
      .then((res) => {
        if (!res.ok) throw new Error('API offline');
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.currencies) && data.currencies.length > 0) {
          setCurrenciesList(data.currencies);
          const matched = data.currencies.find((c: CurrencyItem) => c.code === currency.code);
          if (matched) setCurrency(matched);
        }
      })
      .catch(() => {
        // Silently use built-in comprehensive currency table
      });
  }, []);

  // Invoice Details
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-001');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [poNumber, setPoNumber] = useState('PO-94821');

  // From Details
  const [fromName, setFromName] = useState('Acme Global Innovations Inc.');
  const [fromEmail, setFromEmail] = useState('billing@acme.com');
  const [fromAddress, setFromAddress] = useState('100 Market Street, Suite 400\nSan Francisco, CA 94105');
  const [fromTaxId, setFromTaxId] = useState('US-EIN 12-3456789');

  // Client Details
  const [clientName, setClientName] = useState('John Doe');
  const [clientCompany, setClientCompany] = useState('Apex Digital Corp');
  const [clientEmail, setClientEmail] = useState('john@apexdigital.io');
  const [clientAddress, setClientAddress] = useState('250 Tech Avenue, Floor 12\nAustin, TX 78701');

  // Line Items
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: 'Enterprise SaaS Cloud Architecture & Work Graph Integration', quantity: 1, unitPrice: 4500, taxPercent: 0 },
    { id: '2', description: 'Dedicated Multi-Tenant Database Clustering & Tuning', quantity: 1, unitPrice: 1500, taxPercent: 0 },
    { id: '3', description: 'Custom API Gateway & Webhook Synchronization', quantity: 20, unitPrice: 75, taxPercent: 0 },
  ]);

  const [discountPercent, setDiscountPercent] = useState<number>(5);
  const [shipping, setShipping] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState('Thank you for your business! Payment is due within 14 days.\nPlease transfer to: Chase Bank, Account: 987654321, Routing: 021000021');

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const totalTax = items.reduce((acc, item) => acc + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * ((Number(item.taxPercent) || 0) / 100)), 0);
  const discountAmount = (subtotal * (Number(discountPercent) || 0)) / 100;
  const total = Math.max(0, subtotal + totalTax + (Number(shipping) || 0) - discountAmount);
  const balanceDue = Math.max(0, total - (Number(amountPaid) || 0));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: Math.random().toString(36).substring(7), description: '', quantity: 1, unitPrice: 0, taxPercent: 0 }
    ]);
  };

  const updateItem = (id: string, field: keyof LineItem, val: any) => {
    setItems(items.map((it) => (it.id === id ? { ...it, [field]: val } : it)));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((it) => it.id !== id));
    }
  };

  const loadDemoData = () => {
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setItems([
      { id: '1', description: 'Full-Stack Web & Mobile Application Development', quantity: 1, unitPrice: 3200, taxPercent: 0 },
      { id: '2', description: 'Cloud Infrastructure & High-Availability Server Setup', quantity: 1, unitPrice: 1200, taxPercent: 0 },
      { id: '3', description: 'Monthly Retainer: Technical Maintenance & 24/7 Monitoring', quantity: 1, unitPrice: 800, taxPercent: 0 },
    ]);
    setDiscountPercent(0);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Top Brand Header Banner
      doc.setFillColor(themeColor.hex);
      doc.rect(0, 0, 210, 28, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('INVOICE', 14, 19);

      doc.setFontSize(11);
      doc.text(invoiceNumber || 'INV-001', 196, 19, { align: 'right' });

      // Embed logo if present
      let currentY = 38;
      if (logoUrl) {
        try {
          doc.addImage(logoUrl, 14, 34, 30, 15);
          currentY = 56;
        } catch {
          // Fallback gracefully if logo parsing fails
        }
      }

      // Sender & Client Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('BILLED FROM:', 14, currentY);
      doc.text('BILLED TO:', 110, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      const fromLines = [fromName, fromEmail, ...fromAddress.split('\n'), fromTaxId ? `Tax ID: ${fromTaxId}` : ''].filter(Boolean);
      const toLines = [clientCompany, clientName, clientEmail, ...clientAddress.split('\n')].filter(Boolean);

      doc.text(fromLines, 14, currentY + 5);
      doc.text(toLines, 110, currentY + 5);

      currentY += Math.max(fromLines.length, toLines.length) * 4.5 + 10;

      // Meta Dates Bar
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 182, 11, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);

      doc.text('INVOICE DATE', 18, currentY + 7);
      doc.text('DUE DATE', 80, currentY + 7);
      doc.text('PO NUMBER', 140, currentY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(invoiceDate || 'N/A', 42, currentY + 7);
      doc.text(dueDate || 'N/A', 98, currentY + 7);
      doc.text(poNumber || 'N/A', 162, currentY + 7);

      currentY += 18;

      // Line Items Table Header
      doc.setFillColor(themeColor.hex);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);

      doc.text('Item Description', 18, currentY + 5.5);
      doc.text('Qty', 120, currentY + 5.5, { align: 'right' });
      doc.text('Price', 150, currentY + 5.5, { align: 'right' });
      doc.text('Total', 190, currentY + 5.5, { align: 'right' });

      currentY += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      items.forEach((it) => {
        const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
        const descLines = doc.splitTextToSize(it.description || 'Item Description', 95);

        doc.text(descLines, 18, currentY);
        doc.text(String(it.quantity || 0), 120, currentY, { align: 'right' });
        doc.text(`${currency.symbol}${(Number(it.unitPrice) || 0).toFixed(2)}`, 150, currentY, { align: 'right' });
        doc.text(`${currency.symbol}${lineTotal.toFixed(2)}`, 190, currentY, { align: 'right' });

        currentY += Math.max(descLines.length * 4.5, 6);
        doc.setDrawColor(241, 245, 249);
        doc.line(14, currentY, 196, currentY);
        currentY += 4;
      });

      currentY += 4;

      // Totals Section
      const totalsX = 130;
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);

      doc.text('Subtotal:', totalsX, currentY);
      doc.text(`${currency.symbol}${subtotal.toFixed(2)}`, 190, currentY, { align: 'right' });
      currentY += 5.5;

      if (discountPercent > 0) {
        doc.text(`Discount (${discountPercent}%):`, totalsX, currentY);
        doc.text(`-${currency.symbol}${discountAmount.toFixed(2)}`, 190, currentY, { align: 'right' });
        currentY += 5.5;
      }

      if (totalTax > 0) {
        doc.text('Tax:', totalsX, currentY);
        doc.text(`+${currency.symbol}${totalTax.toFixed(2)}`, 190, currentY, { align: 'right' });
        currentY += 5.5;
      }

      if (shipping > 0) {
        doc.text('Shipping:', totalsX, currentY);
        doc.text(`+${currency.symbol}${shipping.toFixed(2)}`, 190, currentY, { align: 'right' });
        currentY += 5.5;
      }

      doc.setDrawColor(203, 213, 225);
      doc.line(totalsX, currentY, 196, currentY);
      currentY += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Total Due:', totalsX, currentY);
      doc.text(`${currency.symbol}${total.toFixed(2)}`, 190, currentY, { align: 'right' });

      currentY += 14;

      // Notes & Payment Instructions
      if (notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('PAYMENT INSTRUCTIONS & TERMS:', 14, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const splitNotes = doc.splitTextToSize(notes, 180);
        doc.text(splitNotes, 14, currentY + 4.5);
      }

      // Footer Branding
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Created with 180workspace Free Invoice Generator (https://180workspace.com/tools)', 14, 285);

      const safeFilename = (invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`${safeFilename}.pdf`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Invoice PDF generation error:', err);
      alert('Failed to compile invoice PDF. Please check invoice details and try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Top Controls Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Color Palette Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brand Theme:</span>
          <div className="flex items-center gap-2">
            {THEME_COLORS.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setThemeColor(t)}
                className={`w-6 h-6 rounded-full ${t.bgClass} transition-transform cursor-pointer ${
                  themeColor.name === t.name ? 'scale-125 ring-2 ring-offset-2 ' + t.ringClass : 'hover:scale-110 opacity-70'
                }`}
                title={t.name}
              />
            ))}
          </div>
        </div>

        {/* Currency Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Currency:</span>
          <select
            value={currency.code}
            onChange={(e) => {
              const cur = currenciesList.find((c) => c.code === e.target.value);
              if (cur) setCurrency(cur);
            }}
            className="max-w-[260px] px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none truncate cursor-pointer"
          >
            {currenciesList.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadDemoData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <span>✨ Load Sample</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            <span>Print</span>
          </button>

          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {isGeneratingPdf ? (
              <span>Generating PDF...</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Download Invoice PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
            Invoice PDF successfully generated and downloaded!
          </span>
          <button type="button" onClick={() => setDownloadSuccess(false)} className="text-emerald-500 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Invoice Canvas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl space-y-8">
        {/* Header Ribbon */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="relative group w-24 h-16 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 p-1">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="absolute inset-0 bg-black/70 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span>+ Upload Logo</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only hidden" />
                </label>
              )}

              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  INVOICE
                </h2>
                <span className="text-xs font-semibold text-slate-400">Standard Commercial Invoice</span>
              </div>
            </div>
          </div>

          {/* Invoice ID & Dates Meta */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Invoice #</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Billed From / Billed To Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Billed From (Your Details)
            </h4>
            <input
              type="text"
              placeholder="Business / Your Name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold"
            />
            <input
              type="email"
              placeholder="billing@yourcompany.com"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
            />
            <textarea
              placeholder="Address / City / Postal Code"
              rows={2}
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
            />
            <input
              type="text"
              placeholder="Tax ID / VAT Number (Optional)"
              value={fromTaxId}
              onChange={(e) => setFromTaxId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Billed To (Client Details)
            </h4>
            <input
              type="text"
              placeholder="Client Company Name"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold"
            />
            <input
              type="text"
              placeholder="Contact Person Name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium"
            />
            <input
              type="email"
              placeholder="client@company.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
            />
            <textarea
              placeholder="Client Billing Address"
              rows={2}
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>
        </div>

        {/* Dynamic Line Items */}
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2">Item Description</th>
                  <th className="py-3 px-2 w-20 text-right">Qty</th>
                  <th className="py-3 px-2 w-28 text-right">Unit Price</th>
                  <th className="py-3 px-2 w-20 text-right">Tax %</th>
                  <th className="py-3 px-2 w-28 text-right">Line Total</th>
                  <th className="py-3 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it) => {
                  const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  return (
                    <tr key={it.id} className="group">
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={it.description}
                          placeholder="Service or product description..."
                          onChange={(e) => updateItem(it.id, 'description', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => updateItem(it.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-right"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unitPrice}
                            onChange={(e) => updateItem(it.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-right"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={it.taxPercent}
                          onChange={(e) => updateItem(it.id, 'taxPercent', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-right"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs font-bold text-slate-800 dark:text-slate-100">
                        {currency.symbol}{lineTotal.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                          title="Remove Item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
            <span>Add Line Item</span>
          </button>
        </div>

        {/* Calculations & Notes Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Payment Instructions / Terms & Notes
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add bank wire details, PayPal, or payment terms..."
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-normal leading-relaxed"
            />
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-900 dark:text-white">{currency.symbol}{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span>Discount (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="w-14 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-right"
                />
              </span>
              <span className="font-bold text-rose-500">-{currency.symbol}{discountAmount.toFixed(2)}</span>
            </div>

            {totalTax > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Total Tax:</span>
                <span className="font-bold text-slate-900 dark:text-white">+{currency.symbol}{totalTax.toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span>Shipping:</span>
                <input
                  type="number"
                  min="0"
                  value={shipping}
                  onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-right"
                />
              </span>
              <span className="font-bold text-slate-900 dark:text-white">+{currency.symbol}{shipping.toFixed(2)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-base font-black text-slate-900 dark:text-white">
              <span>Total Due:</span>
              <span className="text-xl text-emerald-600 dark:text-emerald-400">{currency.symbol}{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* The 180workspace Funnel CTA */}
      <div className="mt-12 rounded-3xl p-8 bg-gradient-to-r from-emerald-900 to-teal-950 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
              Automate Client Billing & Cash Flow
            </span>
            <h4 className="text-2xl md:text-3xl font-black">
              Never Chase an Unpaid Invoice Again
            </h4>
            <p className="text-sm text-emerald-200 max-w-xl">
              180workspace Finance automates recurring billing, sends automated payment reminders, tracks vendor expenses, and generates real-time P&L reports.
            </p>
          </div>
          <a
            href="https://app.180workspace.com/signup"
            className="px-8 py-4 rounded-full bg-white text-emerald-950 font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shrink-0"
          >
            Try 180workspace Finance →
          </a>
        </div>
      </div>
    </div>
  );
}
