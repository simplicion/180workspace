'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useRef, useState, FormEvent, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { MessageSquare, Send, Search, Users, Plus, CheckCheck, X, Hash, Settings, UserPlus, Trash2, Reply, Pin, MoreVertical, AtSign, Smile, Bell, BellOff, Shield, ChevronDown, LogOut, Menu, Video, Phone, Rocket, BarChart2, Target, Lightbulb, Flame, Zap, Star, Megaphone, Wrench, PartyPopper, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { format, isToday, isYesterday } from 'date-fns';
import { useSettings } from '@/lib/settings-context';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface User { _id?: string; id?: string; name?: string; email?: string; photoUrl?: string; role?: string; companyId?: string; }
interface Message { id?: string;
    _id: string; chatId: string;
    senderId: User;
    content: string; attachmentUrl?: string;
    readBy: string[]; createdAt: string;
    replyTo?: { _id: string; content: string; senderId: User };
    mentions?: User[];
    reactions?: Record<string, string[]>;
    isSystem?: boolean; deletedAt?: string | null;
}
interface Chat { id?: string;
    _id: string; name?: string; description?: string; avatar?: string;
    isGroup: boolean;
    members: User[]; admins?: User[];
    lastMessage?: Message; lastActivity?: string;
    pinnedMessages?: string[];
    createdBy?: string;
}

function IncomingCallOverlay({ call, onAccept, onReject }: { call: any; onAccept: () => void; onReject: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] bg-indigo-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center space-y-6 transform animate-in zoom-in-95 duration-300">
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                    <Avatar user={call.caller} size="lg" />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 border-4 border-white">
                        {call.type === 'video' ? <Video className="w-4 h-4 text-white" /> : <Phone className="w-4 h-4 text-white" />}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{call.caller.name}</h3>
                    <p className="text-gray-500 mt-1">Incoming {call.type} call...</p>
                    {call.chatName && <p className="text-xs text-indigo-500 font-medium mt-2 bg-indigo-50 inline-block px-3 py-1 rounded-full">{call.chatName}</p>}
                </div>
                <div className="flex gap-4 pt-4">
                    <button onClick={onReject} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-2xl transition-all flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-200">
                            <X className="w-6 h-6" />
                        </div>
                        <span className="text-xs uppercase tracking-wider">Decline</span>
                    </button>
                    <button onClick={onAccept} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold py-4 rounded-2xl transition-all flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200 animate-bounce">
                            {call.type === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                        </div>
                        <span className="text-xs uppercase tracking-wider">Accept</span>
                    </button>
                </div>
            </div>
            {/* Audio element for ringtone */}
            <audio autoPlay loop src="/ringtone.mp3" className="hidden" />
        </div>
    );
}

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '✅', '🎉'];

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
}

const GROUP_ICONS = [
    { id: 'messagesquare', icon: MessageSquare }, { id: 'rocket', icon: Rocket },
    { id: 'barchart2', icon: BarChart2 }, { id: 'target', icon: Target },
    { id: 'lightbulb', icon: Lightbulb }, { id: 'flame', icon: Flame },
    { id: 'zap', icon: Zap }, { id: 'star', icon: Star },
    { id: 'megaphone', icon: Megaphone }, { id: 'wrench', icon: Wrench },
    { id: 'partypopper', icon: PartyPopper }, { id: 'users', icon: Users }
];

