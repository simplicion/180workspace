'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRegisterForEventMutation } from '@/redux/api/companyApi';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface EventRegistrationModalProps {
    eventId: string;
    eventTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

export function EventRegistrationModal({ eventId, eventTitle, isOpen, onClose }: EventRegistrationModalProps) {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [registerForEvent, { isLoading }] = useRegisterForEventMutation();
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
                email: currentUser.email || '',
                phone: (currentUser as any).phone || ''
            });
        }
    }, [currentUser]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentUser) {
            toast.error('You must be logged in to register for events.');
            return;
        }

        try {
            await registerForEvent({ eventId, data: formData }).unwrap();
            toast.success('Successfully registered for ' + eventTitle);
            onClose();
        } catch (error: any) {
            toast.error(error.data?.message || 'Failed to register. You may already be registered.');
        }
    };

    const handleLoginClick = () => {
        // Construct the callback URL to come back to the current page
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/auth/login?callbackUrl=${returnUrl}`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Event Registration</h2>
                        <p className="text-xs text-gray-500 mt-1">{eventTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    {!currentUser ? (
                        <div className="text-center py-6">
                            <div className="bg-blue-50 text-blue-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <LogIn className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Login Required</h3>
                            <p className="text-gray-600 text-sm mb-6">
                                You need to be logged in to register for this event. This helps us keep your tickets safe and accessible.
                            </p>
                            <button 
                                onClick={handleLoginClick}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Login or Sign up
                            </button>
                        </div>
                    ) : (
                        <form id="registration-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </form>
                    )}
                </div>

                {currentUser && (
                    <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="registration-form"
                            disabled={isLoading}
                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Complete Registration
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
