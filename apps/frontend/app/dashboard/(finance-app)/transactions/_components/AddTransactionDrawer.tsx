import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import { LogoLoader } from '@workspace/ui';
import { Activity, Tag, AlignLeft, RefreshCw } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';

interface AddTransactionDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddTransactionDrawer({ open, onClose, onSuccess }: AddTransactionDrawerProps) {
    const [loading, setLoading] = useState(false);
    const { company } = useSettings();
    const currency = company?.currency || 'USD';
    const currencySymbol = company?.currencySymbol || '$';
    
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        
        try {
            await api.post('/api/transactions', {
                type: formData.get('type'),
                amount: parseFloat(formData.get('amount') as string),
                provider: 'manual',
                metadata: {
                    description: formData.get('description'),
                    category: formData.get('category')
                }
            });
            toast.success('Transaction recorded successfully');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Failed to record transaction');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Drawer 
            open={open} 
            onClose={onClose} 
            title="Record Transaction" 
            description="Manually add an income or expense to the ledger."
            icon={<Activity className="w-5 h-5 text-indigo-600" />}
            maxWidth="max-w-md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" form="transaction-form" disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Save Transaction'}
                    </button>
                </div>
            }
        >
            <form id="transaction-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                
                <div>
                    <label className="label">Transaction Type</label>
                    <div className="relative">
                        <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select name="type" required className="input pl-9">
                            <option value="credit">Credit (Money In)</option>
                            <option value="debit">Debit (Money Out)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="label">Amount ({currency})</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 flex items-center justify-center text-sm font-medium">
                            {currencySymbol}
                        </div>
                        <input type="number" name="amount" step="0.01" min="0" required className="input pl-9" placeholder="0.00" />
                    </div>
                </div>

                <div>
                    <label className="label">Category</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select name="category" required className="input pl-9">
                            <option value="sales">Sales & Revenue</option>
                            <option value="software">Software/SaaS</option>
                            <option value="office">Office Supplies</option>
                            <option value="marketing">Marketing</option>
                            <option value="utilities">Utilities</option>
                            <option value="professional">Professional Services</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="label">Description</label>
                    <div className="relative">
                        <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <textarea name="description" required rows={3} className="input pl-9" placeholder="e.g. Received payment for consulting..."></textarea>
                    </div>
                </div>

            </form>
        </Drawer>
    );
}
