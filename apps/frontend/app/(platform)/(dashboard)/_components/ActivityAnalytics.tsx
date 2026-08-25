'use client';

import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { SkeletonChart } from '@workspace/ui';
import { Activity, BarChart3 } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';

interface ActivityAnalyticsProps {
    chartData: any[];
    loading: boolean;
    fetchingTrends: boolean;
    range: string;
    setRange: (val: string) => void;
    grouping: string;
    setGrouping: (val: string) => void;
}

export default function ActivityAnalytics({
    chartData,
    loading,
    fetchingTrends,
    range,
    setRange,
    grouping,
    setGrouping
}: ActivityAnalyticsProps) {
    const hasData = chartData && chartData.length > 0;

    return (
        <div className="card overflow-hidden mt-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 pb-0">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <Activity className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 whitespace-nowrap">Activity Analytics</h3>
                        <p className="text-[11px] text-gray-400 font-medium whitespace-nowrap">Track project and task velocity</p>
                    </div>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    <CustomSelect 
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="text-xs font-semibold bg-gray-50 border border-gray-100 rounded-lg focus:ring-1 focus:ring-indigo-200 text-gray-600 px-3 py-1.5 cursor-pointer appearance-none pr-7"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </CustomSelect>
                    <div className="flex items-center gap-0.5 p-0.5 bg-gray-50 border border-gray-100 rounded-lg">
                        {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                            <button
                                key={g}
                                onClick={() => setGrouping(g)}
                                className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all capitalize ${
                                    grouping === g
                                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-100'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="p-5 pt-4">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                >
                    {loading || fetchingTrends ? (
                        <>
                            <SkeletonChart />
                            <SkeletonChart />
                        </>
                    ) : (
                        <>
                            {/* Area Chart */}
                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/60">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-gray-700 capitalize flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        {grouping} Activity
                                    </h4>
                                    {hasData && (
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {chartData.length} data points
                                        </span>
                                    )}
                                </div>
                                {hasData ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: 10, border: '1px solid #f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: 12, padding: '8px 12px' }} 
                                                cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                                            />
                                            <Area type="monotone" dataKey="projects" stroke="#6366f1" strokeWidth={2} fill="url(#colorProjects)" name="Projects" dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                                            <Area type="monotone" dataKey="tasks" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorTasks)" name="Tasks" dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[200px] flex flex-col items-center justify-center text-center">
                                        <Activity className="w-8 h-8 text-gray-200 mb-2" />
                                        <p className="text-xs text-gray-400 font-medium">No activity data yet</p>
                                        <p className="text-[10px] text-gray-300 mt-0.5">Activity will appear as work is logged</p>
                                    </div>
                                )}
                            </div>

                            {/* Bar Chart */}
                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/60">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-gray-700 capitalize flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                        Tasks by {grouping === 'weekly' ? 'Week' : grouping === 'monthly' ? 'Month' : 'Day'}
                                    </h4>
                                </div>
                                {hasData ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={chartData} barSize={grouping === 'monthly' ? 32 : 24}>
                                            <defs>
                                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: 10, border: '1px solid #f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: 12, padding: '8px 12px' }} 
                                                cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                                            />
                                            <Bar dataKey="tasks" fill="url(#barGradient)" radius={[6, 6, 2, 2]} name="Tasks" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[200px] flex flex-col items-center justify-center text-center">
                                        <BarChart3 className="w-8 h-8 text-gray-200 mb-2" />
                                        <p className="text-xs text-gray-400 font-medium">No task data yet</p>
                                        <p className="text-[10px] text-gray-300 mt-0.5">Tasks will show here once created</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
