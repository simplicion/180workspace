'use client';

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Calendar, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import { InstagramMockup } from '@/components/social-mockups/InstagramMockup';
import { LinkedInMockup } from '@/components/social-mockups/LinkedInMockup';

export default function SharedCalendarPage() {
    const params = useParams();
    const token = params.token as string;
    
    const [calendar, setCalendar] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        api.get(`/api/shared/calendar/${token}`)
            .then(({ data }) => setCalendar(data.calendar))
            .catch(() => toast.error('Failed to load calendar or link expired'))
            .finally(() => setLoading(false));
    }, [token]);

    async function handleApprovePiece(pieceId: string) {
        try {
            await api.post(`/api/shared/calendar/${token}/approve`, { pieceId });
            toast.success('Post approved!');
            // Update local state
            setCalendar((prev: any) => ({
                ...prev,
                pieces: prev.pieces.map((p: any) => 
                    p.id === pieceId ? { ...p, status: 'ready' } : p
                )
            }));
        } catch {
            toast.error('Failed to approve post');
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <LogoLoader className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!calendar) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
                Invalid or expired calendar link.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{calendar.name}</h1>
                            <p className="text-gray-500">{calendar.company?.name || 'Content Calendar'} - Client Portal</p>
                        </div>
                    </div>
                    {calendar.description && (
                        <p className="text-gray-600 mt-2">{calendar.description}</p>
                    )}
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Scheduled Content</h2>
                    
                    {calendar.pieces && calendar.pieces.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                            <p className="text-gray-500">No content scheduled for this calendar yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                            {calendar.pieces?.map((piece: any) => (
                                <div key={piece.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-50 text-indigo-700 uppercase">
                                                {piece.platform}
                                            </span>
                                            <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {new Date(piece.scheduledDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {piece.status === 'ready' ? (
                                            <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                                                <CheckCircle className="w-4 h-4" /> Approved
                                            </span>
                                        ) : (
                                            <span className="text-sm font-bold text-amber-600">
                                                Pending Review
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 flex justify-center py-4">
                                        {piece.platform?.toLowerCase() === 'instagram' ? (
                                            <InstagramMockup 
                                                username={calendar.company?.name || 'Company'} 
                                                content={piece.content} 
                                                mediaUrl={piece.mediaUrls?.[0]} 
                                            />
                                        ) : piece.platform?.toLowerCase() === 'linkedin' ? (
                                            <LinkedInMockup 
                                                username={calendar.company?.name || 'Company'} 
                                                content={piece.content} 
                                                mediaUrl={piece.mediaUrls?.[0]} 
                                            />
                                        ) : (
                                            <div className="w-full">
                                                {piece.mediaUrls && piece.mediaUrls.length > 0 && (
                                                    <div className="mb-4 aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                                                        <img src={piece.mediaUrls[0]} alt="Post media" className="object-cover w-full h-full" />
                                                    </div>
                                                )}
                                                <p className="text-gray-800 whitespace-pre-wrap text-sm">{piece.content}</p>
                                            </div>
                                        )}
                                    </div>

                                    {piece.status !== 'ready' && (
                                        <div className="mt-6 pt-6 border-t border-gray-100">
                                            <button 
                                                onClick={() => handleApprovePiece(piece.id)}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Approve Post
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
