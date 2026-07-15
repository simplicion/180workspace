export default function Loading() {
    return (
        <div className="flex-1 p-6 space-y-6 animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
                ))}
            </div>
            <div className="h-[400px] w-full bg-gray-100 rounded-3xl" />
        </div>
    );
}
