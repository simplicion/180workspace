'use client';

import { LogoLoader } from "@workspace/ui";
import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface MigrationProgressBarProps {
    status: 'none' | 'in-progress' | 'completed' | 'failed';
    currentModel: string;
    progress: number;
    error: string | null;
    completedModels: number;
    totalModels: number;
}

const MigrationProgressBar = ({ 
    status, 
    currentModel, 
    progress, 
    error, 
    completedModels, 
    totalModels 
}: MigrationProgressBarProps) => {
    if (status === 'none') return null;

    return (
        <div className="mt-6 p-6 border rounded-xl bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {status === 'in-progress' && <LogoLoader className="w-5 h-5 animate-spin text-indigo-600" />}
                    {status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {status === 'failed' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                    <h3 className="font-semibold text-lg">
                        {status === 'in-progress' ? 'Database Migration In Progress' : 
                         status === 'completed' ? 'Migration Completed Successfully' : 
                         'Migration Failed'}
                    </h3>
                </div>
                <div className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    status === 'in-progress' ? "bg-indigo-50 text-indigo-600" : 
                    status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                    "bg-rose-50 text-rose-600"
                )}>
                    {status.toUpperCase()}
                </div>
            </div>

            {status === 'in-progress' && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Migrating: <span className="font-medium text-gray-900">{currentModel}</span></span>
                        <span>{completedModels} / {totalModels} Collections</span>
                    </div>
                    {/* Manual Progress Bar */}
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-indigo-600 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-center text-gray-400 animate-pulse">
                        Please do not close this window or refresh the page.
                    </p>
                </div>
            )}

            {status === 'completed' && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400">
                        All data has been successfully moved to your new database. The system has automatically switched to the new connection.
                    </p>
                </div>
            )}

            {status === 'failed' && (
                <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                    <p className="text-sm text-destructive font-medium">Error: {error}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        The migration stopped. Your data in the original database is still safe. Please resolve the error and try again.
                    </p>
                </div>
            )}
        </div>
    );
};

export default MigrationProgressBar;

