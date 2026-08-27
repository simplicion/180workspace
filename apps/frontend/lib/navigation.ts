import { LogoLoader } from "@workspace/ui";
import { LayoutDashboard, FolderKanban, CheckSquare, Users, Building2, LayoutGrid, Calendar, MessageSquare, BarChart3, Briefcase, Target, Star, Settings, LogOut, ChevronDown, ChevronRight, DollarSign, FileText, BookOpen, Sparkles, CalendarDays, Clock, Receipt, FilePlus2, HelpCircle, Monitor, Globe, LifeBuoy, CreditCard, TrendingUp, Magnet, Landmark, PieChart, Activity, FileSignature, Bot, Lightbulb, UserSquare, ClipboardList, Palmtree, Wallet, Banknote, Package, PlusCircle, ChevronLeft, Menu, Mail, FolderOpen, Video, Database, Megaphone, Search, Share2, Bookmark } from 'lucide-react';

export const navigation = [
    {
        name: '180 View',
        href: '/',
        icon: LayoutDashboard,
        roles: ['admin', 'manager', 'hr', 'employee', 'client']
    },

    {
        group: 'Communications',
        appId: 'communications',
        icon: MessageSquare,
        roles: ['admin', 'manager', 'hr', 'employee'],
        items: [
            { id: 'chat', name: 'Chat', href: '/chat', icon: MessageSquare, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'meeting', name: 'Meetings', href: '/meeting', icon: Video, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'emails', name: 'Emails', href: '/emails', icon: Mail, roles: ['admin', 'manager', 'hr'] },
        ]
    },

    {
        group: 'Workspace Tools',
        appId: 'workspace-tools',
        icon: FolderOpen,
        roles: ['admin', 'manager', 'hr', 'employee'],
        items: [
            { id: 'calendar', name: 'Calendar', href: '/calendar', icon: Calendar, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'documents', name: '180 Documents', href: '/documents', icon: FolderOpen, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'assets', name: 'IT Assets', href: '/assets', icon: Monitor, roles: ['admin', 'manager'] },
            { id: 'ai-assistant', name: 'AI Assistant', href: '/ai', icon: Bot, roles: ['admin', 'manager', 'hr', 'employee'] },
        ]
    },

    {
        group: 'CRM & Sales',
        appId: 'crm',
        icon: TrendingUp,
        roles: ['admin', 'manager', 'hr', 'sales'],
        items: [
            { id: 'sales', name: 'Sales Overview', href: '/sales', exact: true, icon: TrendingUp, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'leads', name: 'Leads Pipeline', href: '/sales/leads-pipeline', icon: Magnet, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'deals', name: 'Deals Pipeline', href: '/sales/deals', icon: PieChart, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'ai-insights', name: 'AI Insights', href: '/sales/ai-insights', icon: Sparkles, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'productivity', name: 'Productivity', href: '/sales/productivity', icon: ClipboardList, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'clients', name: 'Clients', href: '/clients', icon: Building2, roles: ['admin', 'manager', 'hr'] },
        ]
    },

    {
        group: 'Advertising',
        appId: 'advertising',
        icon: Megaphone,
        roles: ['admin', 'manager', 'sales'],
        items: [
            { id: 'ad-websites', name: 'Ad Websites', href: '/advertising', icon: Globe, roles: ['admin', 'manager', 'sales'] },
            { name: 'Form Builder', href: '/forms', icon: FileText, roles: ['admin', 'manager', 'sales'] },
        ]
    },

    {
        group: 'Social Media',
        appId: 'social-media',
        icon: Share2,
        roles: ['admin', 'manager', 'marketing'],
        items: [
            { id: 'content-calendar', name: 'Content Calendar', href: '/content-calendar', icon: CalendarDays, roles: ['admin', 'manager', 'marketing'] },
            { id: 'social-media-assets', name: 'Social Media Assets', href: '/social-media-assets', icon: Bookmark, roles: ['admin', 'manager', 'marketing'] },
        ]
    },

    {
        group: 'Projects & Tasks',
        appId: 'projects',
        icon: FolderKanban,
        roles: ['admin', 'manager', 'hr', 'employee', 'client'],
        items: [
            { id: 'projects', name: 'Active Projects', href: '/projects', icon: FolderKanban, roles: ['admin', 'manager', 'hr', 'employee', 'client'] },
            { id: 'tasks', name: 'Task Board', href: '/tasks', icon: CheckSquare, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'work-logs', name: 'Work Logs', href: '/work-logs', icon: Clock, roles: ['admin', 'manager', 'hr', 'employee'] },
        ]
    },

    {
        group: 'Finance',
        appId: 'finance',
        icon: Landmark,
        roles: ['admin', 'finance', 'manager', 'employee'],
        items: [
            { id: 'finance-overview', name: 'Finance Overview', href: '/finance', icon: BarChart3, roles: ['admin', 'finance', 'manager'] },
            { id: 'finance-overview', name: 'Transactions', href: '/transactions', icon: Activity, roles: ['admin', 'finance', 'manager'] },
            { id: 'invoices', name: 'Invoices', href: '/invoices', icon: Receipt, roles: ['admin', 'finance', 'manager'] },
            { id: 'bills-and-expenses', name: 'Bills and Expenses', href: '/bills-and-expenses', icon: Wallet, roles: ['admin', 'finance', 'manager', 'employee'] },
            { id: 'salary', name: 'Salary Ledger', href: '/salary', icon: Banknote, roles: ['admin', 'finance', 'manager', 'employee'] },
            { id: 'vendors', name: 'Vendors', href: '/vendors', icon: Building2, roles: ['admin', 'finance', 'manager'] },
        ]
    },

    {
        group: 'HR Management',
        id: 'hr-group',
        appId: 'hr',
        icon: Users,
        roles: ['admin', 'hr', 'manager'],
        items: [
            { id: 'employees', name: 'Employee Directory', href: '/employees', icon: Users, roles: ['admin', 'hr', 'manager'] },
            { id: 'attendance', name: 'Attendance', href: '/attendance', icon: Calendar, roles: ['admin', 'hr', 'manager'] },
            { id: 'hrms', name: 'HR Operations', href: '/hr', icon: DollarSign, roles: ['admin', 'hr', 'manager'] },
            { id: 'recruitment', name: 'Recruitment', href: '/recruitment', icon: Briefcase, roles: ['admin', 'hr', 'manager'] },
            { id: 'reviews', name: 'Performance', href: '/reviews', icon: Star, roles: ['admin', 'hr', 'manager'] },
        ]
    },


    {
        group: 'Insights',
        appId: 'insights',
        icon: BarChart3,
        roles: ['admin', 'manager', 'hr'],
        items: [
            { id: 'analytics', name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'manager', 'hr'] },
            { id: 'reports', name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'manager', 'hr'] },
        ]
    },

    {
        group: 'Settings',
        icon: Settings,
        roles: ['admin', 'manager', 'hr', 'employee', 'client'],
        items: [
            { id: 'company-hub', name: 'Company Hub', href: '/company', icon: Building2, roles: ['admin', 'manager'] },
            { id: 'roles', name: 'Roles & Access', href: '/settings/roles-access', icon: UserSquare, roles: ['admin', 'manager'] },
            { id: 'apps', name: 'Apps', href: '/settings/apps', icon: LayoutGrid, roles: ['admin', 'manager'] },
            { id: 'system-configs', name: 'System Configs', href: '/settings/system-configs', icon: Settings, roles: ['admin', 'manager'] },
            { id: 'platform-billing', name: 'Platform Billing', href: '/settings/platform-billing', icon: CreditCard, roles: ['admin'] },
            { id: 'help-support', name: 'Help & Support', href: '/help-support', icon: LifeBuoy, roles: ['admin', 'manager', 'hr', 'employee', 'client'] },
        ]
    }
];
