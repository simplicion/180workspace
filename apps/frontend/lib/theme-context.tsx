'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme as setReduxTheme } from '@/redux/slices/themeSlice';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const STORAGE_KEY = '180_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(resolved: ResolvedTheme) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (resolved === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
    } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const reduxTheme = useSelector((state: any) => state.theme?.current);

    const [theme, setThemeState] = useState<Theme>('light');
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
    const [mounted, setMounted] = useState(false);

    // Initial mount: Read from localStorage or system
    useEffect(() => {
        try {
            const saved = (localStorage.getItem(STORAGE_KEY) as Theme) || (reduxTheme as Theme) || 'light';
            const validTheme: Theme = saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'light';
            const resolved: ResolvedTheme = validTheme === 'system' ? getSystemTheme() : validTheme;
            
            setThemeState(validTheme);
            setResolvedTheme(resolved);
            applyThemeToDOM(resolved);
            dispatch(setReduxTheme(resolved));
        } catch (e) {
            console.error('Failed to initialize theme:', e);
        } finally {
            setMounted(true);
        }
    }, [dispatch, reduxTheme]);

    // Handle theme updates
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        const resolved: ResolvedTheme = newTheme === 'system' ? getSystemTheme() : newTheme;
        setResolvedTheme(resolved);
        applyThemeToDOM(resolved);
        
        try {
            localStorage.setItem(STORAGE_KEY, newTheme);
        } catch (e) {}

        dispatch(setReduxTheme(resolved));
    }, [dispatch]);

    // 1-Click Toggle between Light and Dark
    const toggleTheme = useCallback(() => {
        const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
        setTheme(next);
    }, [resolvedTheme, setTheme]);

    // Listen for OS system theme changes if theme is 'system'
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if (theme === 'system') {
                const sys = getSystemTheme();
                setResolvedTheme(sys);
                applyThemeToDOM(sys);
                dispatch(setReduxTheme(sys));
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, dispatch]);

    // Listen for cross-tab storage changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                const newTheme = e.newValue as Theme;
                if (newTheme === 'dark' || newTheme === 'light' || newTheme === 'system') {
                    setThemeState(newTheme);
                    const resolved: ResolvedTheme = newTheme === 'system' ? getSystemTheme() : newTheme;
                    setResolvedTheme(resolved);
                    applyThemeToDOM(resolved);
                    dispatch(setReduxTheme(resolved));
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [dispatch]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
