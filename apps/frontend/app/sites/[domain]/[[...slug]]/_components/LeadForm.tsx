'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { User, Mail, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { LogoLoader } from "@workspace/ui";

interface LeadFormProps {
    domain: string;
    slug?: string | string[];
    primaryColor: string;
    buttonText?: string;
    successMessage?: string;
}

export function LeadFormWrapper({ domain, slug, primaryColor, buttonText, successMessage }: LeadFormProps) {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            
            const params = new URLSearchParams();
            params.append('domain', domain);
            if (slug) {
                const slugStr = Array.isArray(slug) ? slug.join('/') : slug;
                params.append('slug', slugStr);
            }

            const targetUrl = `${apiBase}/api/public/websites/resolve/lead?${params.toString()}`;

            await axios.post(targetUrl, formData);
            setSubmitted(true);
            
            if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'Lead');
        } catch (err) {
            alert('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return <SuccessMessage message={successMessage} />;
    }

    return <LeadForm 
        handleSubmit={handleSubmit} 
        formData={formData} 
        setFormData={setFormData} 
        submitting={submitting} 
        primaryColor={primaryColor} 
        buttonText={buttonText} 
    />;
}

function LeadForm({ handleSubmit, formData, setFormData, submitting, primaryColor, buttonText }: any) {
    return (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-gray-100 text-left">
            <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        required
                        placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="email" 
                        required
                        placeholder="john@example.com"
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="tel" 
                        required
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>
            </div>

            <button 
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
                style={{ backgroundColor: primaryColor || 'var(--primary)' }}
            >
                {submitting ? (
                    <LogoLoader className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        {buttonText || 'Get Started Now'}
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </form>
    );
}

function SuccessMessage({ message }: { message?: string }) {
    return (
        <div className="text-center py-12 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-gray-100">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-500">{message || "We've received your request and will get back to you shortly."}</p>
        </div>
    );
}
