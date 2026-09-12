"use client";

import React, { useState, useMemo } from 'react';
import { 
    Star, MessageSquare, Plus, CheckCircle2, User, 
    ShieldCheck, Filter, ShieldAlert, Sparkles, AlertCircle 
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useGetCompanyReviewsQuery } from '../../../../redux/api/companyApi';
import { AddReviewModal } from './AddReviewModal';
import { useRouter } from 'next/navigation';

interface TabProps {
    company: any;
}

type ReviewFilterType = 'all' | 'verified' | 'unverified';

export function ReviewsTab({ company }: TabProps) {
    const router = useRouter();
    const currentUser = useSelector((state: any) => state.auth?.user);

    const { data: responseData, isLoading, refetch } = useGetCompanyReviewsQuery(company?.id, {
        skip: !company?.id
    });
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<ReviewFilterType>('all');

    // Handle response structure (either { reviews: [], stats: {} } or raw array)
    const rawData = responseData?.data;
    const rawReviews = Array.isArray(rawData) ? rawData : (rawData?.reviews || []);
    const backendStats = rawData?.stats;

    // Check if the viewing user is a member of this company
    const isCompanyMember = Boolean(
        currentUser && (currentUser.companyId === company?.id || currentUser.company?.id === company?.id)
    );

    // Compute metrics
    const stats = useMemo(() => {
        if (backendStats) {
            return backendStats;
        }

        const totalCount = rawReviews.length;
        const verifiedList = rawReviews.filter((r: any) => Boolean(r.isVerified || r.userId));
        const verifiedCount = verifiedList.length;
        const unverifiedCount = totalCount - verifiedCount;

        const verifiedSum = verifiedList.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
        const totalSum = rawReviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0);

        const verifiedRating = verifiedCount > 0 ? (verifiedSum / verifiedCount).toFixed(1) : (totalCount > 0 ? (totalSum / totalCount).toFixed(1) : '5.0');
        const totalRating = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : '5.0';

        return {
            totalCount,
            verifiedCount,
            unverifiedCount,
            verifiedRating: Number(verifiedRating),
            totalRating: Number(totalRating),
            primaryRating: verifiedCount > 0 ? Number(verifiedRating) : Number(totalRating)
        };
    }, [rawReviews, backendStats]);

    // Format reviews
    const allFormattedReviews = useMemo(() => {
        return rawReviews.map((r: any) => {
            const isVerified = Boolean(r.isVerified || r.userId || r.user);
            const author = r.user?.name || r.reviewerName || "Guest Reviewer";
            const role = isVerified ? (r.user?.role || r.user?.title || "Verified Member") : "Public Visitor";
            
            return {
                id: r.id,
                author,
                authorId: r.user?.id || r.userId,
                photoUrl: r.user?.photoUrl || r.user?.image,
                role,
                isVerified,
                rating: Number(r.rating || 5),
                date: new Date(r.createdAt || Date.now()).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                }),
                title: r.title,
                content: r.description
            };
        });
    }, [rawReviews]);

    // Filter reviews
    const filteredReviews = useMemo(() => {
        if (activeFilter === 'verified') {
            return allFormattedReviews.filter((r: any) => r.isVerified);
        }
        if (activeFilter === 'unverified') {
            return allFormattedReviews.filter((r: any) => !r.isVerified);
        }
        return allFormattedReviews;
    }, [allFormattedReviews, activeFilter]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            {/* Add Review Modal */}
            <AddReviewModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                companyId={company?.id} 
                companyName={company?.name}
                onReviewSubmitted={() => {
                    if (refetch) refetch();
                }}
            />

            {/* Header & Rating Breakdown Banner */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        Employee & Client Reviews
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Verified ratings and community feedback for {company?.name || 'this company'}.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Verified Rating Pill */}
                    <div className="flex items-center bg-emerald-50/90 border border-emerald-200 px-3.5 py-2 rounded-xl shadow-2xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mr-2" />
                        <div>
                            <div className="flex items-center text-xs text-emerald-800 font-semibold">
                                <Star className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600 mr-1" />
                                <span className="text-sm font-bold text-emerald-900">{stats.verifiedRating || stats.totalRating || '5.0'}</span>
                                <span className="text-[10px] text-emerald-700 ml-1">/ 5.0</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-medium block">
                                {stats.verifiedCount} Verified {stats.verifiedCount === 1 ? 'Review' : 'Reviews'}
                            </span>
                        </div>
                    </div>

                    {/* Total Rating Pill */}
                    <div className="flex items-center bg-amber-50/80 border border-amber-200 px-3.5 py-2 rounded-xl shadow-2xs">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500 mr-2" />
                        <div>
                            <div className="flex items-center text-xs text-amber-800 font-semibold">
                                <span className="text-sm font-bold text-amber-900">{stats.totalRating || '5.0'}</span>
                                <span className="text-[10px] text-amber-700 ml-1">/ 5.0</span>
                            </div>
                            <span className="text-[10px] text-amber-700 font-medium block">
                                {stats.totalCount} Total {stats.totalCount === 1 ? 'Review' : 'Reviews'}
                            </span>
                        </div>
                    </div>

                    {/* Add Review Action */}
                    {isCompanyMember ? (
                        <div className="px-3.5 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 font-medium flex items-center" title="Company members cannot review their own company">
                            <ShieldAlert className="w-4 h-4 mr-1.5 text-gray-400" />
                            Internal Member
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-sm font-semibold shadow-sm shadow-blue-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            Add Review
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            {allFormattedReviews.length > 0 && (
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                activeFilter === 'all'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            All Reviews ({stats.totalCount})
                        </button>
                        <button
                            onClick={() => setActiveFilter('verified')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                activeFilter === 'verified'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified Only ({stats.verifiedCount})
                        </button>
                        <button
                            onClick={() => setActiveFilter('unverified')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                activeFilter === 'unverified'
                                    ? 'bg-gray-200 text-gray-800'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <User className="w-3.5 h-3.5 text-gray-500" />
                            Guest / Unverified ({stats.unverifiedCount})
                        </button>
                    </div>

                    <div className="text-xs text-gray-500 hidden sm:block">
                        Showing {filteredReviews.length} of {stats.totalCount}
                    </div>
                </div>
            )}

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredReviews.map((review: any) => (
                    <div 
                        key={review.id} 
                        className={`bg-white rounded-2xl p-6 shadow-xs flex flex-col h-full border transition-all ${
                            review.isVerified 
                                ? 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/20 to-white' 
                                : 'border-gray-200'
                        }`}
                    >
                        {/* Top: Stars + Verification Badge + Date */}
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center space-x-2">
                                <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} 
                                        />
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-gray-700">{review.rating}.0</span>
                            </div>

                            <div className="flex items-center space-x-2">
                                {review.isVerified ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                        <User className="w-3 h-3 text-gray-400" />
                                        Non-verified
                                    </span>
                                )}
                                <span className="text-[11px] text-gray-400">{review.date}</span>
                            </div>
                        </div>
                        
                        {/* Review Title & Content */}
                        <h3 className="text-base font-bold text-gray-900 mb-2">{review.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-grow whitespace-pre-wrap">
                            &quot;{review.content}&quot;
                        </p>
                        
                        {/* Author Info */}
                        <div 
                            className={`border-t border-gray-100 pt-4 flex items-center ${
                                review.authorId ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''
                            }`}
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
                                    className="h-9 w-9 rounded-full object-cover mr-3 border border-gray-200"
                                />
                            ) : (
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${
                                    review.isVerified 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {review.author?.charAt(0)?.toUpperCase() || 'G'}
                                </div>
                            )}
                            <div>
                                <div className="font-bold text-gray-900 text-xs sm:text-sm flex items-center">
                                    {review.author}
                                    {review.isVerified && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-1.5" />
                                    )}
                                </div>
                                <div className="text-[11px] text-gray-500">{review.role}</div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {filteredReviews.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2.5" />
                        <h3 className="text-base font-semibold text-gray-800 mb-1">
                            {activeFilter === 'all' 
                                ? 'No reviews yet' 
                                : `No ${activeFilter} reviews found`}
                        </h3>
                        <p className="text-gray-500 text-xs max-w-sm mx-auto mb-4">
                            {activeFilter === 'all'
                                ? 'Be the first to share your experience with this company.'
                                : 'Try switching the filter tab above to view other reviews.'}
                        </p>
                        {!isCompanyMember && activeFilter === 'all' && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs"
                            >
                                Write First Review
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
