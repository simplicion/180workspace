'use client';

import { FileText, Mail, Phone, Users } from 'lucide-react';
import clsx from 'clsx';
import { Drawer } from "@/components/ui/Drawer";

const STAGE_COLORS: Record<string, string> = {
    applied: 'badge-gray', screening: 'badge-blue', interview: 'badge-orange',
    offer: 'badge-purple', hired: 'badge-green', rejected: 'badge-red',
};

interface ApplicationDetailDrawerProps {
    app: any;
    onClose: () => void;
}

export default function ApplicationDetailDrawer({ app, onClose }: ApplicationDetailDrawerProps) {
    if (!app) return null;

    return (
        <Drawer 
            open={!!app} 
            onClose={onClose} 
            title={app.applicantName || app.name} 
            icon={<Users className="w-5 h-5 text-indigo-600" />}
            size="md"
        >
            <div className="flex flex-col h-full">
                {/* Header Info */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <span className={clsx('badge text-[10px] px-2 py-0.5 uppercase font-bold tracking-wider', STAGE_COLORS[app.status])}>
                            {app.status}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">Applied on {new Date(app.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Contact Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 group">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Email Address</p>
                                    <p className="text-sm font-semibold text-gray-700 truncate">{app.applicantEmail || app.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 group">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Phone Number</p>
                                    <p className="text-sm font-semibold text-gray-700">{app.applicantPhone || app.phone || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center gap-4 bg-gray-50/50 rounded-2xl p-5 border border-dashed border-gray-200">
                            <p className="text-xs text-gray-500 font-medium text-center">Resume & Documents</p>
                            {app.resumeUrl ? (
                                <a
                                    href={app.resumeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-indigo-600 hover:shadow-md hover:border-indigo-100 transition-all active:scale-95"
                                >
                                    <FileText className="w-4 h-4" /> View Resume
                                </a>
                            ) : (
                                <div className="text-center py-2 text-xs text-gray-400 italic">No resume uploaded</div>
                            )}
                        </div>
                    </div>

                    {/* Custom Fields Section */}
                    {app.customFields && Object.keys(app.customFields).length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-600 pl-3">Additional Information</h4>
                            <div className="grid grid-cols-1 gap-4">
                                {Object.entries(app.customFields).map(([key, val]) => (
                                    <div key={key} className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100/50">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                                            {String(val) || <span className="text-gray-300 italic">N/A</span>}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="pt-6 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 italic">
                        <span>Application ID: {app.id}</span>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Change status in Kanban list</span>
                    <button onClick={onClose} className="btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </Drawer>
    );
}
