'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, 
    Save, 
    Trash2, 
    ExternalLink, 
    BookOpen, 
    Eye,
    X,
    Sparkles,
    Calendar,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    FileText,
    TrendingUp,
    Globe,
    Share2,
    HelpCircle,
    UserCheck,
    Layers,
    Tag,
    Image as ImageIcon,
    RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import saApi from '@/lib/superadmin-api';
import { LogoLoader } from '@workspace/ui';
import toast, { Toaster } from 'react-hot-toast';

interface FAQItem {
    question: string;
    answer: string;
}

interface BlogArticle {
    id?: string;
    _id?: string;
    title: string;
    slug: string;
    category: string;
    tags: string[];
    seoTitle: string;
    seoDescription: string;
    keywords: string[];
    canonicalUrl?: string | null;
    ogImageUrl?: string | null;
    noIndex: boolean;
    excerpt: string;
    contentMarkdown: string;
    contentHtml?: string;
    coverImageUrl?: string | null;
    keyTakeaways: string[];
    readingTimeMin: number;
    authorName: string;
    authorRole: string;
    authorAvatarUrl?: string | null;
    authorBio?: string | null;
    authorSocial?: string | null;
    relatedAppSlug?: string | null;
    ctaHeadline?: string | null;
    ctaButtonText?: string | null;
    faqs?: FAQItem[];
    featured: boolean;
    published: boolean;
    publishedAt?: string | null;
    viewsCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

const CATEGORIES = [
    'Operations',
    'Growth & Ads',
    'Architecture',
    'Finance',
    'AI & Orbit',
    'Freelancing'
];

const APPS_LIST = [
    { slug: 'crm-and-sales', name: 'CRM & Sales Pipelines' },
    { slug: 'traffic-director', name: 'Traffic Director & Bot Shield' },
    { slug: 'finance', name: 'Finance & Cash Flow Ledger' },
    { slug: 'projects-and-tasks', name: 'Projects, Kanban & Sprints' },
    { slug: 'hr-management', name: 'HR Management & Time Clock' },
    { slug: 'orbit-copilot', name: 'Orbit Copilot AI' },
    { slug: 'advertising', name: 'Advertising Attribution' },
    { slug: 'social-media', name: 'Social Media Publisher' },
    { slug: 'communications', name: 'Team Chat & HD Video' },
    { slug: 'service-desk', name: 'Service Desk & SLAs' }
];

const DEFAULT_ARTICLE: BlogArticle = {
    title: '',
    slug: '',
    category: 'Operations',
    tags: [],
    seoTitle: '',
    seoDescription: '',
    keywords: [],
    canonicalUrl: '',
    ogImageUrl: '',
    noIndex: false,
    excerpt: '',
    contentMarkdown: '',
    coverImageUrl: '',
    keyTakeaways: [''],
    readingTimeMin: 5,
    authorName: '180 Strategy Team',
    authorRole: 'Platform Growth & Architecture',
    authorAvatarUrl: '',
    authorBio: 'Engineering and systems leadership at 180workspace, specializing in Work Graph orchestration.',
    authorSocial: '',
    relatedAppSlug: 'crm-and-sales',
    ctaHeadline: 'Ready to run your company on one Work Graph?',
    ctaButtonText: 'Start with $12 Plan',
    faqs: [{ question: '', answer: '' }],
    featured: false,
    published: true,
    publishedAt: new Date().toISOString()
};

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export default function SuperAdminBlogs() {
    const [blogs, setBlogs] = useState<BlogArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'draft'>('all');
    
    // Modal Studio state
    const [isStudioOpen, setIsStudioOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'author' | 'seo' | 'cta'>('content');
    const [editingArticle, setEditingArticle] = useState<BlogArticle>(DEFAULT_ARTICLE);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            setLoading(true);
            const res = await saApi.get('/blogs');
            setBlogs(res.data || []);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load blog posts');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingArticle({ ...DEFAULT_ARTICLE });
        setActiveTab('content');
        setIsStudioOpen(true);
    };

    const handleOpenEdit = (article: BlogArticle) => {
        setEditingArticle({
            ...article,
            keyTakeaways: article.keyTakeaways && article.keyTakeaways.length > 0 ? article.keyTakeaways : [''],
            faqs: article.faqs && article.faqs.length > 0 ? article.faqs : [{ question: '', answer: '' }]
        });
        setActiveTab('content');
        setIsStudioOpen(true);
    };

    const handleTitleChange = (newTitle: string) => {
        setEditingArticle(prev => ({
            ...prev,
            title: newTitle,
            slug: prev.id ? prev.slug : slugify(newTitle),
            seoTitle: prev.seoTitle ? prev.seoTitle : newTitle
        }));
    };

    const handleMarkdownChange = (val: string) => {
        const words = val.trim().split(/\s+/).filter(Boolean).length;
        const readingTime = Math.max(1, Math.ceil(words / 200));
        setEditingArticle(prev => ({
            ...prev,
            contentMarkdown: val,
            readingTimeMin: readingTime
        }));
    };

    const handleSave = async (publishStatus?: boolean) => {
        if (!editingArticle.title.trim()) {
            toast.error('Article Title is required');
            setActiveTab('content');
            return;
        }

        try {
            setIsSaving(true);
            const payload: any = {
                ...editingArticle,
                slug: editingArticle.slug ? slugify(editingArticle.slug) : slugify(editingArticle.title),
                keyTakeaways: editingArticle.keyTakeaways.filter(t => t.trim().length > 0),
                faqs: editingArticle.faqs?.filter(f => f.question.trim().length > 0)
            };

            if (publishStatus !== undefined) {
                payload.published = publishStatus;
                if (publishStatus && !payload.publishedAt) {
                    payload.publishedAt = new Date().toISOString();
                }
            }

            if (editingArticle.id) {
                const res = await saApi.put(`/blogs/${editingArticle.id}`, payload);
                toast.success('Article updated successfully!');
                setBlogs(prev => prev.map(b => b.id === editingArticle.id ? res.data : b));
            } else {
                const res = await saApi.post('/blogs', payload);
                toast.success('Article created successfully!');
                setBlogs(prev => [res.data, ...prev]);
            }

            setIsStudioOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save article');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTogglePublish = async (article: BlogArticle) => {
        try {
            const res = await saApi.patch(`/blogs/${article.id}/toggle-publish`);
            toast.success(res.data.published ? 'Article published live!' : 'Article reverted to draft');
            setBlogs(prev => prev.map(b => b.id === article.id ? res.data : b));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to toggle status');
        }
    };

    const handleDelete = async (article: BlogArticle) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${article.title}"?`)) return;

        try {
            await saApi.delete(`/blogs/${article.id}`);
            toast.success('Article deleted successfully');
            setBlogs(prev => prev.filter(b => b.id !== article.id));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete article');
        }
    };

    // Filtered blogs
    const filteredBlogs = blogs.filter(blog => {
        const matchesSearch = !searchQuery.trim() || 
            blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            blog.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
            blog.authorName.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = selectedCategory === 'All' || blog.category === selectedCategory;

        const matchesPublished = publishedFilter === 'all' 
            ? true 
            : publishedFilter === 'published' 
                ? blog.published 
                : !blog.published;

        return matchesSearch && matchesCategory && matchesPublished;
    });

    const totalViews = blogs.reduce((acc, b) => acc + (b.viewsCount || 0), 0);
    const totalPublished = blogs.filter(b => b.published).length;
    const totalDrafts = blogs.filter(b => !b.published).length;

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Toaster position="top-right" />

            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                            SEO & AI Engine
                        </span>
                        <span className="text-xs text-slate-400 font-mono">/superadmin/blogs</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                        Marketing Blog Studio & SEO CMS
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Author, format, and rank articles that directly sync to the public marketing site with automated Schema.org JSON-LD and GEO citations.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={fetchBlogs}
                        className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        title="Refresh list"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Write New Article</span>
                    </button>
                </div>
            </div>

            {/* Stats Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Articles</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{blogs.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Published</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">{totalPublished}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Drafts in Progress</p>
                        <p className="text-2xl font-black text-amber-600 mt-1">{totalDrafts}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Views Tracked</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{totalViews.toLocaleString()}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input 
                        type="text"
                        placeholder="Search by title, slug, or author..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-sm text-slate-800 placeholder-slate-400 w-full focus:outline-hidden"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-hidden"
                    >
                        <option value="All">All Categories</option>
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-slate-50 text-xs font-bold">
                        <button
                            onClick={() => setPublishedFilter('all')}
                            className={`px-3 py-1 rounded-lg transition-colors ${publishedFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setPublishedFilter('published')}
                            className={`px-3 py-1 rounded-lg transition-colors ${publishedFilter === 'published' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Published
                        </button>
                        <button
                            onClick={() => setPublishedFilter('draft')}
                            className={`px-3 py-1 rounded-lg transition-colors ${publishedFilter === 'draft' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Drafts
                        </button>
                    </div>
                </div>
            </div>

            {/* Articles Table */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                        <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
                        <p className="text-xs font-bold text-slate-500">Loading blog studio data...</p>
                    </div>
                ) : filteredBlogs.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">No blog articles found</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                {searchQuery || selectedCategory !== 'All' 
                                    ? 'No posts matched your current search and filter settings.' 
                                    : 'Start authoring your first high-intent, SEO-optimized blog post.'}
                            </p>
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create First Article</span>
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="py-3.5 px-4">Article Title & Slug</th>
                                    <th className="py-3.5 px-4">Category</th>
                                    <th className="py-3.5 px-4">Author</th>
                                    <th className="py-3.5 px-4">Read Time</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredBlogs.map((blog) => (
                                    <tr key={blog.id} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="py-4 px-4">
                                            <div className="flex items-start gap-3">
                                                {blog.coverImageUrl ? (
                                                    <img 
                                                        src={blog.coverImageUrl} 
                                                        alt={blog.title} 
                                                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 mt-0.5" 
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 font-bold shrink-0 mt-0.5">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                        {blog.title}
                                                    </p>
                                                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                                        /blog/{blog.slug}
                                                    </p>
                                                    {blog.excerpt && (
                                                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 max-w-md">
                                                            {blog.excerpt}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-4 px-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                {blog.category}
                                            </span>
                                        </td>

                                        <td className="py-4 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {blog.authorAvatarUrl ? (
                                                    <img src={blog.authorAvatarUrl} alt={blog.authorName} className="w-6 h-6 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                                                        {blog.authorName.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="font-semibold text-slate-800">{blog.authorName}</span>
                                            </div>
                                        </td>

                                        <td className="py-4 px-4 whitespace-nowrap text-slate-500 font-medium">
                                            {blog.readingTimeMin || 5} min read
                                        </td>

                                        <td className="py-4 px-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleTogglePublish(blog)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                                    blog.published
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                                }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${blog.published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <span>{blog.published ? 'Published' : 'Draft'}</span>
                                            </button>
                                        </td>

                                        <td className="py-4 px-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <a
                                                    href={`http://localhost:3004/blog/${blog.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                                                    title="View live on marketing site"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                                <button
                                                    onClick={() => handleOpenEdit(blog)}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                                                >
                                                    Edit Studio
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(blog)}
                                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                                                    title="Delete article"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* FULL-SCREEN / EXPANDED STUDIO MODAL */}
            {isStudioOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-slate-900">
                                        {editingArticle.id ? 'Edit Article in Studio' : 'Author New Blog Article'}
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        SEO-Engine Grounded • Live Schema.org Ready
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsStudioOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Studio Tabs Navigation */}
                        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0 bg-white">
                            <button
                                onClick={() => setActiveTab('content')}
                                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'content'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <FileText className="w-4 h-4" />
                                <span>1. Content & Markdown</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('author')}
                                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'author'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <UserCheck className="w-4 h-4" />
                                <span>2. E-E-A-T Author Attribution</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('seo')}
                                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'seo'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Globe className="w-4 h-4" />
                                <span>3. Google SEO & AI GEO</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('cta')}
                                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'cta'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Layers className="w-4 h-4" />
                                <span>4. In-Article Work Graph CTA</span>
                            </button>
                        </div>

                        {/* Modal Body / Tab Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">

                            {/* TAB 1: CONTENT & MARKDOWN */}
                            {activeTab === 'content' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="sm:col-span-2 space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Article Title *</label>
                                            <input 
                                                type="text"
                                                placeholder="e.g., How to Scale a 7-Figure Agency on One Work Graph"
                                                value={editingArticle.title}
                                                onChange={(e) => handleTitleChange(e.target.value)}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Category *</label>
                                            <select
                                                value={editingArticle.category}
                                                onChange={(e) => setEditingArticle(prev => ({ ...prev, category: e.target.value }))}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-hidden bg-white"
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Custom URL Slug</label>
                                            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600">
                                                <span>/blog/</span>
                                                <input 
                                                    type="text"
                                                    value={editingArticle.slug}
                                                    onChange={(e) => setEditingArticle(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                                                    className="bg-transparent font-bold text-indigo-600 focus:outline-hidden flex-1 ml-1"
                                                    placeholder="article-slug"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Cover Image URL</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text"
                                                    placeholder="https://images.unsplash.com/... or /images/og-image.png"
                                                    value={editingArticle.coverImageUrl || ''}
                                                    onChange={(e) => setEditingArticle(prev => ({ ...prev, coverImageUrl: e.target.value }))}
                                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                                                />
                                                {editingArticle.coverImageUrl && (
                                                    <img src={editingArticle.coverImageUrl} alt="Preview" className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Excerpt / Card Summary (2-3 sentences)</label>
                                        <textarea
                                            rows={2}
                                            value={editingArticle.excerpt}
                                            onChange={(e) => setEditingArticle(prev => ({ ...prev, excerpt: e.target.value }))}
                                            placeholder="A concise summary highlighting the pain points and resolution for readers and search cards..."
                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                                        />
                                    </div>

                                    {/* KEY TAKEAWAYS BUILDER */}
                                    <div className="p-4 rounded-2xl border border-amber-200/60 bg-amber-50/40 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-amber-600" />
                                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                                                    Key Takeaways (Google AI Overviews & SearchGPT Box)
                                                </h4>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditingArticle(prev => ({ ...prev, keyTakeaways: [...prev.keyTakeaways, ''] }))}
                                                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>Add Bullet</span>
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-amber-700/80">
                                            High-authority bullet points displayed in a prominent callout box at the top of the article.
                                        </p>
                                        <div className="space-y-2">
                                            {editingArticle.keyTakeaways.map((takeaway, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <input 
                                                        type="text"
                                                        value={takeaway}
                                                        onChange={(e) => {
                                                            const copy = [...editingArticle.keyTakeaways];
                                                            copy[idx] = e.target.value;
                                                            setEditingArticle(prev => ({ ...prev, keyTakeaways: copy }));
                                                        }}
                                                        placeholder="e.g. Eliminating tool fragmentation saves 12+ billable hours per week."
                                                        className="w-full px-3 py-1.5 rounded-lg border border-amber-200/80 bg-white text-xs text-slate-800 focus:outline-hidden"
                                                    />
                                                    {editingArticle.keyTakeaways.length > 1 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const copy = editingArticle.keyTakeaways.filter((_, i) => i !== idx);
                                                                setEditingArticle(prev => ({ ...prev, keyTakeaways: copy }));
                                                            }}
                                                            className="text-slate-400 hover:text-rose-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SPLIT-SCREEN MARKDOWN STUDIO */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">Article Content (Markdown Supported)</label>
                                            <span className="text-[11px] font-mono text-slate-400">
                                                ~{editingArticle.readingTimeMin} min read • {editingArticle.contentMarkdown.split(/\s+/).filter(Boolean).length} words
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                                            {/* Left: Raw Markdown Editor */}
                                            <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200">
                                                <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                                    <span>Markdown Editor</span>
                                                    <span>Supports ## H2, ### H3, - list, &gt; quote</span>
                                                </div>
                                                <textarea
                                                    rows={16}
                                                    value={editingArticle.contentMarkdown}
                                                    onChange={(e) => handleMarkdownChange(e.target.value)}
                                                    placeholder="## Introduction&#10;&#10;Write your deep-dive insights here with clear sections, actionable data, and tactical takeaways..."
                                                    className="w-full p-4 text-xs font-mono text-slate-800 focus:outline-hidden resize-none flex-1 bg-slate-50/30 leading-relaxed"
                                                />
                                            </div>

                                            {/* Right: Live Formatted HTML Preview */}
                                            <div className="flex flex-col max-h-[440px] overflow-y-auto">
                                                <div className="p-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-mono flex items-center justify-between sticky top-0 z-10">
                                                    <span>Live Marketing Preview</span>
                                                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                                </div>
                                                <div className="p-4 prose prose-sm max-w-none text-slate-700">
                                                    {editingArticle.contentMarkdown ? (
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {editingArticle.contentMarkdown}
                                                        </ReactMarkdown>
                                                    ) : (
                                                        <p className="text-slate-400 italic text-xs">Live formatted output will render here as you type...</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: E-E-A-T AUTHOR ATTRIBUTION */}
                            {activeTab === 'author' && (
                                <div className="space-y-6 max-w-2xl">
                                    <div className="p-4 rounded-2xl border border-sky-200/60 bg-sky-50/40 text-xs text-sky-900 space-y-1">
                                        <p className="font-bold">Why E-E-A-T matters for Google ranking:</p>
                                        <p className="text-sky-700">
                                            Google Search Quality Guidelines reward articles written by real, verifiable experts with author bios, credentials, and social links.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Author Full Name *</label>
                                            <input 
                                                type="text"
                                                value={editingArticle.authorName}
                                                onChange={(e) => setEditingArticle(prev => ({ ...prev, authorName: e.target.value }))}
                                                placeholder="e.g. Sarah Jenkins"
                                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Author Professional Role *</label>
                                            <input 
                                                type="text"
                                                value={editingArticle.authorRole}
                                                onChange={(e) => setEditingArticle(prev => ({ ...prev, authorRole: e.target.value }))}
                                                placeholder="e.g. VP of Operations & Systems"
                                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Author Avatar Image URL</label>
                                            <input 
                                                type="text"
                                                value={editingArticle.authorAvatarUrl || ''}
                                                onChange={(e) => setEditingArticle(prev => ({ ...prev, authorAvatarUrl: e.target.value }))}
                                                placeholder="https://images.unsplash.com/photo-..."
                                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Author Social Profile (LinkedIn / X)</label>
                                            <input 
                                                type="text"
                                                value={editingArticle.authorSocial || ''}
                                                onChange={(e) => setEditingArticle(prev => ({ ...prev, authorSocial: e.target.value }))}
                                                placeholder="https://linkedin.com/in/..."
                                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Author Bio & Credentials</label>
                                        <textarea
                                            rows={3}
                                            value={editingArticle.authorBio || ''}
                                            onChange={(e) => setEditingArticle(prev => ({ ...prev, authorBio: e.target.value }))}
                                            placeholder="10+ years optimizing operational cash flow and software architectures for 100+ digital agencies worldwide."
                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: GOOGLE SEO & AI SEARCH (GEO) */}
                            {activeTab === 'seo' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        
                                        {/* SEO Form Inputs */}
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold text-slate-700">SEO Meta Title *</label>
                                                    <span className={`text-[11px] font-mono ${editingArticle.seoTitle.length > 60 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                                                        {editingArticle.seoTitle.length} / 60 chars
                                                    </span>
                                                </div>
                                                <input 
                                                    type="text"
                                                    value={editingArticle.seoTitle}
                                                    onChange={(e) => setEditingArticle(prev => ({ ...prev, seoTitle: e.target.value }))}
                                                    placeholder="Target keyword near the beginning..."
                                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold text-slate-700">SEO Meta Description *</label>
                                                    <span className={`text-[11px] font-mono ${editingArticle.seoDescription.length > 160 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                                                        {editingArticle.seoDescription.length} / 160 chars
                                                    </span>
                                                </div>
                                                <textarea 
                                                    rows={3}
                                                    value={editingArticle.seoDescription}
                                                    onChange={(e) => setEditingArticle(prev => ({ ...prev, seoDescription: e.target.value }))}
                                                    placeholder="Compelling SERP snippet that drives clicks..."
                                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">Focus Keywords (comma-separated)</label>
                                                <input 
                                                    type="text"
                                                    value={editingArticle.keywords.join(', ')}
                                                    onChange={(e) => setEditingArticle(prev => ({ ...prev, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) }))}
                                                    placeholder="work graph, software fragmentation, agency crm"
                                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <input 
                                                    type="checkbox"
                                                    id="noindex"
                                                    checked={editingArticle.noIndex}
                                                    onChange={(e) => setEditingArticle(prev => ({ ...prev, noIndex: e.target.checked }))}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label htmlFor="noindex" className="text-xs text-slate-600">
                                                    Exclude from Search Engine Indexing (noindex tag)
                                                </label>
                                            </div>
                                        </div>

                                        {/* Google SERP Live Snippet Preview */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <GoogleIcon className="w-4 h-4" />
                                                <span>Google Search Result Snippet Preview</span>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-1.5 font-sans">
                                                <div className="flex items-center gap-2 text-xs text-slate-700">
                                                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold">180</div>
                                                    <span className="text-[11px] text-slate-500">https://180workspace.com &gt; blog &gt; {editingArticle.slug || 'slug'}</span>
                                                </div>
                                                <h4 className="text-base font-medium text-[#1a0dab] hover:underline cursor-pointer line-clamp-1 leading-snug">
                                                    {editingArticle.seoTitle || editingArticle.title || 'Your Article Title Displays Here in Google Search'}
                                                </h4>
                                                <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                                                    {editingArticle.seoDescription || editingArticle.excerpt || 'Your meta description snippet will appear here to entice searchers on Google and AI retrieval engines...'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* STRUCTURED FAQ SCHEMA BUILDER */}
                                    <div className="p-5 rounded-2xl border border-indigo-200/70 bg-indigo-50/30 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <HelpCircle className="w-4 h-4 text-indigo-600" />
                                                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                                                    Structured FAQ Accordion (Schema.org FAQPage JSON-LD)
                                                </h4>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditingArticle(prev => ({ ...prev, faqs: [...(prev.faqs || []), { question: '', answer: '' }] }))}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Add Q&amp;A</span>
                                            </button>
                                        </div>
                                        <p className="text-xs text-indigo-800/80">
                                            Q&amp;A pairs automatically compile into Google Rich Snippet FAQ schema and SearchGPT direct answer citations.
                                        </p>

                                        <div className="space-y-3">
                                            {editingArticle.faqs?.map((faq, idx) => (
                                                <div key={idx} className="p-3 rounded-xl border border-indigo-100 bg-white space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <input 
                                                            type="text"
                                                            value={faq.question}
                                                            onChange={(e) => {
                                                                const copy = [...(editingArticle.faqs || [])];
                                                                copy[idx].question = e.target.value;
                                                                setEditingArticle(prev => ({ ...prev, faqs: copy }));
                                                            }}
                                                            placeholder="Question (e.g. How does Work Graph differ from Zapier?)"
                                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden"
                                                        />
                                                        {editingArticle.faqs && editingArticle.faqs.length > 1 && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    const copy = editingArticle.faqs?.filter((_, i) => i !== idx);
                                                                    setEditingArticle(prev => ({ ...prev, faqs: copy }));
                                                                }}
                                                                className="text-slate-400 hover:text-rose-500"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <textarea 
                                                        rows={2}
                                                        value={faq.answer}
                                                        onChange={(e) => {
                                                            const copy = [...(editingArticle.faqs || [])];
                                                            copy[idx].answer = e.target.value;
                                                            setEditingArticle(prev => ({ ...prev, faqs: copy }));
                                                        }}
                                                        placeholder="Answer providing factual and direct resolution..."
                                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-hidden"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: IN-ARTICLE WORK GRAPH CTA */}
                            {activeTab === 'cta' && (
                                <div className="space-y-6 max-w-2xl">
                                    <div className="p-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/40 text-xs text-emerald-900 space-y-1">
                                        <p className="font-bold">Product-Led Growth (PLG) In-Article Conversion:</p>
                                        <p className="text-emerald-700">
                                            Embed a high-converting Work Graph app teaser inside the article so readers can immediately start a free trial on the relevant application.
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Promoted 180workspace App</label>
                                        <select
                                            value={editingArticle.relatedAppSlug || ''}
                                            onChange={(e) => setEditingArticle(prev => ({ ...prev, relatedAppSlug: e.target.value }))}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-hidden"
                                        >
                                            <option value="">None (Generic 180workspace CTA)</option>
                                            {APPS_LIST.map(app => (
                                                <option key={app.slug} value={app.slug}>{app.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Custom CTA Headline</label>
                                        <input 
                                            type="text"
                                            value={editingArticle.ctaHeadline || ''}
                                            onChange={(e) => setEditingArticle(prev => ({ ...prev, ctaHeadline: e.target.value }))}
                                            placeholder="e.g. Stop losing 30% of ad spend to bot clicks"
                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Custom CTA Button Text</label>
                                        <input 
                                            type="text"
                                            value={editingArticle.ctaButtonText || ''}
                                            onChange={(e) => setEditingArticle(prev => ({ ...prev, ctaButtonText: e.target.value }))}
                                            placeholder="Start with $12 Plan"
                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                                        />
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer Controls */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                                    <input 
                                        type="checkbox"
                                        checked={editingArticle.published}
                                        onChange={(e) => setEditingArticle(prev => ({ ...prev, published: e.target.checked }))}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>Publish live on marketing site</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsStudioOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSave(false)}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-800 transition-colors"
                                >
                                    Save Draft
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSave(true)}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:scale-105"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{isSaving ? 'Saving...' : 'Publish to Marketing Site'}</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
    );
}
