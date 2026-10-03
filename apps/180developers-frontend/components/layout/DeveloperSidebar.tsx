'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Layers,
  Code2,
  Webhook,
  FileCode2,
  LogOut,
  X,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { AILogoIcon, Button } from '@workspace/ui';

export interface DeveloperSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  userProfile?: {
    name?: string;
    email?: string;
    username?: string;
  } | null;
  onSignOut: () => void;
  appCount: number;
  onOpenRegisterModal?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'purple' | 'amber' | 'zinc';
  isExternal?: boolean;
  href?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function DeveloperSidebar({
  activeTab,
  onTabChange,
  isMobileOpen,
  onMobileClose,
  userProfile,
  onSignOut,
  appCount,
  onOpenRegisterModal,
}: DeveloperSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isInsideAppDetail = pathname.startsWith('/apps');

  const navSections: NavSection[] = [
    {
      title: 'Command',
      items: [
        {
          id: 'apps',
          label: 'Applications',
          icon: Layers,
          badge: appCount > 0 ? `${appCount}` : undefined,
          badgeColor: 'blue',
        },
      ],
    },
    {
      title: 'Developer Tools',
      items: [
        {
          id: 'playground',
          label: 'API Playground',
          icon: Code2,
          badge: 'Interactive',
          badgeColor: 'amber',
        },
        {
          id: 'webhooks',
          label: 'Webhook Simulator',
          icon: Webhook,
          badge: 'HMAC-SHA256',
          badgeColor: 'purple',
        },
        {
          id: 'docs',
          label: 'API Docs & SDKs',
          icon: FileCode2,
          isExternal: true,
          href: '/docs',
        },
      ],
    },
  ];

  const handleItemClick = (item: NavItem) => {
    if (item.isExternal && item.href) {
      router.push(item.href);
      onMobileClose();
      return;
    }

    if (isInsideAppDetail) {
      router.push(`/dashboard?tab=${item.id}`);
    } else {
      onTabChange(item.id);
    }
    onMobileClose();
  };

  const getBadgeClasses = (color: NavItem['badgeColor'] = 'zinc') => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'emerald':
        return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'amber':
        return 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10';
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-[#101012] border-r border-zinc-200/80 dark:border-white/10 select-none">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3 group min-h-[44px] focus:outline-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[1.5px] shadow-sm group-hover:scale-105 transition-all duration-300 shrink-0">
            <div className="w-full h-full bg-white dark:bg-[#101012] rounded-[14px] flex items-center justify-center p-2">
              <AILogoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300 shrink-0" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-zinc-950 dark:text-white">
                180<span className="text-blue-600 dark:text-blue-400 font-semibold ml-0.5">Developers</span>
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Sovereign Console
            </p>
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onMobileClose}
          className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Close Navigation"
          aria-label="Close Navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Action: Register App CTA */}
      {onOpenRegisterModal && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <Button
            onClick={() => {
              onOpenRegisterModal();
              onMobileClose();
            }}
            size="sm"
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>Register New App</span>
          </Button>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 text-xs">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive =
                !item.isExternal &&
                (activeTab === item.id || (item.id === 'apps' && isInsideAppDetail));
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold group cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/30 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                      }`}
                    />
                    <span className="truncate text-left">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClasses(
                          item.badgeColor
                        )}`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.isExternal && (
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400 opacity-60" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Developer Account Profile Widget */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-950/50 shrink-0">
        <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            {userProfile?.name?.[0]?.toUpperCase() ||
              userProfile?.email?.[0]?.toUpperCase() ||
              'D'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
              {userProfile?.name || 'Developer'}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-mono">
              {userProfile?.email || '@developer'}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out of Developer Console"
            aria-label="Sign Out"
            className="p-2 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 lg:w-72 flex-col fixed inset-y-0 left-0 z-40 shadow-xs">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
          onClick={onMobileClose}
        >
          <div
            className="w-72 max-w-[85vw] h-full shadow-2xl transition-transform duration-300 animate-in slide-in-from-left"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
}

export default DeveloperSidebar;
