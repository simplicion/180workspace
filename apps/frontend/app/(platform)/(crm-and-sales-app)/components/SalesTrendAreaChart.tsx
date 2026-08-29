'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesTrendAreaChart({ chartData, currencySymbol = '$' }: { chartData: any[], currencySymbol?: string }) {
    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData.length > 0 ? [...chartData].reverse() : []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${currencySymbol}${value / 1000}k`}
                />
                <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`${currencySymbol}${value.toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="leads" stroke="#f97316" strokeWidth={2} fill="url(#colorLeads)" name="Lead Value" />
                <Area type="monotone" dataKey="pipeline" stroke="#818cf8" strokeWidth={2} fill="url(#colorPipeline)" name="Open Pipeline" />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#colorRevenue)" name="Won Revenue" />
            </AreaChart>
        </ResponsiveContainer>
    );
}
