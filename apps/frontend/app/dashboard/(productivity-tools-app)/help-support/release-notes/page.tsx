'use client';

import { LogoLoader } from "@workspace/ui";
import React from 'react';
import { Rocket, Sparkles, Wrench, Bug, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useGetReleaseNotesQuery } from '@/redux/api/releaseNotesApi';

export default function ReleaseNotesPage() {
    const { data: releaseNotesData, isLoading, isError } = useGetReleaseNotesQuery();

    const releases = releaseNotesData?.data?.releaseNotes || [];

    return (
        <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div>
                <Link href="/dashboard/help-support" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Back to Help & Support
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Release Notes</h1>
                <p className="text-gray-500 mt-2">Stay up to date with the latest features, improvements, and bug fixes.</p>
            </div>

            {isLoading && (
                <div className="p-12 flex justify-center items-center">
                    <LogoLoader className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            )}
            
            {isError && (
                <div className="p-12 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Failed to load release notes</h3>
                    <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
                </div>
            )}

            {!isLoading && !isError && releases.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                    No release notes available at the moment.
                </div>
            )}

            {!isLoading && !isError && releases.length > 0 && (
                <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {releases.map((release: any, index: number) => (
                        <div key={release._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                <Rocket className="h-4 w-4" />
                            </div>
                            
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-xl text-gray-900">{release.version}</h3>
                                    <time className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{new Date(release.releaseDate).toLocaleDateString()}</time>
                                </div>
                                
                                <div className="space-y-4">
                                    {release.features && release.features.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider flex items-center">
                                                <Sparkles className="h-3 w-3 mr-1.5 text-amber-500" /> New Features
                                            </h4>
                                            <ul className="space-y-3">
                                                {release.features.map((feature: any, i: number) => (
                                                    <li key={i} className="text-sm">
                                                        <span className="font-medium text-gray-900">{feature.title}:</span> <span className="text-gray-600">{feature.description}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {release.fixes && release.fixes.length > 0 && (
                                        <div className="pt-2">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider flex items-center">
                                                <Wrench className="h-3 w-3 mr-1.5 text-blue-500" /> Fixes & Improvements
                                            </h4>
                                            <ul className="space-y-2">
                                                {release.fixes.map((fix: string, i: number) => (
                                                    <li key={i} className="text-sm text-gray-600 flex items-start">
                                                        <Bug className="h-3.5 w-3.5 mr-2 mt-0.5 text-gray-400 shrink-0" />
                                                        {fix}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
