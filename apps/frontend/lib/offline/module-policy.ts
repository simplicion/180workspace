/**
 * Offline availability of every part of the workspace: ONE table that drives
 *   - which GET responses may be cached on the device (read offline),
 *   - which screen a user sees when they are offline (a working screen, saved data, or an explanation),
 *   - what the docs and the sales page may claim.
 *
 * Tiers
 *   full         read from saved data AND make changes that sync later (see queue-policy.ts for what can be written)
 *   read         open and browse what was saved on this device; changes need a connection
 *   online-only  needs a live connection (real-time or sensitive); an explanation is shown instead of a broken screen
 *   desktop      runs only in the desktop app (works with no internet there; browsers are told to install the app)
 *
 * Sensitive data (payroll, wallet, finance, vaults, tokens) is never written to the device cache: the local database is
 * not encrypted at rest yet (docs/offline-desktop/PRODUCTION_PLAN.md, Phase 5). Those modules are online-only until it is.
 */

export type OfflineTier = 'full' | 'read' | 'online-only' | 'desktop';

export interface OfflineModule {
  id: string;
  label: string;
  /** First path segment(s) of the module's screens, e.g. "/tasks". */
  routes: string[];
  tier: OfflineTier;
  /**
   * API path prefixes (`/api/...`, version folded) whose GET responses may be cached. Only for `full` / `read`.
   * A trailing `$` means "this exact path only" (no sub-paths).
   */
  readApi: string[];
  /** Shown to the user. */
  note: string;
}

export const OFFLINE_MODULES: OfflineModule[] = [
  {
    id: 'dashboard', label: 'Dashboard', routes: ['/dashboard'], tier: 'read',
    readApi: ['/api/init', '/api/employee/dashboard', '/api/goals', '/api/activity', '/api/calendar'],
    note: 'Shows what was saved the last time you were online.',
  },
  {
    id: 'projects-and-tasks', label: 'Projects & Tasks', routes: ['/projects', '/tasks', '/activity', '/work-logs'], tier: 'full',
    readApi: ['/api/projects', '/api/tasks', '/api/modules', '/api/activity', '/api/work-logs'],
    note: 'Create, edit and delete tasks and projects offline; they sync when you reconnect.',
  },
  {
    id: 'crm-and-sales', label: 'CRM & Sales', routes: ['/clients', '/sales'], tier: 'full',
    readApi: ['/api/clients', '/api/sales', '/api/crm-and-sales'],
    note: 'Browse clients and leads; add and edit clients and leads offline.',
  },
  {
    id: 'hr-management', label: 'HR', routes: ['/employees', '/hr', '/attendance'], tier: 'read',
    // `$` = exact path only: the directory list is cached, individual employee records (which can carry compensation
    // and bank details) are not.
    readApi: ['/api/users$', '/api/leaves', '/api/attendance', '/api/employee/dashboard', '/api/holidays', '/api/designations'],
    note: 'Browse the team directory and leave records; apply for or cancel leave offline. Payroll stays online.',
  },
  {
    id: 'finance', label: 'Finance', routes: ['/finance', '/invoices', '/bills-and-expenses', '/vendors', '/wallet'], tier: 'online-only',
    readApi: [],
    note: 'Financial data is not stored on this device until encryption at rest is available.',
  },
  {
    id: 'insights', label: 'Insights & Reports', routes: ['/analytics', '/reports'], tier: 'online-only',
    readApi: [],
    note: 'Reports are computed live from your data and can include financial figures.',
  },
  {
    id: 'company-hub', label: 'Company Hub', routes: ['/company'], tier: 'read',
    readApi: ['/api/company-config', '/api/company'],
    note: 'Shows what was saved the last time you were online.',
  },
  {
    id: 'service-desk', label: 'Help & Support', routes: ['/help-support'], tier: 'online-only',
    readApi: [],
    note: 'Support chat is live and needs a connection.',
  },
  {
    id: 'settings', label: 'Settings & Profile', routes: ['/settings', '/profile'], tier: 'online-only',
    readApi: [],
    note: 'Settings include billing, integrations and security, so they need a connection.',
  },
  {
    id: 'social-media', label: 'Social Media', routes: ['/content-calendar', '/social-projects', '/social-media-assets'], tier: 'read',
    readApi: ['/api/social-media/projects', '/api/social-media/posts', '/api/content-calendar'],
    note: 'Browse projects and the content calendar; publishing needs a connection.',
  },
  {
    id: 'social-inbox', label: 'Social Inbox', routes: ['/inbox'], tier: 'online-only',
    readApi: [],
    note: 'Messages are live conversations and are not stored on this device.',
  },
  {
    id: 'advertising', label: 'Advertising & Forms', routes: ['/advertising', '/forms'], tier: 'read',
    readApi: ['/api/websites', '/api/forms'],
    note: 'Browse your sites and forms; publishing needs a connection.',
  },
  {
    id: 'traffic-director', label: 'Traffic Director', routes: ['/traffic-director'], tier: 'read',
    readApi: ['/api/traffic-director/links', '/api/traffic-director/overview'],
    note: 'Browse links; analytics and redirects are served live.',
  },
  {
    id: 'communications', label: 'Chat, Email & Meetings', routes: ['/chat', '/emails', '/meeting'], tier: 'online-only',
    readApi: [],
    note: 'Real-time communication needs a live connection.',
  },
  {
    id: 'voiceforce', label: 'Voiceforce', routes: ['/voiceforce'], tier: 'online-only',
    readApi: [],
    note: 'Calling needs a live connection.',
  },
  {
    id: 'ai', label: 'AI Assistant', routes: ['/ai'], tier: 'online-only',
    readApi: [],
    note: 'The AI assistant runs in the cloud.',
  },
  {
    id: 'documents', label: 'Documents & Files', routes: ['/documents', '/document-editor', '/document-viewer', '/assets', '/calendar'], tier: 'read',
    readApi: ['/api/workspace-tools/documents', '/api/assets', '/api/files', '/api/calendar'],
    note: 'Open documents and files you have viewed before; editing needs a connection.',
  },
  {
    id: 'media-editor', label: 'Video Editing', routes: ['/media-editor', '/video-studio'], tier: 'desktop',
    readApi: [],
    note: 'Video editing runs in the desktop app, including with no internet connection.',
  },
];

