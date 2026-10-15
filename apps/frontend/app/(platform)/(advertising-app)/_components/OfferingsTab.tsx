"use client";
import { LogoLoader } from "@workspace/ui";
import React, { useState } from 'react';
import { Plus, X, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { AddOfferingModal } from './AddOfferingModal';
import { useGetCompanyServicesQuery, useDeleteCompanyServiceMutation, useRequestServiceMutation } from '@/redux/api/companyApi';

interface TabProps {
    company: any;
    isOwner?: boolean;
}

export function OfferingsTab({ company, isOwner = true }: TabProps) {
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedOffering, setSelectedOffering] = useState<any>(null);

    const [requirements, setRequirements] = useState('');
    const [requesterEmail, setRequesterEmail] = useState('');
    const [requesterName, setRequesterName] = useState('');

    const [requestService, { isLoading: isRequesting }] = useRequestServiceMutation();

    const offerings = company?.offerings || company?.services || [];

    const handleRequestOffering = (offering: any) => {
        setSelectedOffering(offering);
        setIsRequestModalOpen(true);
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOffering) return;
        
        try {
            await requestService({
                companyId: company.id,
                serviceId: selectedOffering.id,
                requirements,
                requesterEmail,
                requesterName
            }).unwrap();
            setIsRequestModalOpen(false);
            setRequirements('');
            setRequesterEmail('');
            setRequesterName('');
            // Toast success here
        } catch (error) {
            console.error('Failed to submit request:', error);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Our Offerings</h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Discover what we offer to help you scale and succeed.</p>
                </div>
                {isOwner && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)} 
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 hover:shadow-md transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Add Offering
                    </button>
                )}
            </div>

            {offerings.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-zinc-800/30 rounded-2xl border border-gray-100 dark:border-zinc-700/60 border-dashed">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-2">No Offerings Yet</h3>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm text-center max-w-sm mb-6">
                        You haven't added any offerings yet. Add your first offering to showcase to potential clients.
                    </p>
                    {isOwner && (
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                        >
                            Add Your First Offering
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {offerings.map((offering: any) => (
                        <div key={offering.id} className="bg-white dark:bg-zinc-900/90 border border-gray-100 dark:border-zinc-800/80 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-blue-100 dark:hover:border-zinc-700 group flex flex-col">
                            {offering.imageUrl ? (
                                <div className="h-48 w-full overflow-hidden bg-gray-50 dark:bg-zinc-800">
                                    <img src={offering.imageUrl} alt={offering.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                            ) : (
                                <div className="h-48 w-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-850 flex items-center justify-center">
                                    <ImageIcon className="w-12 h-12 text-blue-200 dark:text-zinc-600" />
                                </div>
                            )}
                            <div className="p-6 flex flex-col flex-grow relative">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-2">{offering.name}</h4>
                                <p className="text-sm text-gray-500 dark:text-zinc-400 flex-grow mb-6 leading-relaxed line-clamp-2">
                                    {offering.description}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    {offering.startingPrice ? (
                                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full">
                                            {offering.startingPrice}
                                        </div>
                                    ) : (
                                        <div />
                                    )}
                                    <div className="flex items-center gap-2">
                                        {offering.link && (
                                            <a 
                                                href={offering.link.startsWith('http') ? offering.link : `https://${offering.link}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 text-sm font-semibold flex items-center gap-1 group/link"
                                            >
                                                Visit
                                            </a>
                                        )}
                                        <button 
                                            onClick={() => handleRequestOffering(offering)} 
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-semibold flex items-center gap-1 group/btn"
                                        >
                                            Request
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Offering Modal */}
            <AddOfferingModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                companyId={company?.id} 
            />

            {/* Request Service Modal */}
            {isRequestModalOpen && selectedOffering && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative scale-in-center border border-transparent dark:border-zinc-800">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Request Offering</h2>
                            <button onClick={() => setIsRequestModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full p-1.5">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSubmitRequest} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Offering</label>
                                    <input type="text" readOnly value={selectedOffering?.name || ''} className="w-full px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-zinc-300 font-medium" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Your Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={requesterName}
                                        onChange={(e) => setRequesterName(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500" 
                                        placeholder="John Doe" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Contact Email</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={requesterEmail}
                                        onChange={(e) => setRequesterEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500" 
                                        placeholder="you@company.com" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Your Requirements</label>
                                    <textarea 
                                        rows={4} 
                                        required
                                        value={requirements}
                                        onChange={(e) => setRequirements(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-zinc-500" 
                                        placeholder="Tell us what you need..."
                                    ></textarea>
                                </div>
                                <div className="pt-2">
                                    <button 
                                        type="submit" 
                                        disabled={isRequesting}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isRequesting && <LogoLoader className="w-4 h-4 animate-spin" />}
                                        Send Request
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
