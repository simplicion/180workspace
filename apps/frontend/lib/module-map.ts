/**
 * Module Map Registry
 * Maps frontend route paths to their respective App and Module IDs.
 * Used by the sidebar layout to filter navigation items.
 */

export interface ModuleInfo {
  appId: string;
  moduleId: string;
  isShared?: boolean; // If true, can be enabled by other apps even if parent app is OFF
}

export const MODULE_MAP: Record<string, ModuleInfo> = {
  // CRM & Sales
  '/sales': { appId: 'crm', moduleId: 'sales' },
  '/leads': { appId: 'crm', moduleId: 'leads' },
  '/advertising': { appId: 'advertising', moduleId: 'ad-websites' },
  '/pipeline': { appId: 'crm', moduleId: 'pipeline' },
  '/accounts': { appId: 'crm', moduleId: 'accounts' },
  '/contacts': { appId: 'crm', moduleId: 'contacts' },
  '/deals': { appId: 'crm', moduleId: 'deals' },
  '/clients': { appId: 'crm', moduleId: 'clients', isShared: true }, // Needed by Projects
  '/invoices': { appId: 'crm', moduleId: 'invoices', isShared: true }, // Needed by Finance
  
  // Projects & Workflow
  '/projects': { appId: 'projects', moduleId: 'projects' },
  '/tasks': { appId: 'projects', moduleId: 'tasks' },
  '/milestones': { appId: 'projects', moduleId: 'milestones' },
  '/timetracking': { appId: 'projects', moduleId: 'timetracking' },
  '/work-logs': { appId: 'projects', moduleId: 'work-logs' },
  
  // HR Management
  '/employees': { appId: 'hr', moduleId: 'employees' },
  '/attendance': { appId: 'hr', moduleId: 'attendance' },
  '/hrms': { appId: 'hr', moduleId: 'hrms' },
  '/leaves': { appId: 'hr', moduleId: 'leaves' },
  '/holidays': { appId: 'hr', moduleId: 'holidays' },
  '/onboarding': { appId: 'hr', moduleId: 'onboarding' },
  '/salary': { appId: 'hr', moduleId: 'salary', isShared: true }, // Needed by Finance
  
  // Finance & Analytics
  '/finance': { appId: 'finance', moduleId: 'finance-overview' },
  '/transactions': { appId: 'finance', moduleId: 'transactions' },
  '/bills-and-expenses': { appId: 'finance', moduleId: 'bills-and-expenses' },
  '/expenses': { appId: 'finance', moduleId: 'expenses' },
  '/vendors': { appId: 'finance', moduleId: 'vendors' },
  '/wallet': { appId: 'finance', moduleId: 'wallet' },
  '/analytics': { appId: 'finance', moduleId: 'analytics' },
  '/reports': { appId: 'finance', moduleId: 'reports' },
  '/analytics/website': { appId: 'finance', moduleId: 'website-analytics' },
  
  // Communications App
  '/chat': { appId: 'communications', moduleId: 'chat' },
  '/meeting': { appId: 'communications', moduleId: 'meeting' },
  '/emails': { appId: 'communications', moduleId: 'emails' },
  
  // Workspace Tools App
  '/calendar': { appId: 'workspace-tools', moduleId: 'calendar' },
  '/documents': { appId: 'workspace-tools', moduleId: 'documents' },
  '/assets': { appId: 'workspace-tools', moduleId: 'assets' },
  '/user-preference': { appId: 'workspace-tools', moduleId: 'ai-assistant' }, // AI Assistant lives in prefs for now
  '/ai': { appId: 'workspace-tools', moduleId: 'ai-assistant', isShared: true },
  
  // System / Settings
  '/help-support': { appId: 'system', moduleId: 'help-support' },
  '/settings/wallet': { appId: 'system', moduleId: 'wallet' },
  
  // Social Media Management
  '/content-calendar': { appId: 'social-media', moduleId: 'content-calendar' },
  '/social-media-assets': { appId: 'social-media', moduleId: 'social-media-assets' },

  // Traffic Director (Smart Routing & Conditional Delivery)
  '/traffic-director': { appId: 'traffic-director', moduleId: 'overview' },
  '/traffic-director/links': { appId: 'traffic-director', moduleId: 'links' },
  '/traffic-director/simulator': { appId: 'traffic-director', moduleId: 'simulator' },
  '/traffic-director/logs': { appId: 'traffic-director', moduleId: 'logs' },
  '/traffic-director/analytics': { appId: 'traffic-director', moduleId: 'analytics' },

  // 180 Voiceforce (Autonomous AI Voice Calling Engine)
  '/voiceforce': { appId: 'voiceforce', moduleId: 'dashboard' },
  '/voiceforce/agents': { appId: 'voiceforce', moduleId: 'agents' },
  '/voiceforce/numbers': { appId: 'voiceforce', moduleId: 'numbers' },
  '/voiceforce/forwarding': { appId: 'voiceforce', moduleId: 'forwarding' },
  '/voiceforce/campaigns': { appId: 'voiceforce', moduleId: 'campaigns' },
  '/voiceforce/calls': { appId: 'voiceforce', moduleId: 'calls' },
  '/voiceforce/templates': { appId: 'voiceforce', moduleId: 'templates' },
};

