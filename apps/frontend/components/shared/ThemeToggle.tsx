'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, Theme } from '@/lib/theme-context';
import clsx from 'clsx';

export default function ThemeToggle({ className }: { className?: string }) {
    const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
    const [openMenu, setOpenMenu] = useState(false);
    const [mounted, setMounted] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenu(false);
            }
        }
        if (openMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenu]);

    const isDark = resolvedTheme === 'dark';

    // Prevent hydration mismatch on initial render
    if (!mounted) {
        return (
            <div className={clsx("w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200/50 dark:border-zinc-800/80 animate-pulse", className)} />
        );
    }

    const themeOptions: { id: Theme; label: string; icon: React.ElementType; desc: string }[] = [
        { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean paper white' },
        { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Obsidian true black' },
        { id: 'system', label: 'System Theme', icon: Laptop, desc: 'Sync with OS' },
    ];

    return (
        <div ref={menuRef} className={clsx("relative inline-block text-left select-none", className)}>
            {/* Quick 1-Click Toggle Button + Right Click/Arrow for options */}
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={toggleTheme}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setOpenMenu(v => !v);
                    }}
                    aria-label={`Current theme is ${theme}. Click to switch to ${isDark ? 'Light' : 'Dark'} mode.`}
                    title={isDark ? "Switch to Light Mode" : "Switch to Obsidian Dark Mode"}
                    className={clsx(
                        "relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                        "border shadow-sm",
                        isDark 
                            ? "bg-zinc-900/90 hover:bg-zinc-800 border-zinc-800 text-amber-400 hover:text-amber-300 hover:shadow-[0_0_15px_rgba(251,191,36,0.15)]" 
                            : "bg-gray-100/90 hover:bg-indigo-50 border-gray-200/60 text-gray-600 hover:text-indigo-600 hover:shadow-indigo-500/10"
                    )}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {isDark ? (
                            <motion.div
                                key="moon"
                                initial={{ rotate: -45, scale: 0, opacity: 0 }}
                                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                                exit={{ rotate: 45, scale: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="flex items-center justify-center"
                            >
                                <Moon className="w-4 h-4 fill-amber-400/20 text-amber-400" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="sun"
                                initial={{ rotate: 45, scale: 0, opacity: 0 }}
                                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                                exit={{ rotate: -45, scale: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="flex items-center justify-center"
                            >
                                <Sun className="w-4 h-4 fill-amber-500/20 text-amber-500" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>
            </div>

            {/* Context Dropdown Menu for Explicit Selection (Light / Dark / System) */}
            <AnimatePresence>
                {openMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={clsx(
                            "absolute right-0 top-11 w-52 rounded-2xl p-1.5 z-50 shadow-2xl",
                            "backdrop-blur-xl border",
                            "bg-white/95 border-gray-100 text-gray-800 shadow-gray-200/60",
                            "dark:bg-zinc-950/95 dark:border-zinc-800 dark:text-zinc-100 dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                        )}
                    >
                        <div className="px-3 py-1.5 mb-1 border-b border-gray-100 dark:border-zinc-800/80">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                                Appearance Mode
                            </p>
                        </div>

                        <div className="space-y-0.5">
                            {themeOptions.map((opt) => {
                                const Icon = opt.icon;
                                const isSelected = theme === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            setTheme(opt.id);
                                            setOpenMenu(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                                            isSelected 
                                                ? "bg-indigo-50 text-indigo-600 dark:bg-zinc-800/90 dark:text-zinc-100 font-bold" 
                                                : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Icon className={clsx(
                                                "w-4 h-4",
                                                isSelected 
                                                    ? "text-indigo-600 dark:text-amber-400" 
                                                    : "text-gray-400 dark:text-zinc-500"
                                            )} />
                                            <div className="text-left">
                                                <p className="leading-tight">{opt.label}</p>
                                                <p className="text-[10px] font-normal text-gray-400 dark:text-zinc-500">{opt.desc}</p>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-amber-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
