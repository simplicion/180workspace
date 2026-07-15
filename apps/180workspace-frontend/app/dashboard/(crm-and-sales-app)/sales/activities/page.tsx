'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
    Activity, Phone, Mail, Users, CheckCircle2, Search, Filter, Plus, Calendar
} from 'lucide-react';
import { Skeleton } from "@workspace/ui";
import Link from 'next/link';
import LogActivityModal from '@/app/dashboard/(crm-and-sales-app)/_components/LogActivityModal';
import toast from 'react-hot-toast';

export default function ActivitiesPage() {
    const { user } = useAuth();
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showLogModal, setShowLogModal] = useState(false);

    const fetchActivities = () => {
        setLoading(true);
        api.get('/api/sales/activities')
            .then(({ data }) => setActivities(data.activities || data))
            .catch(() => setError('Failed to load activities'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    const filteredActivities = activities.filter(a =>
        a.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.relatedLead?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.relatedContact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.relatedAccount?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.relatedDeal?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getIcon = (type: string) => {
        switch (type) {
            case 'call': return <Phone className="w-5 h-5" />;
            case 'email': return <Mail className="w-5 h-5" />;
            case 'meeting': return <Users className="w-5 h-5" />;
            default: return <CheckCircle2 className="w-5 h-5" />;
        }
    };

    return (
        <div>
            <div className="page-header flex justify-between items-start">
                <div>
                    <h1 className="page-title text-indigo-900 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-600" />
                        Sales Activities
                    </h1>
                    <p className="page-subtitle mt-1">Track all calls, emails, meetings, and tasks across your accounts and deals.</p>
                </div>
                <button 
                    onClick={() => setShowLogModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Log Activity
                </button>
            </div>

            {error && (
                <div className="text-red-600 bg-red-50 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            <div className="card overflow-hidden mt-4">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
                    <div className="relative max-w-sm w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by notes or related names..."
                            className="input pl-10 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                                <th className="p-4">Type</th>
                                <th className="p-4">Details</th>
                                <th className="p-4">Related To</th>
                                <th className="p-4">Owner</th>
                                <th className="p-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="p-4"><Skeleton variant="text" width="60px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="200px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="140px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="100px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="120px" /></td>
                                    </tr>
                                ))
                            ) : filteredActivities.length > 0 ? (
                                filteredActivities.map(activity => (
                                    <tr key={activity.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border border-white bg-indigo-50 text-indigo-600 shadow flex items-center justify-center flex-shrink-0">
                                                    {getIcon(activity.type)}
                                                </div>
                                                <div className="font-medium text-gray-900 capitalize">{activity.type}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-gray-600 max-w-md truncate">
                                                {activity.notes || '-'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="flex flex-col gap-1">
                                                {activity.relatedDeal && (
                                                    <Link href={`/dashboard/sales/opportunities`} className="text-indigo-600 hover:underline block truncate">
                                                        Deal: {activity.relatedDeal.title}
                                                    </Link>
                                                )}
                                                {activity.relatedContact && (
                                                    <Link href={`/dashboard/sales/contacts/${activity.relatedContact.id}`} className="text-indigo-600 hover:underline block truncate">
                                                        Contact: {activity.relatedContact.name}
                                                    </Link>
                                                )}
                                                {activity.relatedAccount && (
                                                    <Link href={`/dashboard/sales/accounts`} className="text-indigo-600 hover:underline block truncate">
                                                        Account: {activity.relatedAccount.companyName}
                                                    </Link>
                                                )}
                                                {activity.relatedLead && (
                                                    <Link href={`/dashboard/sales/leads`} className="text-indigo-600 hover:underline block truncate">
                                                        Lead: {activity.relatedLead.name}
                                                    </Link>
                                                )}
                                                {!activity.relatedDeal && !activity.relatedContact && !activity.relatedAccount && !activity.relatedLead && (
                                                    <span className="text-gray-400">â€”</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-900 font-medium">
                                            {activity.owner?.name || 'System'}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            {new Date(activity.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        <Activity className="w-8 h-8 opacity-20 mx-auto mb-3" />
                                        No sales activities found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showLogModal && (
                <LogActivityModal 
                    onClose={() => setShowLogModal(false)}
                    onSuccess={fetchActivities}
                />
            )}
        </div>
    );
}

