'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import api from './api';
import { useAuth } from './auth-context';

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
    aiProvider?: 'none' | 'openai' | 'claude' | 'gemini' | 'custom';
    openaiKey?: string;
    claudeKey?: string;
    geminiKey?: string;
    customAiUrl?: string;
    customAiKey?: string;
    customAiModel?: string;
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
    metadata?: any;
}

export interface CompanyConfig {
    companyName: string;
    companyLogo: string;
    emailLogo: string;
    tagline: string;
    brandColor: string;
    currency: string;
    currencySymbol: string;
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
    isCompany: boolean;
}

interface SettingsContextType {
    settings: Settings;
    company: CompanyConfig | null;
    platform: PlatformBranding | null;
    featureFlags: Record<string, boolean>;
    disabledApps: string[];
    isAppDisabledByAdmin: (appId: string) => boolean;
    refreshSettings: (forceFetch?: boolean) => Promise<void>;
    isLoading: boolean;
}

const defaultSettings: Settings = {
    companyName: '180workspace',
    logoUrl: '',
    themeColor: '#4f46e5',
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    company: null,
    platform: null,
    featureFlags: {},
    disabledApps: [],
    isAppDisabledByAdmin: () => false,
    refreshSettings: async () => { },
    isLoading: true,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [company, setCompany] = useState<CompanyConfig | null>(null);
    const [platform, setPlatform] = useState<PlatformBranding | null>(null);
    const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
    const [disabledApps, setDisabledApps] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isAppDisabledByAdmin = useCallback((appId: string): boolean => {
        if (!appId) return false;
        const cleanId = appId.toLowerCase().trim();
        if (disabledApps.includes(cleanId)) return true;
        const snakeId = cleanId.replace(/-/g, '_');
        if (disabledApps.includes(snakeId)) return true;
        if (featureFlags[`app_${snakeId}`] === false) return true;
        if (featureFlags[cleanId] === false) return true;
        return false;
    }, [disabledApps, featureFlags]);

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

    const { user, token, isLoading: isAuthLoading } = useAuth();

    const isFetchingRef = useRef(false);

    const refreshSettings = useCallback(async (forceFetch: boolean = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const isPublicPath = typeof window !== 'undefined' && ['/login', '/signup', '/workspace-setup'].includes(window.location.pathname);
            const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null);

            if (!activeToken && !isPublicPath) {
                // If no token and not public, we can't fetch private settings yet
                setIsLoading(false);
                return;
            }

            const applyData = (newSettings: any, newCompany: any, platformBranding: any, flags?: any, disabled?: string[]) => {
                setSettings(newSettings || defaultSettings);
                setCompany(newCompany || null);
                setPlatform(platformBranding || null);
                if (flags) setFeatureFlags(flags);
                if (disabled) setDisabledApps(disabled);

                if (typeof window !== 'undefined') {
                    // Update session storage so the cache stays fresh
                    const stored = sessionStorage.getItem('platform_init_data');
                    const parsed = stored ? JSON.parse(stored) : {};
                    parsed.settings = newSettings;
                    parsed.companyConfig = newCompany;
                    parsed.platform = platformBranding;
                    if (flags) parsed.featureFlags = flags;
                    if (disabled) parsed.disabledApps = disabled;
                    sessionStorage.setItem('platform_init_data', JSON.stringify(parsed));

                    const themeColor = newCompany?.brandColor || platformBranding?.themeColor || newSettings?.themeColor;
                    if (themeColor) applyThemeColor(themeColor);
                }
                setIsLoading(false);
            };

            // 1. Check if AuthContext already fetched our data via /api/init
            if (!forceFetch && activeToken && typeof window !== 'undefined') {
                try {
                    const stored = sessionStorage.getItem('platform_init_data');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed.settings || parsed.companyConfig || parsed.platform || parsed.featureFlags) {
                            applyData(
                                parsed.settings, 
                                parsed.companyConfig, 
                                parsed.platform, 
                                parsed.featureFlags || {}, 
                                parsed.disabledApps || []
                            );
                            return; // Skip API calls!
                        }
                    }
                } catch (e) {}
            }

            // If AuthContext is currently loading the /api/init endpoint, do not fire fallback APIs.
            // We will just wait for the `platform_init_ready` event to trigger this again.
            if (!forceFetch && activeToken && isAuthLoading) {
                return;
            }

            // 2. Fallback: standard API calls (mostly for public routes or manual refreshes)
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

            const [settingsRes, companyRes, platformRes, flagsRes] = await Promise.all([
                (activeToken) ? api.get('/api/settings').catch(() => ({ data: { settings: null } })) : Promise.resolve({ data: { settings: null } }),
                (activeToken) ? api.get('/api/company-config').catch(() => ({ data: { config: null } })) : Promise.resolve({ data: { config: null } }),
                api.get(`/api/public/branding${workspace ? `?workspace=${workspace}` : ''}`).catch(() => ({ data: null })),
                api.get('/api/feature-flags').catch(() => ({ data: { flags: {}, disabledApps: [] } }))
            ]);

            const flagsData = flagsRes?.data || {};

            if (activeToken && typeof window !== 'undefined') {
                try {
                    const stored = sessionStorage.getItem('platform_init_data');
                    const parsed = stored ? JSON.parse(stored) : {};
                    parsed.settings = settingsRes.data.settings;
                    parsed.companyConfig = companyRes.data.config;
                    if (platformRes.data) parsed.platform = platformRes.data;
                    parsed.featureFlags = flagsData.flags || {};
                    parsed.disabledApps = flagsData.disabledApps || [];
                    sessionStorage.setItem('platform_init_data', JSON.stringify(parsed));
                } catch(e) {}
            }

            applyData(
                settingsRes.data.settings, 
                companyRes.data.config, 
                platformRes.data,
                flagsData.flags || {},
                flagsData.disabledApps || []
            );
            
        } catch (error) {
            console.error('Failed to fetch settings/company-config:', error);
            setIsLoading(false);
        } finally {
            isFetchingRef.current = false;
        }
    }, [token, applyThemeColor, isAuthLoading]);

    useEffect(() => {
        // Only run on explicit token change, and use ref to prevent duplicate calls
        refreshSettings();
        
        // Listen for AuthContext broadcasting fresh data
        const handleInit = (e: any) => {
            const detail = e?.detail;
            if (detail?.featureFlags || detail?.disabledApps) {
                if (detail.featureFlags) setFeatureFlags(detail.featureFlags);
                if (detail.disabledApps) setDisabledApps(detail.disabledApps);
            }
            refreshSettings();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('platform_init_ready', handleInit);
            return () => window.removeEventListener('platform_init_ready', handleInit);
        }
    }, [token, refreshSettings]);

    return (
        <SettingsContext.Provider value={{ 
            settings, 
            company, 
            platform, 
            featureFlags,
            disabledApps,
            isAppDisabledByAdmin,
            refreshSettings, 
            isLoading 
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);

