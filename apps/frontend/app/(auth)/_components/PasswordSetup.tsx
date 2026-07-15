import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export default function PasswordSetup({ 
    onSubmit,
    isSubmitting,
    onBack
}: { 
    onSubmit: (password: string) => void;
    isSubmitting: boolean;
    onBack?: () => void;
}) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Validation rules
    const hasMinLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    const isValid = hasMinLength && hasUpper && hasLower && hasNumber;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isValid) {
            onSubmit(password);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {onBack && (
                <button 
                    onClick={onBack}
                    className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                </button>
            )}
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Secure your account</h3>
                <p className="text-gray-500 text-sm">Create a strong password to protect your data.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        required
                        className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>

                {/* Real-time Validation UI */}
                <div className="space-y-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className={`w-4 h-4 ${hasMinLength ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={hasMinLength ? 'text-gray-900' : 'text-gray-500'}>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className={`w-4 h-4 ${hasUpper ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={hasUpper ? 'text-gray-900' : 'text-gray-500'}>One uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className={`w-4 h-4 ${hasLower ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={hasLower ? 'text-gray-900' : 'text-gray-500'}>One lowercase letter</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className={`w-4 h-4 ${hasNumber ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={hasNumber ? 'text-gray-900' : 'text-gray-500'}>One number</span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    className="w-full py-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    Set Password
                </button>
            </form>
        </motion.div>
    );
}
