'use client';

import { useRef, useState } from 'react';
import { Upload, Film, X } from 'lucide-react';
import { socialAutopilotService, apiError, ApiErrorInfo } from '@/lib/services/social-autopilot.service';
import { ErrorPanel } from '../shared/StatePanels';

const ACCEPT = 'video/mp4,video/quicktime,video/webm';

/** Uploads raw footage to POST /calendar-pieces/:id/raw-footage (multipart field "video") with progress. */
export default function RawFootageUpload({
    pieceId,
    rawMediaUrls,
    onUploaded,
}: {
    pieceId: string;
    rawMediaUrls: string[];
    onUploaded: (res: { url: string; rawMediaUrls: string[] }) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const abort = useRef<AbortController | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<ApiErrorInfo | null>(null);

    const upload = async (f: File) => {
        setFile(f);
        setError(null);
        setProgress(0);
        abort.current = new AbortController();
        try {
            const res = await socialAutopilotService.uploadRawFootage(pieceId, f, setProgress, abort.current.signal);
            onUploaded({ url: res.url, rawMediaUrls: res.rawMediaUrls });
            setFile(null);
        } catch (err: any) {
            if (err?.code === 'ERR_CANCELED') setError(null);
            else setError(apiError(err, 'The upload failed.'));
        } finally {
            setProgress(null);
            abort.current = null;
            if (input.current) input.current.value = '';
        }
    };

    const uploading = progress !== null;

    return (
        <div className="space-y-3">
            <input
                ref={input}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                id={`raw-footage-${pieceId}`}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
                disabled={uploading || !pieceId}
            />
            {uploading ? (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2" aria-live="polite">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-zinc-300">
                        <span className="truncate">{file?.name}</span>
                        <span className="tabular-nums shrink-0">{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <button type="button" onClick={() => abort.current?.abort()} className="inline-flex items-center gap-1 min-h-[36px] text-xs text-slate-600 dark:text-zinc-400">
                        <X className="w-3.5 h-3.5" /> Cancel upload
                    </button>
                </div>
            ) : (
                <label
                    htmlFor={`raw-footage-${pieceId}`}
                    className="flex items-center justify-center gap-2 min-h-[64px] px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 cursor-pointer transition-all duration-300"
                >
                    <Upload className="w-4 h-4 text-indigo-600" /> Upload raw footage (MP4, MOV or WebM)
                </label>
            )}

            {error && (
                <ErrorPanel
                    compact
                    title="Upload failed"
                    message={error.message}
                    code={error.code}
                    onRetry={file ? () => upload(file) : undefined}
                    secondary={{ label: 'Choose another file', onClick: () => input.current?.click() }}
                />
            )}

            {rawMediaUrls.length > 0 && (
                <ul className="space-y-1.5">
                    {rawMediaUrls.map((u, i) => (
                        <li key={u} className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
                            <Film className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={u} target="_blank" rel="noreferrer" className="truncate hover:underline">Clip {i + 1}</a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
