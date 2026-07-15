export default function SettingsLoading() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-4 w-64 bg-gray-100 rounded-md animate-pulse" />
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="border-b border-gray-50 p-4 flex gap-8">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-4 w-20 bg-gray-100 rounded animate-pulse" />)}
                </div>
                <div className="p-8 space-y-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-4">
                            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="h-3 w-20 bg-gray-50 rounded animate-pulse" />
                                    <div className="h-10 w-full bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 w-20 bg-gray-50 rounded animate-pulse" />
                                    <div className="h-10 w-full bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                    <div className="h-10 w-32 bg-indigo-200 rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
    );
}
