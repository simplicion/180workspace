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
  '/dashboard/sales': { appId: 'crm', moduleId: 'sales' },
  '/dashboard/leads': { appId: 'crm', moduleId: 'leads' },
  '/dashboard/advertising': { appId: 'advertising', moduleId: 'ad-websites' },
  '/dashboard/pipeline': { appId: 'crm', moduleId: 'pipeline' },
  '/dashboard/accounts': { appId: 'crm', moduleId: 'accounts' },
  '/dashboard/contacts': { appId: 'crm', moduleId: 'contacts' },
  '/dashboard/opportunities': { appId: 'crm', moduleId: 'opportunities' },
  '/dashboard/clients': { appId: 'crm', moduleId: 'clients', isShared: true }, // Needed by Projects
  '/dashboard/invoices': { appId: 'crm', moduleId: 'invoices', isShared: true }, // Needed by Finance
  
  // Projects & Workflow
  '/dashboard/projects': { appId: 'projects', moduleId: 'projects' },
  '/dashboard/tasks': { appId: 'projects', moduleId: 'tasks' },
  '/dashboard/goals': { appId: 'projects', moduleId: 'goals' },
  '/dashboard/milestones': { appId: 'projects', moduleId: 'milestones' },
  '/dashboard/timetracking': { appId: 'projects', moduleId: 'timetracking' },
  '/dashboard/work-logs': { appId: 'projects', moduleId: 'work-logs' },
  
  // HR Management
  '/dashboard/employees': { appId: 'hr', moduleId: 'employees' },
  '/dashboard/attendance': { appId: 'hr', moduleId: 'attendance' },
  '/dashboard/hrms': { appId: 'hr', moduleId: 'hrms' },
  '/dashboard/leaves': { appId: 'hr', moduleId: 'leaves' },
  '/dashboard/holidays': { appId: 'hr', moduleId: 'holidays' },
  '/dashboard/onboarding': { appId: 'hr', moduleId: 'onboarding' },
  '/dashboard/salary': { appId: 'hr', moduleId: 'salary', isShared: true }, // Needed by Finance
  
  // Finance & Analytics
  '/dashboard/finance': { appId: 'finance', moduleId: 'finance-overview' },
  '/dashboard/expenses': { appId: 'finance', moduleId: 'expenses' },
  '/dashboard/analytics': { appId: 'finance', moduleId: 'analytics' },
  '/dashboard/reports': { appId: 'finance', moduleId: 'reports' },
  
  '/dashboard/assets': { appId: 'assets', moduleId: 'assets' },
  
  // Communication & Productivity Tools
  '/dashboard/chat': { appId: 'tools', moduleId: 'chat' },
  '/dashboard/calendar': { appId: 'tools', moduleId: 'calendar' },
  '/dashboard/content-calendar': { appId: 'tools', moduleId: 'content-calendar' },
  '/dashboard/meeting': { appId: 'tools', moduleId: 'meeting' },
  '/dashboard/emails': { appId: 'tools', moduleId: 'emails' },
  '/dashboard/documents': { appId: 'tools', moduleId: 'documents' },
  '/user-preference': { appId: 'tools', moduleId: 'ai-assistant' }, // AI Assistant lives in prefs for now
};

export interface ModuleConfig {
    id: string;
    name: string;
    description?: string;
}

export interface AppConfig {
    id: string;
    name: string;
    icon: any; // Lucide icon component
    description: string;
    modules: ModuleConfig[];
}

import { 
    LayoutGrid, Smartphone, Globe, ShieldCheck, Database, CreditCard, Bell,
    TrendingUp, FolderKanban, Users, MessageSquare, Landmark, Package, BarChart3, FilePlus2, Megaphone
} from 'lucide-react';