export interface ModuleConfig {
    id: string;
    name: string;
    description?: string;
}

export type AppTag = 'Business' | 'Productivity' | 'Marketing' | 'Analytics' | 'Communication' | 'HR' | 'Operations' | 'Custom';

export interface AppConfig {
    id: string;
    name: string;
    icon: any; // Lucide icon component
    description: string;
    tag: AppTag;
    modules: ModuleConfig[];
}

import { 
    LayoutGrid, Smartphone, Globe, ShieldCheck, Database, CreditCard, Bell,
    TrendingUp, FolderKanban, Users, MessageSquare, Landmark, Package, BarChart3, FilePlus2, Megaphone, Search, Plug2, Share2, FolderOpen, LifeBuoy, GitFork, PhoneCall
} from 'lucide-react';

export const APPS_CONFIG: AppConfig[] = [
    { 
        id: 'crm', 
        name: 'CRM & Sales', 
        icon: Globe, 
        tag: 'Business',
        description: 'Lead management, Pipeline, and Revenue tracking',
        modules: [
            { id: 'sales', name: 'Sales Overview' },
            { id: 'leads', name: 'Leads Management' },
            { id: 'pipeline', name: 'Sales Pipeline' },
            { id: 'accounts', name: 'Accounts & Contacts' },
            { id: 'contacts', name: 'Contacts Directory' },
            { id: 'deals', name: 'Deals Tracking' },
            { id: 'quotes', name: 'Quotation System' },
            { id: 'activities', name: 'Engagement Activities' },
            { id: 'contracts', name: 'Contract Management' },
            { id: 'revenue', name: 'Revenue Tracking' },
            { id: 'forecasting', name: 'Sales Forecasting' },
            { id: 'clients', name: 'Client Database' }
        ]
    },
    {
        id: 'traffic-director',
        name: 'Traffic Director',
        icon: GitFork,
        tag: 'Marketing',
        description: 'Smart routing, dynamic landing page delivery, and differential traffic analytics',
        modules: [
            { id: 'overview', name: 'Traffic Overview' },
            { id: 'links', name: 'Smart Links & Rules' },
            { id: 'simulator', name: 'Routing Simulator' },
            { id: 'logs', name: 'Live Stream Logs' },
            { id: 'analytics', name: 'Traffic Analytics' }
        ]
    },
    {
        id: 'advertising',
        name: 'Advertising',
        icon: Megaphone,
        tag: 'Marketing',
        description: 'Dynamic landing pages and tracking configurations',
        modules: [
            { id: 'ad-websites', name: 'Ad Websites' },
            { id: 'pixels', name: 'Pixel Tracking' },
            { id: 'campaigns', name: 'Campaign Stats' },
            { id: 'forms', name: 'Form Builder' }
        ]
    },
    { 
        id: 'projects', 
        name: 'Projects & Tasks', 
        icon: LayoutGrid, 
        tag: 'Productivity',
        description: 'Project management, Task boards, and Goal tracking',
        modules: [
            { id: 'projects', name: 'Project Lists' },
            { id: 'tasks', name: 'Task Boards' },
            { id: 'timetracking', name: 'Time Sheets' },
            { id: 'work-logs', name: 'Work Logs' }
        ]
    },
    { 
        id: 'hr', 
        name: 'Human Resources', 
        icon: Smartphone, 
        tag: 'HR',
        description: 'Employee directory, Payroll, and Attendance',
        modules: [
            { id: 'employees', name: 'Employee Directory' },
            { id: 'attendance', name: 'Attendance System' },
            { id: 'hrms', name: 'HR Operations' },
            { id: 'recruitment', name: 'Job Recruitment' },
            { id: 'onboarding', name: 'Onboarding Flow' },
            { id: 'reviews', name: 'Performance Reviews' },
            { id: 'leaves', name: 'Leave Management' },
            { id: 'holidays', name: 'Holiday Calendar' }
        ]
    },
    { 
        id: 'finance', 
        name: 'Finance & Analytics', 
        icon: Landmark, 
        tag: 'Business',
        description: 'Invoicing, expenses, financial ledger, and platform-wide analytics & reports',
        modules: [
            { id: 'finance-overview', name: 'Finance Dashboard & Ledger' },
            { id: 'transactions', name: 'Transactions Ledger' },
            { id: 'invoices', name: 'Invoicing System' },
            { id: 'bills-and-expenses', name: 'Bills & Expenses' },
            { id: 'expenses', name: 'Expense Tracking' },
            { id: 'analytics', name: 'Platform Analytics' },
            { id: 'reports', name: 'Reports Generator' },
            { id: 'website-analytics', name: 'Website Traffic' },
            { id: 'vendors', name: 'Vendor Directory' },
            { id: 'wallet', name: 'Financial Wallet' },
            { id: 'salary', name: 'Salary Management' }
        ]
    },
    { 
        id: 'communications', 
        name: 'Communications', 
        icon: MessageSquare, 
        tag: 'Communication',
        description: 'Active, real-time internal and external communication.',
        modules: [
            { id: 'chat', name: 'Internal Chat' },
            { id: 'meeting', name: 'Video Meetings' },
            { id: 'emails', name: 'Email Integration' }
        ]
    },
    { 
        id: 'workspace-tools', 
        name: 'Workspace Tools', 
        icon: FolderOpen, 
        tag: 'Productivity',
        description: 'Passive knowledge, resource management, and utilities.',
        modules: [
            { id: 'calendar', name: 'Shared Calendar' },
            { id: 'documents', name: '180 Documents' },
            { id: 'assets', name: 'IT Assets' },
            { id: 'ai-assistant', name: 'AI Assistant' }
        ]
    },

    {
        id: 'social-media',
        name: 'Social Media Management',
        icon: Share2,
        tag: 'Marketing',
        description: 'Content calendar, asset hub, AI brainstormer, and social post visualizer',
        modules: [
            { id: 'content-calendar', name: 'Content Calendar' },
            { id: 'social-media-assets', name: 'Social Media Assets' }
        ]
    },

    {
        id: 'voiceforce',
        name: '180 Voiceforce',
        icon: PhoneCall,
        tag: 'Operations',
        description: 'Autonomous AI voice employees for customer calling, appointments, and order confirmation.',
        modules: [
            { id: 'dashboard', name: 'Voiceforce Dashboard' },
            { id: 'agents', name: 'AI Voice Agents' },
            { id: 'numbers', name: 'Phone Numbers & DIDs' },
            { id: 'forwarding', name: 'Call Forwarding & Queues' },
            { id: 'campaigns', name: 'Call Campaigns' }
        ]
    }
];

