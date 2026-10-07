export interface CaptionCheckItem {
  check: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
}

export interface CaptionLintResult {
  rawCaption: string;
  charCount: number;
  wordCount: number;
  feedCutout: string;
  isTruncated: boolean;
  hashtags: string[];
  mentions: string[];
  links: string[];
  asks: string[];
  fillerHashtags: string[];
  checks: CaptionCheckItem[];
  score: number; // 0 - 100
  passed: boolean;
  recommendations: string[];
}

const LIMIT = 2200;
const TRUNCATE_CUT = 125;
const HASHTAG_LIMIT = 5;

const HASHTAG_RE = /(?:^|\s)(#[A-Za-z0-9_]+)/g;
const MENTION_RE = /(?:^|\s)(@[A-Za-z0-9_.]+)/g;
const LINK_RE = /(?:https?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(?:com|co|io|net|org|ai|app)\/\S*)/gi;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

const ASKS = [
  { pattern: /\bcomment (?:the word |")?[A-Z0-9]{2,}\b/i, name: 'comment a keyword' },
  { pattern: /\b(?:dm|message) me\b/i, name: 'DM me' },
  { pattern: /\bsave (?:this|it)\b/i, name: 'save this' },
  { pattern: /\bshare (?:this|it)\b/i, name: 'share this' },
  { pattern: /\bfollow (?:me|for)\b/i, name: 'follow' },
  { pattern: /\blink in (?:my )?bio\b/i, name: 'link in bio' },
  { pattern: /\b(?:swipe|tap) (?:through|left|right|for|to)\b/i, name: 'swipe or tap' },
  { pattern: /\btell me\b|\bwhat would you\b|\bwhich one\b/i, name: 'answer a question' }
];

const FILLER_TAGS = new Set([
  '#viral', '#fyp', '#explore', '#explorepage', '#foryou', '#foryoupage',
  '#trending', '#instagood', '#love', '#follow', '#like4like', '#reels',
  '#reelsinstagram', '#viralreels', '#instadaily'
]);

export class CaptionLinter {
  public static analyze(text: string, options: { truncateCut?: number; targetKeywords?: string[] } = {}): CaptionLintResult {
    const cut = options.truncateCut || TRUNCATE_CUT;
    const stripped = text.trim();
    const chars = stripped.length;
    const lines = stripped.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || '';

    // Extract elements
    const hashtags = (stripped.match(HASHTAG_RE) || []).map(h => h.trim().toLowerCase());
    const mentions = (stripped.match(MENTION_RE) || []).map(m => m.trim());
    const links = stripped.match(LINK_RE) || [];
    const words = stripped.match(/[A-Za-z0-9$%'’-]+/g) || [];

    // Visible window
    const feedCutout = stripped.length <= cut ? stripped : stripped.slice(0, cut);
    const isTruncated = stripped.length > cut;

    // Detect asks
    const detectedAsks: string[] = [];
    for (const ask of ASKS) {
      if (ask.pattern.test(stripped)) {
        detectedAsks.push(ask.name);
      }
    }

    // Detect filler hashtags
    const fillerHashtags = hashtags.filter(tag => FILLER_TAGS.has(tag));

    const checks: CaptionCheckItem[] = [];

    // 1. Character length check
    if (chars > LIMIT) {
      checks.push({
        check: 'LENGTH',
        status: 'FAIL',
        detail: `${chars} characters exceeds Instagram hard cap of ${LIMIT}.`
      });
    } else if (chars < 40) {
      checks.push({
        check: 'LENGTH',
        status: 'WARN',
        detail: `Very short caption (${chars} chars). Misses search indexing opportunity.`
      });
    } else {
      checks.push({
        check: 'LENGTH',
        status: 'PASS',
        detail: `${chars}/${LIMIT} characters.`
      });
    }

    // 2. Visible feed window check (first 125 chars)
    if (firstLine.startsWith('#')) {
      checks.push({
        check: 'VISIBLE_FEED_HOOK',
        status: 'FAIL',
        detail: 'Opens with a hashtag in the feed preview. Wastes the 125-char window.'
      });
    } else if (/^(hey|hi|hello|guys|welcome|so|happy \w+)/i.test(firstLine)) {
      checks.push({
        check: 'VISIBLE_FEED_HOOK',
        status: 'WARN',
        detail: 'First line opens on pleasantries/greeting rather than hook.'
      });
    } else if (feedCutout.length > 30) {
      checks.push({
        check: 'VISIBLE_FEED_HOOK',
        status: 'PASS',
        detail: 'Hook carries clean claim in the primary 125-char feed window.'
      });
    } else {
      checks.push({
        check: 'VISIBLE_FEED_HOOK',
        status: 'WARN',
        detail: 'Feed cutout has under 30 characters.'
      });
    }

    // 3. Hashtag cap check
    if (hashtags.length > HASHTAG_LIMIT) {
      checks.push({
        check: 'HASHTAG_COUNT',
        status: 'FAIL',
        detail: `${hashtags.length} hashtags exceeds the platform cap of ${HASHTAG_LIMIT} (post-Dec 2025 rule).`
      });
    } else if (hashtags.length === 0) {
      checks.push({
        check: 'HASHTAG_COUNT',
        status: 'WARN',
        detail: 'No hashtags provided. 3-5 niche-specific tags assist algorithmic categorisation.'
      });
    } else {
      checks.push({
        check: 'HASHTAG_COUNT',
        status: 'PASS',
        detail: `${hashtags.length}/${HASHTAG_LIMIT} hashtags (within official platform limits).`
      });
    }

    // 4. Filler tags
    if (fillerHashtags.length > 0) {
      checks.push({
        check: 'FILLER_HASHTAGS',
        status: 'FAIL',
        detail: `Contains ${fillerHashtags.length} dead generic hashtags (${fillerHashtags.join(', ')}). They hurt distribution.`
      });
    } else {
      checks.push({
        check: 'FILLER_HASHTAGS',
        status: 'PASS',
        detail: 'Zero spam/generic hashtags.'
      });
    }

    // 5. Unclickable links
    if (links.length > 0) {
      checks.push({
        check: 'UNCLICKABLE_LINKS',
        status: 'FAIL',
        detail: `Found URL (${links[0]}). Instagram captions do not hyperlink. Direct to link in bio or DM keyword instead.`
      });
    } else {
      checks.push({
        check: 'UNCLICKABLE_LINKS',
        status: 'PASS',
        detail: 'No dead plaintext URLs in copy.'
      });
    }

    // 6. Call to Action discipline
    if (detectedAsks.length > 1) {
      checks.push({
        check: 'CALL_TO_ACTION',
        status: 'WARN',
        detail: `Multiple conflicting asks (${detectedAsks.join(' + ')}). Pick ONE single ask per post.`
      });
    } else if (detectedAsks.length === 1) {
      checks.push({
        check: 'CALL_TO_ACTION',
        status: 'PASS',
        detail: `Single clear ask: "${detectedAsks[0]}".`
      });
    } else {
      checks.push({
        check: 'CALL_TO_ACTION',
        status: 'WARN',
        detail: 'No clear Call To Action identified.'
      });
    }

    // 7. SEO Keywords
    if (options.targetKeywords && options.targetKeywords.length > 0) {
      const missing = options.targetKeywords.filter(
        kw => !stripped.toLowerCase().includes(kw.toLowerCase())
      );
      if (missing.length === 0) {
        checks.push({
          check: 'SEO_KEYWORDS',
          status: 'PASS',
          detail: 'All target search keywords present in caption body.'
        });
      } else {
        checks.push({
          check: 'SEO_KEYWORDS',
          status: 'WARN',
          detail: `Missing search keywords: ${missing.join(', ')}.`
        });
      }
    }

    // Calculate overall score
    let score = 100;
    for (const c of checks) {
      if (c.status === 'FAIL') score -= 25;
      else if (c.status === 'WARN') score -= 10;
    }
    score = Math.max(0, Math.min(100, score));

    const recommendations: string[] = [];
    checks.filter(c => c.status !== 'PASS').forEach(c => recommendations.push(c.detail));

    return {
      rawCaption: text,
      charCount: chars,
      wordCount: words.length,
      feedCutout,
      isTruncated,
      hashtags,
      mentions,
      links,
      asks: detectedAsks,
      fillerHashtags,
      checks,
      score,
      passed: !checks.some(c => c.status === 'FAIL'),
      recommendations
    };
  }
}
