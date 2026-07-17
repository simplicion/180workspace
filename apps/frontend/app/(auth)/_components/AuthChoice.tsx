import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthChoice({ 
    onGoogleSuccess, 
    onEmailSubmit, 
    googleLoading 
}: { 
    onGoogleSuccess: (res: any) => void, 
    onEmailSubmit: (email: string) => void,
    googleLoading: boolean
}) {
    const [email, setEmail] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptedTerms) {
            toast.error("You must accept the Terms & Privacy Policy");
            return;
        }
        if (!email) {
            toast.error("Please enter a valid email");
            return;
        }
        onEmailSubmit(email);
    };

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-6">
                    <input 
                        type="checkbox" 
                        id="terms" 
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700">
                        I accept the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> & <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                    </label>
                </div>

                <div className="relative opacity-100 transition-opacity" style={{ opacity: acceptedTerms ? 1 : 0.5, pointerEvents: acceptedTerms ? 'auto' : 'none' }}>
                    {googleLoading ? (
                        <div className="flex justify-center items-center py-2.5 border border-gray-200 rounded-2xl bg-gray-50 w-full">
                            <LogoLoader className="w-5 h-5 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <div className="w-full relative shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
                            <GoogleLogin 
                                onSuccess={onGoogleSuccess}
                                onError={() => toast.error('Google Auth Failed')}
                                text="signup_with"
                                width="100%"
                                logo_alignment="center"
                            />
                        </div>
                    )}
                    
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-400 font-medium uppercase tracking-wider text-xs">Or</span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <div className="relative group/input">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email Address"
                                required
                                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center"
                        >
                            Continue with Email
                        </button>
                    </form>
                </div>
            </div>
        </motion.div>
    );
}
