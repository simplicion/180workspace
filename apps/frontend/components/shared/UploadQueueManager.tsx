'use client';

import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { updateJobProgress, updateJobStatus, removeJob } from '@/redux/slices/uploadQueueSlice';
import api from '@/lib/api';
import { Loader2, X, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import axios from 'axios';

export default function UploadQueueManager() {
    const dispatch = useAppDispatch();
    const { jobs } = useAppSelector((state) => state.uploadQueue);
    const [isOpen, setIsOpen] = useState(false);
    
    // Automatically open the queue panel if there are active jobs
    useEffect(() => {
        if (jobs.some(j => j.status === 'uploading' || j.status === 'pending')) {
            setIsOpen(true);
        }
    }, [jobs]);

    useEffect(() => {
        const processQueue = async () => {
            const pendingJob = jobs.find(j => j.status === 'pending');
            if (!pendingJob) return;

            // Mark as uploading
            dispatch(updateJobStatus({ id: pendingJob.id, status: 'uploading' }));

            const totalItems = (pendingJob.files?.length || 0) + (pendingJob.voiceBlobs?.length || 0);
            if (totalItems === 0) {
                dispatch(updateJobStatus({ id: pendingJob.id, status: 'success' }));
                return;
            }

            try {
                const uploadedUrls: string[] = [];
                let completedItems = 0;

                // Process general files
                if (pendingJob.files && pendingJob.files.length > 0) {
                    for (let i = 0; i < pendingJob.files.length; i++) {
                        const file = pendingJob.files[i];
                        const formData = new FormData();
                        formData.append('file', file);

                        const { data } = await api.post('/api/files/upload', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                            onUploadProgress: (progressEvent) => {
                                const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                                const overallProgress = Math.round(((completedItems * 100) + percentCompleted) / totalItems);
                                dispatch(updateJobProgress({ id: pendingJob.id, progress: overallProgress }));
                            }
                        });
                        
                        uploadedUrls.push(data.url);
                        completedItems++;
                    }
                }

                // Process voice notes
                if (pendingJob.voiceBlobs && pendingJob.voiceBlobs.length > 0) {
                    for (let i = 0; i < pendingJob.voiceBlobs.length; i++) {
                        const blob = pendingJob.voiceBlobs[i];
                        const formData = new FormData();
                        formData.append('file', blob, `voice-note-${Date.now()}-${i}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);

                        const { data } = await api.post('/api/files/upload-voice', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                            onUploadProgress: (progressEvent) => {
                                const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                                const overallProgress = Math.round(((completedItems * 100) + percentCompleted) / totalItems);
                                dispatch(updateJobProgress({ id: pendingJob.id, progress: overallProgress }));
                            }
                        });

                        uploadedUrls.push(data.url);
                        completedItems++;
                    }
                }

                // Call appropriate endpoint to attach files
                if (pendingJob.entityType === 'task') {
                    await api.post(`/api/tasks/${pendingJob.entityId}/attachments`, { urls: uploadedUrls });
                }

                dispatch(updateJobStatus({ id: pendingJob.id, status: 'success' }));
                toast.success('Files uploaded successfully');

            } catch (error: any) {
                console.error('Background upload failed:', error);
                dispatch(updateJobStatus({ id: pendingJob.id, status: 'error', error: error.message || 'Upload failed' }));
                toast.error('Background upload failed');
            }
        };

        processQueue();
    }, [jobs, dispatch]);

    if (jobs.length === 0) return null;

    return (
        <div className={cn(
            "fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform",
            isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
        )}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-xl cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-brand-600" />
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">Uploads ({jobs.length})</h3>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                {jobs.map((job) => (
                    <div key={job.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2 z-10 relative">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate pr-2">
                                Uploading {job.files?.length || 0 + (job.voiceBlobs?.length || 0)} files to {job.entityType}
                            </span>
                            {job.status === 'uploading' || job.status === 'pending' ? (
                                <Loader2 className="w-4 h-4 text-brand-600 animate-spin flex-shrink-0" />
                            ) : job.status === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                        </div>
                        
                        {(job.status === 'uploading' || job.status === 'pending') && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 z-10 relative">
                                <div 
                                    className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${job.progress}%` }}
                                ></div>
                            </div>
                        )}
                        
                        {job.status === 'error' && (
                            <p className="text-xs text-red-500 mt-1 z-10 relative">{job.error}</p>
                        )}

                        {(job.status === 'success' || job.status === 'error') && (
                            <button 
                                onClick={() => dispatch(removeJob(job.id))}
                                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