// Never cached, even if they sit under a cacheable prefix. Defence in depth for the sensitive data listed above.
const NEVER_CACHE: RegExp[] = [
  /\/(salary|payroll|payslips?)(\/|$)/i,
  /\/wallet(\/|$)/i,
  /\/vaults?(\/|$)/i,
  /\/(auth|tokens?|secrets?|passwords?|api-keys?|credentials?)(\/|$)/i,
  /\/(integrations|system-configs|superadmin)(\/|$)/i,
  /\/(platform-billing|billing|invoices|expenses|bills|vendors)(\/|$)/i,
  /\/analytics\/financial(\/|$)/i,
  /\/(inbox|chat|messages|voiceforce|meeting)(\/|$)/i,
  /\/social-media\/accounts(\/|$)/i,
];

const prefixMatches = (path: string, prefix: string) =>
  prefix.endsWith('$') ? path === prefix.slice(0, -1) : path === prefix || path.startsWith(prefix + '/');

/** Module that owns a page route (`/tasks/abc` -> Projects & Tasks), or null (login, marketing, unknown). */
export function moduleForRoute(pathname: string | null | undefined): OfflineModule | null {
  if (!pathname) return null;
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/') return OFFLINE_MODULES.find((m) => m.id === 'dashboard') ?? null;
  return OFFLINE_MODULES.find((m) => m.routes.some((r) => prefixMatches(path, r))) ?? null;
}

/** May a GET of this (normalised, `/api/...`) path be cached on the device? */
export function isReadCacheablePath(path: string): boolean {
  if (NEVER_CACHE.some((re) => re.test(path))) return false;
  return OFFLINE_MODULES.some((m) => (m.tier === 'full' || m.tier === 'read') && m.readApi.some((p) => prefixMatches(path, p)));
}

export function tierLabel(tier: OfflineTier): string {
  return { full: 'Works offline', read: 'View offline', 'online-only': 'Needs internet', desktop: 'Desktop app' }[tier];
}
