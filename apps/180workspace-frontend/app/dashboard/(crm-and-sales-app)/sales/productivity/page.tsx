'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Crown, User, TrendingUp, AlertCircle, Briefcase, Zap } from 'lucide-react';
import { Skeleton,  SkeletonStatsCard  } from "@workspace/ui";
import clsx from 'clsx';

interface RepData { id?: string;
    _id: string;
    name: string;
    email: string;
    score: number;
    dealsClosed: number;
}

export default function RepProductivityPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<{
        myScore: number;
        leaderboard: RepData[];
        suggestedRepForNextLead: { _id: string, name: string } | null;
    } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await api.get('/api/sales/productivity');
                setData(res.data);
            } catch (err: any) {
                console.error('Error fetching productivity data', err);
                setError(err.response?.data?.message || 'Failed to load productivity data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold font-heading text-gray-900 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-3 text-indigo-600" />
                    Sales Representative Productivity
                </h1>
                <p className="text-gray-500 mt-1">Leaderboards, Productivity Scores, and Workload Balancing Recommendations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Your Score */}
                {loading ? (
                    <Skeleton height="150px" />
                ) : (
                    <div className="card p-6 flex items-center justify-between border-t-4 border-indigo-500">
                        <div>
                            <h2 className="text-gray-500 font-medium mb-1">Your Productivity Score</h2>
                            <p className="text-5xl font-extrabold text-indigo-700">
                                {data?.myScore || 0} <span className="text-xl text-gray-400 font-normal">/ 100</span>
                            </p>
                        </div>
                        <div className="bg-indigo-100 p-4 rounded-full">
                            <Zap className="w-10 h-10 text-indigo-600" />
                        </div>
                    </div>
                )}

                {/* Suggested Assignment */}
                {loading ? (
                    <Skeleton height="150px" />
                ) : (
                    <div className="card p-6 border-t-4 border-emerald-500">
                        <h2 className="text-gray-500 font-medium mb-1">Workload Auto-Balancer Recommendation</h2>
                        <div className="flex items-center mt-4">
                            <div className="bg-emerald-100 p-3 rounded-full mr-4">
                                <Briefcase className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Suggested Rep for Next Incoming Lead:</p>
                                {data?.suggestedRepForNextLead ? (
                                    <p className="text-xl font-bold text-gray-900">{data.suggestedRepForNextLead.name}</p>
                                ) : (
                                    <p className="text-xl font-bold text-gray-500">No Reps Available</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Leaderboard */}
            <div className="card w-full overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Crown className="w-5 h-5 mr-2 text-amber-500" />
                        Rep Leaderboard
                    </h3>
                </div>

                {loading ? (
                    <div className="p-6">
                        <Skeleton height="200px" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Representative</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Productivity Score</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Deals Closed</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data?.leaderboard.map((rep, index) => (
                                    <tr key={rep.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx(
                                                "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                                                index === 0 ? "bg-amber-100 text-amber-600" :
                                                    index === 1 ? "bg-gray-200 text-gray-600" :
                                                        index === 2 ? "bg-orange-100 text-orange-600" :
                                                            "bg-indigo-50 text-indigo-500"
                                            )}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <User className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                                                    <div className="text-sm text-gray-500">{rep.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="text-lg font-bold text-indigo-600">{rep.score}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="text-sm text-gray-900">{rep.dealsClosed}</div>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.leaderboard || data.leaderboard.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                                            No sales representatives found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg flex items-start text-indigo-800 text-sm">
                <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <p>
                    <strong>Productivity Score Formula:</strong> The productivity score is calculated algorithmically using Weighted Averages. It factors in Deals Closed (50% weight), Revenue Generated (30% weight), and Activities Completed (20% weight), resulting in a normalized value out of 100.
                </p>
            </div>
        </div>
    );
}

