import { LogoLoader } from '@workspace/ui';

export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-50">
            <LogoLoader className="w-10 h-10 animate-spin text-sky-600" />
            <p className="text-xs font-semibold text-slate-600">Loading...</p>
        </div>
    );
}
