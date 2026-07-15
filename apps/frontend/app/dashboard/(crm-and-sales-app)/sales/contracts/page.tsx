'use client';


import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { FileText, Cpu, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Send, Scale, Edit3, PlusCircle } from 'lucide-react';
import clsx from 'clsx';
import { Target } from 'lucide-react'; // Fix missing import from previous file

interface ContractAnalysis {
    title: string;
    parties: string[];
    value: string;
    dates: {
        effectiveDate: string;
        expirationDate: string;
    };
    keyObligations: string[];
    risks: string[];
}

interface ContractProposal {
    proposedChanges: string;
    updatedContractText: string;
}

interface NewContract {
    contractTitle: string;
    contractText: string;
}

export default function ContractIntelligencePage() {
    const { token } = useAuth();
    
    // UI State
    const [mode, setMode] = useState<'analyze' | 'propose' | 'create'>('analyze');
    
    // Input States
    const [text, setText] = useState(''); // Text to analyze or base text to update
    const [instructions, setInstructions] = useState(''); // Updates for propose, or instructions for create new

    // Request State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Output States
    const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
    const [proposal, setProposal] = useState<ContractProposal | null>(null);
    const [newContract, setNewContract] = useState<NewContract | null>(null);

    // Client Selector State
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch potential clients on load
    useState(() => {
        const fetchClients = async () => {
            try {
                const [leadRes, accRes] = await Promise.all([
                    api.get('/api/sales/leads'),
                    api.get('/api/sales/accounts')
                ]);
                
                const combined = [
                    ...(leadRes.data?.leads || []).map((l:any) => ({ id: l.id, name: `${l.name || l.leadName} (Lead)`, email: l.email })),
                    ...(accRes.data?.accounts || []).map((a:any) => ({ id: a.id, name: `${a.companyName || a.name || 'Account'} (Account)`, email: a.email }))
                ];
                setClients(combined);
            } catch (err) {}
        };
        fetchClients();
    });

    const handleAction = async () => {
        setError('');
        setLoading(true);
        setAnalysis(null);
        setProposal(null);
        setNewContract(null);

        try {
            if (mode === 'analyze') {
                if (!text.trim()) throw new Error('Please paste contract text first.');
                const res = await api.post('/api/sales/contracts/analyze', { text });
                setAnalysis(res.data.analysis);
            } else if (mode === 'propose') {
                if (!text.trim() || !instructions.trim()) throw new Error('Please provide both the original contract and your desired updates.');
                const res = await api.post('/api/sales/contracts/propose-updates', { text, updates: instructions });
                setProposal(res.data.proposal);
            } else if (mode === 'create') {
                if (!instructions.trim()) throw new Error('Please describe the contract you want to create.');
                const payload: any = { instructions };
                if (selectedClient) payload.clientId = selectedClient;
                const res = await api.post('/api/sales/contracts/create', payload);
                setNewContract(res.data.contract);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Operation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            
            {/* Header section with Supreme Court Lawyer Persona */}
            <div className="border-b pb-4 mb-6">
                <h1 className="text-3xl font-black text-gray-900 flex items-center tracking-tight">
                    <Scale className="w-8 h-8 mr-3 text-indigo-600" />
                    AI Legal Counsel & Contract Management
                </h1>
                <p className="text-gray-500 mt-2 font-medium max-w-3xl">
                    Powered by a simulated Supreme Court advocate model with 15+ years of corporate experience. Analyze contracts for hidden constraints, draft robust proposals, and generate new agreements seamlessly.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-2 bg-gray-100 p-1.5 rounded-2xl w-full sm:w-fit mb-6">
                <button 
                    onClick={() => setMode('analyze')}
                    className={clsx("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all", mode === 'analyze' ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700")}
                >
                    <FileText className="w-4 h-4" /> Analyze Contract
                </button>
                <button 
                    onClick={() => setMode('propose')}
                    className={clsx("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all", mode === 'propose' ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700")}
                >
                    <Edit3 className="w-4 h-4" /> Propose Updates
                </button>
                <button 
                    onClick={() => setMode('create')}
                    className={clsx("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all", mode === 'create' ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700")}
                >
                    <PlusCircle className="w-4 h-4" /> Create New
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side: Dynamic Inputs depending on mode */}
                <div className="w-full lg:w-5/12 flex flex-col space-y-4">
                    <div className="card p-5 flex flex-col flex-1 h-[600px] border border-gray-100 shadow-sm rounded-3xl">
                        
                        {mode === 'analyze' && (
                            <>
                                <label className="text-sm font-bold tracking-wide text-gray-700 mb-2">Target Contract Text</label>
                                <textarea
                                    className="input flex-1 resize-none text-sm p-4 font-mono mb-4 text-gray-600 bg-gray-50 border-gray-200 focus:bg-white rounded-2xl"
                                    placeholder="Paste MSA, SOW, or NDA text here..."
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                />
                            </>
                        )}

                        {mode === 'propose' && (
                            <>
                                <label className="text-sm font-bold tracking-wide text-gray-700 mb-2">Original Client Contract</label>
                                <textarea
                                    className="input h-[200px] resize-none text-sm p-3 font-mono mb-4 text-gray-600 bg-gray-50 border-gray-200 focus:bg-white rounded-2xl"
                                    placeholder="Paste the original contract elements here..."
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                />
                                <label className="text-sm font-bold tracking-wide text-gray-700 mb-2">Desired Master Updates/Clauses</label>
                                <textarea
                                    className="input flex-1 resize-none text-sm p-3 font-mono mb-4 text-gray-600 bg-gray-50 border-gray-200 focus:bg-white rounded-2xl"
                                    placeholder="Explain what changes are needed (e.g. 'Limit our liability to 10% of total deal value, add severability...')"
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                />
                            </>
                        )}

                        {mode === 'create' && (
                            <>
                                <label className="text-sm font-bold tracking-wide text-gray-700 mb-2">Target Client (Optional)</label>
                                <select 
                                    className="input text-sm p-3 font-medium mb-4 text-gray-600 bg-gray-50 border-gray-200 focus:bg-white rounded-xl"
                                    value={selectedClient}
                                    onChange={e => {
                                        setSelectedClient(e.target.value);
                                        const c = clients.find(c => c.id === e.target.value);
                                        if (c && c.email) setRecipientEmail(c.email);
                                    }}
                                >
                                    <option value="">-- Do not tag a client --</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>

                                <label className="text-sm font-bold tracking-wide text-gray-700 mb-2">Contract Requirements & Context</label>
                                <textarea
                                    className="input flex-1 resize-none text-sm p-4 font-mono mb-4 text-gray-600 bg-gray-50 border-gray-200 focus:bg-white rounded-2xl"
                                    placeholder="Detail what type of agreement is needed, who the parties are, deal value, and specific legal priorities to protect your firm..."
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                />
                            </>
                        )}

                        <div className="flex justify-between items-center bg-white pt-2">
                            <span className="text-xs font-semibold text-gray-400">
                                {mode === 'analyze' ? `${text.length} chars` : (mode === 'propose' ? 'Dual context required' : `${instructions.length} chars`)}
                            </span>
                            <button
                                onClick={handleAction}
                                disabled={loading || (mode === 'analyze' && !text) || (mode === 'propose' && (!text || !instructions)) || (mode === 'create' && !instructions)}
                                className="btn-primary flex items-center gap-2 rounded-xl text-sm px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25"
                            >
                                {loading ? <Cpu className="w-4 h-4 animate-pulse" /> : <Sparkles className="w-4 h-4" />}
                                {loading ? 'Processing...' : (
                                    mode === 'analyze' ? 'Analyze Risk' : (mode === 'propose' ? 'Generate Proposal' : 'Draft Contract')
                                )}
                            </button>
                        </div>
                        {error && <p className="text-xs text-red-600 font-bold mt-3 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                    </div>
                </div>

                {/* Right Side: Outputs */}
                <div className="w-full lg:w-7/12 flex flex-col space-y-4">
                    <div className={clsx("card p-6 flex flex-col flex-1 border border-gray-100 shadow-sm rounded-3xl min-h-[600px]", (!analysis && !proposal && !newContract) && !loading && "bg-gray-50/50 justify-center items-center border-dashed border-2")}>
                        
                        {/* Placeholder State */}
                        {(!analysis && !proposal && !newContract) && !loading && (
                            <div className="text-center text-gray-400 max-w-sm">
                                <Scale className="w-16 h-16 mx-auto mb-5 text-indigo-200" />
                                <h3 className="text-lg font-bold text-gray-600 mb-2">Awaiting Instructions</h3>
                                <p className="text-sm font-medium">Equipped with 15 years of corporate legal expertise. Submit text or parameters on the left to extract obligations, flag hidden constraints, or formulate water-tight templates.</p>
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="space-y-6 animate-pulse p-4">
                                <div className="h-6 bg-gray-200 rounded w-1/2 mb-8"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-24 bg-gray-100 rounded-2xl"></div>
                                    <div className="h-24 bg-gray-100 rounded-2xl"></div>
                                </div>
                                <div className="h-40 bg-gray-100 rounded-2xl"></div>
                                <div className="h-40 bg-indigo-50 rounded-2xl"></div>
                            </div>
                        )}

                        {/* Mode: Analyze Output */}
                        {analysis && !loading && mode === 'analyze' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="border-b border-gray-100 pb-4">
                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 mb-3 inline-block shadow-sm">Legal Review Complete</span>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{analysis.title || 'Extracted Document Terms'}</h2>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        <h4 className="text-xs uppercase font-black tracking-widest text-gray-400 mb-2">Deal Exposure Value</h4>
                                        <p className="text-xl font-black text-emerald-600">{analysis.value || 'Not Specified'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        <h4 className="text-xs uppercase font-black tracking-widest text-gray-400 mb-2">Agreed Timeline</h4>
                                        <div className="text-sm flex flex-col gap-1 text-gray-700 font-medium">
                                            <span><strong>Start Date:</strong> {analysis.dates?.effectiveDate || 'N/A'}</span>
                                            <span><strong>End Date:</strong> {analysis.dates?.expirationDate || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs uppercase font-black tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Parties Involved
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(analysis.parties || []).map((p, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-700">{p}</span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs uppercase font-black tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                        <Target className="w-4 h-4 text-blue-500" /> Core Obligations
                                    </h4>
                                    <ul className="space-y-2">
                                        {(analysis.keyObligations || []).map((ob, i) => (
                                            <li key={i} className="text-sm font-medium text-gray-700 flex items-start gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                                {ob}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-orange-50 border-2 border-orange-100 p-5 rounded-2xl shadow-sm">
                                    <h4 className="text-sm uppercase font-black tracking-widest text-orange-600 mb-4 flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-orange-500" /> Potential Constraints & Hidden Terms
                                    </h4>
                                    {(analysis.risks && analysis.risks.length > 0) ? (
                                        <ul className="space-y-3">
                                            {analysis.risks.map((risk, i) => (
                                                <li key={i} className="text-sm font-bold text-orange-800 flex items-start gap-3 bg-white p-3 rounded-xl shadow-sm border border-orange-50">
                                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
                                                    <span>{risk}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-50 flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            <p className="text-sm font-bold text-emerald-700">No major anomalies or hidden constraints identified for this document.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Mode: Propose Updates Output */}
                        {proposal && !loading && mode === 'propose' && (
                            <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-2">
                                <div className="border-b border-indigo-100 pb-4">
                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-700 mb-3 inline-block shadow-sm">Review Changes</span>
                                    <h2 className="text-2xl font-black text-gray-900">Advocate Proposal Strategy</h2>
                                </div>
                                
                                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
                                    <h4 className="text-xs uppercase font-black tracking-widest text-indigo-800 mb-2">Legal Rationale / Strategic Changes</h4>
                                    <p className="text-sm font-medium text-indigo-900 whitespace-pre-wrap leading-relaxed">{proposal.proposedChanges}</p>
                                </div>

                                <div className="flex-1 min-h-[300px] flex flex-col border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="bg-gray-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Updated Contract Clause(s)
                                    </div>
                                    <textarea 
                                        className="w-full flex-1 p-4 text-sm font-mono text-gray-700 leading-relaxed bg-white resize-none focus:outline-none"
                                        readOnly
                                        value={proposal.updatedContractText}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Mode: Create Output */}
                        {newContract && !loading && mode === 'create' && (
                            <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-2">
                                <div className="border-b border-emerald-100 pb-4 flex justify-between items-end">
                                    <div>
                                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 mb-3 inline-block shadow-sm">Generated Documentation</span>
                                        <h2 className="text-2xl font-black text-gray-900">{newContract.contractTitle}</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            disabled={actionLoading}
                                            onClick={async () => {
                                                try {
                                                    setActionLoading(true);
                                                    const res = await api.post('/api/sales/contracts/pdf', {
                                                        contractTitle: newContract.contractTitle,
                                                        contractText: newContract.contractText,
                                                        clientId: selectedClient
                                                    }, { responseType: 'blob' });
                                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.setAttribute('download', `${newContract.contractTitle.replace(/\s+/g, '_')}.pdf`);
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    link.remove();
                                                } catch(e:any) {
                                                    alert('Failed to download PDF.');
                                                } finally {
                                                    setActionLoading(false);
                                                }
                                            }}
                                            className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            Download PDF
                                        </button>
                                        <div className="relative flex items-center group">
                                            <input 
                                                type="email" 
                                                placeholder="Recipient email..."
                                                value={recipientEmail}
                                                onChange={e => setRecipientEmail(e.target.value)}
                                                className="text-xs px-3 py-2 border border-r-0 rounded-l-xl focus:outline-none focus:ring-1 border-emerald-200 w-40"
                                            />
                                            <button 
                                                disabled={actionLoading || !recipientEmail}
                                                onClick={async () => {
                                                    try {
                                                        setActionLoading(true);
                                                        await api.post('/api/sales/contracts/send-pdf', {
                                                            contractTitle: newContract.contractTitle,
                                                            contractText: newContract.contractText,
                                                            clientId: selectedClient,
                                                            email: recipientEmail
                                                        });
                                                        alert('Contract emailed successfully!');
                                                    } catch(e:any) {
                                                        alert(e.response?.data?.error || 'Failed to email contract.');
                                                    } finally {
                                                        setActionLoading(false);
                                                    }
                                                }}
                                                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-r-xl transition-colors disabled:opacity-50 flex items-center"
                                            >
                                                <Send className="w-3 h-3 mr-1" /> Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-h-[400px] flex flex-col border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                    <textarea 
                                        className="w-full flex-1 p-5 text-sm font-mono text-gray-800 leading-relaxed bg-yellow-50/10 resize-none focus:outline-none"
                                        readOnly
                                        value={newContract.contractText}
                                    />
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
