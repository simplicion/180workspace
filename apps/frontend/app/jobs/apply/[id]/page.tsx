'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Briefcase, MapPin, Calendar, Clock, CheckCircle, FileText, Send, Building } from 'lucide-react';
import Link from 'next/link';

export default function PublicJobApplyPage() {
    const params = useParams();
    const jobId = params.id as string;

    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isApplied, setIsApplied] = useState(false);

    const [form, setForm] = useState({
        applicantName: '',
        applicantEmail: '',
        phone: '',
        resumeUrl: '',
        coverLetter: '',
        customFields: {} as Record<string, string>
    });

    useEffect(() => {
        api.get(`/api/public/jobs/${jobId}`)
            .then((res) => {
                setJob(res.data.job);
            })
            .catch((err) => {
                console.error(err);
                toast.error('Failed to load job details');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [jobId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleCustomFieldChange = (key: string, value: string) => {
        setForm(prev => ({
            ...prev,
            customFields: { ...prev.customFields, [key]: value }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post(`/api/public/apply`, { ...form, jobId });
            toast.success('Application submitted successfully!');
            setIsApplied(true);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.error || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LogoLoader className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
                    <p className="text-gray-500 mb-6">This job posting might have been removed or is no longer active.</p>
                </div>
            </div>
        );
    }

    if (isApplied) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="bg-white p-10 rounded-3xl shadow-sm text-center max-w-lg w-full animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Application Received!</h2>
                    <p className="text-gray-500 mb-8">Thank you for applying to the {job.title} role at {job.company?.name || 'our company'}. We will review your application and get back to you soon.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Card */}
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden mb-8">
                    <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                    <div className="px-8 pb-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 sm:-mt-16 gap-6">
                            <div className="flex items-end gap-5">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white bg-white overflow-hidden shadow-md flex items-center justify-center relative z-10">
                                    {job.company?.logoUrl ? (
                                        <img src={job.company.logoUrl} alt={job.company.name} className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <Building className="w-12 h-12 text-gray-300" />
                                    )}
                                </div>
                                <div className="pb-2">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{job.title}</h1>
                                    <p className="text-lg font-medium text-indigo-600 mt-1">{job.company?.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full font-medium border border-gray-100">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                {job.location || 'Remote'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full font-medium border border-gray-100">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                <span className="capitalize">{job.type?.replace('_', ' ') || job.type}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full font-medium border border-gray-100">
                                <Clock className="w-4 h-4 text-gray-400" />
                                {job.department}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content (Job Description) */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-500" />
                                About the Role
                            </h3>
                            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base">
                                {job.description}
                            </div>
                            
                            {job.requirements && (
                                <div className="mt-8">
                                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-indigo-500" />
                                        Requirements
                                    </h4>
                                    <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base">
                                        {job.requirements}
                                    </div>
                                </div>
                            )}

                            {job.skills && job.skills.length > 0 && (
                                <div className="mt-8 pt-8 border-t border-gray-100">
                                    <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Required Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {job.skills.map((skill: string, idx: number) => (
                                            <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg border border-indigo-100">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl p-6 shadow-sm sticky top-6">
                            <div className="mb-6 pb-6 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Apply Now</h3>
                                <p className="text-sm text-gray-500">Submit your application below</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Full Name *</label>
                                    <input
                                        required
                                        name="applicantName"
                                        value={form.applicantName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address *</label>
                                    <input
                                        required
                                        type="email"
                                        name="applicantEmail"
                                        value={form.applicantEmail}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phone Number</label>
                                    <input
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Resume URL *</label>
                                    <input
                                        required
                                        type="url"
                                        name="resumeUrl"
                                        value={form.resumeUrl}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                        placeholder="Link to PDF/Drive/Portfolio"
                                    />
                                </div>

                                {job.customFields && job.customFields.map((field: any, idx: number) => (
                                    <div key={idx}>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                            {field.label} {field.required && '*'}
                                        </label>
                                        <input
                                            required={field.required}
                                            type={field.type || 'text'}
                                            value={form.customFields[field.name] || ''}
                                            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                            placeholder={`Enter ${field.label.toLowerCase()}`}
                                        />
                                    </div>
                                ))}

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Cover Letter (Optional)</label>
                                    <textarea
                                        name="coverLetter"
                                        value={form.coverLetter}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm resize-none"
                                        placeholder="Tell us why you're a great fit..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                                >
                                    {submitting ? <LogoLoader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    Submit Application
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
