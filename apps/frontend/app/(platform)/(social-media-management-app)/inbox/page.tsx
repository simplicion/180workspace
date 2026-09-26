'use client';

import InboxWorkspace from '../_components/inbox/InboxWorkspace';

/** Unified social inbox across projects: conversations, AI agent per thread, convert to lead, AI Reply All. */
export default function SocialInboxPage() {
    return (
        <div className="space-y-4 pb-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Social inbox</h1>
                <p className="text-sm text-slate-600 dark:text-zinc-400">Comments and DMs from every connected account.</p>
            </div>
            <InboxWorkspace />
        </div>
    );
}
