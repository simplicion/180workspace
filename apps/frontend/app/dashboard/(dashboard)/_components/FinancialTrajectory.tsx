'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Scatter } from 'recharts';
import api from '@/lib/api';

export default function FinancialTrajectory() {
    const [ceoInsights, setCeoInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        api.get('/api/hrms/ceo-insights')
            .then(({ data }) => setCeoInsights(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const formatCurrency = (val: number | undefined): string => {
        if (!val) return '₹0';
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
        return `₹${val.toLocaleString()}`;
    };

    if (loading) {
        return (
            <div className="card p-6 h-[380px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-emerald-200 border-t-emerald-500"></div>
                    <p className="text-xs text-gray-400 font-medium">Loading financials...</p>
                </div>
            </div>
        );
    }

    const kpis = [
        {
            label: 'Monthly Revenue',
            value: formatCurrency(ceoInsights?.mrr),
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-100',
            icon: TrendingUp,
            iconColor: 'text-emerald-500',
        },
        {
            label: 'Burn Rate',
            value: formatCurrency(ceoInsights?.burnRate),
            color: 'text-rose-600',
            bgColor: 'bg-rose-50',
            borderColor: 'border-rose-100',
            icon: ArrowDownRight,
            iconColor: 'text-rose-500',
        },
        {
            label: 'Runway',
            value: ceoInsights?.runway 
                ? ceoInsights.runway.includes('mo') 
                    ? `${ceoInsights.runway.replace(' mo', '')} mo` 
                    : ceoInsights.runway
                : '0 mo',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-100',
            icon: ArrowUpRight,
            iconColor: 'text-indigo-500',
        },
    ];

    const hasChartData = ceoInsights?.financialTrajectory && ceoInsights.financialTrajectory.length > 0;

    // Map time data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    const areaData = (ceoInsights?.financialTrajectory || []).map((d: any) => {
        const monthIndex = months.indexOf(d.name);
        let year = new Date().getFullYear();
        if (currentMonth < monthIndex) {
            year -= 1; // It's from last year
        }
        const timestamp = new Date(year, monthIndex, 15).getTime(); // middle of the month
        return { ...d, timestamp };
    });

    const incomeTransactions = (ceoInsights?.transactions || []).filter((t: any) => t.type === 'income').map((t: any) => ({
        ...t,
        timestamp: new Date(t.date).getTime()
    }));

    const costTransactions = (ceoInsights?.transactions || []).filter((t: any) => t.type !== 'income').map((t: any) => ({
        ...t,
        timestamp: new Date(t.date).getTime()
    }));

    const handleDotClick = (data: any) => {
        if (data && data.payload && data.payload.url) {
            router.push(data.payload.url);
        }
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            // Differentiate between area points (aggregated) and scatter points (transactions)
            if (data.type) {
                const isIncome = data.type === 'income';
                return (
                    <div className="bg-white p-3 border border-gray-100 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-w-[200px]">
                        <p className="text-xs font-bold text-gray-900 mb-2 border-b pb-1">
                            {new Date(data.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-xs text-gray-500 font-medium">What:</span>
                                <span className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">{data.what}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-xs text-gray-500 font-medium">Who:</span>
                                <span className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">{data.who}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-xs text-gray-500 font-medium">Where:</span>
                                <span className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">{data.where}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4 mt-1 border-t pt-1.5">
                                <span className="text-xs text-gray-500 font-medium">Amount:</span>
                                <span className={`text-sm font-black ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatCurrency(data.amount)}
                                </span>
                            </div>
                            <p className="text-[9px] text-indigo-500 mt-1.5 text-center font-semibold bg-indigo-50/50 rounded py-1">Click dot to view details</p>
                        </div>
                    </div>
                );
            } else {
                return (
                    <div className="bg-white p-3 border border-gray-100 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-bold text-gray-900 mb-1.5">{data.name}</p>
                        <p className="text-xs font-medium text-emerald-600 flex justify-between gap-4">
                            <span>Revenue:</span> <span className="font-bold">{formatCurrency(data.rev)}</span>
                        </p>
                        <p className="text-xs font-medium text-rose-600 flex justify-between gap-4 mt-1">
                            <span>Costs:</span> <span className="font-bold">{formatCurrency(data.cost)}</span>
                        </p>
                    </div>
                );
            }
        }
        return null;
    };

    return (
        <div className="card overflow-hidden">
            {/* Header + KPIs */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-xl shrink-0">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 whitespace-nowrap">Financial Trajectory</h3>
                        <p className="text-[11px] text-gray-400 font-medium">Revenue, burn rate & runway overview</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full">
                    {kpis.map((kpi, i) => (
                        <div key={i} className={`flex flex-col gap-1.5 p-2.5 rounded-xl border ${kpi.borderColor} ${kpi.bgColor} overflow-hidden`}>
                            <div className="flex items-center gap-1.5">
                                <kpi.icon className={`shrink-0 w-3.5 h-3.5 ${kpi.iconColor}`} />
                                <p className="text-[8px] sm:text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-none truncate">{kpi.label}</p>
                            </div>
                            <p className={`text-sm font-black ${kpi.color} leading-none truncate`}>{kpi.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="p-5">
                {hasChartData ? (
                    <div className="h-[260px]" role="img" aria-label="Financial Trajectory Area Chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="timestamp" 
                                    type="number" 
                                    scale="time" 
                                    domain={['dataMin', 'dataMax']}
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                                    dy={8}
                                    tickFormatter={(time) => {
                                        const d = new Date(time);
                                        return months[d.getMonth()];
                                    }} 
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dx={-5} tickFormatter={(val) => val >= 1000 ? `₹${val / 1000}k` : `₹${val}`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                                <Legend 
                                    verticalAlign="top" 
                                    height={36} 
                                    iconType="circle" 
                                    iconSize={6}
                                    formatter={(value) => <span className="text-xs font-medium text-gray-500">{value}</span>}
                                />
                                <Area data={areaData} type="monotone" dataKey="rev" name="Gross Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                                <Area data={areaData} type="monotone" dataKey="cost" name="Operating Costs" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCost)" dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                                
                                <Scatter data={incomeTransactions} name="Incomes (Detailed)" dataKey="amount" fill="#10b981" shape="circle" onClick={handleDotClick} cursor="pointer" />
                                <Scatter data={costTransactions} name="Costs (Detailed)" dataKey="amount" fill="#ef4444" shape="circle" onClick={handleDotClick} cursor="pointer" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[260px] flex flex-col items-center justify-center text-center bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
                        <DollarSign className="w-10 h-10 text-gray-200 mb-3" />
                        <p className="text-sm font-medium text-gray-400">No financial data yet</p>
                        <p className="text-xs text-gray-300 mt-1 max-w-[280px]">
                            Financial trajectory will display once invoices and expense records are available.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
