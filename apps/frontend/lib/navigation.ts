import { LogoLoader, AILogoIcon } from "@workspace/ui";
import { 
    LayoutDashboard, FolderKanban, CheckSquare, Users, Building2, 
    LayoutGrid, Calendar, MessageSquare, BarChart3, Briefcase, 
    Target, Star, Settings, LogOut, ChevronDown, ChevronRight, 
    DollarSign, FileText, BookOpen, Sparkles, CalendarDays, Clock, 
    Receipt, FilePlus2, HelpCircle, Monitor, Globe, LifeBuoy, 
    CreditCard, TrendingUp, Magnet, Landmark, PieChart, Activity, 
    FileSignature, Bot, Lightbulb, UserSquare, ClipboardList, 
    Palmtree, Wallet, Banknote, Package, PlusCircle, ChevronLeft, 
    Menu, Mail, FolderOpen, Video, Database, Megaphone, Search, 
    Share2, Bookmark, GitFork, PhoneCall, Smartphone, PhoneForwarded, 
    Brain 
} from 'lucide-react';

export const navigation = [
    {
        name: '180 View',
        href: '/',
        icon: LayoutDashboard,
        roles: ['admin', 'employee', 'client']
    },

    {
        group: 'Communications',
        appId: 'communications',
        icon: MessageSquare,
        roles: ['admin', 'employee'],
        items: [
            { id: 'chat', name: 'Chat', href: '/chat', icon: MessageSquare, roles: ['admin', 'employee'] },
            { id: 'meeting', name: 'Meetings', href: '/meeting', icon: Video, roles: ['admin', 'employee'] },
            { id: 'emails', name: 'Emails', href: '/emails', icon: Mail, roles: ['admin'] },
        ]
    },

    {
        group: 'Workspace Tools',
        appId: 'workspace-tools',
        icon: FolderOpen,
        roles: ['admin', 'employee'],
        items: [
            { id: 'orbit-copilot', name: 'Orbit AI Copilot', href: '/ai', icon: Bot, roles: ['admin', 'employee'] },
            { id: 'calendar', name: 'Calendar', href: '/calendar', icon: Calendar, roles: ['admin', 'employee'] },
            { id: 'documents', name: '180 Documents', href: '/documents', icon: FileText, roles: ['admin', 'employee'] },
            { id: 'document-editor', name: 'Document Editor', href: '/document-editor', icon: FileText, roles: ['admin', 'employee'] },
            { id: 'assets', name: 'Assets & Creds', href: '/assets', icon: Star, roles: ['admin', 'employee'] },
        ]
    },

    {
        group: 'CRM & Sales',
        appId: 'crm',
        icon: TrendingUp,
        roles: ['admin'],
        items: [
            { id: 'sales', name: 'Sales Overview', href: '/sales', exact: true, icon: TrendingUp, roles: ['admin'] },
            { id: 'leads', name: 'Leads Pipeline', href: '/sales/leads-pipeline', icon: Magnet, roles: ['admin'] },
            { id: 'deals', name: 'Deals Pipeline', href: '/sales/deals', icon: PieChart, roles: ['admin'] },
            { id: 'ai-insights', name: 'AI Sales Insights', href: '/sales/ai-insights', icon: Sparkles, roles: ['admin'] },
            { id: 'productivity', name: 'Productivity', href: '/sales/productivity', icon: ClipboardList, roles: ['admin'] },
            { id: 'clients', name: 'Clients', href: '/clients', icon: Building2, roles: ['admin'] },
        ]
    },

    {
        group: 'Advertising',
        appId: 'advertising',
        icon: Megaphone,
        roles: ['admin'],
        items: [
            { id: 'ad-websites', name: 'Ad Websites', href: '/advertising', icon: Globe, roles: ['admin'] },
            { name: 'Form Builder', href: '/forms', icon: FileText, roles: ['admin'] },
        ]
    },

    {
        group: 'Traffic Director',
        appId: 'traffic-director',
        icon: GitFork,
        roles: ['admin', 'employee'],
        items: [
            { id: 'overview', name: 'Traffic Overview', href: '/traffic-director', exact: true, icon: Activity, roles: ['admin', 'employee'] },
            { id: 'links', name: 'Smart Links & Rules', href: '/traffic-director/links', icon: Globe, roles: ['admin', 'employee'] },
            { id: 'simulator', name: 'Routing Simulator', href: '/traffic-director/simulator', icon: Sparkles, roles: ['admin', 'employee'] },
            { id: 'logs', name: 'Live Stream Logs', href: '/traffic-director/logs', icon: Activity, roles: ['admin', 'employee'] },
            { id: 'analytics', name: 'Traffic Analytics', href: '/traffic-director/analytics', icon: BarChart3, roles: ['admin', 'employee'] },
        ]
    },

    {
        group: '180 Voiceforce',
        appId: 'voiceforce',
        icon: PhoneCall,
        roles: ['admin', 'employee'],
        items: [
            { id: 'dashboard', name: 'Voiceforce Radar', href: '/voiceforce', exact: true, icon: PhoneCall, roles: ['admin', 'employee'] },
            { id: 'agents', name: 'AI Voice Employees', href: '/voiceforce/agents', icon: Bot, roles: ['admin', 'employee'] },
            { id: 'numbers', name: 'Phone Numbers & DIDs', href: '/voiceforce/numbers', icon: Smartphone, roles: ['admin', 'employee'] },
            { id: 'forwarding', name: 'Call Forwarding & Queues', href: '/voiceforce/forwarding', icon: PhoneForwarded, roles: ['admin', 'employee'] },
            { id: 'campaigns', name: 'Call Campaigns', href: '/voiceforce/campaigns', icon: Megaphone, roles: ['admin', 'employee'] },
        ]
    },

    {
        group: 'Social Media',
        appId: 'social-media',
        icon: Share2,
        roles: ['admin'],
        items: [
            { id: 'content-calendar', name: 'Content Calendar', href: '/content-calendar', icon: CalendarDays, roles: ['admin'] },
            { id: 'social-media-assets', name: 'Social Media Assets', href: '/social-media-assets', icon: Bookmark, roles: ['admin'] },
        ]
    },

    {
        group: 'Projects & Tasks',
        appId: 'projects',
        icon: FolderKanban,
        roles: ['admin', 'employee', 'client'],
        items: [
            { id: 'projects', name: 'Active Projects', href: '/projects', icon: FolderKanban, roles: ['admin', 'employee', 'client'] },
            { id: 'tasks', name: 'Task Board', href: '/tasks', icon: CheckSquare, roles: ['admin', 'employee'] },
            { id: 'work-logs', name: 'Work Logs', href: '/work-logs', icon: Clock, roles: ['admin', 'employee'] },
            { id: 'activity', name: 'Activity Stream', href: '/activity', icon: Activity, roles: ['admin', 'employee'] },
        ]
    },

    {
        group: 'Finance & Analytics',
        appId: 'finance',
        icon: Landmark,
        roles: ['admin', 'employee'],
        items: [
            { id: 'finance-overview', name: 'Finance & Ledger', href: '/finance', icon: Landmark, roles: ['admin'] },
            { id: 'invoices', name: 'Invoices', href: '/invoices', icon: Receipt, roles: ['admin'] },
            { id: 'bills-and-expenses', name: 'Bills & Expense Claims', href: '/bills-and-expenses', icon: Wallet, roles: ['admin', 'employee'] },
            { id: 'analytics', name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin'] },
            { id: 'reports', name: 'Reports', href: '/reports', icon: FileText, roles: ['admin'] },
            { id: 'website-analytics', name: 'Website Traffic', href: '/analytics/website', icon: Globe, roles: ['admin'] },
            { id: 'vendors', name: 'Vendors', href: '/vendors', icon: Building2, roles: ['admin'] },
            { id: 'wallet', name: 'Financial Wallet', href: '/wallet', icon: CreditCard, roles: ['admin', 'employee'] },
        ]
    },

    {
        group: 'HR Management',
        id: 'hr-group',
        appId: 'hr',
        icon: Users,
        roles: ['admin'],
        items: [
            { id: 'employees', name: 'Employee Directory', href: '/employees', icon: Users, roles: ['admin'] },
            { id: 'attendance', name: 'Attendance', href: '/attendance', icon: Calendar, roles: ['admin'] },
            { id: 'hrms', name: 'HR Operations', href: '/hr', icon: DollarSign, roles: ['admin'] },
        ]
    },

    {
        group: 'Settings',
        icon: Settings,
        roles: ['admin', 'employee', 'client'],
        items: [
            { id: 'company-hub', name: 'Company Hub', href: '/company', icon: Building2, roles: ['admin'] },
            { id: 'roles', name: 'Roles & Access', href: '/settings/roles-access', icon: UserSquare, roles: ['admin'] },
            { id: 'apps', name: 'Apps', href: '/settings/apps', icon: LayoutGrid, roles: ['admin'] },
            { id: 'ai-config', name: 'AI Configurations', href: '/settings/ai', icon: Bot, roles: ['admin'] },
            { id: 'system-configs', name: 'System Configs', href: '/settings/system-configs', icon: Settings, roles: ['admin'] },
            { id: 'platform-billing', name: 'Platform Billing', href: '/settings/platform-billing', icon: CreditCard, roles: ['admin'] },
            { id: 'wallet', name: 'Prepaid Wallet', href: '/settings/wallet', icon: Wallet, roles: ['admin'] },
            { id: 'help-support', name: 'Help & Support', href: '/help-support', icon: LifeBuoy, roles: ['admin', 'employee', 'client'] },
        ]
    }
];
