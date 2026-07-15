export default function AnalyticsLoading() {
    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-64 bg-gray-100 rounded-md animate-pulse" />
                </div>
                <div className="h-10 w-48 bg-gray-100 rounded-xl animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
                        <div className="h-4 w-20 bg-gray-50 rounded mb-4 animate-pulse" />
                        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="mt-4 h-2 w-full bg-gray-100 rounded-full" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-[350px] w-full bg-white border border-gray-100 rounded-[2.5rem] animate-pulse shadow-sm" />
                <div className="h-[350px] w-full bg-white border border-gray-100 rounded-[2.5rem] animate-pulse shadow-sm" />
            </div>

            <div className="h-[400px] w-full bg-white border border-gray-100 rounded-[2.5rem] animate-pulse shadow-sm" />
        </div>
    );
}
