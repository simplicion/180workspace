import { useState, useEffect } from 'react';
import { PlatformModal } from '@/components/shared/PlatformModal';
import { Mail } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface EmailQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    quote: any;
}

export default function EmailQuoteModal({ isOpen, onClose, quote }: EmailQuoteModalProps) {
    const [emailRecipient, setEmailRecipient] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        if (isOpen && quote) {
            setEmailRecipient(quote?.clientId?.email || '');
        }
    }, [isOpen, quote]);

    const handleSendEmail = async () => {
        if (!emailRecipient) return toast.error('Recipient email is required');
        try {
            setSendingEmail(true);
            await api.post(`/api/sales/quotes/${quote.id || quote._id}/send-email`, { email: emailRecipient });
            toast.success('Email sent successfully');
            onClose();
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Failed to send email';
            toast.error(msg, { duration: 5000 });
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <PlatformModal
            isOpen={isOpen}
            onClose={onClose}
            title="Send Quotation"
            icon={Mail}
            iconColorClass="text-blue-600"
            iconBgClass="bg-blue-50"
            maxWidthClass="max-w-md"
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button 
                        type="button"
                        onClick={handleSendEmail} 
                        disabled={sendingEmail}
                        className="btn-primary flex-1"
                    >
                        {sendingEmail ? 'Sending...' : 'Send Now'}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    This will send <strong>{quote?.quoteNumber}</strong> as a PDF attachment to the following address:
                </p>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Recipient Email</label>
                    <input 
                        type="email"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        placeholder="client@example.com"
                        className="input w-full"
                    />
                </div>
            </div>
        </PlatformModal>
    );
}
