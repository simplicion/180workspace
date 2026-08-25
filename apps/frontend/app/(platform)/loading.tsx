import { LogoLoader } from "@workspace/ui";
;

export default function DashboardLoading() {
    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-64 bg-gray-100 rounded-md animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                            <div className="h-4 w-12 bg-gray-50 rounded animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                            <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="h-[400px] w-full rounded-[2.5rem] bg-white border border-gray-100 animate-pulse shadow-sm" />
                    <div className="h-[200px] w-full rounded-[2.5rem] bg-white border border-gray-100 animate-pulse shadow-sm" />
                </div>
                <div className="space-y-6">
                    <div className="h-[300px] w-full rounded-[2.5rem] bg-white border border-gray-100 animate-pulse shadow-sm" />
                    <div className="h-[300px] w-full rounded-[2.5rem] bg-white border border-gray-100 animate-pulse shadow-sm" />
                </div>
            </div>

            {/* Centered Loader for visibility */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <LogoLoader className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
        </div>
    );
}
