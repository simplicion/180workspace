"use client";
import React from 'react';
import { ArrowLeft, MapPin, Briefcase, DollarSign, Clock, Building2, CheckCircle2, ChevronRight, Share2, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function JobDetailsPage() {
    const params = useParams();
    const jobId = params?.id;

    // In a real app, you would fetch job details based on jobId.
    const job = {
        title: "Senior Frontend Engineer",
        department: "Engineering",
        location: "San Francisco, CA (Hybrid)",
        type: "Full-time",
        salary: "$140k - $180k",
        postedAt: "2 days ago",
        company: "Demo Company",
        description: "We are looking for a Senior Frontend Engineer to join our core product team. You will be responsible for architecting and building complex user interfaces for our AI-powered workspace platform. If you love React, performance optimization, and creating magical user experiences, we'd love to talk.",
        requirements: [
            "5+ years of experience building complex web applications",
            "Deep expertise in React, Next.js, and TypeScript",
            "Strong understanding of modern CSS (Tailwind, CSS Modules)",
            "Experience with state management (Redux, Zustand, etc.)",
            "Passion for UI/UX and product design"
        ],
        benefits: [
            "Competitive salary and equity package",
            "Comprehensive health, dental, and vision insurance",
            "Flexible PTO and remote work options",
            "Learning and development budget ($2k/year)",
            "Home office setup stipend"
        ]
    };

    return (
        <div className="max-w-4xl mx-auto pb-12 w-full animate-in fade-in duration-500">
            {/* Breadcrumb & Navigation */}
            <div className="mb-6 flex items-center justify-between">
                <Link href="/dashboard/company/profile" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Company Profile
                </Link>
                <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                        <Share2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                        <Bookmark className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Header Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full opacity-60 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
                    <div>
                        <div className="flex items-center space-x-2 mb-3">
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                                {job.department}
                            </span>
                            <span className="flex items-center text-xs text-gray-500 font-medium">
                                <Clock className="h-3.5 w-3.5 mr-1" /> {job.postedAt}
                            </span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{job.title}</h1>
                        <div className="flex items-center text-gray-600 mt-2">
                            <Building2 className="h-4 w-4 mr-1.5" /> 
                            <span className="font-medium">{job.company}</span>
                        </div>
                    </div>
                    
                    <button className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-200 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        Apply Now
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
                    <div className="flex flex-col space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400" /> Location
                        </span>
                        <span className="font-medium text-gray-900">{job.location}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center">
                            <Briefcase className="h-3.5 w-3.5 mr-1 text-gray-400" /> Job Type
                        </span>
                        <span className="font-medium text-gray-900">{job.type}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center">
                            <DollarSign className="h-3.5 w-3.5 mr-1 text-gray-400" /> Salary
                        </span>
                        <span className="font-medium text-gray-900">{job.salary}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center">
                            <Building2 className="h-3.5 w-3.5 mr-1 text-gray-400" /> Work Setup
                        </span>
                        <span className="font-medium text-gray-900">Hybrid</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">About the Role</h2>
                        <p className="text-gray-600 leading-relaxed">
                            {job.description}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">What you'll need</h2>
                        <ul className="space-y-3">
                            {job.requirements.map((req, idx) => (
                                <li key={idx} className="flex items-start">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 shrink-0 mt-0.5" />
                                    <span className="text-gray-600 leading-relaxed">{req}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Benefits & Perks</h2>
                        <ul className="space-y-3">
                            {job.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start">
                                    <CheckCircle2 className="h-5 w-5 text-blue-500 mr-3 shrink-0 mt-0.5" />
                                    <span className="text-gray-600 leading-relaxed">{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">About the Company</h3>
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="h-12 w-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-blue-600 font-bold text-xl">
                                {job.company.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{job.company}</h4>
                                <Link href="/dashboard/company/profile" className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                                    View profile <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                                </Link>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Building AI-Powered Workspace Solutions for Startups & Teams to automate operations and grow faster.
                        </p>
                        <div className="space-y-2 text-sm text-gray-500">
                            <div className="flex items-center"><MapPin className="h-4 w-4 mr-2" /> San Francisco, CA</div>
                            <div className="flex items-center"><Briefcase className="h-4 w-4 mr-2" /> 10-50 Employees</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
