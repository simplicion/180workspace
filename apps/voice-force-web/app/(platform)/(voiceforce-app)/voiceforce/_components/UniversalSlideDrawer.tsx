'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';

export { Drawer } from '@/components/ui/Drawer';

export interface UniversalSlideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ElementType | React.ReactNode;
  iconColorClass?: string;
  iconBgClass?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
  maxWidth?: string;
  onSubmit?: (e: React.FormEvent) => void;
  bodyClassName?: string;
}

/**
 * UniversalSlideDrawer
 * Wraps and standardizes our workspace's universal Drawer (@/components/ui/Drawer)
 * with animated framer-motion slide-over, full-screen portal backdrop, form submission support,
 * and high-contrast dual-theme SaaS Pro Max styling.
 */
export function UniversalSlideDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  icon: IconProp,
  iconColorClass = 'text-indigo-600 dark:text-indigo-400',
  iconBgClass = 'bg-indigo-50 dark:bg-indigo-950/60',
  children,
  footer,
  maxWidthClass,
  maxWidth = 'max-w-xl',
  onSubmit,
  bodyClassName
}: UniversalSlideDrawerProps) {
  const widthClass = maxWidthClass || maxWidth;
  const desc = subtitle || description;

  let renderedIcon: React.ReactNode = null;
  if (React.isValidElement(IconProp)) {
    renderedIcon = IconProp;
  } else if (IconProp) {
    const IconComponent = IconProp as React.ElementType;
    renderedIcon = (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-gray-800 ${iconBgClass}`}>
        <IconComponent className={`w-5 h-5 ${iconColorClass}`} />
      </div>
    );
  }

  const content = onSubmit ? (
    <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 space-y-6">
      <div className={`flex-1 min-h-0 space-y-6 ${bodyClassName || ''}`}>
        {children}
      </div>
      {footer && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0">
          {footer}
        </div>
      )}
    </form>
  ) : (
    <div className={`flex flex-col flex-1 min-h-0 space-y-6 ${bodyClassName || ''}`}>
      {children}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={desc}
      icon={renderedIcon}
      maxWidth={widthClass}
      footer={onSubmit ? undefined : footer}
      noPadding={false}
    >
      {content}
    </Drawer>
  );
}

export default UniversalSlideDrawer;
