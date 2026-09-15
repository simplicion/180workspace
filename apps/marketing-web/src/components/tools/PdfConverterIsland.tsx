import React, { useState, useRef, useEffect } from 'react';

interface UploadedImage {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
}

const SAMPLE_TEMPLATES = [
  {
    name: 'Executive Spec',
    title: 'Project Specification & System Architecture',
    author: 'Principal Solutions Architect',
    body: `## 1. Executive Summary
This document specifies the technical architecture, security guarantees, and multi-region deployment topology for 180workspace Enterprise Cloud.

## 2. Key Architecture Pillars
- Zero-Trust Security with Hardware Key Authentication
- Autonomous Work Graph with 12ms cross-app state synchronization
- Edge-native multi-tenant database partitioning
- Offline-first client resilience with background reconciliation

## 3. Compliance & Governance
- SOC2 Type II Certified with continuous immutable auditing
- GDPR & HIPAA compliant data segregation
- Sub-millisecond DDoS mitigation and automated failover`
  },
  {
    name: 'Service Agreement',
    title: 'Professional Master Services Agreement (MSA)',
    author: 'Legal & Procurement Operations',
    body: `## 1. Scope of Work
The Provider agrees to furnish high-availability enterprise infrastructure and consulting services as defined in Schedule A.

## 2. Service Level Agreement (SLA)
- Uptime Guarantee: 99.99% monthly availability
- Incident Response Time: Under 15 minutes for Critical P0 tickets
- 24/7 dedicated Technical Account Manager (TAM) support

## 3. Confidentiality & Intellectual Property
All proprietary algorithms, client data graphs, and internal telemetry remain the sole exclusive property of the Client.`
  },
  {
    name: 'Meeting Minutes',
    title: 'Quarterly Strategic Growth & Engineering Sync',
    author: 'VP of Product Engineering',
    body: `## 1. Key Decisions Made
- Prioritize high-performance unauthenticated organic SEO tools suite.
- Expand multi-currency billing integration to support 160+ world currencies.
- Roll out real-time collaboration canvas for document e-signatures.

## 2. Action Items
- Complete edge caching verification on Cloudflare Workers.
- Finalize automated end-to-end regression test suites.
- Review SOC2 audit logs for quarterly compliance certification.`
  }
];

