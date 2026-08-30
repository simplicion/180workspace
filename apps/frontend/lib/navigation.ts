import { LogoLoader } from "@workspace/ui";
import { LayoutDashboard, FolderKanban, CheckSquare, Users, Building2, LayoutGrid, Calendar, MessageSquare, BarChart3, Briefcase, Target, Star, Settings, LogOut, ChevronDown, ChevronRight, DollarSign, FileText, BookOpen, Sparkles, CalendarDays, Clock, Receipt, FilePlus2, HelpCircle, Monitor, Globe, LifeBuoy, CreditCard, TrendingUp, Magnet, Landmark, PieChart, Activity, FileSignature, Bot, Lightbulb, UserSquare, ClipboardList, Palmtree, Wallet, Banknote, Package, PlusCircle, ChevronLeft, Menu, Mail, FolderOpen, Video, Database, Megaphone, Search, Share2, Bookmark, GitFork } from 'lucide-react';

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
            { id: 'calendar', name: 'Calendar', href: '/calendar', icon: Calendar, roles: ['admin', 'employee'] },
            { id: 'documents', name: '180 Documents', href: '/documents', icon: FolderOpen, roles: ['admin', 'employee'] },
            { id: 'assets', name: 'IT Assets', href: '/assets', icon: Monitor, roles: ['admin'] },
            { id: 'ai-assistant', name: 'AI Assistant', href: '/ai', icon: Bot, roles: ['admin', 'employee'] },
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
            { id: 'ai-insights', name: 'AI Insights', href: '/sales/ai-insights', icon: Sparkles, roles: ['admin'] },
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
            { id: 'overview', name: 'Traffic Overview', href: '/traffic-director', icon: GitFork, roles: ['admin', 'employee'] },
            { id: 'links', name: 'Smart Links', href: '/traffic-director/links', icon: Globe, roles: ['admin', 'employee'] },
            { id: 'simulator', name: 'Routing Simulator', href: '/traffic-director/simulator', icon: Sparkles, roles: ['admin', 'employee'] },
            { id: 'logs', name: 'Live Stream Logs', href: '/traffic-director/logs', icon: Activity, roles: ['admin', 'employee'] },
            { id: 'analytics', name: 'Traffic Analytics', href: '/traffic-director/analytics', icon: BarChart3, roles: ['admin', 'employee'] },
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
        ]
    },

    {
        group: 'Finance',
        appId: 'finance',
        icon: Landmark,
        roles: ['admin', 'employee'],
        items: [
            { id: 'finance-overview', name: 'Finance Overview', href: '/finance', icon: BarChart3, roles: ['admin'] },
            { id: 'finance-overview', name: 'Transactions', href: '/transactions', icon: Activity, roles: ['admin'] },
            { id: 'invoices', name: 'Invoices', href: '/invoices', icon: Receipt, roles: ['admin'] },
            { id: 'bills-and-expenses', name: 'Bills and Expenses', href: '/bills-and-expenses', icon: Wallet, roles: ['admin', 'employee'] },
            { id: 'salary', name: 'Salary Ledger', href: '/salary', icon: Banknote, roles: ['admin', 'employee'] },
            { id: 'vendors', name: 'Vendors', href: '/vendors', icon: Building2, roles: ['admin'] },
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
            { id: 'recruitment', name: 'Recruitment', href: '/recruitment', icon: Briefcase, roles: ['admin'] },
            { id: 'reviews', name: 'Performance', href: '/reviews', icon: Star, roles: ['admin'] },
        ]
    },


    {
        group: 'Insights',
        appId: 'insights',
        icon: BarChart3,
        roles: ['admin'],
        items: [
            { id: 'analytics', name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin'] },
            { id: 'reports', name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'] },
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
            { id: 'system-configs', name: 'System Configs', href: '/settings/system-configs', icon: Settings, roles: ['admin'] },
            { id: 'platform-billing', name: 'Platform Billing', href: '/settings/platform-billing', icon: CreditCard, roles: ['admin'] },
            { id: 'help-support', name: 'Help & Support', href: '/help-support', icon: LifeBuoy, roles: ['admin', 'employee', 'client'] },
        ]
    }
];
