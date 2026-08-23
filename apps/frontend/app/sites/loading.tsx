import { Loader2 } from "lucide-react";

export default function SitesLoading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-white">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
    );
}
