'use client';

import React, { useState } from 'react';
import { X, Calendar, MapPin, Users, Edit, Trash2 } from 'lucide-react';
import { useGetCompanyEventByIdQuery, useDeleteEventMutation, useGetPublicEventDetailsQuery } from '@/redux/api/companyApi';
import toast from 'react-hot-toast';
import { EventRegistrationModal } from './EventRegistrationModal';

interface EventDetailsModalProps {
    eventId: string;
    isOpen: boolean;
    onClose: () => void;
    isPublicView?: boolean;
    onEdit?: (event: any) => void;
    companyId?: string;
}

export function EventDetailsModal({ eventId, isOpen, onClose, isPublicView, onEdit, companyId }: EventDetailsModalProps) {
    const { data: companyEventData, isLoading: isLoadingCompany } = useGetCompanyEventByIdQuery(eventId, {
        skip: !isOpen || isPublicView
    });
    
    const { data: publicEventData, isLoading: isLoadingPublic } = useGetPublicEventDetailsQuery(eventId, {
        skip: !isOpen || !isPublicView
    });
    
    const [deleteEvent] = useDeleteEventMutation();
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    if (!isOpen) return null;

    const isLoading = isPublicView ? isLoadingPublic : isLoadingCompany;
    const event = isPublicView ? publicEventData?.data : companyEventData?.data;

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this event?')) {
            try {
                await deleteEvent(eventId).unwrap();
                toast.success('Event deleted');
                onClose();
            } catch (err) {
                toast.error('Failed to delete event');
            }
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col relative">
                    {/* Header Image or Gradient */}
                    <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-600 to-indigo-700">
                        {event?.bannerImage && (
                            <img src={event.bannerImage} alt="Event Banner" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        )}
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="p-12 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : event ? (
                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{event.title}</h2>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1.5 text-blue-500" />
                                            {new Date(event.eventDate).toLocaleDateString('en-US', {
                                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                        <div className="flex items-center">
                                            <MapPin className="w-4 h-4 mr-1.5 text-blue-500" />
                                            {event.location}
                                        </div>
                                        <div className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-xs font-medium uppercase tracking-wider">
                                            {event.eventType}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {isPublicView ? (
                                        <button 
                                            onClick={() => setIsRegisterModalOpen(true)}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                                        >
                                            Register Now
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => onEdit && onEdit(event)}
                                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                                                title="Edit Event"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={handleDelete}
                                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                                                title="Delete Event"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="prose prose-sm md:prose-base max-w-none text-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">About this event</h3>
                                <p className="whitespace-pre-wrap">{event.description || 'No description provided.'}</p>
                            </div>

                            {!isPublicView && event.registrations && (
                                <div className="mt-10">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                                        <Users className="w-5 h-5 mr-2 text-indigo-500" />
                                        Registrations ({event.registrations.length}{event.capacity ? ` / ${event.capacity}` : ''})
                                    </h3>
                                    
                                    {event.registrations.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                                            <p className="text-gray-500 text-sm">No registrations yet.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {event.registrations.map((reg: any) => (
                                                        <tr key={reg.id}>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{reg.name}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{reg.email}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                {new Date(reg.createdAt).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-red-500">
                            Failed to load event details.
                        </div>
                    )}
                </div>
            </div>

            {/* Registration Modal */}
            {isRegisterModalOpen && event && (
                <EventRegistrationModal
                    eventId={event.id}
                    eventTitle={event.title}
                    isOpen={isRegisterModalOpen}
                    onClose={() => setIsRegisterModalOpen(false)}
                />
            )}
        </>
    );
}
