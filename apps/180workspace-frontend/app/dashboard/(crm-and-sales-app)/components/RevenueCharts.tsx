'use client';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

export function RevenueTrendAreaChart({ monthlyTrend }: { monthlyTrend: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                    dataKey="month"
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                />
                <YAxis
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                    dx={-10}
                />
                <RechartsTooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ color: '#374151', fontWeight: 600, marginBottom: '4px' }}
                />
                <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export function RevenueDealsLineChart({ monthlyTrend }: { monthlyTrend: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                    dataKey="month"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                />
                <YAxis
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                />
                <RechartsTooltip
                    formatter={(value: number) => [value, 'Deals']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line
                    type="monotone"
                    dataKey="deals"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

export function RevenuePipelineBarChart({ pipelineByStage }: { pipelineByStage: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineByStage} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" 
                        tick={{ fill: '#6b7280', fontSize: 12 }} 
                        tickFormatter={(val) => `$${val/1000}k`} 
                        axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="stage" 
                        tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} 
                        width={120} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Pipeline Value']}
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                    {
                        pipelineByStage.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))
                    }
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

export function RevenueWinLossPieChart({ winLossData }: { winLossData: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                >
                    <Cell fill="#10b981" /> {/* Won - Green */}
                    <Cell fill="#ef4444" /> {/* Lost - Red */}
                </Pie>
                <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
        </ResponsiveContainer>
    );
}
