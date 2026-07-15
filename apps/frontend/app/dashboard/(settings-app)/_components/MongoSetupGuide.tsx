'use client';

import { Database, Info } from 'lucide-react';

interface MongoSetupGuideProps {
    show: boolean;
    onClose: () => void;
    platformName?: string;
}

export default function MongoSetupGuide({ show, onClose, platformName = 'Platform' }: MongoSetupGuideProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300 border border-slate-100">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Database className="w-6 h-6 text-emerald-600" /> MongoDB Atlas Setup Guide
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-white hover:bg-slate-100 rounded-full p-2 border border-slate-200 shadow-sm">
                        ✕
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                    {/* Step 1: Create Cluster */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                            Create a Free Cluster
                        </h4>
                        <div className="pl-8 text-sm text-slate-600 space-y-2">
                            <p>1. Go to <a href="https://cloud.mongodb.com/v2" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">cloud.mongodb.com/v2</a> and sign in.</p>
                            <p>2. Create a new Project, then click <strong>Build a Database</strong>.</p>
                            <p>3. Choose the <strong>Free M0</strong> tier and click Create.</p>
                        </div>
                    </div>

                    {/* Step 2: Database User */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                            Create Database User Credentials
                        </h4>
                        <div className="pl-8 text-sm text-slate-600 space-y-2">
                            <p>1. Under Security in the left sidebar, click <strong>Database Access</strong>.</p>
                            <p>2. Click <span className="inline-block bg-emerald-500 text-white px-2 py-0.5 rounded text-xs">Add New Database User</span>.</p>
                            <p>3. Select <strong>Password</strong> for the authentication method.</p>
                            <p>4. Type a Username (e.g., <code>db_admin</code>) and a strong Password.</p>
                            <p>5. Click <strong>Add User</strong>. <span className="text-amber-600 font-medium">Use these exact credentials in our {platformName} form.</span></p>
                        </div>
                    </div>

                    {/* Step 3: Network Access (IP Whitelist) */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                            Allow Network Access (IP Whitelist)
                        </h4>
                        <div className="pl-8 text-sm text-slate-600 space-y-2">
                            <p>1. Go to <a href="https://cloud.mongodb.com/v2/console/security/network" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">Network Access</a> (under Security in the left sidebar).</p>
                            <p>2. Click <span className="inline-block bg-emerald-500 text-white px-2 py-0.5 rounded text-xs">Add IP Address</span>.</p>
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl my-2">
                                <p className="font-semibold text-amber-900">Important: Platform Connectivity</p>
                                <p className="mt-1">To allow connections from our platform, you must allow access from anywhere. Click the <strong>&quot;Allow Access from Anywhere&quot;</strong> button. This will automatically fill the IP field with: <code className="bg-white border text-rose-600 border-amber-300 px-1.5 py-0.5 rounded">0.0.0.0/0</code></p>
                            </div>
                            <p>3. Click <strong>Confirm</strong>. <span className="text-slate-500 italic">Wait about 30-60 seconds for the status to change from &quot;Pending&quot; to &quot;Active&quot;.</span></p>
                        </div>
                    </div>

                    {/* Step 4: Get Cluster URL */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                            Get your Cluster URL
                        </h4>
                        <div className="pl-8 text-sm text-slate-600 space-y-2">
                            <p>1. Click <strong>Database</strong> in the top left sidebar to see your clusters.</p>
                            <p>2. Click the <strong>Connect</strong> button next to your cluster.</p>
                            <p>3. Choose <strong>Drivers</strong> (Connect to your application).</p>
                            <p>4. You will see a connection string that looks like this:<br />
                                <code className="block mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] break-all text-slate-800 font-mono">mongodb+srv://&lt;username&gt;:&lt;password&gt;@<span className="bg-indigo-100 text-indigo-900 px-1 rounded font-bold">cluster.xyz.mongodb.net</span>/?retryWrites=true&w=majority</code>
                            </p>
                            <p>5. Copy the connection string and paste it straight into the <strong>Database Connection URI</strong> field.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition-all active:scale-95">
                        I understand, close guide
                    </button>
                </div>
            </div>
        </div>
    );
}
