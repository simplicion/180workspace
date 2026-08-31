'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
    X, 
    PenTool, 
    Type, 
    Upload, 
    Check, 
    RotateCcw, 
    Eraser, 
    ShieldCheck, 
    UserCheck, 
    Sparkles,
    Trash2,
    Calendar,
    Image as ImageIcon
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';

interface UniversalSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSignature: (signatureData: {
        signatureImage: string;
        signerName?: string;
        signedAt?: string;
    }) => void;
    initialSignerName?: string;
    signatoryRole?: string;
    initialSignatureImage?: string | null;
    title?: string;
}

const SIGNATURE_FONTS = [
    { id: 'great-vibes', name: 'Great Vibes', family: "'Great Vibes', cursive", preview: 'Signature' },
    { id: 'dancing-script', name: 'Dancing Script', family: "'Dancing Script', cursive", preview: 'Signature' },
    { id: 'caveat', name: 'Caveat', family: "'Caveat', cursive", preview: 'Signature' },
    { id: 'pacifico', name: 'Pacifico', family: "'Pacifico', cursive", preview: 'Signature' },
    { id: 'satisfy', name: 'Satisfy', family: "'Satisfy', cursive", preview: 'Signature' }
];

const PEN_COLORS = [
    { id: 'navy', label: 'Dark Navy', color: '#0F172A' },
    { id: 'blue', label: 'Royal Blue', color: '#1D4ED8' },
    { id: 'black', label: 'True Black', color: '#000000' },
    { id: 'indigo', label: 'Deep Indigo', color: '#4338CA' }
];

const STROKE_WIDTHS = [
    { id: 'fine', label: 'Fine (1.5px)', width: 1.5 },
    { id: 'medium', label: 'Medium (2.5px)', width: 2.5 },
    { id: 'bold', label: 'Thick (4.0px)', width: 4.0 }
];

