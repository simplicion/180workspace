export default function InvoicesLoading() {
    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-64 bg-gray-100 rounded-md animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-32 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2 shadow-sm">
                        <div className="h-3 w-20 bg-gray-50 rounded animate-pulse" />
                        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                    </div>
                ))}
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            {[1, 2, 3, 4, 5].map(i => (
                                <th key={i} className="p-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <tr key={i}>
                                {[1, 2, 3, 4, 5].map(j => (
                                    <td key={j} className="p-4">
                                        <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
