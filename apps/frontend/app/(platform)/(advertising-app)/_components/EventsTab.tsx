'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, Plus, LayoutGrid, Users, Edit } from 'lucide-react';
import { useGetCompanyEventsQuery, useGetPublicEventsQuery } from '@/redux/api/companyApi';
import { OrganizeEventModal } from './OrganizeEventModal';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';

interface EventsTabProps {
    company: any;
    isPublicView?: boolean;
}

export function EventsTab({ company, isPublicView = false }: EventsTabProps) {
    const router = useRouter();
    const currentUser = useSelector((state: any) => state.auth?.user);
    const isOwner = currentUser?.companyId === company?.id;

    const { data: publicEventsData, isLoading: isLoadingPublic } = useGetPublicEventsQuery(undefined, {
        skip: !isPublicView
    });

    const { data: companyEventsData, isLoading: isLoadingPrivate } = useGetCompanyEventsQuery(undefined, {
        skip: isPublicView
    });

    const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<any>(null);

    const isLoading = isPublicView ? isLoadingPublic : isLoadingPrivate;
    let events = isPublicView ? publicEventsData?.data || [] : companyEventsData?.data || [];

    // If public view, filter for this company
    if (isPublicView) {
        events = events.filter((e: any) => e.companyId === company.id);
    }

    const handleEditEvent = (event: any) => {
        setEventToEdit(event);
        setIsOrganizeModalOpen(true);
    };

    const handleCloseOrganizeModal = () => {
        setIsOrganizeModalOpen(false);
        setEventToEdit(null);
    };

    return (
        <div className="py-6 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Events</h2>
                    <p className="text-gray-500 text-sm mt-1">Upcoming events hosted by {company.name}</p>
                </div>

                {!isPublicView && (
                    <button
                        onClick={() => setIsOrganizeModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Organize Event
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 h-72"></div>
                    ))}
                </div>
            ) : events.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">No events found</h3>
                    <p className="text-gray-500 mt-2 max-w-md">
                        {isPublicView 
                            ? "This company hasn't organized any events yet." 
                            : "You haven't organized any events. Host meetups, webinars, or conferences to engage with your audience."}
                    </p>
                    {!isPublicView && (
                        <button
                            onClick={() => setIsOrganizeModalOpen(true)}
                            className="mt-6 px-6 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                            Organize First Event
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event: any) => (
                        <div 
                            key={event.id}
                            onClick={() => router.push(`/company/${event.companyId || company.id}/events/${event.id}`)}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col"
                        >
                            <div className="relative h-48 bg-gray-100 overflow-hidden">
                                {event.bannerImage ? (
                                    <img 
                                        src={event.bannerImage} 
                                        alt={event.title} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-300">
                                        <LayoutGrid className="w-12 h-12 mb-2" />
                                        <span className="text-xs font-medium uppercase tracking-wider">No Image</span>
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-gray-900 shadow-sm">
                                    {new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-sm uppercase tracking-wider">
                                    {event.eventType}
                                </div>
                            </div>
                            
                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                                    {event.title}
                                </h3>
                                <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                                    {event.description || 'Join us for this exciting event! Click to view details and register.'}
                                </p>
                                
                                <div className="space-y-2 text-sm text-gray-500 mt-auto border-t border-gray-100 pt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                        {!isPublicView && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditEvent(event);
                                                }}
                                                className="text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md text-xs flex items-center font-medium hover:bg-blue-100 transition-colors"
                                            >
                                                <Edit className="w-3 h-3 mr-1" />
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                    {!isPublicView && event.registrations && (
                                        <div className="flex items-center">
                                            <Users className="w-4 h-4 mr-2 text-indigo-400" />
                                            <span>{event.registrations.length} registered</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <OrganizeEventModal
                isOpen={isOrganizeModalOpen}
                onClose={handleCloseOrganizeModal}
                eventToEdit={eventToEdit}
                companyId={company.id}
            />
        </div>
    );
}
