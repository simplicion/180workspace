'use client';

import React, { useState } from 'react';
import { Search, Book, FileText, ChevronRight, Video, HelpCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const categories = [
    { title: 'Getting Started', icon: Book, articles: 12 },
    { title: 'Account Management', icon: FileText, articles: 8 },
    { title: 'Billing & Subscriptions', icon: FileText, articles: 5 },
    { title: 'Video Tutorials', icon: Video, articles: 20 },
    { title: 'Troubleshooting', icon: HelpCircle, articles: 15 },
];

export default function DocsPage() {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <Link href='/help-support' className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        Back to Help & Support
                    </Link>
                </div>
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Documentation</h1>
                <p className="text-gray-500 mt-2">Find guides, tutorials, and answers to common questions.</p>
            </div>

            <div className="bg-white rounded-2xl border-none shadow-sm overflow-hidden">
                <div className="p-6">
                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search for articles..." 
                            className="w-full pl-10 h-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category, index) => (
                    <div key={index} className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer group shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 flex flex-col h-full">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <category.icon className="h-5 w-5" />
                            </div>
                            <h3 className="font-medium text-gray-900">{category.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{category.articles} articles</p>
                            
                            <div className="mt-auto pt-4 flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                View articles <ChevronRight className="h-4 w-4 ml-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Popular Articles */}
            <div className="bg-white rounded-2xl border border-gray-100 mt-8 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Popular Articles</h3>
                </div>
                <div className="p-0">
                    <div className="divide-y divide-gray-100">
                        {['How to invite team members', 'Setting up two-factor authentication', 'Understanding your billing cycle', 'Integrating with third-party apps'].map((article, index) => (
                            <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                                <div className="flex items-center space-x-3">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">{article}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

