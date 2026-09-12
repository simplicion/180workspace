'use client';

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import { LogoLoader } from '@workspace/ui';
import { 
    Activity, 
    Tag, 
    AlignLeft, 
    Building2, 
    CreditCard, 
    ArrowDownRight, 
    ArrowUpRight, 
    Calendar,
    Hash,
    Landmark
} from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import CustomSelect from '@/components/ui/CustomSelect';
import { TRANSACTION_CATEGORIES, PAYMENT_METHODS } from './categories';
import clsx from 'clsx';

interface AddTransactionDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddTransactionDrawer({ open, onClose, onSuccess }: AddTransactionDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [txType, setTxType] = useState<'credit' | 'debit'>('credit');
    const [selectedCategory, setSelectedCategory] = useState('client_retainer');
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');

    const { company } = useSettings();
    const currency = company?.currency || 'USD';
    const currencySymbol = company?.currencySymbol || '₹';

    const availableCategories = TRANSACTION_CATEGORIES.filter(c => 
        txType === 'credit' ? c.group === 'income' : c.group === 'expense'
    );

    // Auto-update selected category when toggling type
    function handleTypeChange(newType: 'credit' | 'debit') {
        setTxType(newType);
        if (newType === 'credit') {
            setSelectedCategory('client_retainer');
        } else {
            setSelectedCategory('payroll_salaries');
        }
    }
    
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        
        try {
            const amount = parseFloat(formData.get('amount') as string);
            const description = formData.get('description') as string;
            const party = formData.get('party') as string;
            const referenceId = formData.get('referenceId') as string;
            const customDate = formData.get('date') as string;

            await api.post('/api/transactions', {
                type: txType,
                amount,
                currency,
                provider: paymentMethod,
                metadata: {
                    description: description || (txType === 'credit' ? 'Income Settlement' : 'Expense Disbursement'),
                    category: selectedCategory,
                    party: party || 'General Account',
                    paymentMethod,
                    referenceId: referenceId || undefined,
                    customDate: customDate || undefined
                }
            });
            toast.success(`Transaction of ${currencySymbol}${amount.toLocaleString()} recorded successfully!`);
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
            title="Record Ledger Transaction" 
            description="Manually record a verified company cash movement."
            icon={<Activity className="w-5 h-5 text-indigo-600" />}
            maxWidth="max-w-md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" form="transaction-form" disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Record Transaction'}
                    </button>
                </div>
            }
        >
            <form id="transaction-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4 text-sm">
                
                {/* Transaction Type Segmented Switch */}
                <div>
                    <label className="label mb-1.5">Movement Direction</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                        <button
                            type="button"
                            onClick={() => handleTypeChange('credit')}
                            className={clsx(
                                "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold text-xs transition-all",
                                txType === 'credit' ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            <ArrowDownRight className="w-4 h-4" />
                            Money In (Credit)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('debit')}
                            className={clsx(
                                "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold text-xs transition-all",
                                txType === 'debit' ? "bg-rose-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            Money Out (Debit)
                        </button>
                    </div>
                </div>

                {/* Amount Input */}
                <div>
                    <label className="label">Amount ({currency})</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 flex items-center justify-center font-bold">
                            {currencySymbol}
                        </div>
                        <input 
                            type="number" 
                            name="amount" 
                            step="0.01" 
                            min="0.01" 
                            required 
                            className="input pl-8 font-semibold text-gray-900" 
                            placeholder="0.00" 
                        />
                    </div>
                </div>

                {/* Standard Business Category */}
                <div>
                    <label className="label">Financial Category</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <CustomSelect 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)} 
                            required 
                            className="input pl-9"
                        >
                            {availableCategories.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.isTaxDeductible ? '(Tax Deductible)' : ''}
                                </option>
                            ))}
                        </CustomSelect>
                    </div>
                </div>

                {/* Counterparty / Reference Party */}
                <div>
                    <label className="label">Counterparty (Client / Vendor / Payee)</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            name="party" 
                            required 
                            className="input pl-9" 
                            placeholder={txType === 'credit' ? 'e.g. Acme Corp / Apex Global' : 'e.g. AWS Cloud / Landlord / Employee'} 
                        />
                    </div>
                </div>

                {/* Payment Method Rail */}
                <div>
                    <label className="label">Payment Rail & Method</label>
                    <div className="relative">
                        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <CustomSelect 
                            value={paymentMethod} 
                            onChange={(e) => setPaymentMethod(e.target.value)} 
                            required 
                            className="input pl-9"
                        >
                            {PAYMENT_METHODS.map(m => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                        </CustomSelect>
                    </div>
                </div>

                {/* Reference ID (UTR / Check / Inv #) */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="label">Txn / UTR Reference ID</label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                name="referenceId" 
                                className="input pl-9 text-xs font-mono" 
                                placeholder="e.g. UTR-98214" 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">Settlement Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="date" 
                                name="date" 
                                defaultValue={new Date().toISOString().split('T')[0]} 
                                className="input pl-9 text-xs" 
                            />
                        </div>
                    </div>
                </div>

                {/* Description & Narrative */}
                <div>
                    <label className="label">Memo / Description</label>
                    <div className="relative">
                        <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <textarea 
                            name="description" 
                            required 
                            rows={2} 
                            className="input pl-9" 
                            placeholder="e.g. Retainer milestone payment for Q3 platform engineering..."
                        ></textarea>
                    </div>
                </div>

            </form>
        </Drawer>
    );
}
