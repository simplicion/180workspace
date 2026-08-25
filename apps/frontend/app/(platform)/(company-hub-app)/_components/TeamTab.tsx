"use client";
import React from 'react';
import { Mail, Linkedin, Twitter, ExternalLink, Award, Users } from 'lucide-react';
import Link from 'next/link';

interface TabProps {
    company: any;
}

export function TeamTab({ company }: TabProps) {
    const teamMembers = company?.users && company.users.length > 0 ? company.users : [];

    const departments = ["All", ...Array.from(new Set(teamMembers.map((m: any) => m.department || 'General')))];
    const [activeDepartment, setActiveDepartment] = React.useState("All");

    const filteredTeam = activeDepartment === "All" 
        ? teamMembers 
        : teamMembers.filter((m: any) => (m.department || 'General') === activeDepartment);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Filters */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Meet Our Team</h2>
                    <p className="text-gray-500">The passionate people behind our success.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {departments.map((dept: any) => (
                        <button
                            key={dept}
                            onClick={() => setActiveDepartment(dept as string)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                activeDepartment === dept
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {dept as string}
                        </button>
                    ))}
                </div>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTeam.map((member: any) => (
                    <Link href={`/profile/${member.id}`} key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group block">
                        <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
                            {member.bannerImage && (
                                <img src={member.bannerImage} alt="banner" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                            )}
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                        </div>
                        <div className="px-6 pb-6 relative">
                            <div className="flex justify-between items-end mb-4 -mt-12">
                                <div className="relative">
                                    {member.image || member.photoUrl ? (
                                        <img 
                                            src={member.image || member.photoUrl} 
                                            alt={member.name || 'User'}
                                            className="w-24 h-24 rounded-2xl border-4 border-white object-cover bg-white shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-2xl border-4 border-white bg-gray-100 shadow-sm flex items-center justify-center text-gray-400">
                                            <Users className="w-8 h-8" />
                                        </div>
                                    )}
                                    {member.department === "Leadership" && (
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center border-2 border-white text-orange-600" title="Leadership Team">
                                            <Award className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 mb-2">
                                    {member.socialLinks?.linkedin && (
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
                                            <Linkedin className="w-4 h-4" />
                                        </div>
                                    )}
                                    {member.socialLinks?.twitter && (
                                        <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors">
                                            <Twitter className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{member.name}</h3>
                                <p className="text-sm font-medium text-blue-600 mb-1">{member.title || member.role || 'Team Member'}</p>
                                <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md mb-3">
                                    {member.department || 'General'}
                                </span>
                                {member.bio && (
                                    <p className="text-sm text-gray-600 line-clamp-3">
                                        {member.bio}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
                {filteredTeam.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No team members yet</h3>
                        <p className="text-gray-500 text-sm">Users connected to this company will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
