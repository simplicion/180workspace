'use client';

import clsx from 'clsx';
import { TrendingUp, AlertCircle, FileText } from 'lucide-react';

interface FinancialSnapshotProps {
    isMobileView?: boolean;
}

export default function FinancialSnapshot({ isMobileView }: FinancialSnapshotProps) {
    return (
        <div className="mb-8">
            <h2 className="text-sm font-bold flex items-center gap-2 text-gray-900 mb-4">
                <TrendingUp className="w-4 h-4 text-gray-500" /> Financial Snapshot
            </h2>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                {/* Company Health Card (Dark Purple) */}
                <div className="lg:col-span-1 bg-[#7c3aed] rounded-2xl p-5 text-white relative overflow-hidden flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <span className="font-semibold text-white/90 text-sm">Company Health</span>
                        <span className="text-xs text-white/70 hover:text-white cursor-pointer">Details &gt;</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-[10px] text-white/70 mb-1 font-medium">MRR</p>
                            <p className="text-lg font-bold">₹8.2L</p>
                        </div>
                        <div className="border-l border-white/20 pl-4">
                            <p className="text-[10px] text-white/70 mb-1 font-medium">Burn Rate</p>
                            <p className="text-lg font-bold">₹3.5L</p>
                        </div>
                        <div className="border-l border-white/20 pl-4">
                            <p className="text-[10px] text-white/70 mb-1 font-medium">Runway</p>
                            <p className="text-lg font-bold">8.5 <span className="text-xs font-normal">mo</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
