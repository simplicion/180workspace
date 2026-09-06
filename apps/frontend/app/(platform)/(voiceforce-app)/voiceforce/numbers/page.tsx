"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Smartphone, Plus, ArrowLeft, ShieldCheck, CheckCircle2, 
  Search, PhoneCall, RefreshCw, AlertCircle, Hash, Globe,
  Check, Trash2, Bot, ArrowRight, PhoneForwarded, Copy, Share2
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  PlatformModal, 
  ConfirmModal,
  UniversalSkeleton 
} from '@workspace/ui';

export default function VoiceforceNumbersPage() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Buy Number Modal
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [searchCountry, setSearchCountry] = useState('US');
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [buyAssignedAgentId, setBuyAssignedAgentId] = useState('');

  // Verify Existing Caller ID Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'phone' | 'otp'>('phone');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyMethod, setVerifyMethod] = useState<'sms' | 'call'>('sms');
  const [verificationId, setVerificationId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyAssignedAgentId, setVerifyAssignedAgentId] = useState('');

  // Deletion Modal
  const [numberToDelete, setNumberToDelete] = useState<{ id: string; number: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [numsRes, agentsRes, walletRes] = await Promise.all([
        api.get('/api/v1/voiceforce/numbers'),
        api.get('/api/v1/voiceforce/agents').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/wallet').catch(() => ({ data: { data: null } }))
      ]);
      setNumbers(numsRes.data?.data || []);
      setAgents(agentsRes.data?.data || []);
      if (walletRes.data?.data) {
        setWallet(walletRes.data.data);
      }
      if (agentsRes.data?.data?.length > 0 && !buyAssignedAgentId) {
        setBuyAssignedAgentId(agentsRes.data.data[0].id);
        setVerifyAssignedAgentId(agentsRes.data.data[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const rentalRate = Number(wallet?.constants?.numberRentalInr || 149);
  const lockThreshold = Number(wallet?.minRequiredInr || wallet?.constants?.minThresholdInr || 200);
  const graceDays = Number(wallet?.constants?.graceDays || 5);
  const totalRequired = rentalRate + lockThreshold;

  const handleSearchAvailable = async (country = searchCountry, area = searchAreaCode) => {
    try {
      setSearching(true);
      const res = await api.get('/api/v1/voiceforce/numbers/search', {
        params: { 
          countryCode: country,
          ...(area && area.trim() ? { areaCode: area.trim() } : {})
        }
      });
      setAvailableNumbers(res.data?.data || []);
      if (res.data?.data?.length === 0) {
        toast('No available numbers found for this criteria');
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
        friendlyName: `Dedicated Line (${searchCountry})`,
        assignedAgentId: buyAssignedAgentId || null
      });
      if (res.data?.success) {
        const allocatedNum = res.data.data?.e164Number || phoneNumber;
        toast.success(res.data.message || `Number ${allocatedNum} acquired and activated!`);
        setIsBuyModalOpen(false);
        fetchData();
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
        phoneNumber: verifyPhone.trim(),
        method: verifyMethod
      });
      if (res.data?.success) {
        setVerificationId(res.data.verificationId);
        setVerifyStep('otp');
        toast.success(`Verification code sent via ${verifyMethod.toUpperCase()}!`);
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
        friendlyName: 'Verified Business Number',
        assignedAgentId: verifyAssignedAgentId || null
      });
      if (res.data?.success) {
        toast.success('Caller ID Verified Successfully!');
        setIsVerifyModalOpen(false);
        setVerifyStep('phone');
        setVerifyPhone('');
        setOtpCode('');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP code');
    } finally {
      setVerifying(false);
    }
  };

  const handleAssignAgent = async (numberId: string, agentId: string) => {
    try {
      await api.put(`/api/v1/voiceforce/numbers/${numberId}`, {
        assignedAgentId: agentId || null
      });
      const agentObj = agents?.find(a => a.id === agentId);
      toast.success(agentObj ? `Inbound calls routed to ${agentObj.name}` : 'Inbound routing updated');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to update inbound routing');
    }
  };

  const handleConfirmDelete = async () => {
    if (!numberToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/api/v1/voiceforce/numbers/${numberToDelete.id}`);
      toast.success(`Number ${numberToDelete.number} disconnected`);
      setNumberToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to disconnect number');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link 
              href="/voiceforce" 
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Back to Voiceforce Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Phone Numbers & Caller ID</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-9">
            Manage your dedicated telecom lines and route inbound calls directly to specific AI employees.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsVerifyModalOpen(true); setVerifyStep('phone'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold border border-gray-200/80 dark:border-gray-800 shadow-sm transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Verify Existing Mobile</span>
          </button>

          <button
            onClick={() => { setIsBuyModalOpen(true); handleSearchAvailable(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buy Virtual Number</span>
          </button>
        </div>
      </div>

      {/* Dynamic Caller ID & Inbound Lifecycle Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-emerald-500/10 border border-indigo-200/60 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
              Customer Direct Lines & Autonomous Inbound Handling
            </h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-300">
              Share your business numbers directly with clients. Inbound calls are answered instantly by your assigned AI Agent (or routed via Call Forwarding), inquiries are logged to CRM, and conversations are recorded with transcripts.
            </p>
          </div>
        </div>
        <Link
          href="/voiceforce/forwarding"
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1 shadow-xs transition-colors whitespace-nowrap"
        >
          <span>Call Forwarding Rules</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-4">
          <UniversalSkeleton type="kanban" />
        </div>
      ) : numbers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50">
            <Smartphone className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Phone Numbers Connected</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
            You need at least one phone number to make or receive autonomous AI telephone calls. Verify your existing mobile or buy a dedicated virtual DID.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => { setIsVerifyModalOpen(true); setVerifyStep('phone'); }}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Verify My Mobile Number
            </button>
            <button
              onClick={() => { setIsBuyModalOpen(true); handleSearchAvailable(); }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              Buy New Virtual Line (₹{rentalRate}/mo)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {numbers.map((num) => (
            <div 
              key={num.id} 
              className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-indigo-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 flex-shrink-0">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-wide">{num.e164Number}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{num.friendlyName || 'Active Dedicated Line'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {num.status === 'cooling_down' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 uppercase animate-pulse">
                        Payment Due (Grace Period)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 uppercase">
                        {num.status || 'ACTIVE'}
                      </span>
                    )}
                    <button
                      onClick={() => setNumberToDelete({ id: num.id, number: num.e164Number })}
                      className="p-1 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Disconnect Line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Share With Customers Quick Action */}
                <div className="mt-4 p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Customer Line</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">Share with your clients</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(num.e164Number);
                      toast.success(`Copied ${num.e164Number} to clipboard! Share with your customers.`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-200/60 dark:border-indigo-800 shadow-xs cursor-pointer flex-shrink-0"
                    title="Copy number to share with clients"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                    <span>Routing Type</span>
                    <span className="text-gray-900 dark:text-gray-200 font-medium capitalize">
                      {num.provider === 'verified_caller_id' ? 'Verified Caller ID' : 'Dedicated Virtual DID'}
                    </span>
                  </div>

                  {/* Interactive Inbound AI Routing Dropdown */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Inbound Call Routing</span>
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {num.routingMode === 'forwarding_rule' ? 'Forwarding Pipeline' : 'Answering Agent'}
                      </span>
                    </div>

                    {num.routingMode === 'forwarding_rule' ? (
                      <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                          <PhoneForwarded className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Hunt Group / Forwarding Active</span>
                        </div>
                        <Link
                          href="/voiceforce/forwarding"
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={num.assignedAgentId || ''}
                        onChange={(e) => handleAssignAgent(num.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="">All Active Agents (Default)</option>
                        {agents.map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.name} ({ag.role})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 pt-1">
                    <span>Concurrency</span>
                    <span className="text-gray-900 dark:text-gray-200 font-medium">{num.maxConcurrent || 10} channels</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                <span>Carrier: {num.provider === 'telnyx' ? 'Telnyx SIP' : 'Mobile PSTN'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Inbound Ready
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Universal Platform Modal: Buy Virtual Number */}
      <PlatformModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        title="Purchase Dedicated Virtual Line"
        icon={Smartphone}
        iconColorClass="text-indigo-600 dark:text-indigo-400"
        iconBgClass="bg-indigo-50 dark:bg-indigo-950/60"
        subHeader="Instant virtual phone numbers provisioned via Telnyx SIP Trunking."
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Country
              </label>
              <select
                value={searchCountry}
                onChange={(e) => {
                  setSearchCountry(e.target.value);
                  handleSearchAvailable(e.target.value, searchAreaCode);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="US">United States (+1)</option>
                <option value="GB">United Kingdom (+44)</option>
                <option value="CA">Canada (+1)</option>
                <option value="IN">India (+91)</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Area Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 415, 212"
                value={searchAreaCode}
                onChange={(e) => setSearchAreaCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                onClick={() => handleSearchAvailable(searchCountry, searchAreaCode)}
                disabled={searching}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Search Available Inventory"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{searching ? '...' : 'Find'}</span>
              </button>
            </div>
          </div>

          {searchCountry === 'IN' && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Indian Telecom (TRAI & DoT) Regulations</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                Self-service instant purchase of virtual Indian (+91) numbers is restricted by Indian telecom law without verified corporate KYC documents.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsBuyModalOpen(false);
                    setIsVerifyModalOpen(true);
                  }}
                  className="text-xs font-bold underline hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
                >
                  Verify your existing Indian mobile/business SIM instead →
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Assign Incoming Calls to Employee
            </label>
            <select
              value={buyAssignedAgentId}
              onChange={(e) => setBuyAssignedAgentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Active Agents (Round-Robin)</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>
              ))}
            </select>
          </div>

          {/* Dedicated Lease Terms Notice */}
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-300">
            <span className="font-bold">Dedicated Number Terms:</span> ₹{rentalRate.toFixed(2)} / month (Auto-renews every 30 days).
            <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
              Requires ₹{totalRequired.toFixed(2)} total wallet balance (₹{rentalRate} lease + ₹{lockThreshold} calling reserve). Unpaid numbers enter a {graceDays}-day grace period before carrier release.
            </p>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {availableNumbers.length === 0 && !searching && searchCountry !== 'IN' && (
              <div className="p-8 text-center rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 text-xs text-gray-500">
                Click Find above to discover available telecom DIDs in {searchCountry}.
              </div>
            )}
            {availableNumbers.map((item, index) => {
              const isMasked = item.isSandbox || item.phoneNumber.includes('-');
              return (
                <div 
                  key={`${item.phoneNumber}-${index}`} 
                  className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{item.phoneNumber}</p>
                      {isMasked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                          Virtual DID
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          Live PSTN
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {item.region || 'National'} • Voice Enabled • Instant Routing
                    </p>
                  </div>
                  <button
                    onClick={() => handlePurchase(item.phoneNumber)}
                    disabled={purchasing}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {purchasing ? 'Acquiring...' : `Buy for ₹${rentalRate}/mo`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </PlatformModal>

      {/* Universal Platform Modal: Verify Existing Caller ID */}
      <PlatformModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Verify Outbound Caller ID"
        icon={ShieldCheck}
        iconColorClass="text-emerald-600 dark:text-emerald-400"
        iconBgClass="bg-emerald-50 dark:bg-emerald-950/60"
        subHeader="Display your real business mobile number when the AI makes calls."
        maxWidthClass="max-w-md"
      >
        {verifyStep === 'phone' ? (
          <form onSubmit={handleRequestVerification} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Your Mobile / Business Number (E.164 format)
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={verifyPhone}
                onChange={(e) => setVerifyPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Enter your genuine mobile number with country code (e.g., +91, +1, +44).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Verification Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyMethod('sms')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    verifyMethod === 'sms'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  📱 SMS Code
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyMethod('call')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    verifyMethod === 'call'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  📞 Phone Call OTP
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Default Answering Employee (Optional)
              </label>
              <select
                value={verifyAssignedAgentId}
                onChange={(e) => setVerifyAssignedAgentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                <option value="">All Active Agents (Round-Robin)</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifying}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {verifying ? 'Sending Code...' : `Send ${verifyMethod === 'sms' ? 'SMS' : 'Call'} OTP`}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Enter 6-Digit Code sent to {verifyPhone}
              </label>
              <input
                type="text"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                maxLength={6}
                required
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setVerifyStep('phone')}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
              >
                Change Number
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {verifying ? 'Verifying...' : 'Verify & Activate'}
                </button>
              </div>
            </div>
          </form>
        )}
      </PlatformModal>

      {/* Disconnect Line Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(numberToDelete)}
        onClose={() => setNumberToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Disconnect Phone Number"
        message={`Are you sure you want to disconnect ${numberToDelete?.number}? This will permanently remove the line from 180workspace and release it on the carrier. Inbound calls will no longer route to your AI employees.`}
        confirmText={deleting ? "Disconnecting..." : "Disconnect Line"}
        cancelText="Keep Line"
        isDestructive={true}
      />
    </div>
  );
}