export function UniversalSignatureModal({
    isOpen,
    onClose,
    onSaveSignature,
    initialSignerName = '',
    signatoryRole = 'Authorized Signatory',
    initialSignatureImage = null,
    title = 'Adopt & Draw Digital Signature'
}: UniversalSignatureModalProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
    
    // Signer info
    const [signerName, setSignerName] = useState(initialSignerName || user?.name || '');
    const [legalAgreed, setLegalAgreed] = useState(true);

    // Draw Tab State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [penColor, setPenColor] = useState('#0F172A');
    const [strokeWidth, setStrokeWidth] = useState(2.5);
    const [strokesHistory, setStrokesHistory] = useState<ImageData[]>([]);

    // Type Tab State
    const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);

    // Upload Tab State
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Inject Google Fonts for Calligraphic Typefaces
    useEffect(() => {
        if (isOpen) {
            const linkId = 'google-fonts-signature-cursive';
            if (!document.getElementById(linkId)) {
                const link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&family=Satisfy&display=swap';
                document.head.appendChild(link);
            }
        }
    }, [isOpen]);

    // Initialize canvas on open
    useEffect(() => {
        if (isOpen && activeTab === 'draw') {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Set high-DPI scaling
                    const dpr = window.devicePixelRatio || 1;
                    const rect = canvas.getBoundingClientRect();
                    canvas.width = rect.width * dpr;
                    canvas.height = rect.height * dpr;
                    ctx.scale(dpr, dpr);
                    
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = penColor;
                    ctx.lineWidth = strokeWidth;

                    // If initial image exists, paint it
                    if (initialSignatureImage && !hasDrawn) {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            ctx.drawImage(img, 0, 0, rect.width, rect.height);
                            setHasDrawn(true);
                        };
                        img.src = initialSignatureImage;
                    }
                }
            }
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────
    // Drawing Logic
    // ─────────────────────────────────────────────────────────────────────────
    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX = 0;
        let clientY = 0;

        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('clientX' in e) {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Save history state before new stroke
        try {
            const currentImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setStrokesHistory(prev => [...prev.slice(-10), currentImg]);
        } catch (e) {}

        const coords = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = strokeWidth;
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const coords = getCoordinates(e);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.closePath();
        }
        setIsDrawing(false);
    };

    const handleClearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            setHasDrawn(false);
            setStrokesHistory([]);
        }
    };

    const handleUndoCanvas = () => {
        if (strokesHistory.length === 0) {
            handleClearCanvas();
            return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            const lastState = strokesHistory[strokesHistory.length - 1];
            ctx.putImageData(lastState, 0, 0);
            setStrokesHistory(prev => prev.slice(0, -1));
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Type Generator Logic (Render Cursive Text to PNG DataURL)
    // ─────────────────────────────────────────────────────────────────────────
    const generateTypedSignatureDataUrl = (): string => {
        const text = signerName.trim() || 'Signatory';
        const offscreen = document.createElement('canvas');
        offscreen.width = 600;
        offscreen.height = 200;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return '';

        ctx.clearRect(0, 0, offscreen.width, offscreen.height);
        ctx.font = `64px ${selectedFont.family}`;
        ctx.fillStyle = penColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, offscreen.width / 2, offscreen.height / 2);

        return offscreen.toDataURL('image/png');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Upload Handler Logic
    // ─────────────────────────────────────────────────────────────────────────
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload a valid PNG or JPEG image');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setUploadedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Save Final Signature
    // ─────────────────────────────────────────────────────────────────────────
    const handleConfirmSignature = () => {
        let finalImage: string | null = null;

        if (activeTab === 'draw') {
            const canvas = canvasRef.current;
            if (!canvas || !hasDrawn) {
                toast.error('Please draw your signature first');
                return;
            }
            finalImage = canvas.toDataURL('image/png');
        } else if (activeTab === 'type') {
            if (!signerName.trim()) {
                toast.error('Please enter your legal name');
                return;
            }
            finalImage = generateTypedSignatureDataUrl();
        } else if (activeTab === 'upload') {
            if (!uploadedImage) {
                toast.error('Please upload a signature image');
                return;
            }
            finalImage = uploadedImage;
        }

        if (!finalImage) {
            toast.error('Unable to capture signature');
            return;
        }

        onSaveSignature({
            signatureImage: finalImage,
            signerName: signerName.trim() || undefined,
            signedAt: new Date().toISOString()
        });

        toast.success('Signature applied successfully!', { id: 'sig-applied', duration: 1500 });
        onClose();
    };

    // Use saved profile signature
    const handleApplyProfileSignature = () => {
        if ((user as any)?.signatureImage) {
            onSaveSignature({
                signatureImage: (user as any).signatureImage,
                signerName: user?.name || signerName,
                signedAt: new Date().toISOString()
            });
            toast.success('Applied your saved workspace signature');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                            <PenTool className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                {title}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Legally Binding
                                </span>
                            </h3>
                            <p className="text-xs text-gray-500">Create or adopt a legally verified digital signature</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="px-6 pt-4 pb-2 bg-white border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                        <button
                            type="button"
                            onClick={() => setActiveTab('draw')}
                            className={clsx(
                                "flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                                activeTab === 'draw' 
                                    ? "bg-white text-indigo-600 shadow-xs border border-black/5" 
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Draw with Pen</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('type')}
                            className={clsx(
                                "flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                                activeTab === 'type' 
                                    ? "bg-white text-indigo-600 shadow-xs border border-black/5" 
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            <Type className="w-3.5 h-3.5" />
                            <span>Type Cursive</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('upload')}
                            className={clsx(
                                "flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                                activeTab === 'upload' 
                                    ? "bg-white text-indigo-600 shadow-xs border border-black/5" 
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Scan</span>
                        </button>
                    </div>

                    {(user as any)?.signatureImage && (
                        <button
                            type="button"
                            onClick={handleApplyProfileSignature}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200 cursor-pointer shadow-2xs"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Use Saved Profile Signature</span>
                        </button>
                    )}
                </div>

                {/* Main Body */}
                <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* Legal Name & Role Header Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                Signatory Legal Name
                            </label>
                            <input
                                type="text"
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                                placeholder="Full Legal Name (e.g. John Doe)"
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                Designated Title / Role
                            </label>
                            <div className="px-3 py-1.5 bg-white/70 border border-gray-200/80 rounded-lg text-xs font-medium text-gray-700 truncate">
                                {signatoryRole}
                            </div>
                        </div>
                    </div>

                    {/* ───────────────────────────────────────────────────────── */}
                    {/* TAB 1: DRAW SIGNATURE */}
                    {/* ───────────────────────────────────────────────────────── */}
                    {activeTab === 'draw' && (
                        <div className="space-y-3">
                            {/* Toolbar: Color & Stroke picker */}
                            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-semibold text-[11px]">Pen Color:</span>
                                    <div className="flex items-center gap-1.5">
                                        {PEN_COLORS.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setPenColor(c.color)}
                                                style={{ backgroundColor: c.color }}
                                                className={clsx(
                                                    "w-5 h-5 rounded-full cursor-pointer transition-transform shadow-2xs",
                                                    penColor === c.color ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "opacity-80 hover:opacity-100"
                                                )}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleUndoCanvas}
                                        disabled={strokesHistory.length === 0}
                                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200/70 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" /> Undo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClearCanvas}
                                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-100"
                                    >
                                        <Eraser className="w-3.5 h-3.5" /> Clear
                                    </button>
                                </div>
                            </div>

                            {/* Spacious Drawing Canvas Box */}
                            <div className="relative w-full h-64 bg-slate-50/60 rounded-2xl border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors overflow-hidden flex items-center justify-center">
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                    className="w-full h-full cursor-crosshair touch-none"
                                />
                                {!hasDrawn && (
                                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 gap-1.5">
                                        <PenTool className="w-7 h-7 opacity-30 animate-pulse" />
                                        <span className="text-xs font-semibold">Draw your signature with mouse or touch screen</span>
                                    </div>
                                )}
                                <div className="absolute bottom-6 left-8 right-8 border-b border-gray-300 border-dashed pointer-events-none flex justify-start pb-1">
                                    <span className="text-[10px] font-mono text-gray-400 tracking-wider">✕ SIGN HERE</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────── */}
                    {/* TAB 2: TYPE CURSIVE */}
                    {/* ───────────────────────────────────────────────────────── */}
                    {activeTab === 'type' && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500">
                                Choose an authentic calligraphic typeface generated from your legal name:
                            </p>

                            <div className="grid grid-cols-1 gap-2.5">
                                {SIGNATURE_FONTS.map((font) => (
                                    <div
                                        key={font.id}
                                        onClick={() => setSelectedFont(font)}
                                        className={clsx(
                                            "p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                                            selectedFont.id === font.id
                                                ? "bg-indigo-50/50 border-indigo-400 shadow-xs ring-1 ring-indigo-400"
                                                : "bg-white border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="flex-1">
                                            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block mb-1">
                                                {font.name}
                                            </span>
                                            <div
                                                style={{ fontFamily: font.family, color: penColor }}
                                                className="text-3xl select-none"
                                            >
                                                {signerName.trim() || 'Your Signature'}
                                            </div>
                                        </div>
                                        {selectedFont.id === font.id && (
                                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────── */}
                    {/* TAB 3: UPLOAD SCAN */}
                    {/* ───────────────────────────────────────────────────────── */}
                    {activeTab === 'upload' && (
                        <div className="space-y-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleFileUpload}
                                className="hidden"
                            />

                            {uploadedImage ? (
                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col items-center gap-3">
                                    <img 
                                        src={uploadedImage} 
                                        alt="Uploaded Signature" 
                                        className="max-h-36 max-w-full object-contain bg-white p-3 rounded-xl border border-gray-200 shadow-xs" 
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer shadow-2xs"
                                        >
                                            Change Image
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUploadedImage(null)}
                                            className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg hover:bg-rose-100 cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-10 border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-2xl bg-gray-50/50 hover:bg-indigo-50/20 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Click to upload scanned signature</p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">PNG or JPEG with clear background (Max 5MB)</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Legal Binding Acknowledgement */}
                    <label className="flex items-start gap-2.5 cursor-pointer pt-2 p-3 bg-gray-50 rounded-xl border border-gray-200/70">
                        <input
                            type="checkbox"
                            checked={legalAgreed}
                            onChange={(e) => setLegalAgreed(e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] text-gray-600 leading-relaxed">
                            I agree and acknowledge that applying this digital signature creates a legally binding execution equivalent to a physical handwritten signature under electronic document acts.
                        </span>
                    </label>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/50 rounded-xl transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirmSignature}
                        disabled={!legalAgreed || (activeTab === 'draw' && !hasDrawn) || (activeTab === 'upload' && !uploadedImage)}
                        className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
                    >
                        <Check className="w-4 h-4" />
                        <span>Adopt & Apply Signature</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
