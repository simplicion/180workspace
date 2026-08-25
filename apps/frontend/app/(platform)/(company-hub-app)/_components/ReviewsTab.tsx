"use client";
import React from 'react';
import { Star, MessageSquare, Plus } from 'lucide-react';
import { useGetCompanyReviewsQuery } from '../../../../redux/api/companyApi';
import { AddReviewModal } from './AddReviewModal';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface TabProps {
    company: any;
}



export function ReviewsTab({ company }: TabProps) {
    const router = useRouter();
    const { data: reviewsData, isLoading } = useGetCompanyReviewsQuery(company.id, {
        skip: !company.id
    });
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const rawReviews = reviewsData?.data || [];
    
    // Calculate average rating
    const averageRating = useMemo(() => {
        if (rawReviews.length === 0) return 4.8; // default mock rating
        const sum = rawReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        return (sum / rawReviews.length).toFixed(1);
    }, [rawReviews]);

    // Determine reviews to show
    const reviews = rawReviews.length > 0 ? rawReviews.map((r: any) => ({
        id: r.id,
        author: r.user?.name || "Anonymous",
        authorId: r.user?.id,
        photoUrl: r.user?.photoUrl,
        role: r.user?.role || "User",
        rating: r.rating,
        date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        title: r.title,
        content: r.description
    })) : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            
            {/* Add Review Modal */}
            <AddReviewModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                companyId={company.id} 
            />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Employee & Client Reviews</h2>
                    <p className="text-sm text-gray-500 mt-1">What people are saying about us</p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Review
                    </button>
                    <div className="flex items-center bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">
                        <Star className="h-4 w-4 text-yellow-500 fill-current mr-1.5" />
                        <span className="font-bold text-yellow-700">{averageRating}</span>
                        <span className="text-xs text-yellow-600 ml-1">/ 5.0</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review: any) => (
                    <div key={review.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} 
                                    />
                                ))}
                            </div>
                            <span className="text-xs text-gray-500 font-medium">{review.date}</span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{review.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-grow">
                            &quot;{review.content}&quot;
                        </p>
                        
                        <div 
                            className={`border-t border-gray-100 pt-4 flex items-center ${review.authorId ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            onClick={() => {
                                if (review.authorId) {
                                    router.push(`/profile/${review.authorId}`);
                                }
                            }}
                        >
                            {review.photoUrl ? (
                                <img 
                                    src={review.photoUrl} 
                                    alt={review.author} 
                                    className="h-10 w-10 rounded-full object-cover mr-3 border border-gray-100"
                                />
                            ) : (
                                <div className="h-10 w-10 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm mr-3">
                                    {review.author.charAt(0)}
                                </div>
                            )}
                            <div>
                                <div className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors">{review.author}</div>
                                <div className="text-xs text-gray-500">{review.role}</div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {reviews.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews yet</h3>
                        <p className="text-gray-500 text-sm">Be the first to review this company.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
