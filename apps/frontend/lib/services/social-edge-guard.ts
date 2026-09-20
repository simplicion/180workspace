/**
 * 180 Workspace - Social Edge Guard & Utility Engine (Client-Side)
 * 
 * Provides sub-millisecond, client-side validation and formatting for:
 * 1. Safe-Zone Overlay dimensions (12% top, 22% bottom, 18% right interaction danger strip)
 * 2. Platform constraints (character limits, hashtag limits, aspect ratios)
 * 3. First-Comment Hashtag Extraction Automation
 * 4. Scratch Storage Retention calculation & badge states
 * 5. Brand Safety copy auditing & Tone DNA matching
 */

export interface PlatformConstraintResult {
    isValid: boolean;
    charCount: number;
    maxChars: number;
    charsRemaining: number;
    hashtagCount: number;
    maxHashtags: number;
    warnings: string[];
    errors: string[];
}

export interface BrandAuditResult {
    isClean: boolean;
    toneMatchScore: number;
    violations: Array<{ type: string; term: string; recommendation: string }>;
    detectedCompetitors: string[];
}

export interface ScratchRetentionState {
    status: 'active' | 'expiring_soon' | 'expired';
    hoursRemaining: number;
    formattedTimeRemaining: string;
    label: string;
}

export const socialEdgeGuard = {
    /**
     * Vertical Video Safe-Zone Margins for 9:16 content (TikTok, Reels, Shorts)
     */
    SAFE_ZONES: {
        topPercent: 12,       // Top account handle & search bar
        bottomPercent: 22,    // Bottom caption, sound title & CTA button
        rightPercent: 18,     // Right interaction strip (like, comment, bookmark, share)
        leftPercent: 4        // Left screen margin buffer
    },

    /**
     * Validate text against platform limits
     */
    validatePlatformConstraints(
        platform: 'instagram' | 'linkedin' | 'tiktok' | 'youtube',
        caption: string,
        mediaType: string = 'video',
        aspectRatio: string = '9:16'
    ): PlatformConstraintResult {
        const text = caption || '';
        const charCount = text.length;
        const hashtags = (text.match(/#[a-zA-Z0-9_]+/g) || []);
        const hashtagCount = hashtags.length;
        const warnings: string[] = [];
        const errors: string[] = [];

        let maxChars = 2200;
        let maxHashtags = 30;

        switch (platform) {
            case 'instagram':
                maxChars = 2200;
                maxHashtags = 30;
                if (charCount > 2200) {
                    errors.push(`Instagram caption exceeds 2,200 characters (${charCount}/2200)`);
                }
                if (hashtagCount > 30) {
                    errors.push(`Instagram permits a maximum of 30 hashtags (${hashtagCount}/30)`);
                } else if (hashtagCount > 10) {
                    warnings.push('More than 10 hashtags can dilute algorithm reach; 3-5 targeted tags recommended');
                }
                break;

            case 'linkedin':
                maxChars = 3000;
                maxHashtags = 10;
                if (charCount > 3000) {
                    errors.push(`LinkedIn post exceeds 3,000 characters (${charCount}/3000)`);
                }
                if (hashtagCount > 5) {
                    warnings.push('LinkedIn algorithm prioritizes 3-5 relevant industry hashtags');
                }
                break;

            case 'tiktok':
                maxChars = 2200;
                maxHashtags = 15;
                if (charCount > 2200) {
                    errors.push(`TikTok caption exceeds 2,200 characters (${charCount}/2200)`);
                }
                if (mediaType === 'video' && aspectRatio !== '9:16') {
                    errors.push('TikTok requires 9:16 vertical video format');
                }
                break;

            case 'youtube':
                maxChars = 100; // Shorts title
                maxHashtags = 15;
                if (charCount > 100) {
                    warnings.push(`YouTube Shorts titles over 100 characters may get truncated (${charCount}/100)`);
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            charCount,
            maxChars,
            charsRemaining: Math.max(0, maxChars - charCount),
            hashtagCount,
            maxHashtags,
            warnings,
            errors
        };
    },

    /**
     * Extracts hashtags from caption to populate First-Comment, cleaning main caption
     */
    extractHashtagsForFirstComment(caption: string): { cleanCaption: string; firstComment: string; extractedCount: number } {
        if (!caption) return { cleanCaption: '', firstComment: '', extractedCount: 0 };

        const hashtagRegex = /#[a-zA-Z0-9_]+/g;
        const matches = caption.match(hashtagRegex) || [];
        
        if (matches.length === 0) {
            return { cleanCaption: caption, firstComment: '', extractedCount: 0 };
        }

        // Clean trailing hashtags or inline hashtags neatly
        let cleanCaption = caption.replace(hashtagRegex, '').replace(/\s+/g, ' ').trim();
        const firstComment = matches.join(' ');

        return {
            cleanCaption,
            firstComment,
            extractedCount: matches.length
        };
    },

    /**
     * Computes real-time Brand Tone Match score and checks for forbidden words
     */
    auditBrandSafetyCopy(
        text: string, 
        brandProfile?: { tone?: string; forbiddenWords?: string[]; targetAudience?: string }
    ): BrandAuditResult {
        if (!text) {
            return { isClean: true, toneMatchScore: 100, violations: [], detectedCompetitors: [] };
        }

        const lower = text.toLowerCase();
        const violations: Array<{ type: string; term: string; recommendation: string }> = [];
        const detectedCompetitors: string[] = [];

        // 1. Check user-defined forbidden words
        const forbidden = brandProfile?.forbiddenWords || ['cheap', 'guaranteed ROI', '100% risk-free', 'miracle'];
        for (const word of forbidden) {
            if (lower.includes(word.toLowerCase())) {
                violations.push({
                    type: 'forbidden_vocabulary',
                    term: word,
                    recommendation: `Avoid "${word}" to maintain brand authority.`
                });
            }
        }

        // 2. Regulatory & spam risk patterns
        const compliancePatterns = [
            { regex: /guaranteed (results|profits|roi)/i, term: 'Guaranteed Results' },
            { regex: /get rich quick/i, term: 'Get Rich Quick' },
            { regex: /free money/i, term: 'Free Money' }
        ];

        for (const pattern of compliancePatterns) {
            if (pattern.regex.test(lower)) {
                violations.push({
                    type: 'regulatory_risk',
                    term: pattern.term,
                    recommendation: 'Potential ad-network or platform spam trigger. Rephrase with substantiated claims.'
                });
            }
        }

        // 3. Competitor mentions
        const competitors = ['hootsuite', 'buffer', 'sprout social', 'later.com'];
        for (const comp of competitors) {
            if (lower.includes(comp)) {
                detectedCompetitors.push(comp);
                violations.push({
                    type: 'competitor_mention',
                    term: comp,
                    recommendation: `Competitor brand "${comp}" detected.`
                });
            }
        }

        // Calculate score
        let score = 100;
        score -= violations.length * 15;
        score = Math.max(10, Math.min(100, score));

        return {
            isClean: violations.length === 0,
            toneMatchScore: score,
            violations,
            detectedCompetitors
        };
    },

    /**
     * Computes Scratch Render Storage retention time
     */
    calculateScratchRetention(createdAt: string | Date, retentionHours: number = 24): ScratchRetentionState {
        const created = new Date(createdAt).getTime();
        const now = Date.now();
        const expirationTime = created + retentionHours * 3600 * 1000;
        const diffMs = expirationTime - now;
        const diffHours = Math.round(diffMs / (3600 * 1000));

        if (diffMs <= 0) {
            return {
                status: 'expired',
                hoursRemaining: 0,
                formattedTimeRemaining: 'Expired',
                label: 'Scratch Render Expired'
            };
        }

        if (diffHours <= 4) {
            return {
                status: 'expiring_soon',
                hoursRemaining: diffHours,
                formattedTimeRemaining: `${diffHours}h left`,
                label: `Expiring Soon (${diffHours}h)`
            };
        }

        const days = Math.floor(diffHours / 24);
        const remHours = diffHours % 24;
        const formatted = days > 0 ? `${days}d ${remHours}h` : `${diffHours}h`;

        return {
            status: 'active',
            hoursRemaining: diffHours,
            formattedTimeRemaining: formatted,
            label: `Retention Active (${formatted})`
        };
    },

    /**
     * Identify cloud storage provider from URL
     */
    detectCloudStorageProvider(url: string): { provider: 'google_drive' | 'dropbox' | 'box' | 'onedrive' | 'direct'; label: string } {
        const clean = (url || '').toLowerCase();
        if (clean.includes('drive.google.com')) return { provider: 'google_drive', label: 'Google Drive' };
        if (clean.includes('dropbox.com')) return { provider: 'dropbox', label: 'Dropbox' };
        if (clean.includes('box.com')) return { provider: 'box', label: 'Box' };
        if (clean.includes('onedrive') || clean.includes('1drv.ms') || clean.includes('sharepoint.com')) return { provider: 'onedrive', label: 'Microsoft OneDrive' };
        return { provider: 'direct', label: 'Direct Storage URL' };
    }
};
