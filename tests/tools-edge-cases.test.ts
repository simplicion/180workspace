import { describe, it, expect } from 'vitest';

function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'shorts' || pathParts[0] === 'embed' || pathParts[0] === 'v') {
        if (pathParts[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[1])) return pathParts[1];
      }
    } else if (parsed.hostname.includes('youtu.be')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) return pathParts[0];
    }
  } catch {
    // Fall through
  }

  const match = trimmed.match(/(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

describe('Free Tools Suite — Comprehensive Edge Case Tests', () => {

  // =========================================================================
  // 1. YouTube Video ID Extraction Edge Cases
  // =========================================================================
  describe('Tool 1: YouTube Video ID Extractor', () => {
    it('should extract ID from standard watch URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID when extra query parameters precede or follow v=', () => {
      expect(extractVideoId('https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('https://www.youtube.com/watch?list=PL12345&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from mobile URLs', () => {
      expect(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtu.be shortlinks', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?si=customTrack123')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from YouTube Shorts URLs', () => {
      expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('https://youtube.com/shorts/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from YouTube Embed and /v/ URLs', () => {
      expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should accept raw 11-character Video ID', () => {
      expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
    });

    it('should gracefully return null for invalid or malicious inputs', () => {
      expect(extractVideoId('')).toBeNull();
      expect(extractVideoId('https://google.com')).toBeNull();
      expect(extractVideoId('https://vimeo.com/123456')).toBeNull();
      expect(extractVideoId('not_a_valid_youtube_url')).toBeNull();
      expect(extractVideoId(null as any)).toBeNull();
    });
  });

  // =========================================================================
  // 2. UTM Builder & Sanitization Edge Cases
  // =========================================================================
  describe('Tool 4: UTM Campaign Builder & Sanitization', () => {
    function buildUtmUrl(baseUrl: string, params: { source?: string; medium?: string; campaign?: string; term?: string; content?: string }): string {
      let trimmedBase = baseUrl.trim();
      if (!trimmedBase) return '';
      if (!trimmedBase.startsWith('http://') && !trimmedBase.startsWith('https://')) {
        trimmedBase = 'https://' + trimmedBase;
      }

      const url = new URL(trimmedBase);
      if (params.source?.trim()) url.searchParams.set('utm_source', params.source.trim());
      if (params.medium?.trim()) url.searchParams.set('utm_medium', params.medium.trim());
      if (params.campaign?.trim()) url.searchParams.set('utm_campaign', params.campaign.trim());
      if (params.term?.trim()) url.searchParams.set('utm_term', params.term.trim());
      if (params.content?.trim()) url.searchParams.set('utm_content', params.content.trim());

      return url.toString();
    }

    it('should automatically prepend https:// when missing protocol', () => {
      const result = buildUtmUrl('180workspace.com/pricing', { source: 'google', medium: 'cpc' });
      expect(result).toBe('https://180workspace.com/pricing?utm_source=google&utm_medium=cpc');
    });

    it('should preserve existing query parameters without duplicating question marks', () => {
      const result = buildUtmUrl('https://180workspace.com/signup?plan=momentum&ref=partner', { source: 'twitter', medium: 'social' });
      expect(result).toContain('plan=momentum');
      expect(result).toContain('ref=partner');
      expect(result).toContain('utm_source=twitter');
      expect(result.split('?').length - 1).toBe(1); // exactly one ?
    });

    it('should encode special characters and spaces in campaign names', () => {
      const result = buildUtmUrl('https://180workspace.com', { campaign: 'summer & black friday sale' });
      expect(result).toContain('utm_campaign=summer+%26+black+friday+sale');
    });

    it('should omit empty or blank UTM parameters', () => {
      const result = buildUtmUrl('https://180workspace.com', { source: 'google', term: '   ', content: '' });
      expect(result).toContain('utm_source=google');
      expect(result).not.toContain('utm_term');
      expect(result).not.toContain('utm_content');
    });
  });

  // =========================================================================
  // 3. Invoice Generator Calculation Engine Edge Cases
  // =========================================================================
  describe('Tool 2: Invoice Calculation Engine', () => {
    interface LineItem {
      quantity: number;
      unitPrice: number;
      taxPercent: number;
    }

    function calculateInvoice(items: LineItem[], discountPercent: number, shipping: number, amountPaid: number) {
      const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
      const totalTax = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (item.taxPercent / 100)), 0);
      const discountAmount = (subtotal * Math.min(100, Math.max(0, discountPercent))) / 100;
      const total = Math.max(0, subtotal + totalTax + Math.max(0, shipping) - discountAmount);
      const balanceDue = Math.max(0, total - Math.max(0, amountPaid));

      return { subtotal, totalTax, discountAmount, total, balanceDue };
    }

    it('should calculate standard multi-item invoice accurately', () => {
      const items: LineItem[] = [
        { quantity: 2, unitPrice: 100, taxPercent: 10 }, // 200 + 20 tax
        { quantity: 1, unitPrice: 300, taxPercent: 0 },   // 300
      ];

      const res = calculateInvoice(items, 10, 20, 0);
      expect(res.subtotal).toBe(500);
      expect(res.totalTax).toBe(20);
      expect(res.discountAmount).toBe(50); // 10% of 500
      expect(res.total).toBe(500 + 20 + 20 - 50); // 490
      expect(res.balanceDue).toBe(490);
    });

    it('should handle 100% discount and overpaid edge cases', () => {
      const items: LineItem[] = [{ quantity: 1, unitPrice: 1000, taxPercent: 0 }];
      const res = calculateInvoice(items, 100, 0, 0);
      expect(res.discountAmount).toBe(1000);
      expect(res.total).toBe(0);
      expect(res.balanceDue).toBe(0);
    });

    it('should clamp negative values safely', () => {
      const items: LineItem[] = [{ quantity: 1, unitPrice: 100, taxPercent: 0 }];
      const res = calculateInvoice(items, 150, -50, 200); // 150% discount clamped to 100%, negative shipping clamped to 0
      expect(res.total).toBe(0);
      expect(res.balanceDue).toBe(0);
    });
  });

  // =========================================================================
  // 4. Dynamic Currency Resolution Edge Cases
  // =========================================================================
  describe('Currency Dynamic Symbol & Intl Resolution', () => {
    function resolveCurrencySymbol(currencyCode: string): string {
      try {
        const code = (currencyCode || 'USD').toString().trim().toUpperCase();
        return (0).toLocaleString('en-US', {
          style: 'currency',
          currency: code,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).replace(/\d/g, '').trim() || code;
      } catch {
        return currencyCode;
      }
    }

    it('should resolve standard and exotic currency symbols dynamically without hardcoding', () => {
      expect(resolveCurrencySymbol('USD')).toBe('$');
      expect(resolveCurrencySymbol('EUR')).toBe('€');
      expect(resolveCurrencySymbol('GBP')).toBe('£');
      expect(resolveCurrencySymbol('INR')).toBe('₹');
      expect(resolveCurrencySymbol('JPY')).toBe('¥');
      expect(resolveCurrencySymbol('CAD')).toBe('CA$');
      expect(['A$', 'AU$']).toContain(resolveCurrencySymbol('AUD'));
    });

    it('should fallback gracefully for unknown currency codes', () => {
      expect(resolveCurrencySymbol('XYZ')).toBe('XYZ');
      expect(resolveCurrencySymbol('')).toBe('$');
    });
  });

});
