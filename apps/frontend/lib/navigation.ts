import { LogoLoader } from "@workspace/ui";
import { LayoutDashboard, FolderKanban, CheckSquare, Users, Building2, LayoutGrid, Calendar, MessageSquare, BarChart3, Briefcase, Target, Star, Settings, LogOut, ChevronDown, ChevronRight, DollarSign, FileText, BookOpen, Sparkles, CalendarDays, Clock, Receipt, FilePlus2, HelpCircle, Monitor, Globe, LifeBuoy, CreditCard, TrendingUp, Magnet, Landmark, PieChart, Activity, FileSignature, Bot, Lightbulb, UserSquare, ClipboardList, Palmtree, Wallet, Banknote, Package, PlusCircle, ChevronLeft, Menu, Mail, FolderOpen, Video, Database, Megaphone, Search } from 'lucide-react';

export const navigation = [
    {
        name: '180 View',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'manager', 'hr', 'employee', 'client']
    },


    {
        group: 'CRM & Sales',
        appId: 'crm',
        icon: TrendingUp,
        roles: ['admin', 'manager', 'hr', 'sales'],
        items: [
            { id: 'sales', name: 'Sales Overview', href: '/dashboard/sales', icon: TrendingUp, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'leads', name: 'Leads', href: '/dashboard/sales/leads', icon: Magnet, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'pipeline', name: 'Pipeline', href: '/dashboard/sales/pipeline', icon: PieChart, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'accounts', name: 'Accounts', href: '/dashboard/sales/accounts', icon: Landmark, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'contacts', name: 'Contacts', href: '/dashboard/sales/contacts', icon: UserSquare, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'opportunities', name: 'Opportunities', href: '/dashboard/sales/opportunities', icon: Target, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'quotes', name: 'Quotations', href: '/dashboard/sales/quotes', icon: FileText, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'activities', name: 'Activities', href: '/dashboard/sales/activities', icon: Activity, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'contracts', name: 'Contracts', href: '/dashboard/sales/contracts', icon: FileSignature, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'revenue', name: 'Revenue', href: '/dashboard/sales/revenue', icon: DollarSign, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'forecasting', name: 'Forecasting', href: '/dashboard/sales/forecasting', icon: BarChart3, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'ai-insights', name: 'AI Insights', href: '/dashboard/sales/ai-insights', icon: Sparkles, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'productivity', name: 'Productivity', href: '/dashboard/sales/productivity', icon: ClipboardList, roles: ['admin', 'manager', 'hr', 'sales'] },
            { id: 'clients', name: 'Clients', href: '/dashboard/clients', icon: Building2, roles: ['admin', 'manager', 'hr'] },
        ]
    },
    {
        group: 'Advertising',
        appId: 'advertising',
        icon: Megaphone,
        roles: ['admin', 'manager', 'sales'],
        items: [
            { id: 'ad-websites', name: 'Ad Websites', href: '/dashboard/advertising', icon: Globe, roles: ['admin', 'manager', 'sales'] },
        ]
    },

    {
        group: 'Projects & Tasks',
        appId: 'projects',
        icon: FolderKanban,
        roles: ['admin', 'manager', 'hr', 'employee', 'client'],
        items: [
            { id: 'projects', name: 'Active Projects', href: '/dashboard/projects', icon: FolderKanban, roles: ['admin', 'manager', 'hr', 'employee', 'client'] },
            { id: 'tasks', name: 'Task Board', href: '/dashboard/tasks', icon: CheckSquare, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'work-logs', name: 'Work Logs', href: '/dashboard/work-logs', icon: Clock, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'goals', name: 'Milestone Goals', href: '/dashboard/goals', icon: Target, roles: ['admin', 'manager', 'hr'] },
        ]
    },

    {
        group: 'HR Management',
        id: 'hr-group',
        appId: 'hr',
        icon: Users,
        roles: ['admin', 'hr', 'manager'],
        items: [
            { id: 'employees', name: 'Employee Directory', href: '/dashboard/employees', icon: Users, roles: ['admin', 'hr', 'manager'] },
            { id: 'attendance', name: 'Attendance', href: '/dashboard/attendance', icon: Calendar, roles: ['admin', 'hr', 'manager'] },
            { id: 'hrms', name: 'HR Operations', href: '/dashboard/hr', icon: DollarSign, roles: ['admin', 'hr', 'manager'] },
            { id: 'recruitment', name: 'Recruitment', href: '/dashboard/recruitment', icon: Briefcase, roles: ['admin', 'hr', 'manager'] },
            { id: 'reviews', name: 'Performance', href: '/dashboard/reviews', icon: Star, roles: ['admin', 'hr', 'manager'] },
        ]
    },

    {
        group: 'Finance',
        appId: 'finance',
        icon: Landmark,
        roles: ['admin', 'finance', 'manager'],
        items: [
            { id: 'finance-overview', name: 'Finance Overview', href: '/dashboard/finance', icon: BarChart3, roles: ['admin', 'finance', 'manager'] },
            { id: 'invoices', name: 'Invoices', href: '/dashboard/invoices', icon: Receipt, roles: ['admin', 'finance', 'manager'] },
            { id: 'expenses', name: 'Expenses', href: '/dashboard/expenses', icon: Wallet, roles: ['admin', 'finance', 'manager'] },
            { id: 'salary', name: 'Salary Ledger', href: '/dashboard/salary', icon: Banknote, roles: ['admin', 'finance', 'manager'] },
            { id: 'bills', name: 'Bills', href: '/dashboard/finance/bills', icon: Receipt, roles: ['admin', 'finance', 'manager'] },
            { id: 'vendors', name: 'Vendors', href: '/dashboard/finance/vendors', icon: Building2, roles: ['admin', 'finance', 'manager'] },
        ]
    },

    {
        group: 'Assets',
        appId: 'assets',
        icon: Package,
        roles: ['admin', 'manager'],
        items: [
            { id: 'assets', name: 'Assets', href: '/dashboard/assets', icon: Monitor, roles: ['admin', 'manager'] },
        ]
    },

    {
        group: 'Insights',
        appId: 'insights',
        icon: BarChart3,
        roles: ['admin', 'manager', 'hr'],
        items: [
            { id: 'analytics', name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin', 'manager', 'hr'] },
            { id: 'reports', name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['admin', 'manager', 'hr'] },
        ]
    },

    {
        group: 'Productivity',
        appId: 'tools',
        icon: Sparkles,
        roles: ['admin', 'manager', 'hr', 'employee'],
        items: [
            { id: 'chat', name: 'Chat', href: '/dashboard/chat', icon: MessageSquare, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'calendar', name: 'Calendar', href: '/dashboard/calendar', icon: Calendar, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'content-calendar', name: 'Content Calendar', href: '/dashboard/content-calendar', icon: CalendarDays, roles: ['admin', 'manager', 'hr'] },
            { id: 'meeting', name: 'Meetings', href: '/dashboard/meeting', icon: Video, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'emails', name: 'Emails', href: '/dashboard/emails', icon: Mail, roles: ['admin', 'manager', 'hr'] },
            { id: 'documents', name: 'Documents', href: '/dashboard/documents', icon: FolderOpen, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'ai-assistant', name: 'AI Assistant', href: '/dashboard/ai', icon: Bot, roles: ['admin', 'manager', 'hr', 'employee'] },
            { id: 'help-support', name: 'Help & Support', href: '/dashboard/help-support', icon: LifeBuoy, roles: ['admin', 'manager', 'hr', 'employee', 'client'] },
        ]
    },

    {
        group: 'Job Hunter AI',
        appId: 'jobhunter',
        icon: Search,
        roles: ['admin', 'manager', 'employee'],
        items: [
            { id: 'job-dashboard', name: 'Job Dashboard', href: '/dashboard/job-hunter', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'] },
            { id: 'job-discovery', name: 'Job Discovery', href: '/dashboard/job-hunter/discovery', icon: Search, roles: ['admin', 'manager', 'employee'] },
        ]
    },


    {
        group: 'Settings',
        icon: Settings,
        roles: ['admin', 'manager'],
        items: [
            { id: 'roles', name: 'Roles & Access', href: '/dashboard/settings/roles-access', icon: UserSquare, roles: ['admin', 'manager'] },
            { id: 'apps', name: 'Apps', href: '/dashboard/settings/apps', icon: LayoutGrid, roles: ['admin', 'manager'] },
            { id: 'system-configs', name: 'System Configs', href: '/dashboard/settings/system-configs', icon: Settings, roles: ['admin', 'manager'] },
            { id: 'billing', name: 'Billing', href: '/dashboard/billing', icon: CreditCard, roles: ['admin', 'manager'] },
        ]
    },
];
