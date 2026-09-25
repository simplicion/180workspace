import type {
    BrandConsciousness,
    BrandConsciousnessPatch,
    BrandPlatform,
    BrandType,
    CaptionStylePreset,
} from '@/lib/services/social-project.service';

/** Mirrors BRAND_FONTS in packages/domains/social-media/src/brand-consciousness.ts (all Google Fonts families). */
export const BRAND_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway', 'Nunito', 'Work Sans', 'DM Sans',
    'Manrope', 'Plus Jakarta Sans', 'Outfit', 'Space Grotesk', 'IBM Plex Sans', 'Rubik', 'Barlow', 'Archivo',
    'Oswald', 'Bebas Neue', 'Anton', 'Playfair Display', 'Merriweather', 'Lora', 'Source Serif 4', 'DM Serif Display',
] as const;

export const BRAND_TYPE_OPTIONS: { id: BrandType; label: string; desc: string }[] = [
    { id: 'company', label: 'Company', desc: 'A business or product brand. Content speaks for the organisation.' },
    { id: 'creator', label: 'Creator', desc: 'A personal brand. Content is in one person’s own voice.' },
    { id: 'agency', label: 'Agency', desc: 'A service business showing its work and expertise.' },
];

export const PLATFORM_OPTIONS: { id: BrandPlatform; label: string }[] = [
    { id: 'instagram', label: 'Instagram' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'twitter', label: 'X (Twitter)' },
];

export const CAPTION_PRESET_OPTIONS: { id: CaptionStylePreset; label: string; desc: string }[] = [
    { id: 'MINIMAL_SUBTITLE', label: 'Minimal', desc: 'Clean subtitles, low on screen' },
    { id: 'ALI_ABDAAL_CLEAN', label: 'Clean', desc: 'Calm, readable, word highlights' },
    { id: 'HORMOZI_BOUNCE', label: 'Bold bounce', desc: 'Large animated words' },
    { id: 'BOLD_CENTER', label: 'Bold centre', desc: 'Big centred statements' },
];

/** Suggestions only: nothing is pre-selected for the user. */
export const TONE_SUGGESTIONS = ['Warm & friendly', 'Bold & direct', 'Calm & expert', 'Playful & witty', 'Inspiring', 'Straight-talking'];

export const HEX = /^#[0-9A-Fa-f]{6}$/;
export const COLOR_KEYS = ['primary', 'accent', 'background', 'text'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Form state: '' means "not given". Converted to null on save, so nothing is invented. */
export interface BrandDraft {
    brandName: string;
    brandType: BrandType | '';
    positioning: string;
    tagline: string;
    description: string;
    ideation: string;
    ideology: string;
    colors: Record<ColorKey, string>;
    logoUrl: string;
    font: string;
    tone: string;
    audience: string;
    forbiddenWords: string[];
    ctas: string[];
    hashtags: string[];
    contentPillars: string[];
    targetPlatforms: BrandPlatform[];
    captionStylePreset: CaptionStylePreset | '';
    watermarkEnabled: boolean | null;
    customGuidelines: string;
}

export function emptyBrandDraft(): BrandDraft {
    return {
        brandName: '', brandType: '', positioning: '', tagline: '', description: '', ideation: '', ideology: '',
        colors: { primary: '', accent: '', background: '', text: '' },
        logoUrl: '', font: '', tone: '', audience: '', forbiddenWords: [], ctas: [], hashtags: [], contentPillars: [],
        targetPlatforms: [], captionStylePreset: '', watermarkEnabled: null, customGuidelines: '',
    };
}

export function draftFromBrand(b: BrandConsciousness): BrandDraft {
    return {
        brandName: b.brandName ?? '',
        brandType: b.brandType ?? '',
        positioning: b.positioning ?? '',
        tagline: b.tagline ?? '',
        description: b.description ?? '',
        ideation: b.ideation ?? '',
        ideology: b.ideology ?? '',
        colors: {
            primary: b.colors.primary ?? '', accent: b.colors.accent ?? '',
            background: b.colors.background ?? '', text: b.colors.text ?? '',
        },
        logoUrl: b.logoUrl ?? '',
        font: b.font ?? '',
        tone: b.tone ?? '',
        audience: b.audience ?? '',
        forbiddenWords: b.forbiddenWords,
        ctas: b.ctas,
        hashtags: b.hashtags,
        contentPillars: b.contentPillars,
        targetPlatforms: b.targetPlatforms,
        captionStylePreset: b.captionStylePreset ?? '',
        watermarkEnabled: b.watermarkEnabled,
        customGuidelines: b.customGuidelines ?? '',
    };
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

export function draftToPatch(d: BrandDraft): BrandConsciousnessPatch {
    const colors = {} as Record<ColorKey, string | null>;
    for (const k of COLOR_KEYS) colors[k] = d.colors[k] ? d.colors[k].toUpperCase() : null;
    return {
        brandName: orNull(d.brandName),
        brandType: d.brandType || null,
        positioning: orNull(d.positioning),
        tagline: orNull(d.tagline),
        description: orNull(d.description),
        ideation: orNull(d.ideation),
        ideology: orNull(d.ideology),
        colors,
        logoUrl: orNull(d.logoUrl),
        font: d.font || null,
        tone: orNull(d.tone),
        audience: orNull(d.audience),
        forbiddenWords: d.forbiddenWords,
        ctas: d.ctas,
        hashtags: d.hashtags,
        contentPillars: d.contentPillars,
        targetPlatforms: d.targetPlatforms,
        captionStylePreset: d.captionStylePreset || null,
        watermarkEnabled: d.watermarkEnabled,
        customGuidelines: orNull(d.customGuidelines),
    };
}

/** Client-side mirror of the server rules, so problems show next to the field before saving. */
export function draftErrors(d: BrandDraft): Partial<Record<string, string>> {
    const errors: Partial<Record<string, string>> = {};
    for (const k of COLOR_KEYS) if (d.colors[k] && !HEX.test(d.colors[k])) errors[`colors.${k}`] = 'Use a hex colour like #1A2B3C';
    if (d.tagline.length > 160) errors.tagline = 'Keep the tagline under 160 characters';
    if (d.positioning.length > 500) errors.positioning = 'Keep positioning under 500 characters';
    return errors;
}

export const FIELD_LABELS: Record<string, string> = {
    brandName: 'Brand name', brandType: 'Brand type', positioning: 'Positioning', tagline: 'Tagline', description: 'Description',
    ideation: 'Ideation', ideology: 'Ideology', 'colors.primary': 'Primary colour', 'colors.accent': 'Accent colour',
    'colors.background': 'Background colour', 'colors.text': 'Text colour', logoUrl: 'Logo', font: 'Font', tone: 'Tone',
    audience: 'Audience', ctas: 'CTAs', hashtags: 'Hashtags', contentPillars: 'Content pillars', targetPlatforms: 'Platforms',
    captionStylePreset: 'Caption style',
};

/** Same required list as the server (REQUIRED_BRAND_FIELDS), computed live for the wizard. */
export function missingRequired(d: BrandDraft): string[] {
    const missing: string[] = [];
    if (!d.brandType) missing.push('brandType');
    if (!d.positioning.trim()) missing.push('positioning');
    if (!d.description.trim()) missing.push('description');
    if (!d.tone.trim()) missing.push('tone');
    if (!d.audience.trim()) missing.push('audience');
    if (!HEX.test(d.colors.primary)) missing.push('colors.primary');
    if (!d.targetPlatforms.length) missing.push('targetPlatforms');
    return missing;
}

export function googleFontHref(font: string) {
    return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}&display=swap`;
}
