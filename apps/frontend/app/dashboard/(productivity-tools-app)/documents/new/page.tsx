'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

import { useCreateArticleMutation } from '@/redux/api/knowledgeApi';

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

export default function NewArticlePage() {
    const router = useRouter();
    const { user } = useAuth();

    const [createArticle, { isLoading: isSaving }] = useCreateArticleMutation();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('General');

    const handleSave = async () => {
        if (!title) {
            toast.error('Title is required');
            return;
        }

        try {
            const result = await createArticle({
                title,
                content,
                category
            }).unwrap();
            toast.success('Document created successfully');
            router.push(`/dashboard/documents/${result.article?._id || result._id || result.id || ''}`);
        } catch (error) {
            toast.error('Failed to create document');
        }
    };

    const handleDelete = () => {
        router.push('/dashboard/documents');
    };

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
                                className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-gray-300 min-w-[300px]"
                                placeholder="Article Title"
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                    Draft
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn-primary shadow-md shadow-indigo-600/20 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> 
                            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Document'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Editor Area */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-250px)]">
                        <ReactQuill 
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            modules={{ toolbar: TOOLBAR_OPTIONS }}
                            className="flex-1 flex flex-col h-full"
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
                                <select 
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="General">General</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="HR">HR</option>
                                    <option value="Sales">Sales</option>
                                    <option value="Product">Product</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-red-600 mb-2">Discard</h3>
                        <p className="text-xs text-gray-500 mb-4">Discard this draft and go back.</p>
                        <button 
                            onClick={handleDelete}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Discard Draft
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