export default function PdfConverterIsland() {
  const [activeTab, setActiveTab] = useState<'images' | 'text'>('images');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Images state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'p' | 'l'>('p');
  const [margin, setMargin] = useState<number>(10);
  const [pdfFilename, setPdfFilename] = useState('converted-document.pdf');
  const [isConverting, setIsConverting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Text state
  const [docTitle, setDocTitle] = useState(SAMPLE_TEMPLATES[0].title);
  const [docAuthor, setDocAuthor] = useState(SAMPLE_TEMPLATES[0].author);
  const [docBody, setDocBody] = useState(SAMPLE_TEMPLATES[0].body);
  const [isTextConverting, setIsTextConverting] = useState(false);
  const [textDownloadSuccess, setTextDownloadSuccess] = useState(false);

  // Listen to paste events for instant screenshot conversion
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        processFiles(pastedFiles);
        setActiveTab('images');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFiles = (files: File[]) => {
    if (!files || files.length === 0) return;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const sizeKb = Math.round(file.size / 1024);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setImages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(7),
              name: file.name,
              dataUrl,
              width: img.width,
              height: img.height,
              sizeKb,
            }
          ]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    // Reset file input value so re-uploading the same file works
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const loadSampleImages = () => {
    // Generate 2 beautiful SVG-to-Canvas sample slides
    const createSampleCanvas = (title: string, subtitle: string, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 1200, 800);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 800);

      // Card overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.roundRect(80, 80, 1040, 640, 24);
      ctx.fill();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(title, 120, 200);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '24px sans-serif';
      ctx.fillText(subtitle, 120, 270);

      ctx.font = '18px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('• 100% In-Browser High Precision Rendering', 120, 360);
      ctx.fillText('• Multi-Page Layout & Margin Customization', 120, 410);
      ctx.fillText('• Export to High-Resolution Vector PDF', 120, 460);

      ctx.font = '14px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('180workspace Document Engine • Sample Test Page', 120, 650);

      return canvas.toDataURL('image/jpeg', 0.92);
    };

    const img1 = createSampleCanvas('180workspace Enterprise Overview', 'Modern All-in-One Cloud Operations Platform', '#312e81');
    const img2 = createSampleCanvas('System Architecture & Work Graph', 'Sub-millisecond Event Synchronization at Global Edge', '#065f46');

    setImages([
      {
        id: 'sample-1',
        name: 'Enterprise-Overview-Slide1.jpg',
        dataUrl: img1,
        width: 1200,
        height: 800,
        sizeKb: 145,
      },
      {
        id: 'sample-2',
        name: 'WorkGraph-Architecture-Slide2.jpg',
        dataUrl: img2,
        width: 1200,
        height: 800,
        sizeKb: 160,
      }
    ]);
  };

  const removeImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newImages.length) return;
    const temp = newImages[index];
    newImages[index] = newImages[targetIdx];
    newImages[targetIdx] = temp;
    setImages(newImages);
  };

  const handleConvertImagesToPdf = async () => {
    if (images.length === 0) return;
    setIsConverting(true);
    setDownloadSuccess(false);

    try {
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: pageSize,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      images.forEach((img, index) => {
        if (index > 0) doc.addPage();

        const usableWidth = Math.max(10, pageWidth - margin * 2);
        const usableHeight = Math.max(10, pageHeight - margin * 2);

        const imgRatio = img.width / (img.height || 1);
        const pageRatio = usableWidth / usableHeight;

        let renderWidth = usableWidth;
        let renderHeight = usableHeight;

        if (imgRatio > pageRatio) {
          renderHeight = usableWidth / imgRatio;
        } else {
          renderWidth = usableHeight * imgRatio;
        }

        const xPos = margin + (usableWidth - renderWidth) / 2;
        const yPos = margin + (usableHeight - renderHeight) / 2;

        const format = img.dataUrl.includes('image/png') ? 'PNG' : img.dataUrl.includes('image/webp') ? 'WEBP' : 'JPEG';
        doc.addImage(img.dataUrl, format, xPos, yPos, renderWidth, renderHeight);
      });

      const cleanFilename = pdfFilename.trim() ? (pdfFilename.endsWith('.pdf') ? pdfFilename : `${pdfFilename}.pdf`) : 'converted-document.pdf';
      doc.save(cleanFilename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('PDF conversion error:', err);
      alert('Error generating PDF. Please check your uploaded images and try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertTextToPdf = async () => {
    setIsTextConverting(true);
    setTextDownloadSuccess(false);

    try {
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 20;

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(docTitle || 'Untitled Document', 14, y);
      y += 8;

      // Subtitle / Author
      if (docAuthor) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Author: ${docAuthor} | Date: ${new Date().toLocaleDateString()}`, 14, y);
        y += 6;
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      // Body Lines
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      const lines = docBody.split('\n');
      lines.forEach((line) => {
        if (line.startsWith('## ')) {
          y += 4;
          if (y > pageHeight - 25) {
            doc.addPage();
            y = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(15, 23, 42);
          doc.text(line.replace('## ', ''), 14, y);
          y += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(51, 65, 85);
        } else if (line.startsWith('- ')) {
          const splitText = doc.splitTextToSize(line, pageWidth - 32);
          if (y + splitText.length * 5 > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(splitText, 18, y);
          y += splitText.length * 5 + 1;
        } else if (line.trim() === '') {
          y += 3;
        } else {
          const splitText = doc.splitTextToSize(line, pageWidth - 28);
          if (y + splitText.length * 5 > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(splitText, 14, y);
          y += splitText.length * 5 + 2;
        }
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text('Compiled with 180workspace PDF Utility (https://180workspace.com/tools)', 14, pageHeight - 10);

      const safeName = (docTitle || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`${safeName}.pdf`);
      setTextDownloadSuccess(true);
      setTimeout(() => setTextDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Text to PDF error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsTextConverting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Hidden File Input for Native File Dialog */}
      <input
        id="pdf-images-file-input"
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleFileInputChange}
        className="sr-only hidden"
      />

      {/* Tool Mode Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('images')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'images'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Images to PDF Converter</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'text'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Text & Markdown to PDF</span>
        </button>
      </div>

      {/* MODE 1: IMAGES TO PDF */}
      {activeTab === 'images' && (
        <div className="space-y-6">
          {/* Dropzone Container */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center shadow-xl transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 scale-[1.01]'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-indigo-500'
            }`}
          >
            <div className="space-y-5 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Drop Images Here or Click to Browse
                </h3>
                <p className="text-xs text-slate-500 mt-1.5">
                  Supports PNG, JPG, JPEG, and WebP • Paste screenshots directly with <kbd className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">Ctrl+V</kbd>
                </p>
              </div>

              {/* Action Buttons inside Dropzone */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <label
                  htmlFor="pdf-images-file-input"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Select Images from Computer</span>
                </label>

                <button
                  type="button"
                  onClick={loadSampleImages}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <span>✨ Try Sample Images (1-Click)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Uploaded Images List & PDF Controls */}
          {images.length > 0 && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              {/* PDF Settings Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Page Size</label>
                  <select
                    value={pageSize}
                    onChange={(e: any) => setPageSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  >
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="letter">US Letter (8.5 x 11 in)</option>
                    <option value="legal">Legal (8.5 x 14 in)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Orientation</label>
                  <select
                    value={orientation}
                    onChange={(e: any) => setOrientation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  >
                    <option value="p">Portrait (Vertical)</option>
                    <option value="l">Landscape (Horizontal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Margin</label>
                  <select
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  >
                    <option value={0}>Zero Margin (0mm)</option>
                    <option value={10}>Standard (10mm)</option>
                    <option value={20}>Wide (20mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">File Name</label>
                  <input
                    type="text"
                    value={pdfFilename}
                    onChange={(e) => setPdfFilename(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Images Preview Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Pages ({images.length})
                    </h4>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                      {images.reduce((acc, it) => acc + (it.sizeKb || 0), 0)} KB Total
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="pdf-images-file-input"
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      + Add More Images
                    </label>
                    <button
                      type="button"
                      onClick={() => setImages([])}
                      className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className="group relative bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 flex flex-col justify-between"
                    >
                      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 mb-2 relative">
                        <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1 bg-black/70 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold backdrop-blur-sm">
                          Page {idx + 1}
                        </span>
                      </div>

                      <div className="mb-2">
                        <span className="text-[10px] text-slate-800 dark:text-slate-200 font-bold truncate block">
                          {img.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {img.width}x{img.height} • {img.sizeKb || 0} KB
                        </span>
                      </div>

                      {/* Reorder & Delete controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveImage(idx, 'up')}
                            className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer font-bold"
                            title="Move Left / Earlier"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            disabled={idx === images.length - 1}
                            onClick={() => moveImage(idx, 'down')}
                            className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer font-bold"
                            title="Move Right / Later"
                          >
                            →
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer font-bold"
                          title="Remove Page"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Convert Button & Status */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  {downloadSuccess && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                      PDF Successfully Downloaded!
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isConverting}
                  onClick={handleConvertImagesToPdf}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {isConverting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating Combined PDF...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      <span>Download Combined PDF ({images.length} Pages)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: TEXT & MARKDOWN TO PDF */}
      {activeTab === 'text' && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          {/* Quick Preset Templates */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Load Template:</span>
            {SAMPLE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                type="button"
                onClick={() => {
                  setDocTitle(tpl.title);
                  setDocAuthor(tpl.author);
                  setDocBody(tpl.body);
                }}
                className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold transition-all cursor-pointer"
              >
                {tpl.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Document Title</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Author / Subtitle</label>
              <input
                type="text"
                value={docAuthor}
                onChange={(e) => setDocAuthor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Document Content (Markdown format supported: ## Headings, - Bullet points)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {docBody.split('\n').length} lines • {docBody.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={12}
              value={docBody}
              onChange={(e) => setDocBody(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div>
              {textDownloadSuccess && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Markdown PDF Successfully Compiled & Downloaded!
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={isTextConverting}
              onClick={handleConvertTextToPdf}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {isTextConverting ? (
                <span>Compiling Document...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  <span>Compile & Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* The 180workspace Funnel CTA */}
      <div className="mt-12 rounded-3xl p-8 bg-gradient-to-r from-blue-900 to-indigo-950 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-widest text-blue-300">
              Enterprise Document Management
            </span>
            <h4 className="text-2xl md:text-3xl font-black">
              Collaborate, E-Sign & Organize Documents in One Hub
            </h4>
            <p className="text-sm text-blue-200 max-w-xl">
              180workspace Docs brings Google Docs power + Notion flexibility + legal e-signatures into your team's central workspace.
            </p>
          </div>
          <a
            href="https://app.180workspace.com/signup"
            className="px-8 py-4 rounded-full bg-white text-blue-950 font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shrink-0"
          >
            Try 180workspace Docs Free →
          </a>
        </div>
      </div>
    </div>
  );
}
