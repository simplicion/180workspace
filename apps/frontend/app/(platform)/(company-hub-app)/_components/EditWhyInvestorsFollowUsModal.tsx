import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, DollarSign, Trophy, CheckCircle2, FileText } from 'lucide-react';
import { useUpdateCompanyFinanceTabMutation } from '@/redux/api/companyApi';
import api from '@/lib/api';
import CustomSelect from '@/components/ui/CustomSelect';

interface EditWhyInvestorsFollowUsModalProps {
    isOpen: boolean;
    onClose: () => void;
    company: any;
    onSave?: () => void;
}

const AVAILABLE_ICONS = [
    { id: 'TrendingUp', icon: <TrendingUp className="h-5 w-5" />, label: 'Trending Up' },
    { id: 'DollarSign', icon: <DollarSign className="h-5 w-5" />, label: 'Dollar Sign' },
    { id: 'Trophy', icon: <Trophy className="h-5 w-5" />, label: 'Trophy' },
    { id: 'CheckCircle2', icon: <CheckCircle2 className="h-5 w-5" />, label: 'Check Circle' }
];

export function EditWhyInvestorsFollowUsModal({ isOpen, onClose, company, onSave }: EditWhyInvestorsFollowUsModalProps) {
    const [highlights, setHighlights] = useState<any[]>([]);
    const [pitchDeckUrl, setPitchDeckUrl] = useState<string>('');
    const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    
    const [updateFinanceTab, { isLoading }] = useUpdateCompanyFinanceTabMutation();

    useEffect(() => {
        if (isOpen && company) {
            let meta: any = {};
            try { meta = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {}); } catch(e) {}
            
            const existingHighlights = company.companyHighlights && company.companyHighlights.length > 0 ? company.companyHighlights : (meta.companyHighlights || []);
            // Ensure we have exactly 4 items (or pad up to 4)
            const padded = [...existingHighlights];
            while (padded.length < 4) {
                padded.push({ title: '', details: '', icon: 'TrendingUp' });
            }
            // Truncate to 4 just in case
            setHighlights(padded.slice(0, 4));
            setPitchDeckUrl(meta.pitchDeckUrl || '');
            setPitchDeckFile(null);
            setError('');
        }
    }, [isOpen, company]);

    if (!isOpen) return null;

    const handleHighlightChange = (index: number, field: string, value: string) => {
        const newHighlights = [...highlights];
        newHighlights[index] = { ...newHighlights[index], [field]: value };
        setHighlights(newHighlights);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Check file type if necessary
            setPitchDeckFile(selectedFile);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Filter out empty highlights
        const validHighlights = highlights.filter(h => h.title.trim() !== '');

        let uploadedUrl = pitchDeckUrl;

        if (pitchDeckFile) {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', pitchDeckFile);

            try {
                // Using existing upload endpoint. /api/branding/logo returns { url }
                // We'll reuse it or an appropriate upload endpoint for files.
                // Assuming /api/branding/logo works for any file upload or we have /api/upload
                const response = await api.post('/api/branding/logo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedUrl = response.data.url;
            } catch (err: any) {
                console.error("Upload error", err);
                setError(err.response?.data?.message || 'Failed to upload pitch deck.');
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        try {
            await updateFinanceTab({
                companyHighlights: validHighlights,
                pitchDeckUrl: uploadedUrl
            }).unwrap();
            
            if (onSave) onSave();
            onClose();
        } catch (err: any) {
            console.error("Save error", err);
            setError(err.data?.message || 'Failed to update highlights.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl animate-in zoom-in-95 my-8 mt-12 md:mt-24">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Edit Why Investors Follow Us</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Highlights (Add up to 4)</h4>
                            <div className="space-y-4">
                                {highlights.map((highlight, index) => (
                                    <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="w-1/4">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Icon</label>
                                            <CustomSelect 
                                                value={highlight.icon}
                                                onChange={(e) => handleHighlightChange(index, 'icon', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                            >
                                                {AVAILABLE_ICONS.map(i => (
                                                    <option key={i.id} value={i.id}>{i.label}</option>
                                                ))}
                                            </CustomSelect>
                                        </div>
                                        <div className="w-3/4 space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                                <input 
                                                    type="text"
                                                    value={highlight.title}
                                                    onChange={(e) => handleHighlightChange(index, 'title', e.target.value)}
                                                    placeholder="e.g. Strong Revenue Growth"
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Details</label>
                                                <input 
                                                    type="text"
                                                    value={highlight.details}
                                                    onChange={(e) => handleHighlightChange(index, 'details', e.target.value)}
                                                    placeholder="e.g. 20% YoY growth with profitable unit economics"
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Pitch Deck</h4>
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                                <div className="text-sm text-gray-600 mb-4">
                                    <span className="font-semibold text-blue-600 cursor-pointer">Click to upload</span> or drag and drop
                                    <p className="text-xs text-gray-500 mt-1">Recommended format: PDF, PPTX or DOCX</p>
                                </div>
                                <input 
                                    type="file" 
                                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                                    className="hidden" 
                                    id="pitch-deck-upload"
                                    onChange={handleFileChange}
                                />
                                <label 
                                    htmlFor="pitch-deck-upload"
                                    className="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Select File
                                </label>
                            </div>
                            
                            {(pitchDeckFile || pitchDeckUrl) && (
                                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {pitchDeckFile ? pitchDeckFile.name : 'Current Pitch Deck'}
                                            </p>
                                            {pitchDeckFile && <p className="text-xs text-gray-500">{(pitchDeckFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                                        </div>
                                    </div>
                                    {pitchDeckFile && (
                                        <button 
                                            type="button" 
                                            onClick={() => setPitchDeckFile(null)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end space-x-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                            disabled={isLoading || isUploading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading || isUploading}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {(isLoading || isUploading) && <LogoLoader className="h-4 w-4 mr-2 animate-spin" />}
                            {isUploading ? 'Uploading...' : isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
