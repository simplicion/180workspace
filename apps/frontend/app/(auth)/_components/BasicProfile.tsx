import { LogoLoader } from "@workspace/ui";
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Edit3, CheckCircle2, XCircle, Camera, Briefcase, AlignLeft } from 'lucide-react';
import api from '@/lib/api';

export default function BasicProfile({ 
    onSubmit,
    isSubmitting,
    onBack
}: { 
    onSubmit: (data: any) => void;
    isSubmitting: boolean;
    onBack?: () => void;
}) {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        headline: '',
        title: '',
        bio: ''
    });

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'>('idle');

    useEffect(() => {
        if (!formData.username) {
            setUsernameStatus('idle');
            return;
        }

        setUsernameStatus('checking');
        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await api.get(`/api/auth/check-username?username=${encodeURIComponent(formData.username)}`);
                const data = res.data;
                if (data.success) {
                    if (data.available) setUsernameStatus('available');
                    else setUsernameStatus(data.message === 'Invalid format' ? 'invalid' : 'unavailable');
                } else {
                    setUsernameStatus('idle');
                }
            } catch (err) {
                console.error('Username check failed:', err);
                setUsernameStatus('idle');
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [formData.username]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        let value = e.target.value;
        // Basic lowercase enforcing for username
        if (e.target.name === 'username') {
            value = value.toLowerCase().replace(/\s/g, '');
        }
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Image size must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setImagePreview(result);
            setImageBase64(result);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            ...(imageBase64 && { imageBase64 })
        });
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md mx-auto relative">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete your profile</h3>
                <p className="text-gray-500 text-sm">Tell us a bit about yourself.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto p-1 pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                {/* Profile Image Upload */}
                <div className="flex justify-center mb-2">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group overflow-hidden"
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <Camera className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        )}
                        {imagePreview && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                </div>
                <p className="text-center text-xs text-gray-400 -mt-2 mb-2">
                    {imagePreview ? 'Tap to change' : 'Add a profile photo'}
                </p>

                {/* Full Name */}
                <div className="relative group/input">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Full Name"
                        required
                        className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-gray-900 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                    />
                </div>
                
                {/* Username */}
                <div className="relative group/input flex flex-col">
                    <div className="flex">
                        <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">
                            @
                        </span>
                        <div className="relative flex-1">
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Username"
                                required
                                className={`w-full bg-white border border-gray-200 rounded-r-xl pl-4 pr-10 py-3 text-gray-900 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm ${
                                    usernameStatus === 'unavailable' || usernameStatus === 'invalid' ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''
                                } ${usernameStatus === 'available' ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20' : ''}`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {usernameStatus === 'checking' && <LogoLoader className="w-4 h-4 text-gray-400 animate-spin" />}
                                {usernameStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                {(usernameStatus === 'unavailable' || usernameStatus === 'invalid') && <XCircle className="w-4 h-4 text-red-500" />}
                            </div>
                        </div>
                    </div>
                    {usernameStatus === 'unavailable' && (
                        <p className="text-xs text-red-500 mt-1 ml-12">Username is already taken.</p>
                    )}
                    {usernameStatus === 'invalid' && (
                        <p className="text-xs text-red-500 mt-1 ml-12">Letters, numbers, dots, and underscores only.</p>
                    )}
                </div>

                {/* Title / Role */}
                <div className="relative group/input">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Title (e.g. CEO, CTO, Founder)"
                        className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-gray-900 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                    />
                </div>

                {/* Headline */}
                <div className="relative group/input">
                    <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                    <input
                        type="text"
                        name="headline"
                        value={formData.headline}
                        onChange={handleChange}
                        placeholder="Headline (e.g. Software Engineer at Tech)"
                        className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-gray-900 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                    />
                </div>

                {/* Bio */}
                <div className="relative group/input">
                    <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                    <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        placeholder="Short bio — tell people about yourself"
                        rows={3}
                        maxLength={300}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-gray-900 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm resize-none"
                    />
                    {formData.bio.length > 0 && (
                        <span className="absolute right-3 bottom-2 text-[10px] text-gray-400">{formData.bio.length}/300</span>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={!formData.name || !formData.username || isSubmitting || usernameStatus === 'unavailable' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
                    className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 active:scale-[0.98] hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <LogoLoader className="w-5 h-5 animate-spin" /> : null}
                    Continue
                </button>
            </form>
        </motion.div>
    );
}
