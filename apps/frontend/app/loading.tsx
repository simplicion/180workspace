import { LogoLoader } from '@workspace/ui';

export default function Loading() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
            <LogoLoader className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
    );
}
