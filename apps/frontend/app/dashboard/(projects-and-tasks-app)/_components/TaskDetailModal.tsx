'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { X, CheckSquare, Calendar, User, Tag, AlignLeft, Paperclip, Save, Trash2, Clock, Flag, FolderKanban, CheckCircle2, Link, AlertCircle, CalendarClock } from 'lucide-react';
import clsx from 'clsx';
import FileUploadModal from '@/components/shared/FileUploadModal';
import { ConfirmModal , LogoLoader } from "@workspace/ui";
import { useAuth } from '@/lib/auth-context';
import { TimeProgressBar } from "@workspace/ui";
import { toast } from 'react-hot-toast';
import MultiVoiceRecorder from './MultiVoiceRecorder';

interface Props {
    taskId: string;
    onClose: () => void;
    onUpdated?: (task: any) => void;
    onDeleted?: (id: string) => void;
}

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
    { value: 'medium', label: 'Medium', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    { value: 'high', label: 'High', cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    { value: 'critical', label: 'Critical', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
];

export default function TaskDetailModal({ taskId, onClose, onUpdated, onDeleted }: Props) {
    const [task, setTask] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { user } = useAuth();

    // Editable fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('todo');
    const [priority, setPriority] = useState('medium');
    const [assigneeId, setAssigneeId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [voiceMessageUrl, setVoiceMessageUrl] = useState('');
    const [sendEmailNotification, setSendEmailNotification] = useState(true);
    
    const [voiceBlobs, setVoiceBlobs] = useState<Blob[]>([]);


    useEffect(() => {
        Promise.all([
            api.get(`/api/tasks/${taskId}`),
            api.get('/api/users', { params: { limit: 100 } }),
        ]).then(([tRes, uRes]) => {
            const t = tRes.data.task;
            setTask(t);
            setTitle(t.title);
            setDescription(t.description || '');
            setStatus(t.status);
            setPriority(t.priority);
            setAssigneeId(t.assigneeId || '');
            setDueDate(t.dueDate ? t.dueDate.slice(0, 16) : '');
            setVoiceMessageUrl(t.voiceMessageUrl || '');
            setMembers(uRes.data.users);
        }).finally(() => setLoading(false));
    }, [taskId]);


    const save = async () => {
        setSaving(true);
        try {
            let finalVoiceUrl = voiceMessageUrl;

            // Upload multiple blobs if any
            if (voiceBlobs.length > 0) {
                const uploadedUrls = [];
                for (let i = 0; i < voiceBlobs.length; i++) {
                    const blob = voiceBlobs[i];
                    const formData = new FormData();
                    formData.append('file', blob, `voice-note-${Date.now()}-${i}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
                    
                    const { data: uploadData } = await api.post('/api/files/upload-voice', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    uploadedUrls.push(uploadData.url);
                }
                finalVoiceUrl = finalVoiceUrl ? `${finalVoiceUrl},${uploadedUrls.join(',')}` : uploadedUrls.join(',');
            }

            const { data } = await api.put(`/api/tasks/${taskId}`, {
                title, description, status, priority,
                assigneeId: assigneeId || null,
                dueDate: dueDate || null,
                voiceMessageUrl: finalVoiceUrl || null,
                sendEmailNotification,
            });

            toast.success('Task updated!');

            // Show email notification status if it was requested and assignee changed
            if (sendEmailNotification && assigneeId && assigneeId !== task?.assigneeId?.id) {
                if (data.notificationResult?.success) {
                    toast.success('Assignment email sent successfully!');
                } else if (data.notificationResult?.error) {
                    toast.error(`Email failed: ${data.notificationResult.error}`);
                } else if (data.notificationResult?.skipped) {
                    toast('Email skipped (user may be online)');
                }
            }

            onUpdated?.(data.task);
            setVoiceBlobs([]);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to update task');
        } finally {
            setSaving(false);
        }
    };

    const deleteTask = async () => {
        setDeleting(true);
        try {
            await api.delete(`/api/tasks/${taskId}`);
            onDeleted?.(taskId);
            onClose();
        } catch (err: any) {
            console.error('Delete task error:', err);
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const assignee = members.find(m => m.id === assigneeId);

    const STATUS_OPTIONS = [
        { value: 'todo', label: 'To Do', cls: 'bg-gray-100 text-gray-700' },
        { value: 'in_progress', label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
        { value: 'in_review', label: 'In Review', cls: 'bg-amber-100 text-amber-700', internalOnly: true },
        { value: 'done', label: 'Done', cls: 'bg-emerald-100 text-emerald-700', internalOnly: true },
        { value: 'backlog', label: 'Backlog', cls: 'bg-purple-100 text-purple-700' },
        { value: 'custom', label: task?.project?.customTaskStatusName || 'Custom', cls: 'bg-indigo-100 text-indigo-700' },
    ];
    
    const statusCfg = STATUS_OPTIONS.find(s => s.value === status);
    const priorityCfg = PRIORITY_OPTIONS.find(p => p.value === priority);

    const canEdit = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team')) || task?.assigneeId === user?.id || assigneeId === user?.id || task?.creator?.id === user?.id || task?.creatorId === user?.id;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                        </div>
                        {loading ? (
                            <div className="h-5 bg-gray-100 rounded animate-pulse w-48" />
                        ) : canEdit ? (
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="flex-1 text-lg font-bold text-gray-900 bg-transparent border-0 outline-none placeholder-gray-300 focus:ring-0 p-0"
                                placeholder="Task title"
                                aria-label="Task title"
                            />
                        ) : (
                            <h2 className="flex-1 text-lg font-bold text-gray-900">{title}</h2>
                        )}
                    </div>
                    <button onClick={onClose} aria-label="Close modal" title="Close modal" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
                        <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <LogoLoader className="w-7 h-7 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex flex-col lg:flex-row gap-0">
                            {/* Main: Description */}
                            <div className="flex-1 p-6 lg:border-r border-gray-100">
                                <label htmlFor="taskDescription" className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <AlignLeft className="w-3.5 h-3.5" aria-hidden="true" />Description
                                </label>
                                {canEdit ? (
                                    <textarea
                                        id="taskDescription"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a description..."
                                        rows={6}
                                        className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl p-3 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 resize-none transition-all placeholder-gray-300"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{description || 'No description provided.'}</p>
                                )}

                                {/* Attachments */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Paperclip className="w-3.5 h-3.5" />Attachments
                                        </label>
                                        {canEdit && (
                                            <button
                                                onClick={() => setShowUpload(true)}
                                                className="text-xs text-indigo-600 hover:underline"
                                            >+ Add file</button>
                                        )}
                                    </div>
                                    {(!task?.attachments || task.attachments.length === 0) ? (
                                        <p className="text-xs text-gray-400 italic">No attachments yet</p>
                                    ) : (
                                        <div className="grid gap-2 mt-2">
                                            {task.attachments.map((file: any, i: number) => {
                                                const url = typeof file === 'string' ? file : file.fileUrl || file.url;
                                                const name = typeof file === 'string' ? `Attachment ${i + 1}` : file.name || `Attachment ${i + 1}`;
                                                const size = file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB • ` : '';
                                                const date = file.createdAt ? format(new Date(file.createdAt), 'MMM d, yyyy') : '';
                                                
                                                const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) != null;
                                                
                                                return (
                                                <a
                                                    key={file.id || i}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group"
                                                >
                                                    {isImage ? (
                                                        <img src={url} alt={name} className="w-8 h-8 object-cover rounded shadow-sm border border-gray-200 flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                            <Paperclip className="w-4 h-4 text-indigo-600" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                                                            {name}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {size}{date}
                                                        </p>
                                                    </div>
                                                </a>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Voice Note */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        {canEdit ? (
                                            <div className="mb-2">
                                                <MultiVoiceRecorder onChangeBlobs={setVoiceBlobs} label="Voice Note (Optional)" />
                                            </div>
                                        ) : null}
                                        {voiceMessageUrl && (
                                            <div className="flex flex-col gap-2 mt-2">
                                                {voiceMessageUrl.split(',').filter((url: string) => url.trim().length > 0).map((url: string, i: number) => (
                                                    <div key={i} className="flex flex-col gap-2 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                                                        <div className="text-sm font-medium text-amber-900">Voice Note {i + 1}</div>
                                                        <audio controls src={url} className="w-full h-8" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Work Logs History */}
                                    {task?.workLogs_TaskWorkLogs?.length > 0 && (
                                        <div className="mt-6 pt-5 border-t border-gray-100">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                                <Clock className="w-3.5 h-3.5" /> Work Logs History
                                            </label>
                                            <div className="space-y-3">
                                                {task.workLogs_TaskWorkLogs.map((log: any) => (
                                                    <div key={log.id} className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {log.user?.photoUrl || log.user?.profilePicture ? (
                                                                    <img src={log.user?.photoUrl || log.user?.profilePicture} alt={log.user?.name || log.employee?.name || 'User'} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
                                                                        <span className="text-indigo-600 text-[10px] font-bold">{(log.user?.name || log.employee?.name)?.[0]?.toUpperCase()}</span>
                                                                    </div>
                                                                )}
                                                                <span className="text-xs font-semibold text-gray-900">{log.user?.name || log.employee?.name || 'Unknown User'}</span>
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 font-medium">
                                                                {log.workDate ? format(new Date(log.workDate), 'MMM d, yyyy') : ''}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Status & Timing Metadata */}
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100" title="Created At">
                                                                <CalendarClock className="w-3 h-3" /> {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy h:mm a') : 'Unknown time'}
                                                            </div>
                                                            {log.status && (
                                                                <div className={clsx("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded capitalize", 
                                                                    log.status === 'approved' ? 'text-emerald-700 bg-emerald-50' : 
                                                                    log.status === 'rejected' ? 'text-red-700 bg-red-50' : 'text-amber-700 bg-amber-50'
                                                                )}>
                                                                    {log.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                                    {log.status}
                                                                </div>
                                                            )}
                                                            {log.isWorkCompleted && (
                                                                <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                                    <CheckCircle2 className="w-3 h-3" /> Marked Completed
                                                                </div>
                                                            )}
                                                            {log.hoursSpent > 0 && (
                                                                <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                    <Clock className="w-3 h-3" /> {log.hoursSpent} hrs
                                                                </div>
                                                            )}
                                                        </div>

                                                        <p className="text-xs text-gray-700 whitespace-pre-wrap mt-1">{log.description}</p>
                                                        
                                                        {/* Links & Attachments */}
                                                        {(log.links?.length > 0 || log.attachmentUrls?.length > 0) && (
                                                            <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-gray-50">
                                                                {log.links?.map((link: string, i: number) => (
                                                                    <a key={i} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] text-indigo-600 hover:underline truncate">
                                                                        <Link className="w-3 h-3 flex-shrink-0" /> {link}
                                                                    </a>
                                                                ))}
                                                                {log.attachmentUrls?.map((url: string, i: number) => (
                                                                    <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] text-indigo-600 hover:underline truncate">
                                                                        <Paperclip className="w-3 h-3 flex-shrink-0" /> Attachment {i + 1}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sidebar: Meta fields */}
                            <div className="w-full lg:w-64 p-6 space-y-5 flex-shrink-0">

                                {/* Project Summary (if associated) */}
                                {task?.projectId?.name && (
                                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                        <div className="flex items-center justify-between mb-2 border-b border-indigo-100/50 pb-2">
                                            <div className="font-semibold text-sm text-indigo-900 flex items-center gap-2 truncate">
                                                <FolderKanban className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                                <span className="truncate">{task.projectId.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white text-indigo-600 border border-indigo-200">
                                                {task.projectId.status?.replace('_', ' ') || 'Unknown'}
                                            </span>
                                            <span className="text-xs font-medium text-indigo-700">{task.projectId.progress || 0}%</span>
                                        </div>
                                        <p className="text-xs text-indigo-700/80 line-clamp-2 leading-relaxed">
                                            {task.projectId.description || 'No description provided.'}
                                        </p>
                                    </div>
                                )}

                                {/* Status */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Status</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {STATUS_OPTIONS.map(o => {
                                            const isSelectable = !o.internalOnly || status === o.value;
                                            if (!isSelectable && !canEdit) return null; // non-admins don't see forbidden buttons
                                            
                                            return (
                                                <button
                                                    key={o.value}
                                                    onClick={() => canEdit && setStatus(o.value)}
                                                    disabled={!canEdit || (o.internalOnly && status !== o.value)}
                                                    className={clsx(
                                                        'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                                                        o.cls,
                                                        status === o.value ? 'ring-2 ring-offset-1 ring-indigo-400' : 'opacity-60 hover:opacity-100',
                                                        o.internalOnly && status !== o.value && 'hidden' 
                                                    )}
                                                    title={o.internalOnly && status !== o.value ? 'Status automatically managed via Work Logs' : `Set status to ${o.label}`}
                                                >{o.label}</button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Priority</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PRIORITY_OPTIONS.map(o => (
                                            <button
                                                key={o.value}
                                                onClick={() => canEdit && setPriority(o.value)}
                                                disabled={!canEdit}
                                                className={clsx(
                                                    'px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
                                                    o.cls,
                                                    priority === o.value ? 'ring-2 ring-offset-1 ring-indigo-400' : 'opacity-60 hover:opacity-100'
                                                )}
                                                title={`Set priority to ${o.label}`}
                                            >
                                                <span className={clsx('w-1.5 h-1.5 rounded-full', o.dot)} />
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Assignee */}
                                <div>
                                    <label htmlFor="taskAssignee" className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                        <User className="w-3 h-3" aria-hidden="true" />Assignee
                                    </label>
                                    {canEdit ? (
                                        <select
                                            id="taskAssignee"
                                            value={assigneeId}
                                            onChange={(e) => setAssigneeId(e.target.value)}
                                            className="select w-full text-sm"
                                            title="Select assignee"
                                        >
                                            <option value="">Unassigned</option>
                                            {members.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                        </select>
                                    ) : (
                                        <div className="text-sm font-medium">
                                            {assignee ? assignee.name : 'Unassigned'}
                                        </div>
                                    )}
                                    {assignee && (
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {assignee.profilePicture || assignee.photoUrl ? (
                                                <img src={assignee.profilePicture || assignee.photoUrl} alt={assignee.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white text-[9px] font-bold">{assignee.name?.[0]?.toUpperCase()}</span>
                                                </div>
                                            )}
                                            <span className="text-xs text-gray-500">{assignee.name}</span>
                                        </div>
                                    )}

                                    {canEdit && (
                                        <div className="flex items-center gap-2 mt-2 px-1">
                                            <input 
                                                type="checkbox" 
                                                id="detailSendEmailNotification"
                                                checked={sendEmailNotification}
                                                onChange={(e) => setSendEmailNotification(e.target.checked)}
                                                className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <label htmlFor="detailSendEmailNotification" className="text-[11px] text-gray-500 cursor-pointer select-none">
                                                Notify assignee via email
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Due Date */}
                                <div>
                                    <label htmlFor="taskDueDate" className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                        <Calendar className="w-3 h-3" aria-hidden="true" />Due Date
                                    </label>
                                    {canEdit ? (
                                        <input
                                            id="taskDueDate"
                                            type="datetime-local"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="input text-sm"
                                            title="Task due date"
                                        />
                                    ) : (
                                        <div className="text-sm font-medium">{dueDate ? format(new Date(dueDate), 'MMM d, yyyy h:mm a') : 'No set date'}</div>
                                    )}
                                </div>

                                {/* Created info */}
                                {(task?.createdAt || task?.creator) && (
                                    <div className="text-xs text-gray-500 pt-3 border-t border-gray-50 flex flex-col gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold uppercase tracking-wider text-gray-400">Created:</span>
                                            <span>{task?.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy h:mm a') : 'Unknown Date'}</span>
                                        </div>
                                        {task?.creator && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold uppercase tracking-wider text-gray-400">By:</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-white text-[8px] font-bold">{task.creator.name?.[0]?.toUpperCase()}</span>
                                                    </div>
                                                    <span>{task.creator.name}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Time Progress Bar */}
                                {task?.dueDate && (
                                    <div className="pt-3 border-t border-gray-50">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Time Remaining</label>
                                        <TimeProgressBar
                                            createdAt={task.createdAt}
                                            dueDate={task.dueDate}
                                            estimatedHours={task.estimatedHours}
                                            status={status}
                                            completedOnTime={task.completedOnTime}
                                        />
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-gray-100 gap-3">
                    {canEdit ? (
                        <>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={loading || deleting}
                                className="btn-danger"
                            >
                                {deleting ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Delete
                            </button>
                            <div className="flex gap-2">
                                <button onClick={onClose} className="btn-secondary">Cancel</button>
                                <button onClick={save} disabled={loading || saving} className="btn-primary">
                                    {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="w-full flex justify-end">
                            <button onClick={onClose} className="btn-secondary">Close</button>
                        </div>
                    )}
                </div>
            </div>

            {showUpload && task && (
                <FileUploadModal
                    relatedId={task.id}
                    relatedModel="Task"
                    onClose={() => setShowUpload(false)}
                    onSuccess={(file) => {
                        setTask((prev: any) => ({
                            ...prev,
                            attachments: [file, ...(prev?.attachments || [])]
                        }));
                    }}
                />
            )}

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Task"
                message="Are you sure you want to delete this task permanently? This action cannot be undone."
                confirmText="Delete Task"
                onConfirm={deleteTask}
                onCancel={() => setShowDeleteConfirm(false)}
                loading={deleting}
                variant="danger"
            />
        </div>
    );
}
