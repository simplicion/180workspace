export default function HRLoading() {
    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-64 bg-gray-100 rounded-md animate-pulse" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white border border-gray-100 space-y-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-6">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
                                <div className="h-3 w-32 bg-gray-50 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
