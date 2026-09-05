"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Smartphone, Plus, ArrowLeft, ShieldCheck, CheckCircle2, 
  Search, Key, PhoneCall, RefreshCw, X, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';

export default function VoiceforceNumbersPage() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Buy Number Tab / Modal
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [searchCountry, setSearchCountry] = useState('US');
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Verify Existing Caller ID Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'phone' | 'otp'>('phone');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/voiceforce/numbers');
      setNumbers(res.data?.data || []);
    } catch (err: any) {
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const handleSearchAvailable = async () => {
    try {
      setSearching(true);
      const res = await api.get('/api/v1/voiceforce/numbers/search', {
        params: { countryCode: searchCountry }
      });
      setAvailableNumbers(res.data?.data || []);
      if (res.data?.data?.length === 0) {
        toast('No available numbers found in this region');
      }
    } catch (err: any) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handlePurchase = async (phoneNumber: string) => {
    try {
      setPurchasing(true);
      const res = await api.post('/api/v1/voiceforce/numbers/purchase', {
        phoneNumber,
        friendlyName: `Dedicated Line (${searchCountry})`
      });
      if (res.data?.success) {
        toast.success(`Number ${phoneNumber} acquired!`);
        setIsBuyModalOpen(false);
        fetchNumbers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPhone.trim()) return;

    try {
      setVerifying(true);
      const res = await api.post('/api/v1/voiceforce/numbers/verify-request', {
        phoneNumber: verifyPhone
      });
      if (res.data?.success) {
        setVerificationId(res.data.verificationId);
        setVerifyStep('otp');
        toast.success('Verification code sent to your phone!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification request failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVerifying(true);
      const res = await api.post('/api/v1/voiceforce/numbers/verify-otp', {
        verificationId,
        phoneNumber: verifyPhone,
        code: otpCode,
        friendlyName: 'Verified Business Number'
      });
      if (res.data?.success) {
        toast.success('Caller ID Verified Successfully!');
        setIsVerifyModalOpen(false);
        setVerifyStep('phone');
        setVerifyPhone('');
        setOtpCode('');
        fetchNumbers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP code');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/voiceforce" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight">Phone Numbers & Caller ID</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage your dedicated telecom lines and verify existing business numbers to display on client caller IDs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsVerifyModalOpen(true); setVerifyStep('phone'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium border border-white/10 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verify Existing Mobile</span>
          </button>

          <button
            onClick={() => { setIsBuyModalOpen(true); handleSearchAvailable(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buy Virtual Number</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : numbers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10">
          <Smartphone className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-white">No Phone Numbers Connected</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You need at least one phone number to make or receive autonomous AI telephone calls.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => { setIsVerifyModalOpen(true); setVerifyStep('phone'); }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
            >
              Verify My Mobile Number
            </button>
            <button
              onClick={() => { setIsBuyModalOpen(true); handleSearchAvailable(); }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Buy New Virtual Line (₹85/mo)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {numbers.map((num) => (
            <div key={num.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">{num.e164Number}</h3>
                    <p className="text-xs text-slate-400">{num.friendlyName || 'Active Line'}</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {num.status}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Type</span>
                  <span className="text-slate-200 capitalize">{num.provider === 'verified_caller_id' ? 'Verified Caller ID' : 'Dedicated Virtual DID'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Assigned AI Employee</span>
                  <span className="text-indigo-300 font-medium">{num.assignedAgent?.name || 'All Active Agents'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Max Channels</span>
                  <span className="text-slate-200">{num.maxConcurrent} concurrent</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Buy Virtual Number Modal */}
      {isBuyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsBuyModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Smartphone className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Purchase Dedicated Line</h3>
                <p className="text-xs text-slate-400">Instant virtual phone numbers provisioned via Telnyx.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <select
                value={searchCountry}
                onChange={(e) => setSearchCountry(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              >
                <option value="US">United States (+1)</option>
                <option value="GB">United Kingdom (+44)</option>
                <option value="CA">Canada (+1)</option>
                <option value="IN">India (+91)</option>
              </select>

              <button
                onClick={handleSearchAvailable}
                disabled={searching}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{searching ? 'Searching...' : 'Search Numbers'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableNumbers.map((item) => (
                <div key={item.phoneNumber} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{item.phoneNumber}</p>
                    <p className="text-[11px] text-slate-400">{item.region} • Voice Enabled</p>
                  </div>
                  <button
                    onClick={() => handlePurchase(item.phoneNumber)}
                    disabled={purchasing}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {purchasing ? 'Buying...' : 'Buy for ₹85/mo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verify Existing Number Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsVerifyModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Verify Outbound Caller ID</h3>
                <p className="text-xs text-slate-400">Show your own mobile number when the AI calls clients.</p>
              </div>
            </div>

            {verifyStep === 'phone' ? (
              <form onSubmit={handleRequestVerification} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Your Mobile / Business Number (E.164)</label>
                  <input
                    type="text"
                    placeholder="+919876543210"
                    value={verifyPhone}
                    onChange={(e) => setVerifyPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    We will send an SMS or call with a 6-digit verification code to prove ownership.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsVerifyModalOpen(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {verifying ? 'Sending Code...' : 'Send Verification OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmitOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Enter 6-Digit OTP Code</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm tracking-widest text-center font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setVerifyStep('phone')}
                    className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {verifying ? 'Verifying...' : 'Confirm Verification'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
