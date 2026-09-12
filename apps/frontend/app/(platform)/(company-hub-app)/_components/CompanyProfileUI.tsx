"use client";

import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect, useRef } from 'react';
import { 
    Building, MapPin, Globe, Calendar, Users, DollarSign, 
    Trophy, ArrowRight, CheckCircle2, ChevronDown, Clock, Eye, 
    Mail, Phone, Target, Briefcase, FileText, Map, Activity, 
    MonitorSmartphone, Code, Cpu, BarChart, ExternalLink, Camera, Upload, Sparkles
} from 'lucide-react';
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
import ImageCropModal, { AspectRatioOption } from '@/components/shared/ImageCropModal';

interface CompanyProfileUIProps {
    companyData: any;
    isLoading: boolean;
    isPublicView?: boolean;
    onProfileUpdate?: () => void;
}

const BANNER_ASPECT_RATIOS: AspectRatioOption[] = [
    { label: "3:1 Wide Banner", value: 3 / 1, description: "Best for Profile Header" },
    { label: "16:9 Landscape", value: 16 / 9, description: "Standard Banner" },
    { label: "4:1 Ultra-wide", value: 4 / 1, description: "Panoramic Header" },
    { label: "2:1 Classic", value: 2 / 1, description: "Compact Banner" },
];

const LOGO_ASPECT_RATIOS: AspectRatioOption[] = [
    { label: "1:1 Square / Circle", value: 1 / 1, description: "Standard Avatar / Logo" },
    { label: "4:3 Standard", value: 4 / 3, description: "Classic Logo" },
];

