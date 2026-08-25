"use client";

import { LogoLoader } from "@workspace/ui";
// Force recompile to bust Next.js cache - updated
import React, { useState, useEffect } from 'react';
import { Building, MapPin, Globe, Calendar, Users, DollarSign, TrendingUp, Trophy, ArrowRight, CheckCircle2, ChevronDown, Clock, Eye, Mail, Phone, Target, Briefcase, FileText, Map, Activity, MonitorSmartphone, Code, Cpu, BarChart, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useGetFollowStatusQuery, useFollowCompanyMutation, useUnfollowCompanyMutation } from '@/redux/api/companyApi';
import { OverviewTab } from './OverviewTab';
import { CompanyHeaderEditModal } from './CompanyHeaderEditModal';
import { AboutTab } from './AboutTab';
import { OfferingsTab } from './OfferingsTab';
import { JobsTab } from './JobsTab';

interface CompanyProfileUIProps {
    companyData: any;
    isLoading: boolean;
    isPublicView?: boolean;
    onProfileUpdate?: () => void;
}

export function CompanyProfileUI({ companyData, isLoading, isPublicView = false, onProfileUpdate }: CompanyProfileUIProps) {
    const currentUser = useSelector((state: any) => state.auth?.user);

    const company = companyData || {
        name: 'Company Name',
        description: '',
        website: '',
        industry: '',
        foundedYear: '',
        teamSize: '',
        headquarters: '',
    };

    let meta: any = {};
    try {
        meta = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {});
    } catch (e) {}

    let parsedSocials: any = {};
    try {
        parsedSocials = typeof company.socialLinks === 'string' ? JSON.parse(company.socialLinks) : (company.socialLinks || {});
    } catch (e) {}

    const teamSize = company.teamSize || '1-10';
    const currentTeamSize = parseInt(teamSize.split('-')[1] || teamSize.split('-')[0] || '10');
    const teamGrowthRate = currentTeamSize > 50 ? '+15%' : (currentTeamSize > 10 ? '+24%' : '+12%');
    


    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const tabFromUrl = searchParams?.get('tab');

    const [activeMainTab, setActiveMainTabState] = useState(tabFromUrl || 'Overview');
    const [isHeaderEditModalOpen, setIsHeaderEditModalOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    // Follow functionality
    const { data: followStatus, isLoading: isFollowStatusLoading } = useGetFollowStatusQuery(company?.id, {
        skip: !isPublicView || !company?.id || !currentUser,
    });
    const isFollowing = followStatus?.isFollowing || false;
    const [followCompany, { isLoading: isFollowingLoading }] = useFollowCompanyMutation();
    const [unfollowCompany, { isLoading: isUnfollowingLoading }] = useUnfollowCompanyMutation();

    const handleFollowToggle = async () => {
        if (!currentUser) {
            toast.error('Please log in to follow companies');
            return;
        }
        try {
            if (isFollowing) {
                await unfollowCompany(company.id).unwrap();
                toast.success(`Unfollowed ${company.name}`);
            } else {
                await followCompany(company.id).unwrap();
                toast.success(`Following ${company.name}`);
            }
        } catch (error) {
            toast.error('Failed to update follow status');
        }
    };

    useEffect(() => {
        if (tabFromUrl && tabFromUrl !== activeMainTab) {
            setActiveMainTabState(tabFromUrl);
        }
    }, [tabFromUrl]);

    const setActiveMainTab = (tab: string) => {
        setActiveMainTabState(tab);
        const params = new URLSearchParams(searchParams.toString());
        params?.set('tab', tab);
        router.push(`${pathname}?${params?.toString()}`, { scroll: false });
    };

    useEffect(() => {
        // Increment profile views
        if (company?.id) {
            api.post(`/api/company-profile/public/${company.id}/view`).catch(console.error);
        }
    }, [company?.id]);

    const handleHeaderSave = async (data: any) => {
        try {
            const res = await api.put(`/api/company-profile`, data);
            if (res.data) {
                if (onProfileUpdate) {
                    onProfileUpdate();
                } else {
                    window.location.reload();
                }
            }
        } catch (e: any) {
            console.error(e);
            toast.error(e?.response?.data?.message || 'Failed to update profile');
            throw e;
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LogoLoader className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }
    const mainTabs = [
        'Overview',
        'About',
        'Offerings',
        'Jobs'
    ];

    return (
        <div className="max-w-6xl mx-auto pb-12 bg-gray-50/50 min-h-screen w-full">
            <div className={`space-y-8 ${isPublicView ? 'p-0' : 'p-4 md:p-8'}`}>
                {/* Header Banner & Profile */}
                <div className={`bg-white shadow-sm overflow-hidden relative ${isPublicView ? 'border-y border-gray-200' : 'rounded-2xl border border-gray-200'}`}>
                    <div className="h-32 md:h-48 bg-[#0a192f] w-full relative overflow-hidden">
                        {/* Placeholder for banner image */}
                        {(meta.bannerUrl || company.bannerUrl) ? (
                            <img src={meta.bannerUrl || company.bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80 mix-blend-overlay" />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-indigo-900 opacity-90" />
                        )}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    </div>
                    
                    <div className="px-4 md:px-8 pb-4 md:pb-8">
                        <div className="flex flex-col md:flex-row justify-between items-start">
                            {/* Logo */}
                            <div className="-mt-12 md:-mt-16 relative z-10 self-start">
                                {company.logoUrl && !imageError ? (
                                    <img src={company.logoUrl} alt="Logo" onError={() => setImageError(true)} className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-white p-1 border-4 border-white shadow-md object-contain object-center" />
                                ) : (
                                    <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-white border-4 border-white flex items-center justify-center shadow-md text-blue-600 text-4xl md:text-5xl font-bold">
                                        {company.name ? company.name.charAt(0) : 'S'}
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-white p-1">
                                    <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-white" />
                                </div>
                            </div>

                            {/* Top Right Actions */}
                            <div className="flex items-center space-x-2 md:space-x-3 mt-4 self-end md:self-auto w-full md:w-auto justify-end">
                                <div className="flex items-center text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                    <Users className="h-4 w-4 mr-2 text-blue-600" />
                                    {meta.followersCount || '0'} Followers
                                </div>
                                <div className="hidden md:flex items-center text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                    <Eye className="h-4 w-4 mr-2 text-indigo-600" />
                                    {meta.profileViews || '0'} Profile Views
                                </div>
                                {!isPublicView && company.slug && (
                                    <a 
                                        href={(() => {
                                            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '180workspace.com';
                                            const protocol = (typeof window !== 'undefined' && window.location.protocol === 'https:') || (rootDomain !== 'localhost' && !rootDomain.includes('127.0.0.1')) ? 'https://' : 'http://';
                                            const port = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
                                            return `${protocol}${company.slug}.${rootDomain}${port}`;
                                        })()}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center px-3 md:px-4 py-1.5 md:py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors shadow-sm"
                                    >
                                        <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> View Public Profile
                                    </a>
                                )}
                                {!isPublicView && (
                                    <button onClick={() => setIsHeaderEditModalOpen(true)} className="flex items-center px-3 md:px-4 py-1.5 md:py-2 bg-white border border-gray-300 text-gray-700 text-xs md:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                                        Edit Profile
                                    </button>
                                )}
                                {isPublicView && (!currentUser || currentUser.companyId !== company.id) && (
                                    <button 
                                        onClick={handleFollowToggle}
                                        disabled={isFollowingLoading || isUnfollowingLoading || isFollowStatusLoading}
                                        className={`flex items-center px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-colors shadow-sm ${
                                            isFollowing 
                                                ? 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200' 
                                                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                        }`}
                                    >
                                        {(isFollowingLoading || isUnfollowingLoading) ? (
                                            <LogoLoader className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
                                        ) : isFollowing ? (
                                            <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> 
                                        ) : (
                                            <Users className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                        )}
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                )}
                                <a href={`mailto:${meta?.socialLinks?.adminEmail || ''}`} className="flex items-center px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                    <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Message
                                </a>
                            </div>
                        </div>

                        {/* Company Details */}
                        <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
                                    {company.name} <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-blue-500 ml-2" />
                                </h1>
                                <p className="text-gray-800 text-sm md:text-lg mt-1 font-medium">{company.oneLineDescription || 'No description provided'}</p>
                                
                                <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-2 mt-3 text-xs md:text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 text-gray-400" /> {company.headquarters || 'Not provided'}
                                    </div>
                                    <div className="flex items-center">
                                        <Globe className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 text-gray-400" /> 
                                        <a href={company.website || '#'} className="hover:text-blue-600 transition-colors">{company.website?.replace(/^https?:\/\//, '') || 'Not provided'}</a>
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 text-gray-400" /> Founded {company.foundedDate ? new Date(company.foundedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Not provided'}
                                    </div>
                                    <div className="flex items-center">
                                        <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 text-green-500" /> <span className="text-green-600 font-medium">{teamGrowthRate.startsWith('-') ? '↓' : '↑'} {teamGrowthRate.replace('-', '')} this year</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Target className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 text-blue-500" /> <span className="text-gray-600 font-medium mr-1">Startup Stage:</span> {company.startupStage || 'Startup'}
                                    </div>
                                    <div className="flex items-center">
                                        <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 text-yellow-500" /> <span className="text-gray-600 font-medium mr-1">180workspaceScore:</span> 
                                        <span className="font-bold text-gray-900 mr-1.5">92/100</span>
                                        <span className="text-[10px] md:text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-medium">Top 5% Companies</span>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Top Navigation */}
                <div className={`bg-white shadow-sm flex space-x-6 overflow-x-auto scrollbar-hide px-4 md:px-8 ${isPublicView ? 'border-y border-gray-200' : 'rounded-xl border border-gray-200'}`}>
                    {mainTabs.map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveMainTab(tab)}
                            className={`py-4 px-2 whitespace-nowrap font-medium text-sm border-b-2 transition-colors ${activeMainTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content Rendering */}
                {activeMainTab === 'Overview' && <OverviewTab company={company} isPublicView={isPublicView} onProfileUpdate={onProfileUpdate} />}
                {activeMainTab === 'About' && <AboutTab company={company} isPublicView={isPublicView} onProfileUpdate={onProfileUpdate} />}
                {activeMainTab === 'Offerings' && <OfferingsTab company={company} />}
                {activeMainTab === 'Jobs' && <JobsTab company={company} />}

                <CompanyHeaderEditModal 
                    company={company} 
                    isOpen={isHeaderEditModalOpen} 
                    onClose={() => setIsHeaderEditModalOpen(false)} 
                    onSave={handleHeaderSave} 
                />

            </div>
        </div>
    );
}

// Custom icon for Sequoia
function LeafIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}
