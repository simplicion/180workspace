'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { TrendingUp, Calendar, AlertCircle, BrainCircuit, Activity, BarChart3, CheckCircle, ShieldAlert } from 'lucide-react';
import { Skeleton } from "@workspace/ui";
import clsx from 'clsx';

export default function ForecastingPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await api.get('/api/sales/forecasting');
                setData(res.data);
            } catch (err: any) {
                console.error('Error fetching forecasting data', err);
                setError(err.response?.data?.message || 'Failed to load forecasting data');
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

    const ai = data?.aiForecast;
    const metrics = data?.metrics;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <TrendingUp className="w-8 h-8 mr-3 text-indigo-600" />
                        Advanced AI Forecasting
                    </h1>
                    <p className="text-gray-500 mt-2">Data-driven quarterly and yearly pipeline expectations backed by machine intelligence.</p>
                </div>
            </div>

            {/* Historical Context Bar */}
            {!loading && metrics && (
                <div className="bg-white border text-sm border-gray-100 shadow-sm p-4 rounded-xl flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-500">Historical Win Rate:</span>
                        <span className="font-bold text-gray-800">{metrics.historicalWinRate}%</span>
                    </div>
                    <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <span className="text-gray-500">Total Closed Deals:</span>
                        <span className="font-bold text-gray-800">{metrics.totalClosed}</span>
                    </div>
                    <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        <span className="text-gray-500">Total Historical Revenue:</span>
                        <span className="font-bold text-gray-800">${(metrics.wonValue || 0).toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Core Pipeline Prediction */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quarterly View */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Current Quarter</h2>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton height="60px" />
                            <Skeleton height="60px" />
                        </div>
                    ) : (
                        <div className="space-y-4 relative z-10">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expected Pipeline</p>
                                    <p className="text-2xl font-black text-gray-900">
                                        ${(data?.quarterly?.expected || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-400">Total Active</span>
                                </div>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Weighted Forecast</p>
                                    <p className="text-2xl font-black text-indigo-700">
                                        ${(data?.quarterly?.weighted || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-indigo-400 font-medium tracking-wide">Probability Adjusted</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Yearly View */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Current Year</h2>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton height="60px" />
                            <Skeleton height="60px" />
                        </div>
                    ) : (
                        <div className="space-y-4 relative z-10">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expected Pipeline</p>
                                    <p className="text-2xl font-black text-gray-900">
                                        ${(data?.yearly?.expected || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-400">Total Active</span>
                                </div>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Weighted Forecast</p>
                                    <p className="text-2xl font-black text-emerald-700">
                                        ${(data?.yearly?.weighted || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-emerald-400 font-medium tracking-wide">Probability Adjusted</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Advanced Analysis Module */}
            {ai ? (
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-1 shadow-2xl">
                    <div className="bg-white/5 rounded-[22px] p-8 h-full">
                        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center backdrop-blur-md border border-indigo-500/30">
                                <BrainCircuit className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">AI Prophet Analysis</h2>
                                <p className="text-indigo-200/70 text-sm mt-1">Deep-learning derived insights based on historic run-rate and active deal dynamics.</p>
                            </div>
                            
                            <div className="ml-auto text-right">
                                <span className="block text-xs text-indigo-300/60 uppercase tracking-widest font-bold mb-1">Confidence Score</span>
                                <span className={clsx("text-xl font-black", ai.confidenceScore > 75 ? "text-emerald-400" : ai.confidenceScore > 50 ? "text-amber-400" : "text-rose-400")}>
                                    {ai.confidenceScore}%
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Predictions */}
                            <div className="lg:col-span-1 space-y-4">
                                <h3 className="text-sm font-bold text-white/90 uppercase tracking-wider mb-4">Predicted Outcomes</h3>
                                
                                <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
                                    <p className="text-sm text-indigo-300 font-medium mb-1">AI Predicted Quarter</p>
                                    <p className="text-3xl font-black text-white">${(ai.aiPredictedQuarterlyRevenue || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
                                    <p className="text-sm text-indigo-300 font-medium mb-1">AI Predicted Year</p>
                                    <p className="text-3xl font-black text-white">${(ai.aiPredictedYearlyRevenue || 0).toLocaleString()}</p>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex justify-between items-center backdrop-blur-sm mt-4">
                                    <span className="text-sm text-indigo-300 font-medium">Trajectory:</span>
                                    <span className={clsx(
                                        "px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider",
                                        ai.growthTrajectory === 'Accelerating' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
                                        ai.growthTrajectory === 'Stable' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                                        "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                    )}>
                                        {ai.growthTrajectory}
                                    </span>
                                </div>
                            </div>

                            {/* Intelligent Insights & Risks */}
                            <div className="lg:col-span-2 space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-white/90 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-400" /> Strategic Insights
                                    </h3>
                                    <ul className="space-y-3">
                                        {ai.keyInsights?.map((insight: string, idx: number) => (
                                            <li key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4 text-indigo-100 text-sm leading-relaxed flex items-start gap-3 shadow-inner">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                                                {insight}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-white/90 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 text-amber-400" /> Discovered Risks
                                        </h3>
                                        <ul className="space-y-2 text-sm text-white/70">
                                            {ai.riskFactors?.map((risk: string, idx: number) => (
                                                <li key={idx} className="flex gap-2 items-start bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                                    <span className="text-amber-500 shrink-0">â€¢</span> {risk}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-white/90 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-blue-400" /> Recommended Actions
                                        </h3>
                                        <ul className="space-y-2 text-sm text-white/70">
                                            {ai.recommendedActions?.map((action: string, idx: number) => (
                                                <li key={idx} className="flex gap-2 items-start bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                                    <span className="text-blue-500 shrink-0">â†’</span> {action}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            ) : (!loading && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center mt-6">
                    <BrainCircuit className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">AI Forecasting Offline</h3>
                    <p className="text-gray-500 max-w-md mx-auto mt-2">
                        To activate deep-learning predictions and realistic trajectory analysis, please ensure your AI integration is properly configured in the master settings.
                    </p>
                </div>
            ))}

            <div className="bg-gray-50 p-4 rounded-xl flex items-start text-gray-600 text-xs border border-gray-100">
                <AlertCircle className="w-4 h-4 mr-3 mt-0.5 flex-shrink-0 text-gray-400" />
                <p className="leading-relaxed">
                    <strong>Calculations Explained:</strong> Expected Pipeline is the combined raw value of all active deals closing within the specified period. 
                    Weighted Forecast multiplies each deal&apos;s value by its probabilistic Win Likelihood. AI Predictions take into account your historical win/loss ratios against the current pipeline structure to create realistic growth trajectories.
                </p>
            </div>
        </div>
    );
}
