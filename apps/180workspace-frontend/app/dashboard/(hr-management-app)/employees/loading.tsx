export default function Loading() {
    return (
        <div className="flex-1 p-6 space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-64 bg-gray-200 rounded-xl" />
                <div className="h-10 w-32 bg-gray-200 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-64 bg-gray-100 rounded-3xl" />
                ))}
            </div>
            <div className="h-96 w-full bg-gray-100 rounded-3xl" />
        </div>
    );
}
