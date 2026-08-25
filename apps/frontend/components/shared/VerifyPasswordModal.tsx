import { useState } from 'react';
import { PlatformModal } from '@/components/shared/PlatformModal';
import { Lock, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface VerifyPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
    description?: string;
    buttonText?: string;
}

export default function VerifyPasswordModal({ 
    isOpen, 
    onClose, 
    onSuccess,
    title = "Verify Authorization",
    description = "Please enter your account password to authorize this action.",
    buttonText = "Authorize Action"
}: VerifyPasswordModalProps) {
    const [password, setPassword] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async () => {
        if (!password) {
            setError('Please enter your account password');
            return;
        }

        try {
            setVerifying(true);
            setError('');
            const res = await api.post('/api/v1/identity/profile/verify-password', { password });
            if (res.data.success) {
                toast.success('Password verified successfully');
                setPassword('');
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.error || 'Invalid password';
            setError(msg);
            toast.error(msg);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <PlatformModal
            isOpen={isOpen}
            onClose={() => {
                setPassword('');
                setError('');
                onClose();
            }}
            title={title}
            icon={Lock}
            iconColorClass="text-red-600"
            iconBgClass="bg-red-50"
            maxWidthClass="max-w-md"
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button 
                        type="button"
                        onClick={handleVerify} 
                        disabled={verifying || !password}
                        className="btn-primary bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                        {verifying ? 'Verifying...' : buttonText}
                    </button>
                </>
            }
        >
            <div className="space-y-4 pt-2">
                <div className="bg-amber-50 text-amber-800 p-3 rounded-lg flex items-start gap-3 border border-amber-200">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm">
                        {description}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleVerify();
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}`}
                        placeholder="Enter your password"
                        autoFocus
                    />
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
            </div>
        </PlatformModal>
    );
}
