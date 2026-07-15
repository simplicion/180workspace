'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
    Users, Search, Mail, Phone, Building2, ChevronRight, Plus, Trash2, Edit, MessageSquare, AlertTriangle
} from 'lucide-react';
import { Skeleton } from "@workspace/ui";
import Link from 'next/link';
import AddContactModal from '@/app/dashboard/(dashboard)/_components/AddContactModal';
import { ConfirmModal } from "@workspace/ui";
import toast from 'react-hot-toast';

export default function ContactsPage() {
    const { user } = useAuth();
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const fetchContacts = () => {
        setLoading(true);
        api.get('/api/sales/contacts')
            .then(({ data }) => setContacts(data.contacts || data))
            .catch(() => setError('Failed to load contacts'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const handleDeleteContact = (id: string, name: string) => {
        setConfirmState({
            open: true,
            title: 'Delete Contact?',
            message: `Are you sure you want to delete "${name}"? This will remove them from their associated account.`,
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    await api.delete(`/api/sales/contacts/${id}`);
                    toast.success('Contact removed');
                    fetchContacts();
                } catch (error) {
                    toast.error('Failed to delete contact');
                } finally {
                    setIsDeleting(false);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const filteredContacts = contacts.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.accountId?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <AddContactModal 
                isOpen={isAddModalOpen || !!editingContact}
                onClose={() => { setIsAddModalOpen(false); setEditingContact(null); }}
                onSuccess={fetchContacts}
                contact={editingContact}
            />

            <ConfirmModal 
                isOpen={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                variant="danger"
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
                loading={isDeleting}
            />

            <div className="page-header flex justify-between items-start">
                <div>
                    <h1 className="page-title text-indigo-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-600" />
                        Contacts Directory
                    </h1>
                    <p className="page-subtitle mt-1">Manage people, track communication history, and manage relationships.</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5"
                >
                    <Plus className="w-4 h-4" />
                    New Contact
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-100 italic">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-4">
                <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                    <div className="relative max-w-sm w-full group">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or company..."
                            className="input pl-10 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 font-mono">
                                <th className="p-4">Contact Name</th>
                                <th className="p-4">Account</th>
                                <th className="p-4">Contact Info</th>
                                <th className="p-4">Last Contacted</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="p-4"><Skeleton variant="text" width="180px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="140px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="160px" /></td>
                                        <td className="p-4"><Skeleton variant="text" width="100px" /></td>
                                        <td className="p-4"></td>
                                    </tr>
                                ))
                            ) : filteredContacts.length > 0 ? (
                                filteredContacts.map(contact => (
                                    <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                                                    {(contact.name || 'C').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{contact.name}</div>
                                                    {contact.role && <div className="text-[10px] font-black uppercase tracking-tight text-gray-400">{contact.role}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                                {contact.accountId?.companyName || 'â€”'}
                                            </div>
                                        </td>
                                        <td className="p-4 space-y-1">
                                            {contact.email && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                    <a href={`mailto:${contact.email}`} className="hover:text-indigo-600 hover:underline">{contact.email}</a>
                                                </div>
                                            )}
                                            {contact.phone && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                    <a href={`tel:${contact.phone}`} className="hover:text-indigo-600 hover:underline">{contact.phone}</a>
                                                </div>
                                            )}
                                            {!contact.email && !contact.phone && <span className="text-xs text-gray-400 italic">â€” No details</span>}
                                        </td>
                                        <td className="p-4 text-xs text-gray-600 font-medium">
                                            {contact.lastContacted ? new Date(contact.lastContacted).toLocaleDateString() : (
                                                <span className="text-gray-400 italic">Never</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1 px-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <a 
                                                    href={`mailto:${contact.email}`}
                                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                    title="Send Email"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </a>
                                                <button 
                                                    onClick={() => setEditingContact(contact)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Edit Contact"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteContact(contact.id, contact.name)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete Contact"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <div className="w-px h-4 bg-gray-200 mx-1" />
                                                <Link href={`/dashboard/sales/contacts/${contact.id}`} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1 group/btn">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Profile</span>
                                                    <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        <Users className="w-8 h-8 opacity-20 mx-auto mb-3" />
                                        No contacts found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

