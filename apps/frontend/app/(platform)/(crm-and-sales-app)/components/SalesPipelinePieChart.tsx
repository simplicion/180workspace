'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesPipelinePieChart({ pipelineData, COLORS }: { pipelineData: any[], COLORS: string[] }) {
    if (!pipelineData || pipelineData.length === 0) return <p className="text-gray-400 text-sm text-center py-10">No pipeline data</p>;
    
    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={pipelineData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
            </PieChart>
        </ResponsiveContainer>
    );
}
