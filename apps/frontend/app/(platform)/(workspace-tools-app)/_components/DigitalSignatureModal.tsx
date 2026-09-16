import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { UniversalSignatureModal } from '@/app/(platform)/(workspace-tools-app)/document-editor/_components/UniversalSignatureModal';

interface DigitalSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function DigitalSignatureModal({ isOpen, onClose, onSuccess }: DigitalSignatureModalProps) {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (isOpen && user?.id) {
            api.get(`/api/v1/identity/profile/${user.id}`).then(res => {
                setProfile(res.data.profile);
            }).catch(console.error);
        }
    }, [isOpen, user?.id]);

    const handleSaveSignature = async (data: { signatureImage: string; signerName?: string }) => {
        try {
            await api.put(`/api/v1/identity/profile`, { 
                signatureImage: data.signatureImage 
            });
            toast.success('Digital signature saved securely');
            if (refreshUser) await refreshUser();
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to save signature';
            toast.error(msg);
        }
    };

    return (
        <UniversalSignatureModal
            isOpen={isOpen}
            onClose={onClose}
            onSaveSignature={handleSaveSignature}
            initialSignerName={profile?.name || user?.name || ''}
            signatoryRole={profile?.designation?.name || profile?.role || user?.role || 'Employee / Signatory'}
            initialSignatureImage={(user as any)?.signatureImage || null}
            title="Configure Official Digital Signature"
        />
    );
}
