"use client";

import React, { useState } from 'react';
import { Building, MapPin, Globe, Calendar, Users, TrendingUp, Trophy, Clock, Eye, Mail, Phone, Target, Briefcase, FileText, Map, Activity, MonitorSmartphone, Code, Cpu, BarChart, CheckCircle2 } from 'lucide-react';
import { CompanyOverviewEditModal } from './CompanyOverviewEditModal';
import { MediaTab } from './MediaTab';
import { ReviewsTab } from './ReviewsTab';
import api from '@/lib/api';

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

interface OverviewTabProps {
    company: any;
    isPublicView?: boolean;
    onProfileUpdate?: () => void;
}

export function OverviewTab({ company, isPublicView, onProfileUpdate }: OverviewTabProps) {
    const [isOverviewEditModalOpen, setIsOverviewEditModalOpen] = useState(false);

    const handleOverviewSave = async (data: any) => {
        try {
            const res = await api.put(`/api/company-profile`, data);
            if (res.status === 200) {
                if (onProfileUpdate) {
                    onProfileUpdate();
                } else {
                    window.location.reload();
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const financials = company.calculatedFinancials || {
        businessStatus: 'Profitable',
        annualRevenue: '0.00',
        burnRate: '0.00',
        totalIncome: 0,
        totalExpenses: 0
    };
    const teamGrowthRate = company.teamGrowth || '0%';
    const startupStage = company.evaluatedStartupStage || 'Growth Stage';

    let meta: any = {};
    try { meta = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {}); } catch(e) {}
    const highlights = meta.companyHighlights || [];
    
    let socialLinks: any = {};
    try { socialLinks = typeof company.socialLinks === 'string' ? JSON.parse(company.socialLinks) : (company.socialLinks || {}); } catch(e) {}


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">




            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* About Section */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">About {company.name || 'Company'}</h2>
                        {!isPublicView && (
                            <button onClick={() => setIsOverviewEditModalOpen(true)} className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                                Edit Overview
                            </button>
                        )}
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-6 text-sm whitespace-pre-wrap">
                        {company.aboutUs || 'No description provided.'}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-8">
                        {company.tagline && company.tagline.split(',').map((tag: string) => (
                            <span key={tag} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-md border border-gray-200">
                                {tag.trim()}
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Globe className="h-3.5 w-3.5 mr-2" /> Country
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company.country || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <MapPin className="h-3.5 w-3.5 mr-2" /> Headquarters
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company.headquarters || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <FileText className="h-3.5 w-3.5 mr-2" /> Legal Name
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company.name || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Map className="h-3.5 w-3.5 mr-2" /> Other Offices
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company.otherOffices || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Calendar className="h-3.5 w-3.5 mr-2" /> Founded
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company.foundedDate ? new Date(company.foundedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Target className="h-3.5 w-3.5 mr-2" /> Specialties
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm leading-snug">{company.industry || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Globe className="h-3.5 w-3.5 mr-2" /> Website
                            </div>
                            <a href={company.website || '#'} className="text-blue-600 font-medium pl-5 text-sm hover:underline">{company.website || 'Not provided'}</a>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Mail className="h-3.5 w-3.5 mr-2" /> Email
                            </div>
                            <a href={`mailto:${company.adminEmail}`} className="text-blue-600 font-medium pl-5 text-sm hover:underline">{company.adminEmail || 'Not provided'}</a>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Briefcase className="h-3.5 w-3.5 mr-2" /> Industry
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company.industry || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Phone className="h-3.5 w-3.5 mr-2" /> Phone
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company.adminPhone || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Users className="h-3.5 w-3.5 mr-2" /> Company Size
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company.teamSize || company._count?.users || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <TrendingUp className="h-3.5 w-3.5 mr-2" /> Team Growth Rate
                            </div>
                            <div className="text-green-600 font-bold pl-5 text-sm">{teamGrowthRate}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Briefcase className="h-3.5 w-3.5 mr-2" /> Products Built
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company._count?.products || '0'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-1 font-medium">
                                <Users className="h-3.5 w-3.5 mr-2" /> Happy Clients
                            </div>
                            <div className="text-gray-900 font-medium pl-5 text-sm">{company._count?.clients_CompanyClients || '0'}</div>
                        </div>
                        <div>
                            <div className="flex items-center text-gray-500 text-xs mb-2 font-medium">
                                <Globe className="h-3.5 w-3.5 mr-2" /> Social links
                            </div>
                            <div className="flex space-x-2 pl-5">
                                {socialLinks.linkedin && <a href={socialLinks.linkedin} target="_blank" rel="noreferrer" className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-gray-200"><span className="font-bold text-[10px]">in</span></a>}
                                {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noreferrer" className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-400 transition-colors border border-gray-200"><span className="font-bold text-[10px]">tw</span></a>}
                                {socialLinks.youtube && <a href={socialLinks.youtube} target="_blank" rel="noreferrer" className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"><span className="font-bold text-[10px]">yt</span></a>}
                                {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-pink-50 hover:text-pink-600 transition-colors border border-gray-200"><span className="font-bold text-[10px]">ig</span></a>}
                                {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-gray-200"><span className="font-bold text-[10px]">fb</span></a>}
                                {socialLinks.tiktok && <a href={socialLinks.tiktok} target="_blank" rel="noreferrer" className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-black hover:text-white transition-colors border border-gray-200"><span className="font-bold text-[10px]">tk</span></a>}
                                {socialLinks.pinterest && <a href={socialLinks.pinterest} target="_blank" rel="noreferrer" className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"><span className="font-bold text-[10px]">pt</span></a>}
                                {socialLinks.github && <a href={socialLinks.github} target="_blank" rel="noreferrer" className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors border border-gray-200"><span className="font-bold text-[10px]">gh</span></a>}
                                {socialLinks.discord && <a href={socialLinks.discord} target="_blank" rel="noreferrer" className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-gray-200"><span className="font-bold text-[10px]">dc</span></a>}
                                {!Object.values(socialLinks).some(Boolean) && <span className="text-gray-400 text-xs">No links added</span>}
                            </div>
                        </div>
                    </div>
                    
                    {/* Media Tab Component */}
                    <div className="mt-8">
                        <MediaTab company={company} isOwner={!isPublicView} />
                    </div>
                    
                    {/* Reviews Tab Component */}
                    <div className="mt-8">
                        <ReviewsTab company={company} />
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6 h-full">


                </div>
            </div>





            <CompanyOverviewEditModal 
                company={company} 
                isOpen={isOverviewEditModalOpen} 
                onClose={() => setIsOverviewEditModalOpen(false)} 
                onSave={handleOverviewSave} 
            />
        </div>
    );
}
