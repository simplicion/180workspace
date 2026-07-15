'use client';
import React, { useState } from 'react';
import { useGetServiceRequestsQuery } from '@/redux/api/companyApi';
import { Mail, Clock, Search, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function ServiceResponsesPage() {
    const { data: response, isLoading } = useGetServiceRequestsQuery(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    const requests = response?.data || [];

    const filteredRequests = requests.filter((req: any) => 
        req.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        req.requesterEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.service?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto py-8 px-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Service Responses</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and view requests from potential clients for your services.</p>
                </div>
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by name, email, or service..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
                        <Mail className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No requests found</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                        {searchTerm ? 'No requests match your search criteria.' : 'You haven\'t received any service requests yet.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-600">Requester</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600">Service Requested</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600">Date</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600">Requirements</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRequests.map((request: any) => (
                                    <tr key={request.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{request.requesterName}</div>
                                            <div className="text-gray-500 mt-0.5">{request.requesterEmail}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs">
                                                {request.service?.name || 'Unknown Service'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-gray-500 whitespace-nowrap">
                                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                                {format(new Date(request.createdAt), 'MMM d, yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-gray-600 line-clamp-2 max-w-xs" title={request.requirements}>
                                                {request.requirements}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a 
                                                href={`mailto:${request.requesterEmail}?subject=Re: Request for ${request.service?.name}`}
                                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                Reply <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