export const APPS_CONFIG: AppConfig[] = [
    { 
        id: 'crm', 
        name: 'CRM & Sales', 
        icon: Globe, 
        description: 'Lead management, Pipeline, and Revenue tracking',
        modules: [
            { id: 'sales', name: 'Sales Overview' },
            { id: 'leads', name: 'Leads Management' },
            { id: 'pipeline', name: 'Sales Pipeline' },
            { id: 'accounts', name: 'Accounts & Contacts' },
            { id: 'contacts', name: 'Contacts Directory' },
            { id: 'opportunities', name: 'Opportunity Tracking' },
            { id: 'quotes', name: 'Quotation System' },
            { id: 'activities', name: 'Engagement Activities' },
            { id: 'contracts', name: 'Contract Management' },
            { id: 'revenue', name: 'Revenue Tracking' },
            { id: 'forecasting', name: 'Sales Forecasting' },
            { id: 'clients', name: 'Client Database' }
        ]
    },
    {
        id: 'advertising',
        name: 'Advertising',
        icon: Megaphone,
        description: 'Dynamic landing pages and tracking configurations',
        modules: [
            { id: 'ad-websites', name: 'Ad Websites' },
            { id: 'pixels', name: 'Pixel Tracking' },
            { id: 'campaigns', name: 'Campaign Stats' }
        ]
    },
    { 
        id: 'projects', 
        name: 'Projects & Tasks', 
        icon: LayoutGrid, 
        description: 'Project management, Task boards, and Goal tracking',
        modules: [
            { id: 'projects', name: 'Project Lists' },
            { id: 'tasks', name: 'Task Boards' },
            { id: 'timetracking', name: 'Time Sheets' },
            { id: 'work-logs', name: 'Work Logs' },
            { id: 'goals', name: 'Milestone Tracking' }
        ]
    },
    { 
        id: 'hr', 
        name: 'Human Resources', 
        icon: Smartphone, 
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
        description: 'Invoicing, Expenses, Salary Ledgers, and Platform Analytics',
        modules: [
            { id: 'finance-overview', name: 'Finance Dashboard' },
            { id: 'invoices', name: 'Invoicing System' },
            { id: 'expenses', name: 'Expense Tracking' },
            { id: 'analytics', name: 'Platform Analytics' },
            { id: 'reports', name: 'Report Generator' },
            { id: 'salary', name: 'Salary Management' }
        ]
    },
    { 
        id: 'assets', 
        name: 'Assets', 
        icon: Database, 
        description: 'Track company assets and property',
        modules: [
            { id: 'assets', name: 'Asset Registry' }
        ]
    },
    { 
        id: 'tools', 
        name: 'Workspace Tools', 
        icon: Bell, 
        description: 'Communication and Productivity tools',
        modules: [
            { id: 'chat', name: 'Internal Chat' },
            { id: 'calendar', name: 'Shared Calendar' },
            { id: 'content-calendar', name: 'AI Content Calendar' },
            { id: 'meeting', name: 'Video Meetings' },
            { id: 'emails', name: 'Email Integration' },
            { id: 'documents', name: 'Document Cloud' },
            { id: 'ai-assistant', name: 'AI Assistant' }
        ]
    }
];

export const STARTER_SET = {
    apps: ['crm', 'projects', 'hr', 'finance', 'tools', 'advertising'],
    modules: [
        'sales', 'leads', 'pipeline', 'accounts', 'contacts', 'clients',
        'projects', 'tasks', 'work-logs',
        'employees', 'attendance', 'leaves', 'holidays',
        'finance-overview', 'invoices', 'expenses',
        'analytics', 'reports',
        'chat', 'calendar', 'emails', 'documents', 'ai-assistant'
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
    { id: 'finance', name: 'Finance & Analytics', description: 'Invoices, expenses, and platform analytics.', icon: Landmark },
    { id: 'assets', name: 'Assets', description: 'Track company assets.', icon: Package },
    { id: 'collaboration', name: 'Collaboration', description: 'Real-time chat and team communication.', icon: MessageSquare },
    { id: 'documents', name: 'Documents', description: 'Cloud storage and document management.', icon: FilePlus2 },
    { id: 'advertising', name: 'Advertising', description: 'Dynamic landing pages and ad tracking.', icon: Megaphone },
];