function Avatar({ user, size = 'md', emoji, iconName }: { user?: any; size?: 'sm' | 'md' | 'lg'; emoji?: string; iconName?: string }) {
    const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
    if (emoji) return <div className={clsx('rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0', sz)}>{emoji}</div>;

    if (iconName) {
        // Find icon component or fallback to MessageSquare
        const IconMapping = GROUP_ICONS.find(i => i.id === iconName)?.icon || MessageSquare;
        return (
            <div className={clsx('rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-500', sz)}>
                <IconMapping className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
            </div>
        );
    }

    return (
        <div className={clsx('rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0 font-bold text-white', sz)}>
            {user?.photoUrl
                ? <img src={user.photoUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                : user?.name?.[0]?.toUpperCase() || '?'}
        </div>
    );
}

function RoleBadge({ role }: { role: string }) {
    const c: Record<string, string> = { admin: 'bg-red-50 text-red-600', client: 'bg-amber-50 text-amber-600', hr: 'bg-purple-50 text-purple-600', manager: 'bg-blue-50 text-blue-600', employee: 'bg-gray-50 text-gray-600' };
    return <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide', c[role] || c.employee)}>{role}</span>;
}

// ── New Chat / Group Modal ────────────────────────────────────────────────────
function NewChatModal({ onClose, onChatCreated, currentUser }: { onClose: () => void; onChatCreated: (c: Chat) => void; currentUser: User }) {
    const [mode, setMode] = useState<'dm' | 'group'>('dm');
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [groupIconStr, setGroupIconStr] = useState(GROUP_ICONS[0].id);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const isAdminOrHR = currentUser.role === 'admin' || currentUser.role === 'ceo' || ((currentUser as any).permissions && ((currentUser as any).permissions.includes('can_manage_team') || (currentUser as any).permissions.includes('can_manage_hr')));

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersRes, clientsRes] = await Promise.all([
                    api.get('/api/users', { params: { limit: 200 } }).catch(() => ({ data: { users: [] } })),
                    api.get('/api/clients', { params: { limit: 200 } }).catch(() => ({ data: { clients: [] } }))
                ]);
                const allUsers = usersRes.data.users || [];
                const allClients = (clientsRes.data.clients || []).map((c: any) => ({
                    _id: c._id,
                    name: c.name,
                    email: c.email,
                    photoUrl: c.logoUrl,
                    role: 'client'
                }));
                const combined = [...allUsers, ...allClients];
                setUsers(combined.filter((u: User) => (u._id || u.id) !== (currentUser._id || currentUser.id)));
            } catch (err: any) {
                console.error('Error fetching chat users:', err);
                toast.error('Failed to load users for chat');
            } finally {
                setFetching(false);
            }
        };
        fetchData();
    }, [(currentUser._id || currentUser.id)]);


    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    );

    function toggle(id: string) {
        if (mode === 'dm') { setSelected([id]); return; }
        setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    }

    async function handleCreate() {
        if (selected.length === 0) return toast.error('Select at least one user');
        if (mode === 'group' && !groupName.trim()) return toast.error('Group name is required');
        setLoading(true);
        try {
            const payload = mode === 'dm'
                ? { memberId: selected[0] }
                : { isGroup: true, name: groupName.trim(), description: groupDesc, avatar: groupIconStr, memberIds: selected };
            const res = await api.post('/api/chat', payload);
            onChatCreated(res.data.chat);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create chat');
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <h2 className="font-bold text-gray-900">New Conversation</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label="Close modal"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* DM / Group toggle */}
                    {isAdminOrHR && (
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => { setMode('dm'); setSelected([]); }} className={clsx('flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2', mode === 'dm' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                                <MessageSquare className="w-4 h-4" /> Direct Message
                            </button>
                            <button onClick={() => { setMode('group'); setSelected([]); }} className={clsx('flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2', mode === 'group' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                                <Users className="w-4 h-4" /> Create Group
                            </button>
                        </div>
                    )}

                    {/* Group fields */}
                    {mode === 'group' && (
                        <div className="space-y-3">
                            <div>
                                <label className="label">Group Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {GROUP_ICONS.map(e => (
                                        <button key={e.id} type="button" onClick={() => setGroupIconStr(e.id)}
                                            aria-label={`Select ${e.id} icon`}
                                            className={clsx('w-9 h-9 text-indigo-600 rounded-xl text-xl flex items-center justify-center border-2 transition-all', groupIconStr === e.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300')}>
                                            <e.icon className="w-4 h-4" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <label htmlFor="groupName" className="label">Group Name *</label>
                                <input id="groupName" className="input" placeholder="e.g. Design Team, Sprint 12..." value={groupName} onChange={e => setGroupName(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="groupDesc" className="label">Description</label>
                                <input id="groupDesc" className="input" placeholder="What's this group about?" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input aria-label="Search users" className="input pl-8 text-sm" placeholder="Search by name, email, or role..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    {mode === 'group' && selected.length > 0 && (
                        <p className="text-xs text-indigo-600 font-medium">{selected.length} member{selected.length > 1 ? 's' : ''} selected</p>
                    )}

                    {/* User list */}
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                        {fetching ? (
                            <div className="flex items-center justify-center py-6"><LogoLoader className="w-5 h-5 animate-spin text-indigo-400" /></div>
                        ) : filtered.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-6">No users found</p>
                        ) : filtered.map(u => {
                            const isSelected = selected.includes((u._id || u.id));
                            return (
                                <button key={(u._id || u.id)} onClick={() => toggle((u._id || u.id))}
                                    className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all', isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent')}>
                                    <div className="w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all">
                                        {isSelected && <CheckCheck className="w-3 h-3 text-white" />}
                                    </div>
                                    <Avatar user={u} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                    </div>
                                    <RoleBadge role={u.role} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                    <button onClick={handleCreate} disabled={loading || selected.length === 0} className="btn-primary w-full">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : mode === 'dm' ? <MessageSquare className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        {loading ? 'Creating...' : mode === 'dm' ? 'Open Chat' : `Create Group (${selected.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Group Info Panel ──────────────────────────────────────────────────────────
function GroupInfoPanel({ chat, currentUser, onClose, onUpdated }: { chat: Chat; currentUser: User; onClose: () => void; onUpdated: () => void }) {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [adding, setAdding] = useState(false);
    const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
    const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'ceo' || ((currentUser as any)?.permissions && (currentUser as any).permissions.includes('can_manage_team'));

    useEffect(() => {
        Promise.all([
            api.get('/api/users', { params: { limit: 200 } }).catch(() => ({ data: { users: [] } })),
            api.get('/api/clients', { params: { limit: 200 } }).catch(() => ({ data: { clients: [] } }))
        ]).then(([usersRes, clientsRes]) => {
            const allUsers = usersRes.data.users || [];
            const allClients = (clientsRes.data.clients || []).map((c: any) => ({
                _id: c._id,
                name: c.name,
                email: c.email,
                photoUrl: c.logoUrl,
                role: 'client'
            }));
            const combined = [...allUsers, ...allClients];
            const memberIds = chat.members.map(m => m._id || (m._id || m.id));
            setUsers(combined.filter((u: User) => !memberIds.includes(u._id || (u._id || u.id))));
        })
            .catch(() => { });
    }, [chat.members]);

    async function addMembers() {
        if (!selectedToAdd.length) return;
        try {
            await api.post(`/api/chat/${chat._id}/members`, { memberIds: selectedToAdd });
            toast.success('Members added!');
            setAdding(false);
            setSelectedToAdd([]);
            onUpdated();
        } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
    }

    async function removeMember() {
        if (!memberToRemove) return;
        try {
            await api.delete(`/api/chat/${chat._id}/members/${memberToRemove}`);
            toast.success('Member removed');
            onUpdated();
        } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
        setMemberToRemove(null);
    }

    return (
        <div className="w-72 border-l border-gray-100 flex flex-col bg-white">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">Group Info</h3>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100" aria-label="Close group info"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-indigo-200">
                    <div className="w-20 h-20 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center mb-3 shadow-inner">
                        <Avatar iconName={chat.avatar || 'messagesquare'} size="lg" />
                    </div>
                    <h3 className="text-xl font-bold text-white text-center">{chat.name}</h3>
                    {chat.description && <p className="text-indigo-100 text-sm text-center mt-1 max-w-xs">{chat.description}</p>}
                    <p className="text-indigo-200 text-xs mt-3 flex items-center gap-1"><Users className="w-3 h-3" /> {chat.members.length} members</p>
                </div>

                {/* Members */}
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Members</p>
                    <div className="space-y-1">
                        {chat.members.map(m => (
                            <div key={(m._id || m.id)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 group">
                                <Avatar user={m} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-800 truncate">{m.name}{(m._id || m.id) === (currentUser._id || currentUser.id) && ' (You)'}</p>
                                    <p className="text-[10px] text-gray-400">{m.role}</p>
                                </div>
                                {chat.admins?.some(a => a.id === (m._id || m.id)) && (
                                    <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">Admin</span>
                                )}
                                {isAdmin && (m._id || m.id) !== (currentUser._id || currentUser.id) && (
                                    <button onClick={() => setMemberToRemove((m._id || m.id))} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600" aria-label={`Remove ${m.name}`}>
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add members */}
                {isAdmin && (
                    <div>
                        {!adding ? (
                            <button onClick={() => setAdding(true)} className="w-full flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium py-2">
                                <UserPlus className="w-4 h-4" /> Add Members
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <input aria-label="Search users to add" className="input text-xs py-1.5" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {users.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
                                        <button key={(u._id || u.id)} onClick={() => setSelectedToAdd(p => p.includes((u._id || u.id)) ? p.filter(x => x !== (u._id || u.id)) : [...p, (u._id || u.id)])}
                                            className={clsx('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs', selectedToAdd.includes((u._id || u.id)) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700')}>
                                            <Avatar user={u} size="sm" />
                                            <span className="truncate">{u.name}</span>
                                            <RoleBadge role={u.role} />
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setAdding(false); setSelectedToAdd([]); }} className="btn-secondary text-xs flex-1 py-1.5">Cancel</button>
                                    <button onClick={addMembers} disabled={!selectedToAdd.length} className="btn-primary text-xs flex-1 py-1.5">Add {selectedToAdd.length > 0 ? `(${selectedToAdd.length})` : ''}</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Remove Member Confirmation Modal */}
            {memberToRemove && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Remove Member?</h3>
                            <p className="text-sm text-gray-500 text-center">Are you sure you want to remove this user from the group? They will no longer see new messages.</p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex gap-3">
                            <button onClick={() => setMemberToRemove(null)} className="btn-secondary flex-1 py-2 rounded-xl text-gray-700 bg-white border-gray-200">
                                Cancel
                            </button>
                            <button onClick={removeMember} className="btn-primary flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white border-transparent">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Chat Page ────────────────────────────────────────────────────────────
export default function ChatPage({ mobileLayout = false }: { mobileLayout?: boolean }) {
    const { platform } = useSettings();
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><LogoLoader className="w-10 h-10 animate-spin text-indigo-500" /></div>}>
            <ChatPageContent platform={platform} mobileLayout={mobileLayout} />
        </Suspense>
    );
}

function ChatPageContent({ platform, mobileLayout }: { platform: any, mobileLayout?: boolean }) {
    const { user, company } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const userIdQuery = searchParams.get('userId');
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const activeChatRef = useRef<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [emojiPicker, setEmojiPicker] = useState<string | null>(null); // messageId
    const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [clientChatAllowed, setClientChatAllowed] = useState(true);
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [sidebarMinimized, setSidebarMinimized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeout = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const socket = getSocket();
    const isAdmin = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'));
    const [allUsers, setAllUsers] = useState<User[]>([]);

    // Load chats & settings
    useEffect(() => {
        api.get('/api/chat').then(({ data }) => {
            const uniqueChats: Chat[] = [];
            const seenUsers = new Set<string>();
            for (const c of data.chats) {
                if (c.isGroup) {
                    uniqueChats.push(c);
                } else {
                    const otherId = c.members.find((m: User) => (m._id || m.id) !== (user?._id || user?.id))?._id || c.members.find((m: User) => (m._id || m.id) !== (user?._id || user?.id))?.id;
                    if (otherId && !seenUsers.has(otherId)) {
                        seenUsers.add(otherId);
                        uniqueChats.push(c);
                    } else if (!otherId) {
                        uniqueChats.push(c);
                    }
                }
            }
            setChats(uniqueChats);
        }).finally(() => setLoadingChats(false));
        api.get('/api/chat/settings').then(r => setClientChatAllowed(r.data.employeeClientChatAllowed)).catch(() => { });

        // Fetch all users for mentions globally
        Promise.all([
            api.get('/api/users', { params: { limit: 200 } }).catch(() => ({ data: { users: [] } })),
            api.get('/api/clients', { params: { limit: 200 } }).catch(() => ({ data: { clients: [] } }))
        ]).then(([usersRes, clientsRes]) => {
            const allUsersData = usersRes.data.users || [];
            const allClientsData = (clientsRes.data.clients || []).map((c: any) => ({
                _id: c._id,
                name: c.name,
                email: c.email,
                photoUrl: c.logoUrl,
                role: 'client'
            }));
            setAllUsers([...allUsersData, ...allClientsData]);
        }).catch(() => { });
    }, []);

    // Auto-open or create chat with userIdQuery
    useEffect(() => {
        if (loadingChats || !userIdQuery || !user) return;
        const autoStartChat = async () => {
            const existingChat = chats.find(c => !c.isGroup && c.members.some(m => (m._id || m.id) === userIdQuery));
            if (existingChat) {
                selectChat(existingChat);
            } else {
                try {
                    const { data } = await api.post('/api/chat', { memberId: userIdQuery });
                    setChats(prev => [data.chat, ...prev]);
                    selectChat(data.chat);
                } catch (err) {
                    toast.error('Could not auto-start chat');
                }
            }
            router.replace(pathname || '/dashboard/chat'); // Clear query param
        };
        autoStartChat();
    }, [loadingChats, userIdQuery, user, chats]);

    // Socket events
    useEffect(() => {
        if (!socket) return;
        socket.on('chat:message', (msg: Message) => {
            console.log('[Socket] Received message:', msg);
            setChats(prev => prev.map(c => c._id === msg.chatId ? { ...c, lastMessage: msg, lastActivity: msg.createdAt } : c));
            
            // Use ref to avoid stale closure
            const currentActiveChat = activeChatRef.current;
            
            setMessages(prev => {
                // If the message is for the chat we're currently looking at
                if (currentActiveChat && msg.chatId === currentActiveChat._id) {
                    return prev.find(m => (m._id || m.id) === msg._id) ? prev : [...prev, msg];
                }
                return prev;
            });
            if (currentActiveChat && msg.chatId === currentActiveChat._id) {
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            }
        });
        socket.on('chat:typing', ({ userId }: { userId: string }) => setTypingUsers(p => p.includes(userId) ? p : [...p, userId]));
        socket.on('chat:stop_typing', ({ userId }: { userId: string }) => setTypingUsers(p => p.filter(id => id !== userId)));
        socket.on('user:online', ({ userId }: { userId: string }) => setOnlineUsers(p => new Set([...p, userId])));
        socket.on('user:offline', ({ userId }: { userId: string }) => setOnlineUsers(p => { const s = new Set(p); s.delete(userId); return s; }));

        // Call signaling
        socket.on('call:request', (data) => {
            setIncomingCall(data);
        });

        socket.on('call:response', ({ accepted, roomId, callerId }) => {
            if (accepted) {
                router.push(`/dashboard/meeting/${roomId}`);
            } else if (callerId === (user?._id || user?.id)) {
                toast.error('Call rejected');
            }
        });

        return () => {
            socket.off('chat:message');
            socket.off('chat:typing');
            socket.off('chat:stop_typing');
            socket.off('user:online');
            socket.off('user:offline');
            socket.off('call:request');
            socket.off('call:response');
        };
    }, [(user?._id || user?.id)]);

    const selectChat = async (chat: Chat) => {
        if (activeChat) socket.emit('chat:leave', { chatId: activeChat._id });
        setActiveChat(chat);
        activeChatRef.current = chat;
        setMessages([]);
        setReplyTo(null);
        setShowGroupInfo(false);
        setLoadingMessages(true);
        socket.emit('chat:join', { chatId: chat._id });
        socket.emit('chat:read', { chatId: chat._id });
        try {
            const { data } = await api.get(`/api/chat/${chat._id}/messages`);
            setMessages(data.messages);
        } finally {
            setLoadingMessages(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };

    const sendMessage = (e: FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !activeChat) return;
        
        try {
            console.log('[Socket] Sending message to chat:', activeChat._id);
            const mentions = extractMentionIds(text);
            const optimisticMsg: any = {
                _id: 'temp-' + Date.now(),
                chatId: activeChat._id,
                senderId: user,
                content: text.trim(),
                readBy: [(user?._id || user?.id)],
                createdAt: new Date().toISOString(),
                replyTo: replyTo,
                mentions: [],
            };
            setMessages(prev => [...prev, optimisticMsg]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

            socket.emit('chat:message', {
                chatId: activeChat._id,
                content: text.trim(),
                replyTo: replyTo?._id || null,
                mentions,
            });
            setText('');
            setReplyTo(null);
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            socket.emit('chat:stop_typing', { chatId: activeChat._id });
        } catch (err) {
            console.error('[Chat] Send message error:', err);
            toast.error('Failed to send message');
        }
    };

    function extractMentionIds(msg: string): string[] {
        if (!activeChat || !activeChat.members) return [];
        try {
            const matches = [...(msg.matchAll(/@(\w[\w\s]*)/g))];
            if (matches.length === 0) return [];
            const names = matches.map(m => m[1].toLowerCase());
            return activeChat.members
                .filter(m => m && m.name && names.some(n => m.name.toLowerCase().startsWith(n)))
                .map(m => (m._id || m.id));
        } catch (err) {
            console.error('[Chat] Mention extraction error:', err);
            return [];
        }
    }

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement> | string) => {
        const val = typeof e === 'string' ? e : e.target.value;
        const cursor = typeof e === 'string' ? val.length : (e.target.selectionStart || val.length);
        setText(val);
        if (!activeChat) return;

        // @mention detection based on cursor position
        const textBeforeCursor = val.slice(0, cursor);
        const lastWordMatch = textBeforeCursor.match(/@([\w\s]*)$/);

        if (lastWordMatch) {
            setMentionQuery(lastWordMatch[1]);
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }

        socket.emit('chat:typing', { chatId: activeChat._id });
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => socket.emit('chat:stop_typing', { chatId: activeChat._id }), 2000);
    };

    function insertMention(u: User) {
        const cursor = inputRef.current?.selectionStart || text.length;
        const textBeforeCursor = text.slice(0, cursor);
        const textAfterCursor = text.slice(cursor);

        // replace the last @... with @u.name
        const newTextBefore = textBeforeCursor.replace(/@([\w\s]*)$/, `@${u.name} `);
        setText(newTextBefore + textAfterCursor);
        setShowMentions(false);
        setTimeout(() => {
            if (inputRef.current) inputRef.current.selectionStart = inputRef.current.selectionEnd = newTextBefore.length;
            inputRef.current?.focus();
        }, 0);
    }

    async function react(msgId: string, emoji: string) {
        if (!activeChat) return;
        try {
            const res = await api.post(`/api/chat/${activeChat._id}/react`, { messageId: msgId, emoji });
            setMessages(ms => ms.map(m => (m._id || m.id) === msgId ? { ...m, reactions: res.data.reactions } : m));
        } catch { /* silent */ }
        setEmojiPicker(null);
    }

    function deleteMsg(msgId: string) {
        setMessageToDelete(msgId);
    }

    async function confirmDeleteMsg() {
        if (!activeChat || !messageToDelete) return;
        try {
            await api.delete(`/api/chat/${activeChat._id}/messages/${messageToDelete}`);
            setMessages(ms => ms.map(m => (m._id || m.id) === messageToDelete ? { ...m, content: 'This message was deleted', deletedAt: new Date().toISOString() } : m));
        } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
        setMessageToDelete(null);
    }

    async function toggleClientChat() {
        const newVal = !clientChatAllowed;
        try {
            await api.put('/api/chat/settings', { employeeClientChatAllowed: newVal });
            setClientChatAllowed(newVal);
            toast.success(`Client chat ${newVal ? 'enabled' : 'disabled'}`);
        } catch { toast.error('Failed to update setting'); }
    }

    const getChatName = (chat: Chat) => {
        if (chat.isGroup) return chat.name || 'Group Chat';
        const other = chat.members.find(m => (m._id || m.id) !== (user?._id || user?.id));
        return other?.name || 'Chat';
    };
    const getChatOther = (chat: Chat) => chat.members.find(m => (m._id || m.id) !== (user?._id || user?.id));
    const isOtherOnline = (chat: Chat) => { const o = getChatOther(chat); return o ? onlineUsers.has(o.id) : false; };

    const handleCallResponse = (accepted: boolean) => {
        if (!incomingCall) return;
        socket.emit('call:response', {
            callerId: incomingCall.callerId,
            accepted,
            roomId: incomingCall.roomId
        });
        if (accepted) {
            router.push(`/dashboard/meeting/${incomingCall.roomId}`);
        }
        setIncomingCall(null);
    };

    const initiateCall = (type: 'audio' | 'video') => {
        if (!activeChat) return;
        const other = getChatOther(activeChat);
        if (!other) return toast.error('Group calling coming soon!');

        const roomId = `v-${(company?._id || company?.id)}-call-${Date.now()}`;
        socket.emit('call:initiate', {
            recipientId: (other._id || other.id),
            roomId,
            type,
            chatName: getChatName(activeChat)
        });

        // Redirect caller directly to the room
        router.push(`/dashboard/meeting/${roomId}`);
    };

    const startAdHocMeeting = () => {
        if (!activeChat) return;
        const roomId = `v-${(company?._id || company?.id)}-meeting-${Date.now()}`;
        // In a real app, you might want to send a system message to the chat
        socket.emit('chat:message', {
            chatId: activeChat._id,
            content: `Started a meeting: [Join Meeting](${window.location.origin}/dashboard/meeting/${roomId})`,
            isSystem: true
        });
        router.push(`/dashboard/meeting/${roomId}`);
    };

    const mentionSuggestions = allUsers.filter(u =>
        (u._id || u.id) !== (user?._id || user?.id) &&
        (clientChatAllowed || u.role !== 'client') &&
        (u.name || '').toLowerCase().includes((mentionQuery || '').toLowerCase())
    ) || [];

    const filteredChats = chats.filter(c =>
        getChatName(c).toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Render a single message
    function renderMessage(msg: Message) {
        const isMine = msg.senderId.id === (user?._id || user?.id);
        const isDeleted = !!msg.deletedAt;
        const reactions = msg.reactions || {};
        if (msg.isSystem) {
            return (
                <div key={msg._id} className="flex justify-center">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</span>
                </div>
            );
        }
        return (
            <div key={msg._id}
                className={clsx('flex gap-2 group', isMine && 'flex-row-reverse')}
                onMouseEnter={() => setHoveredMsg(msg._id)}
                onMouseLeave={() => { setHoveredMsg(null); setEmojiPicker(null); }}
            >
                {!isMine && <Avatar user={msg.senderId} size="sm" />}
                <div className={clsx('max-w-[65%] flex flex-col gap-0.5', isMine && 'items-end')}>
                    {!isMine && <p className="text-xs text-gray-400 font-medium px-1">{msg.senderId.name}</p>}

                    {/* Reply preview */}
                    {msg.replyTo && (
                        <div className="text-xs bg-gray-100 border-l-2 border-indigo-400 px-2 py-1 rounded mb-0.5 max-w-full truncate text-gray-500">
                            <span className="font-semibold text-indigo-500">{msg.replyTo.senderId.name}</span>: {msg.replyTo.content}
                        </div>
                    )}

                    <div className={clsx(
                        'px-3.5 py-2.5 rounded-2xl text-[14.5px] leading-relaxed break-words shadow-sm border',
                        isMine
                            ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-700'
                            : 'bg-white text-gray-900 rounded-tl-none border-gray-100',
                        isDeleted && 'opacity-60 italic'
                    )}>
                        {/* Highlight @mentions and links */}
                        {isDeleted ? '🚫 This message was deleted' : renderMessageContent(msg.content, msg.mentions || [])}
                    </div>

                    {/* Reactions */}
                    {Object.keys(reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 px-1">
                            {Object.entries(reactions).map(([emoji, uids]) => (
                                <button key={emoji} onClick={() => react(msg._id, emoji)}
                                    className={clsx('flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-all',
                                        (uids as string[]).includes((user?._id || user?.id) || '') ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
                                    {emoji} <span>{(uids as string[]).length}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className={clsx('flex items-center gap-1 px-1 mt-0.5', isMine && 'flex-row-reverse')}>
                        <span className={clsx("text-[10px]", isMine ? "text-gray-400" : "text-gray-400")}>{formatTime(msg.createdAt)}</span>
                        {isMine && <CheckCheck className={clsx('w-3.5 h-3.5', msg.readBy.length > 1 ? 'text-indigo-500' : 'text-gray-300')} />}
                    </div>
                </div>

                {/* Message actions */}
                {hoveredMsg === msg._id && !isDeleted && (
                    <div className={clsx('flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-center', isMine ? 'mr-1' : 'ml-1')}>
                        <button onClick={() => setReplyTo(msg)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600" title="Reply">
                            <Reply className="w-3.5 h-3.5" />
                        </button>
                        <div className="relative">
                            <button onClick={() => setEmojiPicker(emojiPicker === msg._id ? null : msg._id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600" title="React">
                                <Smile className="w-3.5 h-3.5" />
                            </button>
                            {emojiPicker === msg._id && (
                                <div className={clsx('absolute bottom-full mb-1 bg-white border border-gray-100 shadow-lg rounded-xl p-2 flex gap-1 z-10', isMine ? 'right-0' : 'left-0')}>
                                    {EMOJI_LIST.map(e => (
                                        <button key={e} onClick={() => react(msg._id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {(isMine || isAdmin) && (
                            <button onClick={() => deleteMsg(msg._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    function renderMessageContent(content: string, mentions: User[]) {
        if (!content) return null;
        const regex = /(\[[^\]]+\]\(https?:\/\/[^\s\)]+\)|@\w[\w\s]*)/g;
        const parts = content.split(regex);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const name = part.slice(1).trim();
                const mentioned = mentions?.find(m => content.includes(`@${m.name}`));
                if (mentioned) return <span key={i} className="font-semibold text-indigo-300 cursor-pointer">@{name}</span>;
            }
            const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)$/);
            if (linkMatch) {
                return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:opacity-80 break-all">{linkMatch[1]}</a>;
            }
            return <span key={i} className="break-words">{part}</span>;
        });
    }

    return (
        <div className={clsx("flex overflow-hidden bg-[#f0f2f5] w-full relative", mobileLayout ? "h-full" : "h-full md:h-[calc(100vh-7rem)] md:card")}>
            {/* ── Sidebar ─────────────────────────────────────────────────────── */}
            <div className={clsx(
                "border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 bg-white",
                mobileLayout 
                    ? (activeChat ? "hidden" : "w-full") 
                    : (sidebarMinimized ? "w-[80px] hidden md:flex" : "w-full md:w-[300px]"),
                !mobileLayout && activeChat ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-gray-100 space-y-3">
                    <div className={clsx("flex items-center", sidebarMinimized ? "justify-center flex-col gap-2" : "justify-between")}>
                        <div className="flex gap-2 items-center">
                            <button onClick={() => setSidebarMinimized(!sidebarMinimized)} className={clsx("p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors", mobileLayout ? "hidden" : "")} aria-label={sidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}>
                                <Menu className="w-5 h-5" />
                            </button>
                            {!sidebarMinimized && <h2 className="font-bold text-gray-900">Messages</h2>}
                        </div>
                        <div className={clsx("flex gap-1", sidebarMinimized && "flex-col")}>
                            {isAdmin && (
                                <button onClick={toggleClientChat} title={clientChatAllowed ? 'Disable client-employee chat' : 'Enable client-employee chat'} aria-label={clientChatAllowed ? 'Disable client-employee chat' : 'Enable client-employee chat'}
                                    className={clsx('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', clientChatAllowed ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-500 hover:bg-rose-100')}>
                                    <Shield className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button onClick={() => setShowNewChat(true)} className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors" title="New conversation" aria-label="New conversation">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {!sidebarMinimized && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input aria-label="Search chats" placeholder="Search chats..." className="input pl-8 text-xs py-1.5" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    )}
                    {isAdmin && !sidebarMinimized && (
                        <p className={clsx('text-[10px] font-medium flex items-center gap-1', clientChatAllowed ? 'text-emerald-600' : 'text-rose-500')}>
                            <Shield className="w-3 h-3" />
                            Employee–Client chat: {clientChatAllowed ? 'Allowed' : 'Blocked'}
                        </p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingChats ? (
                        <div className="flex items-center justify-center py-10"><LogoLoader className="w-5 h-5 animate-spin text-indigo-500" /></div>
                    ) : filteredChats.length === 0 ? (
                        <div className="text-center py-10">
                            <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">No conversations yet</p>
                            <button onClick={() => setShowNewChat(true)} className="mt-3 text-xs text-indigo-600 hover:underline">Start one</button>
                        </div>
                    ) : filteredChats.map(chat => {
                        const other = getChatOther(chat);
                        const online = isOtherOnline(chat);
                        const isActive = activeChat?._id === chat._id;
                        return (
                            <button key={chat._id} onClick={() => selectChat(chat)}
                                className={clsx('w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left', isActive && 'bg-indigo-50/70 border-l-2 border-indigo-500', sidebarMinimized && 'justify-center px-2')}>
                                <div className="relative flex-shrink-0">
                                    {chat.isGroup ? <Avatar iconName={chat.avatar} /> : <Avatar user={other} />}
                                    {!chat.isGroup && (
                                        <span className={clsx('absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white', online ? 'bg-emerald-400' : 'bg-gray-300')} />
                                    )}
                                </div>
                                {!sidebarMinimized && (
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{getChatName(chat)}</p>
                                            {chat.lastActivity && <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(chat.lastActivity)}</span>}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">
                                            {chat.lastMessage?.isSystem ? <span className="italic">{chat.lastMessage.content}</span> : chat.lastMessage?.content || 'No messages yet'}
                                        </p>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Main area ───────────────────────────────────────────────────── */}
            {activeChat ? (
                <div className={clsx("flex-1 flex-col min-w-0 bg-white", mobileLayout ? "flex absolute inset-0 z-50 h-full" : (activeChat ? "flex" : "hidden md:flex"))}>
                    {/* Chat header */}
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-white">
                        <button onClick={() => setActiveChat(null)} className={clsx("p-2 -ml-3 mr-1 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors", !mobileLayout && "md:hidden")}>
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="relative">
                            {activeChat.isGroup ? <Avatar iconName={activeChat.avatar} size="lg" /> : <Avatar user={getChatOther(activeChat)} size="lg" />}
                            {!activeChat.isGroup && (
                                <span className={clsx('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white', isOtherOnline(activeChat) ? 'bg-emerald-400' : 'bg-gray-300')} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{getChatName(activeChat)}</p>
                            <p className="text-xs text-gray-400">
                                {!activeChat.isGroup && (isOtherOnline(activeChat) ? <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online</span> : 'Offline')}
                                {activeChat.isGroup && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {activeChat.members.length} members</span>}
                                {typingUsers.length > 0 && <span className="text-indigo-500 ml-2 animate-pulse">typing...</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            {!activeChat.isGroup && (
                                <>
                                    <button onClick={() => initiateCall('audio')} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" title="Audio Call" aria-label="Audio Call">
                                        <Phone className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => initiateCall('video')} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" title="Video Call" aria-label="Video Call">
                                        <Video className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            <button onClick={startAdHocMeeting} className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors" title="Start Meeting" aria-label="Start Meeting">
                                <Plus className="w-4 h-4" />
                            </button>
                            {activeChat.isGroup && (
                                <button onClick={() => setShowGroupInfo(p => !p)} className={clsx('p-2 rounded-xl hover:bg-gray-100 transition-colors', showGroupInfo && 'bg-indigo-50 text-indigo-600')} aria-label="Toggle group info">
                                    <Users className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-1 min-h-0">
                        {/* Messages */}
                        <div className="flex-1 flex flex-col min-w-0 relative">
                            {/* Theme styling background layer */}
                            <div className="absolute inset-0 z-0 bg-slate-50/80 pointer-events-none" />
                            <div className="flex-1 overflow-y-auto p-5 space-y-4 relative z-10">
                                {loadingMessages ? (
                                    <div className="flex items-center justify-center py-10"><LogoLoader className="w-6 h-6 animate-spin text-indigo-500" /></div>
                                ) : (
                                    messages.map(msg => renderMessage(msg))
                                )}
                                {typingUsers.length > 0 && (
                                    <div className="flex gap-2 items-center">
                                        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-2.5">
                                            <div className="flex gap-1">
                                                {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }} />)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input area */}
                            <div className="border-t border-gray-100 bg-white">
                                {/* Reply bar */}
                                {replyTo && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                                        <Reply className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-indigo-600">{replyTo.senderId.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">This room is for general discussions across {platform?.platformName || 'the system'}.</p>
                                        </div>
                                        <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-white rounded text-gray-400" aria-label="Cancel reply"><X className="w-3 h-3" /></button>
                                    </div>
                                )}

                                {/* @mention suggestions */}
                                {showMentions && mentionSuggestions.length > 0 && (
                                    <div className="mx-4 mb-0 border border-gray-200 rounded-xl shadow-lg bg-white overflow-hidden">
                                        {mentionSuggestions.slice(0, 5).map(u => (
                                            <button key={(u._id || u.id)} onClick={() => insertMention(u)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-left text-sm">
                                                <Avatar user={u} size="sm" />
                                                <span className="font-medium text-gray-800">{u.name}</span>
                                                <RoleBadge role={u.role} />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100">
                                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-full border border-gray-200 focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-sm">
                                        <button type="button" onClick={() => { setText(t => t + '@'); inputRef.current?.focus(); handleTyping(text + '@'); }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 hover:text-indigo-600 transition-colors" title="Mention someone" aria-label="Mention someone">
                                            <AtSign className="w-4 h-4" />
                                        </button>
                                        <input
                                            id="messageInput"
                                            ref={inputRef}
                                            value={text}
                                            onChange={handleTyping}
                                            placeholder="Type a message..."
                                            aria-label="Message content"
                                            className="flex-1 bg-transparent text-[15px] py-2 px-1 outline-none text-gray-800 placeholder-gray-400"
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e as any)}
                                        />
                                        <button type="submit" disabled={!text.trim()} aria-label="Send message" className={clsx(
                                            "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200",
                                            text.trim() ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-95" : "bg-gray-200 text-gray-400"
                                        )}>
                                            <Send className={clsx("w-4 h-4", text.trim() && "ml-0.5")} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Group info panel */}
                        {showGroupInfo && activeChat.isGroup && (
                            <GroupInfoPanel
                                chat={activeChat}
                                currentUser={user!}
                                onClose={() => setShowGroupInfo(false)}
                                onUpdated={() => {
                                    api.get('/api/chat').then(({ data }) => {
                                        setChats(data.chats);
                                        const updated = data.chats.find((c: Chat) => c._id === activeChat._id);
                                        if (updated) setActiveChat(updated);
                                    });
                                }}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <div className={clsx("flex-1 flex-col items-center justify-center text-center p-8 bg-[#f0f2f5]", mobileLayout ? "hidden" : "hidden md:flex")}>
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 shadow-sm">
                        <MessageSquare className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-lg">{platform?.platformName || 'System'} Chat</h3>
                    <p className="text-sm text-gray-500 max-w-xs mb-6">Send and receive messages seamlessly within the internal management system.</p>
                    <button onClick={() => setShowNewChat(true)} className="btn-primary rounded-full px-6 shadow-md">
                        <Plus className="w-4 h-4 mr-1" /> Start New Conversation
                    </button>
                </div>
            )}

            {/* ── New Chat Modal ─────────────────────────────────────────────── */}
            {showNewChat && user && (
                <NewChatModal
                    currentUser={user}
                    onClose={() => setShowNewChat(false)}
                    onChatCreated={(chat) => {
                        setChats(prev => [chat, ...prev.filter(c => c._id !== chat._id)]);
                        selectChat(chat);
                        setShowNewChat(false);
                    }}
                />
            )}

            {/* ── Delete Message Modal ───────────────────────────────────────── */}
            {messageToDelete && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Message?</h3>
                        <p className="text-sm text-gray-500 mb-6">This action cannot be undone. The message will be replaced with a deletion note.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setMessageToDelete(null)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={confirmDeleteMsg} className="btn-danger flex-1">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {incomingCall && (
                <IncomingCallOverlay
                    call={incomingCall}
                    onAccept={() => handleCallResponse(true)}
                    onReject={() => handleCallResponse(false)}
                />
            )}
        </div>
    );
}
