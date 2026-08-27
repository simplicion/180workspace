'use client';

import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Building2, CheckCircle2, AlertCircle, Save, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

export default function EmployeeBankDetails({ profileUser, currentUser, onUpdate }: { profileUser: any, currentUser: any, onUpdate: () => void }) {
    const isOwnProfile = currentUser?.id === profileUser.id;
    const isAdmin = currentUser?.role === 'admin';
    const canEdit = isOwnProfile || isAdmin;

    const [bankName, setBankName] = useState(profileUser.bankDetails?.bankName || '');
    const [accountName, setAccountName] = useState(profileUser.bankDetails?.accountName || '');
    const [accountNumber, setAccountNumber] = useState(profileUser.bankDetails?.accountNumber || '');
    const [ifscCode, setIfscCode] = useState(profileUser.bankDetails?.ifscCode || '');
    const [branchName, setBranchName] = useState(profileUser.bankDetails?.branchName || '');

    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const verificationStatus = profileUser.bankDetails?.verificationStatus || 'unverified';

    const saveBankDetails = async () => {
        setSaving(true);
        try {
            await api.put(`/api/users/${profileUser.id}`, {
                bankDetails: {
                    bankName,
                    accountName,
                    accountNumber,
                    ifscCode,
                    branchName,
                    verificationStatus: verificationStatus === 'verified' && accountNumber === profileUser.bankDetails?.accountNumber ? 'verified' : 'unverified'
                }
            });
            toast.success('Bank details saved successfully');
            onUpdate();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to save bank details');
        } finally {
            setSaving(false);
        }
    };

    const verifyBankAccount = async () => {
        setVerifying(true);
        try {
            const { data } = await api.post('/api/finance/verify-bank', { userId: profileUser.id });
            toast.success(data.message || 'Bank account verified successfully!');
            onUpdate();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="card p-6 mt-6 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    Bank Details & Payout Config
                </h3>
                <div className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5",
                    verificationStatus === 'verified' ? "bg-emerald-100 text-emerald-700" :
                        verificationStatus === 'failed' ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                )}>
                    {verificationStatus === 'verified' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {verificationStatus === 'failed' && <AlertCircle className="w-3.5 h-3.5" />}
                    {verificationStatus === 'unverified' && <AlertCircle className="w-3.5 h-3.5" />}
                    {verificationStatus.toUpperCase()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">Bank Name</label>
                    <input
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        disabled={!canEdit}
                        className="input"
                        placeholder="HDFC Bank"
                    />
                </div>
                <div>
                    <label className="label">Account Holder Name</label>
                    <input
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        disabled={!canEdit}
                        className="input"
                        placeholder="John Doe"
                    />
                </div>
                <div>
                    <label className="label">Account Number</label>
                    <input
                        type="password"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        disabled={!canEdit}
                        className="input"
                        placeholder={profileUser.bankDetails?.accountNumber ? '••••••••••••' : 'Enter Account Number'}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Stored securely using military-grade encryption.</p>
                </div>
                <div>
                    <label className="label">IFSC Code / Routing Number</label>
                    <input
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        disabled={!canEdit}
                        className="input"
                        placeholder="HDFC0001234"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="label">Branch Name</label>
                    <input
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        disabled={!canEdit}
                        className="input"
                        placeholder="Main Branch"
                    />
                </div>
            </div>

            {canEdit && (
                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                    <button
                        onClick={verifyBankAccount}
                        disabled={verifying || verificationStatus === 'verified' || !profileUser.bankDetails?.accountNumber}
                        className="btn items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold"
                    >
                        {verifying ? <LogoLoader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                        {verifying ? 'Verifying via Penny Drop...' : 'Verify Bank Account'}
                    </button>

                    <button
                        onClick={saveBankDetails}
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Bank Details'}
                    </button>
                </div>
            )}
        </div>
    );
}
