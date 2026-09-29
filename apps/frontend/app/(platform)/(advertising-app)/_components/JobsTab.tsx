"use client";
import React from 'react';
import { Briefcase, MapPin, DollarSign, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TabProps {
    company: any;
}

export function JobsTab({ company }: TabProps) {
    const jobs = company.jobs?.length > 0 ? company.jobs : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Open Positions</h2>
                    <p className="text-sm text-gray-500 mt-1">Join our team and help us build the future</p>
                </div>
            </div>

            <div className="space-y-4">
                {jobs.map((job: any) => (
                    <div key={job.id} className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <Link href={`/company/${company.id}/jobs/${job.id}`} className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {job.title}
                                </Link>
                                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <Briefcase className="h-4 w-4 mr-1.5 text-gray-400" />
                                        {job.department}
                                    </div>
                                    <div className="flex items-center">
                                        <MapPin className="h-4 w-4 mr-1.5 text-gray-400" />
                                        {job.location}
                                    </div>
                                    <div className="flex items-center">
                                        <DollarSign className="h-4 w-4 mr-1.5 text-gray-400" />
                                        {job.salaryRangeMin ? `${job.currency || '$'}${job.salaryRangeMin} - ${job.salaryRangeMax}` : (job.salary || 'Competitive')}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col md:items-end gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-md">
                                        {job.type}
                                    </span>
                                    <span className="flex items-center text-xs text-gray-500">
                                        <Clock className="h-3.5 w-3.5 mr-1" />
                                        {new Date(job.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <Link 
                                    href={`/company/${company.id}/jobs/${job.id}`}
                                    className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    View Details <ArrowRight className="h-4 w-4 ml-1.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
                
                {jobs.length === 0 && (
                    <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No open positions</h3>
                        <p className="text-gray-500 text-sm">Check back later for new opportunities.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
