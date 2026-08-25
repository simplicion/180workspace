"use client";
import React, { useState, useEffect } from 'react';
import { Target, Flag, Edit2, X, Plus, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AboutEditModal } from './AboutEditModal';
import { AddCoreValueModal } from './AddCoreValueModal';
import { useDeleteCompanyCoreValueMutation } from '@/redux/api/companyApi';
import api from '@/lib/api';

interface TabProps {
    company: any;
    isPublicView?: boolean;
    onProfileUpdate?: () => void;
}

export function AboutTab({ company, isPublicView, onProfileUpdate }: TabProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
    const [isAddCoreValueModalOpen, setIsAddCoreValueModalOpen] = useState(false);
    const [milestones, setMilestones] = useState<any[]>([]);

    const [deleteCoreValue] = useDeleteCompanyCoreValueMutation();
    const coreValues = company?.coreValueItems || [];

    useEffect(() => {
        const fetchMilestones = async () => {
            try {
                const res = await api.get('/api/company-profile/private/milestones');
                const data = res.data;
                if (data.success && data.data) {
                    setMilestones(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch milestones:", err);
            }
        };

        if (company?.id) {
            fetchMilestones();
        }
    }, [company?.id]);

    const handleSave = async (data: any) => {
        try {
            const res = await api.put('/api/company-profile', data);
            if (res.data) {
                if (onProfileUpdate) onProfileUpdate();
            }
        } catch (error) {
            console.error('Failed to update about info:', error);
            throw error;
        }
    };

    const mission = company?.mission;
    const vision = company?.vision;
    const story = company?.story;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            
            {!isPublicView && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium text-sm border border-blue-100 shadow-sm"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit About Info
                    </button>
                </div>
            )}

            {/* Mission & Vision */}
            {(mission || vision) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {mission && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Flag className="w-24 h-24 text-blue-600" />
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                                <Flag className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h3>
                            <p className="text-gray-600 leading-relaxed relative z-10 whitespace-pre-wrap">
                                {mission}
                            </p>
                        </div>
                    )}
                    
                    {vision && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Target className="w-24 h-24 text-indigo-600" />
                            </div>
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
                                <Target className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Our Vision</h3>
                            <p className="text-gray-600 leading-relaxed relative z-10 whitespace-pre-wrap">
                                {vision}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Core Values */}
            {(coreValues.length > 0 || !isPublicView) && (
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mt-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Core Values</h3>
                        {!isPublicView && coreValues.length < 10 && (
                            <button 
                                onClick={() => setIsAddCoreValueModalOpen(true)}
                                className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add Value
                            </button>
                        )}
                    </div>
                    
                    {coreValues.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {coreValues.map((cv: any) => (
                                <div key={cv.id} className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors group relative">
                                    {!isPublicView && (
                                        <button 
                                            onClick={() => deleteCoreValue(cv.id)}
                                            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1.5 rounded-full shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-100 mb-3 shadow-sm overflow-hidden text-xl">
                                        {cv.iconUrl ? (
                                            <img src={cv.iconUrl} alt={cv.title} className="w-full h-full object-cover" />
                                        ) : (
                                            "💎"
                                        )}
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2">{cv.title}</h4>
                                    <p className="text-sm text-gray-600">{cv.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-500 text-sm mb-4">No core values added yet.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Story & Milestones */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    {story && (
                        <>
                            <h3 className="text-xl font-bold text-gray-900 mb-6">The {company?.name || 'Company'} Story</h3>
                            <div className="prose max-w-none text-gray-600">
                                {/* We use line-clamp-4 for the inline story preview */}
                                <div 
                                    className="leading-relaxed mb-4 line-clamp-4 overflow-hidden" 
                                    dangerouslySetInnerHTML={{ __html: story }} 
                                />
                                <button 
                                    onClick={() => setIsStoryModalOpen(true)}
                                    className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
                                >
                                    Read More
                                </button>
                            </div>
                        </>
                    )}
                    
                    <div className="flex justify-between items-end mt-10 mb-6">
                        <h4 className="text-lg font-bold text-gray-900">Company Milestones</h4>
                        {!isPublicView && (
                            <Link 
                                href='/projects'
                                className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 shadow-sm"
                            >
                                <Plus className="w-4 h-4 mr-1.5" /> Add Milestone
                            </Link>
                        )}
                    </div>
                    {milestones.length > 0 ? (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                            {milestones.map((milestone: any, index: number) => (
                                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                        <span className="text-xs font-bold">{index + 1}</span>
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="font-bold text-gray-900">
                                                {new Date(milestone.completedAt).getFullYear()}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 font-medium">{milestone.title}</div>
                                        <div className="text-xs text-gray-500 mt-1">{milestone.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-6">
                            <p className="text-gray-500 text-sm mb-4">No milestones tracked yet.</p>
                            {!isPublicView && (
                                <Link 
                                    href='/projects'
                                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    Go to Projects to track milestones <ArrowRight className="w-4 h-4 ml-1" />
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AddCoreValueModal 
                isOpen={isAddCoreValueModalOpen}
                onClose={() => setIsAddCoreValueModalOpen(false)}
            />

            <AboutEditModal 
                company={company}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSave}
            />

            {/* Story Read More Modal */}
            {isStoryModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                            <h2 className="text-2xl font-bold text-gray-900">Our Story</h2>
                            <button 
                                onClick={() => setIsStoryModalOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <div 
                                className="prose max-w-none text-gray-700 leading-loose"
                                dangerouslySetInnerHTML={{ __html: story }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
