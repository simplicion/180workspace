export default function SitesLoading() {
    return (
        <div className="min-h-screen w-full bg-white" aria-busy="true" aria-label="Loading page">
            <div className="h-16 w-full border-b border-gray-100 flex items-center justify-between px-6 animate-pulse">
                <div className="h-6 w-32 rounded bg-gray-200" />
                <div className="h-4 w-48 rounded bg-gray-100 hidden sm:block" />
            </div>
            <div className="max-w-4xl mx-auto px-6 py-16 space-y-6 animate-pulse">
                <div className="h-10 w-3/4 rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-5/6 rounded bg-gray-100" />
                <div className="h-64 w-full rounded-xl bg-gray-100" />
            </div>
        </div>
    );
}
