import { LogoLoader } from "@workspace/ui";
;

export default function TasksLoading() {
    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-64 bg-gray-100 rounded-md animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex gap-4">
                    <div className="h-10 w-64 bg-white border border-gray-100 rounded-xl animate-pulse" />
                    <div className="h-10 w-32 bg-white border border-gray-100 rounded-xl animate-pulse" />
                </div>
                <div className="divide-y divide-gray-50">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-5 h-5 rounded border-2 border-gray-100 bg-gray-50 animate-pulse" />
                                <div className="space-y-2">
                                    <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
                                    <div className="h-3 w-32 bg-gray-50 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                                <div className="h-8 w-8 bg-gray-50 rounded-lg animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
