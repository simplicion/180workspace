'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import CustomSelect from '@/components/ui/CustomSelect';
import { Building2, User, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export function CreateTransactionDrawer({ isOpen, onClose, onSuccess, vendors, projects, clients }: any) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Type selection, 2: Form

    const [formData, setFormData] = useState({
        type: '', // company_expense or employee_claim
        title: '',
        amount: '',
        currency: 'USD',
        category: 'other',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
        vendorId: '',
        newVendorName: '',
        newVendorEmail: '',
        newVendorPhone: '',
        newVendorTaxId: '',
        newVendorAddress: '',
        newVendorBankDetails: '',
        projectId: '',
        clientId: '',
        receiptLinks: '',
    });

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFormData({
                type: '',
                title: '',
                amount: '',
                currency: 'USD',
                category: 'other',
                date: new Date().toISOString().split('T')[0],
                dueDate: '',
                notes: '',
                vendorId: '',
                newVendorName: '',
                newVendorEmail: '',
                newVendorPhone: '',
                newVendorTaxId: '',
                newVendorAddress: '',
                newVendorBankDetails: '',
                projectId: '',
                clientId: '',
                receiptLinks: '',
            });
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/expenses', formData);
            toast.success(formData.type === 'employee_claim' ? 'Claim submitted successfully' : 'Expense recorded');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to submit transaction');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={step === 1 ? 'Select Transaction Type' : formData.type === 'company_expense' ? 'Record Company Expense' : 'Submit Employee Claim'}
            maxWidth="max-w-2xl"
            footer={
                step === 2 && (
                    <div className="flex items-center justify-between w-full">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                            Back
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="transaction-form"
                                disabled={loading}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Submit
                            </button>
                        </div>
                    </div>
                )
            }
        >
            {step === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option 1: Company Expense */}
                    <button
                        onClick={() => { setFormData(prev => ({ ...prev, type: 'company_expense' })); setStep(2); }}
                        className="group relative flex flex-col items-start p-5 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all text-left"
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mb-1">Company Expense</h4>
                        <p className="text-xs text-gray-500 line-clamp-2">Vendor bills, software subscriptions, rent, and corporate purchases.</p>
                        <ArrowRight className="w-4 h-4 text-indigo-500 absolute top-5 right-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Option 2: Employee Claim */}
                    <button
                        onClick={() => { setFormData(prev => ({ ...prev, type: 'employee_claim' })); setStep(2); }}
                        className="group relative flex flex-col items-start p-5 rounded-2xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <User className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mb-1">Employee Claim</h4>
                        <p className="text-xs text-gray-500 line-clamp-2">Reimbursements for travel, meals, or out-of-pocket expenses.</p>
                        <ArrowRight className="w-4 h-4 text-emerald-500 absolute top-5 right-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            )}

            {step === 2 && (
                <form id="transaction-form" onSubmit={handleSubmit} className="space-y-5">
                    {/* Basic Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
                            <input
                                required
                                placeholder="e.g. AWS Hosting Bill"
                                className={inputClass}
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                <input
                                    required type="number" step="0.01"
                                    placeholder="0.00"
                                    className={`${inputClass} pl-8`}
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Date</label>
                            <input
                                required type="date"
                                className={inputClass}
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <CustomSelect 
                                label="Category"
                                value={formData.category}
                                onChange={val => setFormData({ ...formData, category: val })}
                                options={[
                                    { label: 'Travel & Transit', value: 'travel' },
                                    { label: 'Software & IT', value: 'software' },
                                    { label: 'Office Supplies', value: 'office' },
                                    { label: 'Meals & Entertainment', value: 'meals' },
                                    { label: 'Other', value: 'other' }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <CustomSelect
                                label="Project (Optional)"
                                searchable={true}
                                value={formData.projectId}
                                onChange={val => setFormData({ ...formData, projectId: val, clientId: '' })}
                                options={[
                                    { label: 'None', value: '' },
                                    ...(projects?.map((p: any) => ({ label: p.name, value: p.id })) || [])
                                ]}
                                placeholder="Search project..."
                            />
                        </div>
                        <div className="space-y-1">
                            <CustomSelect
                                label="Client (Optional)"
                                searchable={true}
                                value={formData.clientId}
                                onChange={val => setFormData({ ...formData, clientId: val })}
                                options={[
                                    { label: 'None', value: '' },
                                    ...((formData.projectId
                                        ? clients?.filter((c: any) => {
                                            const proj = projects?.find((p: any) => p.id === formData.projectId);
                                            return proj?.clientIds?.includes(c.id);
                                        })
                                        : clients
                                    )?.map((c: any) => ({ label: c.name, value: c.id })) || [])
                                ]}
                                placeholder="Search client..."
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Receipt / Proof Links</label>
                            <button type="button" className="text-indigo-600 text-xs font-bold hover:underline">+ Add Link</button>
                        </div>
                        <input
                            placeholder="https://drive.google.com/... or any proof link"
                            className={inputClass}
                            value={formData.receiptLinks}
                            onChange={e => setFormData({ ...formData, receiptLinks: e.target.value })}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Paste links to Google Drive, Dropbox, S3, or any publicly accessible proof document.</p>
                    </div>

                    {/* Conditional Vendor Fields for Company Expense */}
                    {formData.type === 'company_expense' && (
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <h4 className="text-sm font-bold text-gray-700">Vendor Information</h4>
                            </div>

                            <div className="space-y-1">
                                <CustomSelect
                                    label="Select Existing Vendor"
                                    searchable={true}
                                    value={formData.vendorId}
                                    onChange={val => setFormData({ ...formData, vendorId: val })}
                                    options={[
                                        { label: '-- Add New Vendor --', value: '' },
                                        ...(vendors?.map((v: any) => ({ label: v.name, value: v.id })) || [])
                                    ]}
                                    placeholder="-- Search Vendor --"
                                />
                            </div>

                            {!formData.vendorId && (
                                <div className="space-y-4 border rounded-xl p-4 bg-white shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase">New Vendor Name *</label>
                                            <input
                                                placeholder="Company Name"
                                                className={inputClass}
                                                value={formData.newVendorName}
                                                onChange={e => setFormData({ ...formData, newVendorName: e.target.value })}
                                                required={!formData.vendorId}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Tax ID / GSTIN</label>
                                            <input
                                                placeholder="Tax ID"
                                                className={inputClass}
                                                value={formData.newVendorTaxId}
                                                onChange={e => setFormData({ ...formData, newVendorTaxId: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                                            <input
                                                type="email"
                                                placeholder="billing@company.com"
                                                className={inputClass}
                                                value={formData.newVendorEmail}
                                                onChange={e => setFormData({ ...formData, newVendorEmail: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Phone Number</label>
                                            <input
                                                type="text"
                                                placeholder="+1 234 567 890"
                                                className={inputClass}
                                                value={formData.newVendorPhone}
                                                onChange={e => setFormData({ ...formData, newVendorPhone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Address</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Vendor full address"
                                            className={`${inputClass} resize-none`}
                                            value={formData.newVendorAddress}
                                            onChange={e => setFormData({ ...formData, newVendorAddress: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Bank Details</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Account Number, Routing, etc."
                                            className={`${inputClass} resize-none`}
                                            value={formData.newVendorBankDetails}
                                            onChange={e => setFormData({ ...formData, newVendorBankDetails: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1 mt-4">
                                <label className="text-xs font-semibold text-gray-500 uppercase">Due Date (If Bill)</label>
                                <input
                                    type="date"
                                    className={inputClass}
                                    value={formData.dueDate}
                                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Notes / Description</label>
                        <textarea
                            rows={3}
                            placeholder="Add any extra context here..."
                            className={`${inputClass} resize-none`}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </form>
            )}
        </Drawer>
    );
}
