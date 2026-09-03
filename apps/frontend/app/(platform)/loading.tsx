import { SkeletonWorkspace } from "@workspace/ui";

export default function DashboardLoading() {
    return (
        <div className="w-full space-y-8 animate-in fade-in duration-300">
            <SkeletonWorkspace />
        </div>
    );
}
