'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

export default function RevenuePipelineBarChart({ pipelineTrend }: { pipelineTrend: any[] }) {
    if (!pipelineTrend || pipelineTrend.length === 0) return null;
    
    const stageSet = new Set<string>();
    pipelineTrend.forEach(item => {
        Object.keys(item).forEach(k => {
            if (k !== 'date') stageSet.add(k);
        });
    });
    const stages = Array.from(stageSet);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pipelineTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                   {stages.map((stage, idx) => (
                       <linearGradient key={`grad-${stage}`} id={`color-pipe-${idx}`} x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.4} />
                           <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0} />
                       </linearGradient>
                   ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10} 
                />
                <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `$${val/1000}k`} 
                    dx={-10} 
                />
                <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    labelStyle={{ color: '#374151', fontWeight: 600, marginBottom: '4px' }}
                    formatter={(val: number, name: string) => [`$${val.toLocaleString()}`, name]} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                {stages.map((stage, idx) => (
                    <Area 
                        key={stage} 
                        type="monotone" 
                        dataKey={stage} 
                        stackId="1" 
                        stroke={COLORS[idx % COLORS.length]} 
                        fill={`url(#color-pipe-${idx})`} 
                        strokeWidth={2} 
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
