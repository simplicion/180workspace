'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import api from './api';

interface Settings {
    companyName: string;
    logoUrl: string;
    themeColor: string;
    webhookUrl?: string;
    webhookSecret?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpSecure?: boolean;
    emailFrom?: string;
    supportEmail?: string;
    lastEmailTestStatus?: 'success' | 'failure' | 'none';
    lastEmailTestDate?: Date | string;
    lastEmailTestError?: string;

    // AI Settings
    aiProvider?: 'none' | 'openai' | 'claude' | 'gemini';
    openaiKey?: string;
    claudeKey?: string;
    geminiKey?: string;
    lastAiTestStatus?: 'success' | 'failure' | 'none';
    lastAiTestDate?: Date | string;
    lastAiTestError?: string;

    // Storage Configuration
    storageMode?: 'cloudinary' | 'google_drive' | 'local';
    googleDriveServiceAccount?: string;
    googleDriveFolderId?: string;
    cloudinaryCloudName?: string;
    cloudinaryApiKey?: string;
    cloudinaryApiSecret?: string;
    lastStorageTestStatus?: 'success' | 'failure' | 'none';
    lastStorageTestDate?: Date | string;
    lastStorageTestError?: string;

    // Database Configuration
    dbHost?: string;
    dbPort?: number;
    dbUser?: string;
    dbPass?: string;
    dbName?: string;
    dbSrv?: boolean;
    useManualUri?: boolean;
    manualUri?: string;
    lastDbTestStatus?: 'success' | 'failure' | 'none';
    lastDbTestDate?: Date | string;
    lastDbTestError?: string;

    // Additional CRM Settings
    googleSheetsId?: string;
    salesConfig?: any;
    plausibleApiKey?: string;
    plausibleSiteId?: string;
}

export interface CompanyConfig {
    companyName: string;
    companyLogo: string;
    emailLogo: string;
    tagline: string;
    brandColor: string;
    websiteUrl: string;
    companyEmail: string;
    supportEmail: string;
    phoneNumber: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    gstNumber: string;
    registrationNumber: string;
    bankName: string;
    accountHolderName: string;
    bankAccountNumber: string;
    ifscCode: string;
    authorizedSignatory: string;
    designation: string;
    signatureImage: string;
    salaryReleaseDate?: number;
    workingDaysPerMonth?: number;
    enabledApps?: string[];
    enabledModules?: string[];
    databaseConfigured?: boolean; // Meta status for setup
    
    // Attendance Settings
    standardStartTime?: string;
    standardEndTime?: string;
    gracePeriod?: number;
}

export interface PlatformBranding {
    name: string;
    platformName?: string; // Alias used in some layouts
    logo: string;
    favicon: string;
    email: string;
    phone: string;
    currency: string;
    themeColor: string;
    tagline: string;
    legalName: string;
    address: string;
    website: string;
    supportEmail?: string;
    isTenant: boolean;
}

interface SettingsContextType {
    settings: Settings;
    company: CompanyConfig | null;
    platform: PlatformBranding | null;
    refreshSettings: (forceFetch?: boolean) => Promise<void>;
    isLoading: boolean;
}

