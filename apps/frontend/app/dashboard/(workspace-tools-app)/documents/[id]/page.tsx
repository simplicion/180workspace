'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Lock, Unlock, History, Link as LinkIcon, Trash2 } from 'lucide-react';
import { LogoLoader } from "@workspace/ui";
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

import { 
    useGetArticleByIdQuery, 
    useUpdateArticleMutation, 
    useLockArticleMutation, 
    useUnlockArticleMutation,
    useDeleteArticleMutation
} from '@/redux/api/knowledgeApi';

// Dynamically import Quill to avoid SSR issues
import CustomSelect from '@/components/ui/CustomSelect';
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-xl" /> });

const TOOLBAR_OPTIONS = [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': [] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image', 'video'],
    ['clean']
];

export default function ArticleEditorPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params.id as string;

    const { data, isLoading, refetch } = useGetArticleByIdQuery(id);
    const [updateArticle, { isLoading: isSaving }] = useUpdateArticleMutation();
    const [lockArticle] = useLockArticleMutation();
    const [unlockArticle] = useUnlockArticleMutation();
    const [deleteArticle] = useDeleteArticleMutation();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('General');
    const [isLockedByOther, setIsLockedByOther] = useState(false);
    const [lockedByName, setLockedByName] = useState('');
    const [showVersions, setShowVersions] = useState(false);

    const isInitialized = useRef(false);

    useEffect(() => {
        if (data?.article && !isInitialized.current) {
            setTitle(data.article.title);
            setContent(data.article.content || '');
            setCategory(data.article.category);
            isInitialized.current = true;
        }
    }, [data]);

    // Handle locking
    useEffect(() => {
        if (!id) return;

        const attemptLock = async () => {
            try {
                await lockArticle(id).unwrap();
                setIsLockedByOther(false);
            } catch (err: any) {
                if (err?.status === 403) {
                    setIsLockedByOther(true);
                    setLockedByName(data?.article?.lockedBy?.name || 'Someone');
                }
            }
        };

        attemptLock();
        // Ping every 5 minutes to keep lock active
        const interval = setInterval(attemptLock, 5 * 60 * 1000);

        return () => {
            clearInterval(interval);
            unlockArticle(id).catch(console.error);
        };
    }, [id, data?.article?.lockedBy?.name]);

    const handleSave = async (saveVersion = false) => {
        if (isLockedByOther) {
            toast.error('Cannot save while someone else is editing');
            return;
        }

        try {
            await updateArticle({
                id,
                title,
                content,
                category,
                saveVersion
            }).unwrap();
            toast.success(saveVersion ? 'Snapshot saved' : 'Saved successfully');
            if (saveVersion) refetch();
        } catch (error) {
            toast.error('Failed to save');
        }
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this article?')) {
            try {
                await deleteArticle(id).unwrap();
                toast.success('Deleted successfully');
                router.push('/dashboard/documents');
            } catch {
                toast.error('Failed to delete');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!data?.article) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Article not found</h2>
                <button onClick={() => router.push('/dashboard/documents')} className="btn-secondary">
                    Go Back
                </button>
            </div>
        );
    }

    const article = data.article;
    const versions = article.versions || [];

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.push('/dashboard/documents')}
                            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <input 
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={isLockedByOther}
                                className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-gray-300 min-w-[300px]"
                                placeholder="Article Title"
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-gray-500">
                                    Last edited {new Date(article.updatedAt).toLocaleString()}
                                </span>
                                {isLockedByOther ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                        <Lock className="w-3 h-3" /> Locked by {lockedByName}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                        <Unlock className="w-3 h-3" /> Editable
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowVersions(!showVersions)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <History className="w-4 h-4" /> 
                            <span className="hidden sm:inline">Versions</span>
                        </button>
                        <button 
                            onClick={() => handleSave(true)}
                            disabled={isLockedByOther || isSaving}
                            className="btn-secondary flex items-center gap-2"
                            title="Save as a snapshot version"
                        >
                            <Save className="w-4 h-4" /> 
                            <span className="hidden sm:inline">Snapshot</span>
                        </button>
                        <button 
                            onClick={() => handleSave(false)}
                            disabled={isLockedByOther || isSaving}
                            className="btn-primary flex items-center gap-2 shadow-md shadow-indigo-600/20"
                        >
                            {isSaving ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
                            <span className="hidden sm:inline">Save</span>
                        </button>
                    </div>
                </div>
            </div>

            {isLockedByOther && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-amber-900">Document is Locked</h4>
                        <p className="text-sm text-amber-800 mt-1">
                            {lockedByName} is currently editing this document. You cannot make changes until they leave.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Editor Area */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="h-full min-h-[600px] flex flex-col">
                        <ReactQuill 
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            readOnly={isLockedByOther}
                            modules={{ toolbar: TOOLBAR_OPTIONS }}
                            className="flex-1 flex flex-col"
                            style={{ height: 'calc(100vh - 300px)' }}
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-80 space-y-6">
                    {/* Settings */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">Settings</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Category</label>
                                <CustomSelect 
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    disabled={isLockedByOther}
                                    className="input w-full"
                                >
                                    <option value="General">General</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="HR">HR</option>
                                    <option value="Sales">Sales</option>
                                    <option value="Product">Product</option>
                                </CustomSelect>
                            </div>
                        </div>
                    </div>

                    {/* Versions */}
                    {showVersions && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <History className="w-4 h-4 text-indigo-500" /> Version History
                            </h3>
                            <div className="space-y-3">
                                {versions.length === 0 ? (
                                    <p className="text-sm text-gray-500">No previous versions saved.</p>
                                ) : (
                                    versions.map((v: any, idx: number) => (
                                        <div key={v.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-gray-700">Snapshot {versions.length - idx}</span>
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    {new Date(v.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mb-2">By {v.createdBy?.name}</p>
                                            <button 
                                                onClick={() => {
                                                    if(confirm('Replace current content with this snapshot?')) {
                                                        setContent(v.content);
                                                    }
                                                }}
                                                disabled={isLockedByOther}
                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                                            >
                                                Restore Content
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Links */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-indigo-500" /> Linked Items
                        </h3>
                        {article.links && article.links.length > 0 ? (
                            <div className="space-y-2">
                                {article.links.map((link: any) => (
                                    <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-sm">
                                        <span className="font-semibold text-indigo-600">{link.relatedModel}:</span>
                                        <span className="text-gray-600 truncate">{link.relatedId}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500">No linked projects or tasks.</p>
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h3>
                        <p className="text-xs text-gray-500 mb-4">Once you delete an article, there is no going back. Please be certain.</p>
                        <button 
                            onClick={handleDelete}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Article
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Quill Styles */}
            <style jsx global>{`
                .quill {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .ql-toolbar.ql-snow {
                    border: none !important;
                    border-bottom: 1px solid #f3f4f6 !important;
                    padding: 12px 16px !important;
                    background: #f9fafb;
                    border-top-left-radius: 16px;
                    border-top-right-radius: 16px;
                }
                .ql-container.ql-snow {
                    border: none !important;
                    flex: 1;
                    overflow: auto;
                    font-family: inherit !important;
                    font-size: 16px !important;
                }
                .ql-editor {
                    padding: 24px 32px !important;
                    min-height: 100%;
                }
                .ql-editor p {
                    margin-bottom: 1em;
                }
            `}</style>
        </div>
    );
}
