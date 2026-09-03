'use client';

import { motion } from 'framer-motion';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { SkeletonChart } from '@workspace/ui';
import { BarChart3 } from 'lucide-react';
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
    const totalTasks = chartData?.reduce((acc: number, curr: any) => acc + (curr.tasks || 0), 0) || 0;

    return (
        <div className="card overflow-hidden mt-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white whitespace-nowrap">Activity Analytics</h3>
                        <p className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">Track task and project velocity across the month</p>
                    </div>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    <CustomSelect 
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-indigo-500 text-zinc-700 dark:text-zinc-200 px-3 py-1.5 cursor-pointer appearance-none pr-7"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                    >
                        <option value="30">Whole Month (30 Days)</option>
                        <option value="7">Last 7 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </CustomSelect>
                    <div className="flex items-center gap-0.5 p-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                        {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                            <button
                                key={g}
                                onClick={() => setGrouping(g)}
                                className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all capitalize ${
                                    grouping === g
                                        ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-xs font-bold'
                                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Single Full-Width Bar Chart */}
            <div className="p-5 pt-4">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="w-full"
                >
                    {loading || fetchingTrends ? (
                        <SkeletonChart />
                    ) : (
                        <div className="bg-zinc-50/50 dark:bg-zinc-800/40 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 capitalize flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    Tasks by {grouping === 'weekly' ? 'Week' : grouping === 'monthly' ? 'Month' : 'Day'}
                                </h4>
                                {hasData && (
                                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-medium">
                                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                            Total: {totalTasks} tasks
                                        </span>
                                        <span className="text-zinc-400">
                                            {chartData.length} {grouping === 'daily' ? 'days' : 'intervals'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {hasData ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.12)" vertical={false} />
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{ fontSize: 10, fill: '#94a3b8' }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            interval={grouping === 'daily' && chartData.length > 14 ? 1 : 0}
                                        />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip 
                                            contentStyle={{ 
                                                borderRadius: 12, 
                                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                                color: '#fff',
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', 
                                                fontSize: 12, 
                                                padding: '8px 12px' 
                                            }} 
                                            cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                                        />
                                        <Bar 
                                            dataKey="tasks" 
                                            fill="url(#barGradient)" 
                                            radius={[5, 5, 1, 1]} 
                                            name="Tasks"
                                            barSize={grouping === 'monthly' ? 36 : grouping === 'weekly' ? 24 : chartData.length > 20 ? 14 : 22}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[220px] flex flex-col items-center justify-center text-center">
                                    <BarChart3 className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                                    <p className="text-xs text-zinc-400 font-medium">No task data yet</p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">Tasks will show here once created</p>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
