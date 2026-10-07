/**
 * Agent 7: Cross-Platform Transmuter Agent
 *
 * Transmutes core narrative content into native, agency-grade posts across 5 platforms:
 * 1. Instagram: Reels & 1080x1350 Carousels (125-char cutoff safety, 5-tag cap)
 * 2. LinkedIn: PDF Carousels & Executive Thought Leadership (140-char fold cutoff, 3 hashtags)
 * 3. Twitter / X: 280-char hook tweets & threads with high-retweet bookmark triggers
 * 4. YouTube: Shorts with 1.8s cold open & 60-char title cutoff rule
 * 5. Facebook: 150-char fold cutoff, group/feed conversation starters
 */

export interface TransmutedPlatformPost {
  platform: 'instagram' | 'linkedin' | 'x' | 'youtube' | 'facebook';
  contentType: 'reel' | 'carousel' | 'post' | 'thread' | 'short';
  headline: string;
  hook: string;
  captionOrBody: string;
  hashtags: string[];
  cta: string;
  truncationCheck: {
    cutoffChars: number;
    previewBeforeCutoff: string;
    passesFold: boolean;
  };
  nativeAdvice: string;
}

export class CrossPlatformTransmuterAgent {
  /**
   * Transmutes a piece into agency-grade copies across all 5 platforms.
   */
  public static transmute(params: {
    topic: string;
    hook: string;
    body: string[];
    cta: string;
    brandHashtags?: string[];
  }): Record<string, TransmutedPlatformPost> {
    const { topic, hook, body, cta, brandHashtags = [] } = params;
    const bodyText = body.join(' ');

    // 1. Instagram
    const igCaption = `${hook}\n\n${body.join('\n\n')}\n\n👉 ${cta}`;
    const igCutoff = 125;
    const igPassed = hook.length <= igCutoff;
    const instagram: TransmutedPlatformPost = {
      platform: 'instagram',
      contentType: 'reel',
      headline: hook.slice(0, 60),
      hook,
      captionOrBody: igCaption,
      hashtags: [...brandHashtags.slice(0, 2), '#creator', '#growth', '#strategy'].slice(0, 5),
      cta,
      truncationCheck: {
        cutoffChars: igCutoff,
        previewBeforeCutoff: igCaption.slice(0, igCutoff),
        passesFold: igPassed,
      },
      nativeAdvice: 'Ensure first 125 characters force a "... more" click. Keep hashtags at 3-5 max.',
    };

    // 2. LinkedIn
    const liHook = `${hook}\n\nMost people get this completely wrong. Here is the breakdown:`;
    const liBody = body.map((b, i) => `${i + 1}. ${b}`).join('\n\n');
    const liCaption = `${liHook}\n\n${liBody}\n\nWhat would you add to this list?\n\n${cta}`;
    const liCutoff = 140;
    const linkedin: TransmutedPlatformPost = {
      platform: 'linkedin',
      contentType: 'carousel',
      headline: hook.slice(0, 70),
      hook: liHook,
      captionOrBody: liCaption,
      hashtags: ['#leadership', '#innovation', '#business'].slice(0, 3),
      cta,
      truncationCheck: {
        cutoffChars: liCutoff,
        previewBeforeCutoff: liCaption.slice(0, liCutoff),
        passesFold: liHook.split('\n')[0].length <= liCutoff,
      },
      nativeAdvice: 'First 2 lines before "...see more" determine reach. Export carousel slides as PDF.',
    };

    // 3. Twitter / X
    const xHook = hook.length > 220 ? `${hook.slice(0, 217)}...` : hook;
    const xThread = [
      `${xHook}\n\nA breakdown of what actually works (and why): 🧵👇`,
      ...body.map((b, i) => `${i + 1}/ ${b}`),
      `If you found this valuable:\n1. Retweet the first tweet\n2. Follow for more\n\n${cta}`
    ];
    const twitter: TransmutedPlatformPost = {
      platform: 'x',
      contentType: 'thread',
      headline: hook.slice(0, 50),
      hook: xHook,
      captionOrBody: xThread.join('\n\n---\n\n'),
      hashtags: [],
      cta,
      truncationCheck: {
        cutoffChars: 280,
        previewBeforeCutoff: xThread[0],
        passesFold: xThread[0].length <= 280,
      },
      nativeAdvice: 'No hashtags in tweet 1. Optimize hook tweet for bookmarks and quote-retweets.',
    };

    // 4. YouTube Shorts
    const ytTitle = hook.length > 60 ? `${hook.slice(0, 57)}...` : hook;
    const ytDesc = `${hook}\n\n${bodyText}\n\nSubscribe for daily breakdowns!\n\n${cta}`;
    const youtube: TransmutedPlatformPost = {
      platform: 'youtube',
      contentType: 'short',
      headline: ytTitle,
      hook,
      captionOrBody: ytDesc,
      hashtags: ['#shorts', '#viral', '#trending'],
      cta: 'Subscribe for daily breakdowns',
      truncationCheck: {
        cutoffChars: 60,
        previewBeforeCutoff: ytTitle,
        passesFold: ytTitle.length <= 60,
      },
      nativeAdvice: 'Keep title under 60 characters so mobile YouTube feed never truncates it.',
    };

    // 5. Facebook
    const fbCaption = `${hook}\n\n${body.join('\n\n')}\n\nDrop your thoughts below 👇\n\n${cta}`;
    const fbCutoff = 150;
    const facebook: TransmutedPlatformPost = {
      platform: 'facebook',
      contentType: 'post',
      headline: hook.slice(0, 60),
      hook,
      captionOrBody: fbCaption,
      hashtags: [],
      cta,
      truncationCheck: {
        cutoffChars: fbCutoff,
        previewBeforeCutoff: fbCaption.slice(0, fbCutoff),
        passesFold: hook.length <= fbCutoff,
      },
      nativeAdvice: 'Drive comments in first 30 minutes to trigger algorithm feed distribution.',
    };

    return {
      instagram,
      linkedin,
      x: twitter,
      youtube,
      facebook,
    };
  }
}
