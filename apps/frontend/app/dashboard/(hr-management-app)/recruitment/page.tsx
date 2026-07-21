'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Briefcase, Plus, MapPin, Clock, Users, Pencil, ChevronRight, X, Mail, Phone, FileText, ChevronDown, CheckCircle, Key, Copy, RefreshCw, Link as LinkIcon, ExternalLink, Info, Sparkles, Bot, Terminal, Cpu } from 'lucide-react';
import clsx from 'clsx';
import PostJobModal from './_components/PostJobModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';

const TYPE_COLORS: Record<string, string> = {
    full_time: 'badge-blue', part_time: 'badge-orange',
    contract: 'badge-purple', internship: 'badge-gray',
};

const APP_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
const STAGE_COLORS: Record<string, string> = {
    applied: 'badge-gray', screening: 'badge-blue', interview: 'badge-orange',
    offer: 'badge-purple', hired: 'badge-green', rejected: 'badge-red',
};

const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : '';

function ApplicationDetailModal({ app, onClose }: { app: any; onClose: () => void }) {
    if (!app) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in transition-all">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 leading-tight">{app.applicantName || app.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={clsx('badge text-[10px] px-2 py-0.5 uppercase font-bold tracking-wider', STAGE_COLORS[app.status])}>
                                    {app.status}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">Applied on {new Date(app.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Contact Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 group">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Email Address</p>
                                    <p className="text-sm font-semibold text-gray-700 truncate">{app.applicantEmail || app.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 group">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Phone Number</p>
                                    <p className="text-sm font-semibold text-gray-700">{app.applicantPhone || app.phone || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center gap-4 bg-gray-50/50 rounded-2xl p-5 border border-dashed border-gray-200">
                            <p className="text-xs text-gray-500 font-medium text-center">Resume & Documents</p>
                            {app.resumeUrl ? (
                                <a
                                    href={app.resumeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-indigo-600 hover:shadow-md hover:border-indigo-100 transition-all active:scale-95"
                                >
                                    <FileText className="w-4 h-4" /> View Resume
                                </a>
                            ) : (
                                <div className="text-center py-2 text-xs text-gray-400 italic">No resume uploaded</div>
                            )}
                        </div>
                    </div>

                    {/* Custom Fields Section */}
                    {app.customFields && Object.keys(app.customFields).length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-600 pl-3">Additional Information</h4>
                            <div className="grid grid-cols-1 gap-4">
                                {Object.entries(app.customFields).map(([key, val]) => (
                                    <div key={key} className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100/50">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                                            {String(val) || <span className="text-gray-300 italic">N/A</span>}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="pt-6 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 italic">
                        <span>Application ID: {app.id}</span>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:text-gray-700 transition-colors">
                        Close
                    </button>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 mr-2">Change status in Kanban list</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ApplicationKanban({ jobId, onClose }: { jobId: string; onClose: () => void }) {
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [selectedDetailApp, setSelectedDetailApp] = useState<any>(null);

    useEffect(() => {
        api.get(`/api/jobs/${jobId}/applications`)
            .then(({ data }) => setApps(data.applications || []))
            .finally(() => setLoading(false));
    }, [jobId]);

    async function handleDrop(stage: string) {
        if (!draggedId) return;
        const app = apps.find(a => a.id === draggedId);
        if (!app || app.status === stage) { setDraggedId(null); return; }
        setApps(prev => prev.map(a => a.id === draggedId ? { ...a, status: stage } : a));
        setDraggedId(null);
        try {
            await api.put(`/api/jobs/applications/${draggedId}`, { status: stage });
        } catch {
            toast.error('Failed to update status');
            api.get(`/api/jobs/${jobId}/applications`).then(({ data }) => setApps(data.applications || []));
        }
    }

    if (loading) return <div className="flex items-center justify-center py-12"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>;

    return (
        <div>
            {selectedDetailApp && (
                <ApplicationDetailModal
                    app={selectedDetailApp}
                    onClose={() => setSelectedDetailApp(null)}
                />
            )}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 px-1 border-l-4 border-indigo-600 ml-1">Application Pipeline</h3>
                <button onClick={onClose} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" />Close</button>
            </div>
            {apps.length === 0 ? (
                <div className="card p-8 text-center">
                    <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">No applications yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 overflow-x-auto pb-4 custom-scrollbar">
                    {APP_STAGES.map(stage => {
                        const stageApps = apps.filter(a => a.status === stage);
                        return (
                            <div
                                key={stage}
                                className="bg-gray-50/50 border border-gray-100 rounded-2xl p-2 min-h-[300px] flex flex-col"
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => handleDrop(stage)}
                            >
                                <div className="flex items-center justify-between mb-3 px-1 pt-1">
                                    <span className={clsx('badge text-[10px] uppercase tracking-tighter font-bold', STAGE_COLORS[stage])}>{stage}</span>
                                    <span className="text-[10px] font-bold text-gray-300 bg-white px-1.5 py-0.5 rounded-md border border-gray-100">{stageApps.length}</span>
                                </div>
                                <div className="space-y-2 flex-1">
                                    {stageApps.map(app => (
                                        <div
                                            key={app.id}
                                            draggable
                                            onDragStart={() => setDraggedId(app.id)}
                                            onDragEnd={() => setDraggedId(null)}
                                            onClick={() => setSelectedDetailApp(app)}
                                            className={clsx(
                                                'bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-grab hover:shadow-md hover:border-indigo-100 transition-all select-none group relative overflow-hidden',
                                                draggedId === app.id && 'opacity-40'
                                            )}
                                        >
                                            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ExternalLink className="w-3 h-3 text-indigo-300" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate mb-0.5 group-hover:text-indigo-600 transition-colors">
                                                    {app.applicantName || app.name}
                                                </p>
                                                <p className="text-[10px] text-gray-400 truncate font-medium">
                                                    {app.applicantEmail || app.email}
                                                </p>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                                                    {new Date(app.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                </span>
                                                {app.resumeUrl && <FileText className="w-3 h-3 text-gray-300 group-hover:text-indigo-300" />}
                                            </div>
                                        </div>
                                    ))}
                                    {stageApps.length === 0 && (
                                        <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-8">
                                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400 mb-1" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function AiAgentGuideModal({ apiKey, origin, onClose }: { apiKey: string; origin: string; onClose: () => void }) {
    const prompt = `I want to integrate a dynamic job board into my existing website. 
Please create a high-fidelity, responsive React or HTML/Tailwind component that fetches data from my Pitchin180 Job API.

API CONFIGURATION:
- Endpoint: GET ${origin}/api/public/jobs
- Method: GET
- Authentication: Header 'x-api-key' with value '${apiKey || 'YOUR_API_KEY'}'

SECURITY NOTE (Domain Whitelisting):
- For browser-based requests, you MUST ensure your website domain (e.g., yourcompany.com) is added to the "Whitelisted Domains" in the 180workspace Recruitment Dashboard -> API Settings.
- Requests from unauthorized origins will return a 403 Forbidden error.

UI REQUIREMENTS:
1. Fetch jobs on component mount.
2. Display job listings in a modern card layout or clean list.
3. Show Title, Department, Location, and Job Type (e.g., Full-time, Remote).
4. Include a 'View Details & Apply' button for each job.
5. The application link should point to: ${origin}/jobs/apply/{jobId}
6. Add professional loading states and handle 'No Jobs Found' scenarios.

Please provide the complete, production-ready code with integrated styling. Ensure it looks premium and matches a professional corporate aesthetic.`;

    const copyPrompt = () => {
        navigator.clipboard.writeText(prompt);
        toast.success('AI Prompt copied to clipboard!');
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in transition-all">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-indigo-100">
                {/* Header */}
                <div className="px-8 py-7 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Cpu className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                                <Sparkles className="w-7 h-7 text-white animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold tracking-tight">AI Agent Bridge</h3>
                                <p className="text-indigo-100 text-sm mt-0.5 font-medium opacity-90">Auto-integrate your Job Portal in seconds</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                    {/* Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { icon: <Copy className="w-4 h-4" />, title: 'Copy Prompt', desc: 'Click the button below to copy the AI instruction.' },
                            { icon: <Bot className="w-4 h-4" />, title: 'Paste to AI', desc: 'Paste it into ChatGPT, Claude, or any AI Agent.' },
                            { icon: <Terminal className="w-4 h-4" />, title: 'Deploy Code', desc: 'Copy the code generated by AI into your website.' }
                        ].map((s, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600 mb-3 border border-gray-100">
                                    {s.icon}
                                </div>
                                <h4 className="text-xs font-bold text-gray-900 mb-1">{s.title}</h4>
                                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">{s.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Prompt Preview */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                <Terminal className="w-3 h-3" /> Ready-Made Prompt
                            </h4>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                            <div className="relative bg-gray-900 rounded-2xl p-6 font-mono text-[11px] text-gray-300 leading-relaxed border border-gray-800 shadow-xl max-h-[300px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                {prompt}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="px-8 py-6 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
                    <p className="text-xs text-indigo-400 font-medium italic select-none">
                        All variables (API Key, URLs) are per-configured
                    </p>
                    <button 
                        onClick={copyPrompt}
                        className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        <Copy className="w-4 h-4" /> Copy Prompt for AI
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RecruitmentPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'jobs' | 'pipeline'>('jobs');
    const [showPostJob, setShowPostJob] = useState(false);
    const [editJob, setEditJob] = useState<any>(null);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [whitelist, setWhitelist] = useState<string[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [isSavingWhitelist, setIsSavingWhitelist] = useState(false);
    const [showApiSettings, setShowApiSettings] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showAiGuide, setShowAiGuide] = useState(false);
    const { user } = useAuth();
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    function loadJobs() {
        setLoading(true);
        api.get('/api/jobs')
            .then(({ data }) => setJobs(data.jobs))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadJobs();
        if (['admin', 'ceo'].includes(user?.role || '') || (user?.permissions && user.permissions.includes('can_manage_hr'))) {
            api.get('/api/public/api-key').then(({ data }) => setApiKey(data.apiKey));
            
            // Fetch current settings to get whitelist
            api.get('/api/settings').then(({ data }) => {
                setWhitelist(data.settings?.authorizedRecruitmentDomains || []);
            });
        }
    }, [user]);

    async function updateAuthorizedDomains(newList: string[]) {
        setIsSavingWhitelist(true);
        try {
            await api.put('/api/settings', { authorizedRecruitmentDomains: newList });
            setWhitelist(newList);
            toast.success('Whitelisted domains updated');
        } catch {
            toast.error('Failed to update domains');
        } finally {
            setIsSavingWhitelist(false);
        }
    }

    const addDomain = () => {
        const domain = newDomain.trim().toLowerCase();
        if (!domain) return;
        if (whitelist.includes(domain)) {
            toast.error('Domain already in list');
            return;
        }
        updateAuthorizedDomains([...whitelist, domain]);
        setNewDomain('');
    };

    const removeDomain = (domain: string) => {
        updateAuthorizedDomains(whitelist.filter(d => d !== domain));
    };

    async function generateKey() {
        try {
            const { data } = await api.post('/api/public/api-key/generate');
            setApiKey(data.apiKey);
            toast.success('New API Key generated');
        } catch {
            toast.error('Failed to generate API Key');
        }
    }

    function copyToClipboard(text: string, label: string) {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied!`);
    }

    function openApplications(jobId: string) {
        setSelectedJobId(jobId);
        setTab('pipeline');
    }

    return (
        <div>
            {(showPostJob || editJob) && (
                <PostJobModal
                    editJob={editJob}
                    onClose={() => { setShowPostJob(false); setEditJob(null); }}
                    onSuccess={() => { setShowPostJob(false); setEditJob(null); loadJobs(); }}
                />
            )}

            {showAiGuide && (
                <AiAgentGuideModal 
                    apiKey={apiKey} 
                    origin={origin} 
                    onClose={() => setShowAiGuide(false)} 
                />
            )}

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Recruitment</h1>
                    <p className="page-subtitle">Manage job postings and applications</p>
                </div>
                {(['admin', 'ceo'].includes(user?.role || '') || (user?.permissions && user.permissions.includes('can_manage_hr'))) && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowAiGuide(true)} className="btn-secondary group relative overflow-hidden border-indigo-200 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Sparkles className="w-4 h-4 text-indigo-500 group-hover:text-white transition-colors" /> 
                            <span className="relative z-10">Connect with AI Agent</span>
                        </button>
                        <button onClick={() => setShowApiSettings(!showApiSettings)} className="btn-secondary">
                            <Key className="w-4 h-4" /> API Settings
                        </button>
                        <button onClick={() => setShowPostJob(true)} className="btn-primary">
                            <Plus className="w-4 h-4" /> Post Job
                        </button>
                    </div>
                )}
            </div>

            {showApiSettings && (
                <div className="card p-5 mb-5 bg-indigo-50/30 border-indigo-100 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                            <Key className="w-4 h-4" /> Recruitment API Key
                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="p-1 rounded-full hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
                                title="How to use this key?"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
                        <button onClick={() => setShowApiSettings(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {showInstructions && (
                        <div className="mb-4 p-4 bg-white/60 border border-indigo-100 rounded-xl space-y-3 animate-in fade-in zoom-in-95">
                            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Implementation Guide</h4>
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-indigo-600">1</div>
                                    <p className="text-xs text-indigo-800">
                                        <strong>Endpoint:</strong> <code>GET {origin}/api/public/jobs</code>
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-indigo-600">2</div>
                                    <p className="text-xs text-indigo-800">
                                        <strong>Auth:</strong> Pass your key in the <code>x-api-key</code> request header.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-indigo-600">3</div>
                                    <p className="text-xs text-indigo-800">
                                        <strong>Security:</strong> Add your website domain to the <strong>Whitelisted Domains</strong> section below to allow requests.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-2">
                                <p className="text-[10px] font-semibold text-indigo-400 mb-1 uppercase">Sample Fetch Request</p>
                                <div className="bg-gray-900 rounded-lg p-3 font-mono text-[11px] text-gray-300 overflow-x-auto whitespace-pre">
                                    {`fetch('${origin || 'https://your-domain.com'}/api/public/jobs', {
  headers: {
    'x-api-key': '${apiKey || 'YOUR_KEY_HERE'}'
  }
})
.then(res => res.json())
.then(data => console.log(data));`}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 mb-6">
                        <div className="space-y-1">
                            <p className="text-xs text-indigo-700/70 max-w-2xl">
                                Use this key in the <code>x-api-key</code> header to fetch job listings for your external website. Click the info icon for instructions.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <div className="flex-1 bg-white border border-indigo-100 rounded-lg px-3 py-2 font-mono text-sm text-indigo-900 select-all overflow-hidden truncate">
                                    {apiKey || 'No key generated yet'}
                                </div>
                                <button onClick={() => copyToClipboard(apiKey, 'API Key')} className="btn-secondary bg-white whitespace-nowrap" disabled={!apiKey}>
                                    <Copy className="w-4 h-4" /> Copy
                                </button>
                                <button onClick={generateKey} className="btn-secondary bg-white whitespace-nowrap text-indigo-600">
                                    <RefreshCw className="w-4 h-4" /> Regenerate
                                </button>
                            </div>
                        </div>

                        {/* Whitelisted Domains Section */}
                        <div className="pt-4 border-t border-indigo-100/50">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[11px] font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                                    <LinkIcon className="w-3 h-3" /> Whitelisted Domains (Security)
                                </h4>
                                {whitelist.length === 0 && (
                                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Public Access Enabled</span>
                                )}
                            </div>
                            <p className="text-[10px] text-indigo-600/60 mb-3">
                                Restrict API access to specific websites by adding their domains (e.g., <code>mycompany.com</code>). If empty, all domains are allowed.
                            </p>
                            
                            {/* Whitelisting Tips */}
                            <div className="mb-4 bg-orange-50/50 border border-orange-100 rounded-lg p-3">
                                <p className="text-[10px] text-orange-800 leading-relaxed font-medium flex items-start gap-2">
                                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-orange-500" />
                                    <span>
                                        <strong>Testing locally?</strong> If you test your job board by opening the HTML file directly (<code>file://</code>), browsers send a <code>null</code> origin which is blocked for security. Please use a local web server (like VS Code <strong>Live Server</strong>) and whitelist <code>localhost</code> instead.
                                    </span>
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add domain (e.g. my-site.com)"
                                        className="flex-1 bg-white border border-indigo-100 rounded-lg px-3 py-1.5 text-xs text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                        value={newDomain}
                                        onChange={(e) => setNewDomain(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                                    />
                                    <button 
                                        onClick={addDomain}
                                        disabled={isSavingWhitelist || !newDomain.trim()}
                                        className="btn-primary py-1.5 text-[10px] px-4 h-auto"
                                    >
                                        {isSavingWhitelist ? <LogoLoader className="w-3 h-3 animate-spin" /> : 'Add Domain'}
                                    </button>
                                </div>

                                {whitelist.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-2 bg-white/40 rounded-xl border border-indigo-100/50 min-h-[40px]">
                                        {whitelist.map((domain) => (
                                            <div 
                                                key={domain} 
                                                className="flex items-center gap-1.5 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-200 group"
                                            >
                                                {domain}
                                                <button 
                                                    onClick={() => removeDomain(domain)}
                                                    className="p-0.5 hover:bg-indigo-200 rounded-sm text-indigo-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-max">
                {(['jobs', 'pipeline'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize', tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                    >
                        {t === 'pipeline' ? 'Application Pipeline' : t}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : tab === 'jobs' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {jobs.map((job) => (
                        <div key={job.id} className="card p-5 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                        <Briefcase className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                                        <p className="text-xs text-gray-400">{job.department}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={clsx('badge', TYPE_COLORS[job.type] || 'badge-gray')}>{job.type?.replace('_', ' ')}</span>
                                    {(['admin', 'ceo'].includes(user?.role || '') || (user?.permissions && user.permissions.includes('can_manage_hr'))) && (
                                        <button onClick={() => setEditJob(job)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{job.description}</p>

                            <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-3">
                                {job.location && <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</div>}
                                {job.deadline && <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Deadline: {new Date(job.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>}
                                {job.openings && <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{job.openings} opening{job.openings > 1 ? 's' : ''}</div>}
                            </div>

                            {job.skills?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3 pt-3 border-t border-gray-50">
                                    {job.skills.slice(0, 4).map((s: string) => (
                                        <span key={s} className="badge badge-gray">{s}</span>
                                    ))}
                                    {job.skills.length > 4 && <span className="badge badge-gray">+{job.skills.length - 4}</span>}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={() => openApplications(job.id)} className="btn-secondary text-xs flex-1 justify-center">
                                    <Users className="w-3.5 h-3.5" /> Pipeline
                                </button>
                                <button
                                    onClick={() => copyToClipboard(`${origin || 'https://your-domain.com'}/jobs/apply/${job.id}`, 'Application link')}
                                    className="btn-secondary text-xs px-3"
                                    title="Copy Application Link"
                                >
                                    <LinkIcon className="w-3.5 h-3.5" />
                                </button>
                                <a
                                    href={`/jobs/apply/${job.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-secondary text-xs px-3"
                                    title="Preview Form"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    ))}
                    {jobs.length === 0 && (
                        <div className="col-span-2 text-center py-20">
                            <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No job postings yet</p>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {/* Job selector when no specific job is selected */}
                    {!selectedJobId ? (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-500 mb-3">Select a job to view its application pipeline:</p>
                            {jobs.map(job => (
                                <button key={job.id} onClick={() => setSelectedJobId(job.id)} className="card p-4 w-full text-left flex items-center gap-3 hover:shadow-md transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <Briefcase className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                                        <p className="text-xs text-gray-400">{job.department}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <ApplicationKanban jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
                    )}
                </div>
            )}
        </div>
    );
}