export const STARTER_SET = {
    apps: ['crm', 'projects', 'hr', 'finance', 'communications', 'workspace-tools', 'advertising', 'social-media'],
    modules: [
        'sales', 'leads', 'pipeline', 'accounts', 'contacts', 'clients',
        'projects', 'tasks', 'work-logs',
        'employees', 'attendance', 'leaves', 'holidays',
        'finance-overview', 'transactions', 'invoices', 'bills-and-expenses', 'expenses', 'vendors', 'wallet',
        'analytics', 'reports', 'website-analytics',
        'chat', 'meeting', 'emails', 
        'calendar', 'documents', 'assets', 'ai-assistant',
        'content-calendar', 'social-media-assets'
    ]
};

/**
 * Dependency Map
 * Defines which apps require which modules from other apps.
 */
export const APP_DEPENDENCIES: Record<string, string[]> = {
  'projects': ['clients'],
  'finance': ['invoices', 'salary'],
};

export const ALL_APPS = [
    { id: 'system', name: 'Core System', description: 'Essential dashboard and settings modules.', icon: ShieldCheck, color: 'text-gray-500', bgColor: 'bg-gray-100', current: true, core: true },
    { id: 'crm', name: 'CRM & Sales', description: 'Leads, deals, and customer relationship management.', icon: TrendingUp },
    { id: 'projects', name: 'Projects & Tasks', description: 'Project management, tasks, and time tracking.', icon: FolderKanban },
    { id: 'hr', name: 'Human Resources', description: 'Employee management, payroll, and attendance.', icon: Users },
    { id: 'finance', name: 'Finance & Analytics', description: 'Financial ledgers, invoices, bills, expenses, and platform analytics.', icon: Landmark },
    { id: 'communications', name: 'Communications', description: 'Active, real-time internal and external communication.', icon: MessageSquare },
    { id: 'workspace-tools', name: 'Workspace Tools', description: 'Passive knowledge, resource management, and utilities.', icon: FolderOpen },
    { id: 'advertising', name: 'Advertising', description: 'Dynamic landing pages and ad tracking.', icon: Megaphone },
    { id: 'social-media', name: 'Social Media Management', description: 'Content calendar, asset hub, and social post visualizer.', icon: Share2 },
    { id: 'traffic-director', name: 'Traffic Director', description: 'Smart routing, dynamic landing pages, and differential analytics.', icon: GitFork },
    { id: 'voiceforce', name: '180 Voiceforce', description: 'Autonomous AI voice employees for outbound and inbound calling.', icon: PhoneCall },
];
