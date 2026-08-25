"use client";

import { LogoLoader } from "@workspace/ui";
import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false }) as any;
import 'react-quill-new/dist/quill.snow.css';

interface AboutEditModalProps {
    company: any;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export function AboutEditModal({ company, isOpen, onClose, onSave }: AboutEditModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        vision: company.vision || '',
        mission: company.mission || '',
        story: company.story || '',
    });

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleQuillChange = (value: string) => {
        setFormData(prev => ({ ...prev, story: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save about info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-gray-900">Edit About Info</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="about-edit-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Mission */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="block text-sm font-semibold text-gray-700">Mission</label>
                                <span className="text-xs text-gray-500">{formData.mission.length} / 500</span>
                            </div>
                            <textarea
                                name="mission"
                                value={formData.mission}
                                onChange={handleChange}
                                maxLength={500}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none text-gray-900"
                                placeholder="Enter company mission..."
                            />
                        </div>

                        {/* Vision */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="block text-sm font-semibold text-gray-700">Vision</label>
                                <span className="text-xs text-gray-500">{formData.vision.length} / 500</span>
                            </div>
                            <textarea
                                name="vision"
                                value={formData.vision}
                                onChange={handleChange}
                                maxLength={500}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none text-gray-900"
                                placeholder="Enter company vision..."
                            />
                        </div>

                        {/* Story */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Story</label>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-gray-900">
                                {/* @ts-ignore */}
                                <ReactQuill 
                                    theme="snow"
                                    value={formData.story}
                                    onChange={handleQuillChange}
                                    className="h-[300px]"
                                />
                            </div>
                        </div>
                        <br/>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0 flex justify-end gap-3 z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="about-edit-form"
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                    >
                        {isLoading ? <LogoLoader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
