'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CreditCard, Save, Link2, ShieldAlert, Bell, Clock, Send } from 'lucide-react';

export default function FinanceTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [activeProvider, setActiveProvider] = useState<'manual' | 'razorpay' | 'stripe'>('manual');

    // Razorpay Keys
    const [razorpayKeyId, setRazorpayKeyId] = useState('');
    const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
    const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');

    // Stripe Keys
    const [stripePublicKey, setStripePublicKey] = useState('');
    const [stripeSecretKey, setStripeSecretKey] = useState('');
    const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');

    // Reminder Settings
    const [remindersEnabled, setRemindersEnabled] = useState(false);
    const [reminderSchedule, setReminderSchedule] = useState<number[]>([3, 1, -7]);
    const [triggering, setTriggering] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/api/finance/config');
            if (data?.paymentConfig) {
                setActiveProvider(data.paymentConfig.activeProvider || 'manual');
                setRazorpayKeyId(data.paymentConfig.razorpay?.keyId || '');
                setStripePublicKey(data.paymentConfig.stripe?.publicKey || '');
                setRemindersEnabled(data.paymentConfig.reminderSettings?.enabled || false);
                setReminderSchedule(data.paymentConfig.reminderSettings?.schedule || [3, 1, -7]);
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to load finance config');
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const payload = {
                companyPaymentConfig: {
                    activeProvider,
                    razorpay: {
                        keyId: razorpayKeyId,
                        ...(razorpayKeySecret && { keySecret: razorpayKeySecret }),
                        ...(razorpayWebhookSecret && { webhookSecret: razorpayWebhookSecret })
                    },
                    stripe: {
                        publicKey: stripePublicKey,
                        ...(stripeSecretKey && { secretKey: stripeSecretKey }),
                        ...(stripeWebhookSecret && { webhookSecret: stripeWebhookSecret })
                    },
                    reminderSettings: {
                        enabled: remindersEnabled,
                        schedule: reminderSchedule
                    }
                }
            };

            await api.post('/api/finance/config', payload);
            toast.success('Payment configuration updated successfully!');
            // clear the local state secrets to avoid accidental resubmissions of plain text
            setRazorpayKeySecret('');
            setRazorpayWebhookSecret('');
            setStripeSecretKey('');
            setStripeWebhookSecret('');
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const triggerRemindersManually = async () => {
        setTriggering(true);
        try {
            const { data } = await api.post('/api/finance/trigger-reminders');
            toast.success(data.message || 'Reminders processed successfully');
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to trigger reminders');
        } finally {
            setTriggering(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><LogoLoader className="w-6 h-6 animate-spin text-indigo-500" /></div>;

    return (
        <div className="max-w-xl space-y-6">
            <div className="card">
                <div className="card-header flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-semibold text-gray-900">Payment Collection & Payouts</h2>
                </div>

                <div className="card-body space-y-6">
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-orange-500 mt-0.5" />
                        <div className="text-sm text-orange-800">
                            <strong>Security Notice:</strong> Secret keys are never sent back to the client. If you see blank fields for secrets, your previous keys are still safely stored. Only enter new secrets if you want to replace the current ones.
                        </div>
                    </div>

                    <div>
                        <label className="label">Active Payment Provider</label>
                        <select
                            value={activeProvider}
                            onChange={(e) => setActiveProvider(e.target.value as any)}
                            className="select"
                        >
                            <option value="manual">Manual (Bank Transfer / Cash)</option>
                            <option value="razorpay">Razorpay</option>
                            <option value="stripe">Stripe</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Select how you want to collect payments from your clients via invoices.
                        </p>
                    </div>

                    {activeProvider === 'razorpay' && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <h3 className="font-semibold text-gray-800 text-sm mb-4">Razorpay Configuration</h3>

                            <div>
                                <label className="label">Key ID</label>
                                <input
                                    value={razorpayKeyId}
                                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                                    className="input bg-white"
                                    placeholder="rzp_test_..."
                                />
                            </div>
                            <div>
                                <label className="label">Key Secret</label>
                                <input
                                    type="password"
                                    value={razorpayKeySecret}
                                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                                    className="input bg-white"
                                    placeholder="Leave blank to keep existing"
                                />
                            </div>
                            <div>
                                <label className="label">Webhook Secret</label>
                                <input
                                    type="password"
                                    value={razorpayWebhookSecret}
                                    onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                                    className="input bg-white"
                                    placeholder="Leave blank to keep existing"
                                />
                                <div className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" />
                                    <span>Webhook URL:</span> <code>https://YOUR_DOMAIN/api/webhooks/company/razorpay?companyId=[YOUR_COMPANY_ID]</code>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeProvider === 'stripe' && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <h3 className="font-semibold text-gray-800 text-sm mb-4">Stripe Configuration</h3>

                            <div>
                                <label className="label">Publishable Key</label>
                                <input
                                    value={stripePublicKey}
                                    onChange={(e) => setStripePublicKey(e.target.value)}
                                    className="input bg-white"
                                    placeholder="pk_test_..."
                                />
                            </div>
                            <div>
                                <label className="label">Secret Key</label>
                                <input
                                    type="password"
                                    value={stripeSecretKey}
                                    onChange={(e) => setStripeSecretKey(e.target.value)}
                                    className="input bg-white"
                                    placeholder="Leave blank to keep existing"
                                />
                            </div>
                            <div>
                                <label className="label">Webhook Secret</label>
                                <input
                                    type="password"
                                    value={stripeWebhookSecret}
                                    onChange={(e) => setStripeWebhookSecret(e.target.value)}
                                    className="input bg-white"
                                    placeholder="Leave blank to keep existing"
                                />
                                <div className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" />
                                    <span>Webhook URL:</span> <code>https://YOUR_DOMAIN/api/webhooks/company/stripe?companyId=[YOUR_COMPANY_ID]</code>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-indigo-600" />
                                <h3 className="font-semibold text-gray-800 text-sm">Automated Payment Reminders</h3>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={remindersEnabled}
                                    onChange={(e) => setRemindersEnabled(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <p className="text-xs text-gray-500">
                            Automatically send friendly email reminders to clients for upcoming and overdue invoices based on a schedule.
                        </p>

                        {remindersEnabled && (
                            <div className="space-y-3 p-3 bg-indigo-50/30 rounded-lg border border-indigo-100/50">
                                <label className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">Reminder Schedule (Days from Due Date)</label>
                                <div className="flex flex-wrap gap-2">
                                    {reminderSchedule.map((days, idx) => (
                                        <div key={idx} className="flex items-center gap-1 bg-white border border-indigo-100 rounded-md px-2 py-1 shadow-sm">
                                            <Clock className="w-3 h-3 text-indigo-400" />
                                            <input
                                                type="number"
                                                value={days}
                                                onChange={(e) => {
                                                    const newSchedule = [...reminderSchedule];
                                                    newSchedule[idx] = parseInt(e.target.value) || 0;
                                                    setReminderSchedule(newSchedule);
                                                }}
                                                className="w-10 text-xs font-medium focus:outline-none"
                                            />
                                            <button
                                                onClick={() => setReminderSchedule(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-gray-300 hover:text-red-400 transition-colors"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setReminderSchedule(prev => [...prev, 0])}
                                        className="text-[10px] font-bold text-indigo-600 underline hover:text-indigo-700"
                                    >
                                        + Add Day
                                    </button>
                                </div>
                                <p className="text-[10px] text-indigo-600">
                                    <strong>Positive numbers (e.g. 3):</strong> days before due date.
                                    <strong>Negative numbers (e.g. -7):</strong> days after due date (overdue).
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 mt-2">
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-gray-700">Manual Batch Trigger</p>
                                <p className="text-[10px] text-gray-400">Force system to scan and send all pending reminders right now.</p>
                            </div>
                            <button
                                onClick={triggerRemindersManually}
                                disabled={triggering}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                            >
                                {triggering ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                {triggering ? 'Processing...' : 'Send Now'}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <button
                            onClick={saveConfig}
                            disabled={saving}
                            className="btn-primary"
                        >
                            {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        <p className="text-xs text-gray-400 mt-3 text-center">
                            Updating provider settings will immediately impact all future invoices and payouts.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
