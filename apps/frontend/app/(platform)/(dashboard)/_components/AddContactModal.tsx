'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';

interface AddContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contact?: any;
}

export default function AddContactModal({ isOpen, onClose, onSuccess, contact }: AddContactModalProps) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        email: '',
        phone: '',
        accountId: '',
    });

    useEffect(() => {
        if (contact) {
            setFormData({
                name: contact.name || '',
                role: contact.role || '',
                email: contact.email || '',
                phone: contact.phone || '',
                accountId: contact.accountId?.id || contact.accountId || '',
            });
        } else {
            setFormData({
                name: '',
                role: '',
                email: '',
                phone: '',
                accountId: '',
            });
        }
    }, [contact, isOpen]);

    useEffect(() => {
        if (isOpen) {
            api.get('/api/sales/accounts')
                .then(res => setAccounts(res.data.accounts || res.data))
                .catch(() => toast.error('Failed to load accounts'));
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (contact) {
                await api.put(`/api/sales/contacts/${contact.id}`, formData);
                toast.success('Contact updated successfully');
            } else {
                await api.post('/api/sales/contacts', formData);
                toast.success('Contact added successfully');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save contact');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
            >
                <div className="p-8 pb-4 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter">
                            {contact ? 'Edit Contact' : 'New Contact'}
                        </h2>
                        <p className="text-gray-500 text-sm font-medium">Link people to corporate accounts and track details.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-2xl transition-all" aria-label="Close modal">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <label htmlFor="contactName" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-1 block">Full Name</label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    id="contactName"
                                    required
                                    type="text"
                                    className="input w-full pl-11 bg-gray-50/50 border-gray-100 focus:bg-white transition-all"
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative group">
                                <label htmlFor="contactRole" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-1 block">Role / Title</label>
                                <input
                                    id="contactRole"
                                    type="text"
                                    className="input w-full bg-gray-50/50 border-gray-100 focus:bg-white transition-all"
                                    placeholder="e.g. CTO"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                />
                            </div>
                            <div className="relative group">
                                <label htmlFor="contactAccount" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-1 block">Account</label>
                                <div className="relative">
                                    <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <CustomSelect
                                        id="contactAccount"
                                        required
                                        className="input w-full pl-11 bg-gray-50/50 border-gray-100 focus:bg-white appearance-none transition-all"
                                        value={formData.accountId}
                                        onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.companyName}</option>
                                        ))}
                                    </CustomSelect>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <label htmlFor="contactEmail" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-1 block">Email Address</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    id="contactEmail"
                                    required
                                    type="email"
                                    className="input w-full pl-11 bg-gray-50/50 border-gray-100 focus:bg-white transition-all"
                                    placeholder="name@company.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="relative group">
                            <label htmlFor="contactPhone" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-1 block">Phone Number</label>
                            <div className="relative">
                                <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    id="contactPhone"
                                    type="tel"
                                    className="input w-full pl-11 bg-gray-50/50 border-gray-100 focus:bg-white transition-all"
                                    placeholder="+1 (555) 000-0000"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-4 px-6 rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <LogoLoader className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            {contact ? 'Update Contact' : 'Create Contact'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
