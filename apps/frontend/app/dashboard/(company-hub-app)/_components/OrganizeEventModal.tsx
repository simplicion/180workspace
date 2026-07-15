'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Calendar, MapPin, AlignLeft, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateEventMutation, useUpdateEventMutation } from '@/redux/api/companyApi';
import api from '@/lib/api';

interface OrganizeEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventToEdit?: any;
    companyId: string;
}

export function OrganizeEventModal({ isOpen, onClose, eventToEdit, companyId }: OrganizeEventModalProps) {
    const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
    const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        eventType: 'in-person',
        location: '',
        eventDate: '',
        capacity: '',
        bannerImage: '',
    });

    useEffect(() => {
        if (eventToEdit) {
            setFormData({
                title: eventToEdit.title || '',
                description: eventToEdit.description || '',
                eventType: eventToEdit.eventType || 'in-person',
                location: eventToEdit.location || '',
                eventDate: eventToEdit.eventDate ? new Date(eventToEdit.eventDate).toISOString().slice(0, 16) : '',
                capacity: eventToEdit.capacity?.toString() || '',
                bannerImage: eventToEdit.bannerImage || '',
            });
        } else {
            setFormData({
                title: '',
                description: '',
                eventType: 'in-person',
                location: '',
                eventDate: '',
                capacity: '',
                bannerImage: '',
            });
        }
    }, [eventToEdit, isOpen]);

    if (!isOpen) return null;

    const isLoading = isCreating || isUpdating;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await api.post('/api/events/upload-banner', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, bannerImage: res.data.document.fileUrl }));
            toast.success('Image uploaded successfully');
        } catch (error: any) {
            toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Upload failed');
        } finally {
            setIsUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.title || !formData.eventDate || !formData.location) {
            toast.error('Please fill all required fields');
            return;
        }

        const submitData = {
            ...formData,
            eventDate: new Date(formData.eventDate).toISOString(),
            capacity: formData.capacity ? parseInt(formData.capacity) : null,
        };

        try {
            if (eventToEdit) {
                await updateEvent({ id: eventToEdit.id, data: submitData }).unwrap();
                toast.success('Event updated successfully');
            } else {
                await createEvent(submitData).unwrap();
                toast.success('Event created successfully');
            }
            onClose();
        } catch (error: any) {
            toast.error(error.data?.message || 'Failed to save event');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {eventToEdit ? 'Edit Event' : 'Organize New Event'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
                            <p className="text-xs text-gray-500 mb-2">Upload a 16:9 image or provide a URL directly</p>
                            
                            <div className="flex gap-2 mb-3">
                                <div className="relative flex-1">
                                    <input
                                        type="url"
                                        name="bannerImage"
                                        value={formData.bannerImage}
                                        onChange={handleChange}
                                        placeholder="https://example.com/banner.jpg"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <label className={`flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl cursor-pointer transition-colors ${isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-gray-600" /> : <Upload className="w-5 h-5 text-gray-600" />}
                                    <span className="ml-2 text-sm font-medium text-gray-700">Upload</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleImageUpload} 
                                        disabled={isUploadingImage}
                                    />
                                </label>
                            </div>
                            
                            {formData.bannerImage && (
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                    <img src={formData.bannerImage} alt="Preview" className="object-cover w-full h-full" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                            <input
                                type="text"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g. Annual Startup Mixer"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="What is this event about?"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                                <select
                                    name="eventType"
                                    value={formData.eventType}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="in-person">In Person</option>
                                    <option value="online">Online / Virtual</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                                <input
                                    type="number"
                                    name="capacity"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g. 100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date and Time *</label>
                                <input
                                    type="datetime-local"
                                    name="eventDate"
                                    required
                                    value={formData.eventDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Link *</label>
                                <input
                                    type="text"
                                    name="location"
                                    required
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Address or Meeting Link"
                                />
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="event-form"
                        disabled={isLoading}
                        className="flex items-center px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {eventToEdit ? 'Save Changes' : 'Create Event'}
                    </button>
                </div>
            </div>
        </div>
    );
}
