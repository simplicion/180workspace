'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HardDrive, Minus, Plus, ChevronLeft, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function AddStoragePage() {
    const router = useRouter();
    const [gigabytes, setGigabytes] = useState(5);
    const [loading, setLoading] = useState(false);
    
    const PRICE_PER_GB = 50; // INR
    
    const handleIncrement = () => setGigabytes(g => Math.min(g + 1, 1000));
    const handleDecrement = () => setGigabytes(g => Math.max(g - 1, 1));
    
    const handleCheckout = async () => {
        setLoading(true);
        try {
            // Initiate Razorpay checkout for storage addon
            const { data } = await api.post('/api/billing/storage/checkout', {
                gigabytes
            });
            
            if (data.orderId) {
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: data.amount,
                    currency: "INR",
                    name: "180workspace",
                    description: `Add ${gigabytes}GB Storage`,
                    order_id: data.orderId,
                    handler: async function (response: any) {
                        try {
                            await api.post('/api/billing/storage/verify', {
                                ...response,
                                gigabytes
                            });
                            toast.success(`Successfully added ${gigabytes}GB of storage!`);
                            router.push('/dashboard/billing');
                        } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Verification failed');
                        }
                    },
                    theme: {
                        color: "#4f46e5" // indigo-600
                    }
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response: any) {
                    toast.error(response.error.description || 'Payment failed');
                });
                rzp.open();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to initiate checkout');
        }
        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto py-10">
            <button onClick={() => router.back()} className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Billing
            </button>
            
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-indigo-50/50">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Add Extra Storage</h1>
                        <p className="text-slate-500 font-medium">Purchase additional R2 cloud storage at ₹50/GB per month.</p>
                    </div>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-8 mb-8 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-slate-700">Select Amount (GB)</span>
                        <span className="text-indigo-600 font-black text-xl">{gigabytes} GB</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleDecrement}
                            className="w-12 h-12 bg-white rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-colors"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                        
                        <div className="flex-1 relative">
                            <input 
                                type="range" 
                                min="1" 
                                max="100" 
                                value={gigabytes}
                                onChange={(e) => setGigabytes(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                        
                        <button 
                            onClick={handleIncrement}
                            className="w-12 h-12 bg-white rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center justify-between py-4 border-t border-slate-100 mb-6">
                    <div>
                        <span className="block text-slate-500 font-medium text-sm">Total per month</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-black text-slate-900">₹{gigabytes * PRICE_PER_GB}</span>
                            <span className="text-slate-400 font-bold uppercase text-sm">/mo</span>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black tracking-wide uppercase transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                    {loading ? 'Processing...' : 'Proceed to Checkout'}
                </button>
                
                <p className="text-center text-slate-400 text-xs font-medium mt-4 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Secure payment powered by Razorpay
                </p>
            </div>
        </div>
    );
}