export function CompanyProfileUI({ companyData, isLoading, isPublicView = false, onProfileUpdate }: CompanyProfileUIProps) {
    const currentUser = useSelector((state: any) => state.auth?.user);

    const [company, setCompany] = useState<any>(companyData || {
        name: 'Company Name',
        description: '',
        website: '',
        industry: '',
        foundedYear: '',
        teamSize: '',
        headquarters: '',
    });

    useEffect(() => {
        if (companyData) {
            setCompany(companyData);
        }
    }, [companyData]);

    let meta: any = {};
    try {
        meta = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {});
    } catch (e) {}

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const tabFromUrl = searchParams?.get('tab');

    const [activeMainTab, setActiveMainTabState] = useState(tabFromUrl || 'Overview');
    const [isHeaderEditModalOpen, setIsHeaderEditModalOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    // Direct Image Upload & Crop State
    const bannerFileInputRef = useRef<HTMLInputElement>(null);
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const [cropModal, setCropModal] = useState<{
        isOpen: boolean;
        type: 'banner' | 'logo';
        imageSrc: string;
    }>({
        isOpen: false,
        type: 'banner',
        imageSrc: '',
    });
    const [uploadingImage, setUploadingImage] = useState<'banner' | 'logo' | null>(null);

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
        const params = new URLSearchParams(searchParams?.toString() || '');
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
                setCompany((prev: any) => ({ ...prev, ...data }));
                toast.success('Company profile updated successfully!');
                if (onProfileUpdate) {
                    onProfileUpdate();
                }
            }
        } catch (e: any) {
            console.error(e);
            toast.error(e?.response?.data?.message || 'Failed to update profile');
            throw e;
        }
    };

    // Trigger file selection for banner
    const handleBannerClick = () => {
        if (isPublicView) return;
        bannerFileInputRef.current?.click();
    };

    // Trigger file selection for logo
    const handleLogoClick = () => {
        if (isPublicView) return;
        logoFileInputRef.current?.click();
    };

    const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'logo') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Verify valid image type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropModal({
                isOpen: true,
                type,
                imageSrc: reader.result as string,
            });
        };
        reader.readAsDataURL(file);
        // Reset input value so same file can be re-selected if desired
        e.target.value = '';
    };

    // Handle Cropped Image Upload
    const handleCropComplete = async (croppedBlob: Blob) => {
        const type = cropModal.type;
        setCropModal(prev => ({ ...prev, isOpen: false }));
        setUploadingImage(type);

        const formData = new FormData();
        const filename = `${type}_${Date.now()}.jpg`;
        formData.append('file', croppedBlob, filename);

        try {
            const res = await api.post('/api/branding/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const uploadedUrl = res.data?.url;
            if (!uploadedUrl) throw new Error('Upload did not return a valid URL');

            if (type === 'banner') {
                await handleHeaderSave({ bannerUrl: uploadedUrl });
            } else {
                await handleHeaderSave({ logoUrl: uploadedUrl });
                setImageError(false);
            }
            toast.success(`${type === 'banner' ? 'Banner' : 'Logo'} updated successfully!`);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || `Failed to upload ${type}`);
        } finally {
            setUploadingImage(null);
        }
    };

    // Handle View Public Profile Navigation
    const handleViewPublicProfile = () => {
        const slug = company.slug || company.id;
        if (!slug) {
            toast.error('Workspace domain is not configured.');
            return;
        }

        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        if (isLocal) {
            // In local development, opening /sites/:slug guarantees direct public rendering
            window.open(`/sites/${slug}`, '_blank', 'noopener,noreferrer');
        } else {
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '180workspace.com';
            const protocol = window.location.protocol || 'https:';
            window.open(`${protocol}//${slug}.${rootDomain}`, '_blank', 'noopener,noreferrer');
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
    ];

    const currentBannerUrl = company.bannerUrl || meta.bannerUrl;

    return (
        <div className="max-w-6xl mx-auto pb-12 bg-gray-50/50 min-h-screen w-full">
            {/* Hidden File Inputs for Direct Banner & Logo Upload */}
            <input 
                type="file" 
                ref={bannerFileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleFileChosen(e, 'banner')} 
            />
            <input 
                type="file" 
                ref={logoFileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleFileChosen(e, 'logo')} 
            />

            {/* Image Crop Modal with Aspect Ratio Selector */}
            {cropModal.isOpen && (
                <ImageCropModal
                    imageSrc={cropModal.imageSrc}
                    title={cropModal.type === 'banner' ? "Crop & Adjust Banner" : "Crop & Adjust Company Logo"}
                    aspectRatio={cropModal.type === 'banner' ? 3 / 1 : 1 / 1}
                    allowedRatios={cropModal.type === 'banner' ? BANNER_ASPECT_RATIOS : LOGO_ASPECT_RATIOS}
                    cropShape={cropModal.type === 'banner' ? "rect" : "round"}
                    onCropComplete={handleCropComplete}
                    onClose={() => setCropModal(prev => ({ ...prev, isOpen: false }))}
                />
            )}

            <div className={`space-y-8 ${isPublicView ? 'p-0' : 'p-4 md:p-8'}`}>
                {/* Header Banner & Profile */}
                <div className={`bg-white shadow-sm overflow-hidden relative ${isPublicView ? 'border-y border-gray-200' : 'rounded-2xl border border-gray-200'}`}>
                    
                    {/* Banner Section with Direct Click to Upload & Hover Overlay */}
                    <div 
                        onClick={handleBannerClick}
                        className={`h-36 sm:h-48 md:h-56 bg-[#0a192f] w-full relative overflow-hidden group ${!isPublicView ? 'cursor-pointer' : ''}`}
                        title={!isPublicView ? "Click to change banner image" : undefined}
                    >
                        {/* Banner Image */}
                        {currentBannerUrl ? (
                            <img 
                                src={currentBannerUrl} 
                                alt="Company Banner" 
                                className="w-full h-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105" 
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 opacity-95" />
                        )}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15"></div>

                        {/* Banner Hover Overlay for Admins */}
                        {!isPublicView && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <div className="px-4 py-2 bg-white/90 text-gray-900 font-semibold text-xs sm:text-sm rounded-full shadow-lg flex items-center space-x-2 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                                    {uploadingImage === 'banner' ? (
                                        <LogoLoader className="w-4 h-4 animate-spin text-blue-600" />
                                    ) : (
                                        <Camera className="w-4 h-4 text-blue-600" />
                                    )}
                                    <span>{uploadingImage === 'banner' ? 'Uploading Banner...' : 'Click to Change Banner (Crop & Adjust)'}</span>
                                </div>
                            </div>
                        )}

                        {/* Top-Right Quick Banner Button */}
                        {!isPublicView && (
                            <div className="absolute top-3 right-3 z-10">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleBannerClick();
                                    }}
                                    className="px-3 py-1.5 bg-black/50 hover:bg-black/75 text-white text-xs font-medium rounded-lg backdrop-blur-md transition-all flex items-center space-x-1.5 border border-white/20 shadow-sm"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Edit Banner</span>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="px-4 md:px-8 pb-4 md:pb-8">
                        <div className="flex flex-col md:flex-row justify-between items-start">
                            
                            {/* Logo with Click to Upload & Hover Overlay */}
                            <div className="-mt-14 sm:-mt-16 md:-mt-20 relative z-10 self-start group">
                                <div 
                                    onClick={handleLogoClick}
                                    className={`relative ${!isPublicView ? 'cursor-pointer' : ''}`}
                                    title={!isPublicView ? "Click to change logo" : undefined}
                                >
                                    {company.logoUrl && !imageError ? (
                                        <img 
                                            src={company.logoUrl} 
                                            alt="Logo" 
                                            onError={() => setImageError(true)} 
                                            className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-full bg-white p-1.5 border-4 border-white shadow-lg object-contain object-center transition-transform group-hover:scale-105" 
                                        />
                                    ) : (
                                        <div className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border-4 border-white flex items-center justify-center shadow-lg text-white text-3xl sm:text-4xl md:text-5xl font-extrabold transition-transform group-hover:scale-105">
                                            {company.name ? company.name.charAt(0).toUpperCase() : 'S'}
                                        </div>
                                    )}

                                    {/* Logo Hover Overlay */}
                                    {!isPublicView && (
                                        <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-4 border-white">
                                            <div className="text-white text-center p-1">
                                                {uploadingImage === 'logo' ? (
                                                    <LogoLoader className="w-5 h-5 animate-spin mx-auto text-white" />
                                                ) : (
                                                    <Camera className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-white" />
                                                )}
                                                <span className="text-[10px] sm:text-xs font-semibold block mt-0.5">Edit Logo</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Verified Badge */}
                                    <div className="absolute bottom-1 right-1 bg-green-500 rounded-full border-2 border-white p-1 shadow-sm">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                    </div>
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

                                {/* View Public Profile Button */}
                                {!isPublicView && (
                                    <button 
                                        type="button"
                                        onClick={handleViewPublicProfile}
                                        className="flex items-center px-3 md:px-4 py-1.5 md:py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs md:text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" /> 
                                        <span>View Public Profile</span>
                                    </button>
                                )}

                                {!isPublicView && (
                                    <button 
                                        onClick={() => setIsHeaderEditModalOpen(true)} 
                                        className="flex items-center px-3 md:px-4 py-1.5 md:py-2 bg-white border border-gray-300 text-gray-700 text-xs md:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                    >
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
