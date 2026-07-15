import { Loader2 } from 'lucide-react';

export default function RootLoading() {
    return (
        <div className="flex flex-col h-[70vh] w-full items-center justify-center bg-gray-50/50 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center w-16 h-16">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-pulse" />
                </div>
                <div className="space-y-2 text-center">
                    <h3 className="text-sm font-semibold text-gray-900">Loading PitchIn 180...</h3>
                    <p className="text-xs text-gray-500">Fetching your workspace data</p>
                </div>
            </div>
        </div>
    );
}
