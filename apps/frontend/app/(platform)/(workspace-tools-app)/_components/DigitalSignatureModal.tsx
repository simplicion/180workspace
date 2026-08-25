import { useState, useEffect } from 'react';
import { PlatformModal } from '@/components/shared/PlatformModal';
import { PenTool } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { SignaturePad } from '@/app/(platform)/(workspace-tools-app)/document-editor/_components/ui/SignaturePad';

interface DigitalSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function DigitalSignatureModal({ isOpen, onClose, onSuccess }: DigitalSignatureModalProps) {
    const { user, refreshUser } = useAuth();
    const [signatureData, setSignatureData] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (isOpen && user?.id) {
            api.get(`/api/v1/identity/profile/${user.id}`).then(res => {
                setProfile(res.data.profile);
            }).catch(console.error);
        }
    }, [isOpen, user?.id]);

    const handleSave = async () => {
        if (!signatureData) {
            toast.error('Please draw your signature first');
            return;
        }

        try {
            setSaving(true);
            await api.put(`/api/v1/identity/profile`, { 
                signatureImage: signatureData 
            });
            toast.success('Digital signature saved securely');
            if (refreshUser) await refreshUser();
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to save signature';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <PlatformModal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Digital Signature"
            icon={PenTool}
            iconColorClass="text-indigo-600"
            iconBgClass="bg-indigo-50"
            maxWidthClass="max-w-md"
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button 
                        type="button"
                        onClick={handleSave} 
                        disabled={saving || !signatureData}
                        className="btn-primary flex-1"
                    >
                        {saving ? 'Saving...' : 'Save Signature'}
                    </button>
                </>
            }
        >
            <div className="space-y-4 pt-2">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col gap-1">
                    <p className="text-sm font-semibold text-gray-900">{profile?.name || user?.name || 'Loading...'}</p>
                    <p className="text-xs text-gray-500">
                        {profile?.designation?.name || profile?.role || user?.role || 'Employee'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                        By saving this signature, you authorize its use on official documents within the workspace.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Draw Signature</label>
                    <SignaturePad 
                        onSave={(data) => setSignatureData(data)}
                        onClear={() => setSignatureData('')}
                        initialValue={user?.signatureImage || null}
                    />
                </div>
            </div>
        </PlatformModal>
    );
}
