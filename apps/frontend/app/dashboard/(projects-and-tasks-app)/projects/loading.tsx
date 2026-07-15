export default function ProjectsLoading() {
    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-64 bg-gray-100 rounded-md animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-[2rem] p-6 space-y-6 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 animate-pulse" />
                            <div className="h-6 w-20 bg-gray-50 rounded-full animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <div className="h-3 w-16 bg-gray-50 rounded animate-pulse" />
                                <div className="h-3 w-8 bg-gray-50 rounded animate-pulse" />
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gray-200 w-1/3 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(j => <div key={j} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 animate-pulse" />)}
                            </div>
                            <div className="h-4 w-20 bg-gray-50 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