const defaultSettings: Settings = {
    companyName: 'Internal Management System',
    logoUrl: '',
    themeColor: '#4f46e5',
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    company: null,
    platform: null,
    refreshSettings: async () => { },
    isLoading: true,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [company, setCompany] = useState<CompanyConfig | null>(null);
    const [platform, setPlatform] = useState<PlatformBranding | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ── Theme Color Helpers ─────────────────────────────────────────────────────
    function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const cleaned = hex.replace(/^#/, '');
        if (cleaned.length === 3) {
            const r = parseInt(cleaned[0] + cleaned[0], 16);
            const g = parseInt(cleaned[1] + cleaned[1], 16);
            const b = parseInt(cleaned[2] + cleaned[2], 16);
            return { r, g, b };
        }
        if (cleaned.length === 6) {
            const r = parseInt(cleaned.slice(0, 2), 16);
            const g = parseInt(cleaned.slice(2, 4), 16);
            const b = parseInt(cleaned.slice(4, 6), 16);
            return { r, g, b };
        }
        return null;
    }

    const applyThemeColor = useCallback((hex: string) => {
        if (typeof window === 'undefined') return;
        const rgb = hexToRgb(hex);
        if (!rgb) return;
        // Primary channels — used by Tailwind: bg-primary, text-primary, ring-primary, etc.
        document.documentElement.style.setProperty('--primary-rgb', `${rgb.r} ${rgb.g} ${rgb.b}`);
        // Slightly darkened version for hover states (bg-primary-dark)
        const darkR = Math.max(0, rgb.r - 20);
        const darkG = Math.max(0, rgb.g - 20);
        const darkB = Math.max(0, rgb.b - 20);
        document.documentElement.style.setProperty('--primary-dark-rgb', `${darkR} ${darkG} ${darkB}`);
        // Also set hex for any direct CSS var(--theme-color) usages
        document.documentElement.style.setProperty('--theme-color', hex);
    }, []);

    const { user, token } = (function useAuthSafe() {
        try {
            return require('./auth-context').useAuth();
        } catch {
            return { user: null, token: null };
        }
    })();

    const refreshSettings = useCallback(async (forceFetch: boolean = false) => {
        try {
            const isPublicPath = typeof window !== 'undefined' && ['/login', '/signup', '/workspace-setup'].includes(window.location.pathname);
            const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null);

            if (!activeToken && !isPublicPath) {
                // If no token and not public, we can't fetch private settings yet
                setIsLoading(false);
                return;
            }

            const applyData = (newSettings: any, newCompany: any, platformBranding: any) => {
                setSettings(newSettings || defaultSettings);
                setCompany(newCompany || null);
                setPlatform(platformBranding || null);

                if (typeof window !== 'undefined') {
                    const themeColor = newCompany?.brandColor || platformBranding?.themeColor || newSettings?.themeColor;
                    if (themeColor) applyThemeColor(themeColor);

                    const title = newCompany?.companyName || platformBranding?.name || newSettings?.companyName || 'Platform';
                    document.title = `${title} — Management System`;

                    const favicon = newCompany?.companyLogo || platformBranding?.favicon || platformBranding?.logo || newSettings?.logoUrl;
                    if (favicon) {
                        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
                        if (!link) {
                            link = document.createElement('link');
                            link.rel = 'icon';
                            document.getElementsByTagName('head')[0].appendChild(link);
                        }
                        link.href = favicon;
                    }
                }
                setIsLoading(false);
            };

            // 1. Check if AuthContext already fetched our data via /api/init
            if (!forceFetch && activeToken && typeof window !== 'undefined') {
                try {
                    const stored = sessionStorage.getItem('platform_init_data');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed.settings || parsed.companyConfig || parsed.platform) {
                            applyData(parsed.settings, parsed.companyConfig, parsed.platform);
                            return; // Skip API calls!
                        }
                    }
                } catch (e) {}
            }

            // 2. Fallback: standard API calls (mostly for public routes)
            const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            let workspace = urlParams.get('workspace') || urlParams.get('subdomain') || '';

            if (!workspace && typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                const parts = hostname.split('.');
                if (parts.length > 2) {
                    const sub = parts[0];
                    if (!['www', 'ims', 'api', 'admin', 'app', 'localhost'].includes(sub)) {
                        workspace = sub;
                    }
                }
            }

            const [settingsRes, companyRes, platformRes] = await Promise.all([
                (activeToken) ? api.get('/api/settings').catch(() => ({ data: { settings: null } })) : Promise.resolve({ data: { settings: null } }),
                (activeToken) ? api.get('/api/company-config').catch(() => ({ data: { config: null } })) : Promise.resolve({ data: { config: null } }),
                api.get(`/api/public/branding${workspace ? `?workspace=${workspace}` : ''}`).catch(() => ({ data: null }))
            ]);

            if (activeToken && typeof window !== 'undefined') {
                try {
                    const stored = sessionStorage.getItem('platform_init_data');
                    let parsed = stored ? JSON.parse(stored) : {};
                    parsed.settings = settingsRes.data.settings;
                    parsed.companyConfig = companyRes.data.config;
                    if (platformRes.data) parsed.platform = platformRes.data;
                    sessionStorage.setItem('platform_init_data', JSON.stringify(parsed));
                } catch(e) {}
            }

            applyData(settingsRes.data.settings, companyRes.data.config, platformRes.data);
            
        } catch (error) {
            console.error('Failed to fetch settings/company-config:', error);
            setIsLoading(false);
        }
    }, [token, applyThemeColor]);

    useEffect(() => {
        // Only run on explicit token change, and use ref to prevent duplicate calls
        refreshSettings();
        
        // Listen for AuthContext broadcasting fresh data
        const handleInit = () => refreshSettings();
        if (typeof window !== 'undefined') {
            window.addEventListener('platform_init_ready', handleInit);
            return () => window.removeEventListener('platform_init_ready', handleInit);
        }
    }, [token, refreshSettings]);


    return (
        <SettingsContext.Provider value={{ settings, company, platform, refreshSettings, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);
