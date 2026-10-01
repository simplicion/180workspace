'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

export interface SiteNavLink {
    id: string;
    name: string;
    href: string;
    active?: boolean;
}

/**
 * Hamburger navigation for narrow screens (shown by the `.site-nav-toggle` container rule below 768px).
 * Escape and link clicks close it; focus returns to the toggle.
 */
export function SiteMobileNav({ links, backgroundColor, color }: { links: SiteNavLink[]; backgroundColor?: string; color?: string }) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    if (!links.length) return null;

    return (
        <div className="site-nav-toggle">
            <button
                ref={buttonRef}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={open ? 'Close menu' : 'Open menu'}
                onClick={() => setOpen((v) => !v)}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
                style={{ color: 'inherit' }}
            >
                {open ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
            </button>
            <nav
                id={panelId}
                aria-label="Main"
                hidden={!open}
                className="absolute left-0 right-0 top-full border-b border-black/10 shadow-lg backdrop-blur-md"
                // Header colours are often translucent (default light theme is 80% white); layer them over a solid base
                // so page content never shows through the open menu.
                style={{
                    backgroundColor: '#ffffff',
                    backgroundImage: backgroundColor ? `linear-gradient(${backgroundColor}, ${backgroundColor})` : undefined,
                    color: color || 'inherit',
                }}
            >
                <ul className="flex flex-col py-2">
                    {links.map((l) => (
                        <li key={l.id}>
                            <a
                                href={l.href}
                                aria-current={l.active ? 'page' : undefined}
                                onClick={() => setOpen(false)}
                                className={`flex items-center min-h-[44px] px-6 text-base font-semibold ${l.active ? 'underline underline-offset-4' : 'opacity-90 hover:opacity-100'}`}
                                style={{ color: 'inherit' }}
                            >
                                {l.name}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}
