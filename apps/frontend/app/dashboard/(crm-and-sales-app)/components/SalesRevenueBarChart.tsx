'use client';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesRevenueBarChart({ repData }: { repData: any[] }) {
    if (!repData || repData.length === 0) return <p className="text-gray-400 text-sm text-center py-10">No revenue data</p>;

    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={repData} maxBarSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
