import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OtpVerification({ 
    email, 
    onVerify,
    isVerifying,
    onBack,
    onResend,
    isResending
}: { 
    email: string;
    onVerify: (otp: string) => void;
    isVerifying: boolean;
    onBack?: () => void;
    onResend?: () => void;
    isResending?: boolean;
}) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timer, setTimer] = useState(60);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleChange = (element: any, index: number) => {
        if (isNaN(element.value)) return false;

        setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

        // Focus next input
        if (element.nextSibling && element.value) {
            element.nextSibling.focus();
        }
    };

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length !== 6) {
            toast.error("Please enter a 6-digit code");
            return;
        }
        onVerify(code);
    };

    const handleResend = () => {
        if (timer === 0 && onResend) {
            onResend();
            setTimer(60);
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h3>
                <p className="text-gray-500 text-sm">We&apos;ve sent a 6-digit verification code to <strong className="text-gray-800">{email}</strong>.</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-8">
                <div className="flex justify-center gap-2 sm:gap-4">
                    {otp.map((data, index) => (
                        <input
                            className="w-10 h-12 sm:w-12 sm:h-14 text-center border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none"
                            type="text"
                            name="otp"
                            maxLength={1}
                            key={index}
                            value={data}
                            onChange={e => handleChange(e.target, index)}
                            onFocus={e => e.target.select()}
                        />
                    ))}
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        type="submit"
                        disabled={isVerifying}
                        className="w-full py-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        Verify Code
                    </button>
                    
                    {onResend && (
                        <div className="text-center">
                            <p className="text-sm text-gray-500">
                                Didn&apos;t receive the code?{' '}
                                <button 
                                    type="button" 
                                    onClick={handleResend}
                                    disabled={timer > 0 || isResending}
                                    className={`font-semibold ${timer > 0 || isResending ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700 hover:underline'}`}
                                >
                                    {isResending ? 'Resending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </motion.div>
    );
}
