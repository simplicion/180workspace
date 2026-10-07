import { HookScorer, HookEvaluation } from '../instagram-team/linters/hook-scorer';
import { BeatSheetLinter, BeatSheetAnalysis } from '../instagram-team/linters/beat-sheet';
import { CaptionLinter, CaptionLintResult } from '../instagram-team/linters/caption-linter';
import { TextHumanizer, HumanizerResult, AiDetectionReport } from '../instagram-team/linters/text-humanizer';

export type SupportedPlatform = 'instagram' | 'linkedin' | 'twitter' | 'x' | 'youtube' | 'facebook';

export interface PlatformFeedCutoffSpec {
  platform: SupportedPlatform;
  characterLimitBeforeCut: number;
  mobileVisibleWindow: string;
  isTruncated: boolean;
  ctaRequiredBeforeCut: boolean;
  hashtagLimit: number;
  recommendation: string;
}

export interface PlatformTailoredPiece {
  platform: SupportedPlatform;
  format: 'Reel/Short' | 'Carousel/Document' | 'Text/Thread' | 'Story/Status';
  headline: string;
  hook: string;
  body: string;
  callToAction: string;
  hashtags: string[];
  feedCutoutPreview: string;
  characterCount: number;
  platformSpecificTips: string[];
}

export interface CrossPlatformStrategyPackage {
  coreIdea: string;
  niche: string;
  pieces: Record<SupportedPlatform, PlatformTailoredPiece>;
  repurposingBlueprint: {
    heroAsset: string;
    derivatives: string[];
    timelinePlan: string;
  };
}

export class AgencyReplacementEngine {
  /**
   * Platform-specific cutoff limits:
   * - Instagram: 125 chars before "... more"
   * - LinkedIn: 140 chars / 2 lines before "...see more"
   * - Twitter/X: 280 chars per tweet (hard single tweet limit)
   * - YouTube: 60 chars for titles above mobile fold, 100 chars for Shorts
   * - Facebook: 150 chars before "See More"
   */
  public static simulatePlatformCutoff(platform: SupportedPlatform, text: string): PlatformFeedCutoffSpec {
    const p = platform.toLowerCase() as SupportedPlatform;
    const stripped = text.trim();
    let limit = 125;
    let hashtagCap = 5;
    let recommendation = '';

    switch (p) {
      case 'instagram':
        limit = 125;
        hashtagCap = 5;
        recommendation = 'Keep your spoken & caption claim inside the first 125 chars before Instagram cuts to "... more". Cap at 3-5 niche tags.';
        break;
      case 'linkedin':
        limit = 140;
        hashtagCap = 3;
        recommendation = 'First 2 lines (~140 chars) must force a tap on "...see more" to maximize dwell time. Use generous line spacing and max 3 hashtags.';
        break;
      case 'twitter':
      case 'x':
        limit = 280;
        hashtagCap = 2;
        recommendation = 'First tweet must be 100% hook with 0 preamble. Standalone quote/take must be bookmarkable.';
        break;
      case 'youtube':
        limit = 60;
        hashtagCap = 3;
        recommendation = 'Keep title under 60 chars so it does not get truncated on mobile thumbnails. Cold open in first 2 seconds.';
        break;
      case 'facebook':
        limit = 150;
        hashtagCap = 3;
        recommendation = 'First 150 chars must carry relatable emotional stake or actionable curiosity. Facebook prioritizes Group & Messenger shares.';
        break;
    }

    const isTruncated = stripped.length > limit;
    const window = isTruncated ? stripped.slice(0, limit) : stripped;

    return {
      platform: p,
      characterLimitBeforeCut: limit,
      mobileVisibleWindow: window,
      isTruncated,
      ctaRequiredBeforeCut: false,
      hashtagLimit: hashtagCap,
      recommendation
    };
  }

  /**
   * Adapts a single core idea into production-grade assets across all 5 major platforms
   */
  public static generate5PlatformPackage(coreIdea: string, niche = 'Business'): CrossPlatformStrategyPackage {
    const raw = coreIdea.trim();

    // 1. Instagram: Reel + Carousel
    const igHook = `$18,000 is what ${raw.toLowerCase().slice(0, 35)} cost us.`;
    const igBody = `Most creators figure this out after losing six months of momentum.\n\n` +
      `Here is the 3-step turnaround framework:\n` +
      `1. Cut vanity metrics immediately.\n` +
      `2. Track sends and saves instead of views.\n` +
      `3. Test every offer with 5 people before launching.\n\n` +
      `Comment the word PLAYBOOK and I will DM you our complete system.`;
    const igTags = ['#creatoreconomy', '#solopreneur', '#businessgrowth'];

    const igPiece: PlatformTailoredPiece = {
      platform: 'instagram',
      format: 'Reel/Short',
      headline: raw,
      hook: igHook,
      body: igBody,
      callToAction: 'Comment PLAYBOOK for the complete swipe file',
      hashtags: igTags,
      feedCutoutPreview: (igHook + '\n\n' + igBody).slice(0, 125),
      characterCount: (igHook + igBody).length,
      platformSpecificTips: [
        'Shoot vertical 9:16 at 165 WPM pacing',
        'Frame 1 must feature hand/body motion',
        'End with seamless loop repeating the word "$18,000"'
      ]
    };

    // 2. LinkedIn: Thought leadership + PDF Document Carousel
    const liHook = `I lost $18,000 on a single contract clause. Here is what no one in ${niche} tells you:`;
    const liBody = `\n\nMost founders believe scale comes from grinding harder.\n\n` +
      `In reality, it comes from knowing where you are leaking cash.\n\n` +
      `Here are the 3 structural shifts we implemented:\n\n` +
      `→ Shift 1: Scope locking before contract delivery\n` +
      `→ Shift 2: 50% upfront retainer terms\n` +
      `→ Shift 3: Net-7 invoice terms instead of Net-30\n\n` +
      `The full 7-slide PDF framework is attached below. Drop a "SEND" in the comments and I will connect and share the document directly.`;
    const liTags = ['#founders', '#businessstrategy', '#leadership'];

    const liPiece: PlatformTailoredPiece = {
      platform: 'linkedin',
      format: 'Carousel/Document',
      headline: `The $18K Contract Lesson for ${niche} Leaders`,
      hook: liHook,
      body: liBody,
      callToAction: 'Comment SEND for the full 7-slide PDF framework',
      hashtags: liTags,
      feedCutoutPreview: liHook.slice(0, 140),
      characterCount: (liHook + liBody).length,
      platformSpecificTips: [
        'Format as 1080x1350 PDF carousel (Slide 1 bold claim, Slide 2 data, Slide 7 recap)',
        'Reply to every comment in the first 60 minutes to trigger algorithm reach',
        'Avoid external links in post body (put in first comment or DM)'
      ]
    };

    // 3. Twitter / X: Thread opener + Punchy Take
    const twHook = `I lost $18,000 on one mistake in ${niche}.\n\nIt took 48 hours to fix and doubled our retention.\n\nHere is the 4-step breakdown (bookmark this): 🧵👇`;
    const twBody = `1/ The trap is doing what everyone else does: adding features when clients only want clarity.\n\n` +
      `2/ We cut 60% of our onboarding steps. Client activation immediately jumped 42%.\n\n` +
      `3/ Never send a proposal without locking scope on a live call first.\n\n` +
      `4/ If you want our exact proposal checklist, RT this tweet and reply "GROW".`;
    const twTags = ['#buildinpublic', '#startups'];

    const twPiece: PlatformTailoredPiece = {
      platform: 'twitter',
      format: 'Text/Thread',
      headline: raw,
      hook: twHook,
      body: twBody,
      callToAction: 'RT and reply "GROW" for the complete template',
      hashtags: twTags,
      feedCutoutPreview: twHook.slice(0, 280),
      characterCount: twHook.length,
      platformSpecificTips: [
        'Tweet 1 must have 0 filler words',
        'End on an actionable bookmark / quote tweet trigger',
        'Snipe top accounts in your niche within 5 minutes of their posts'
      ]
    };

    // 4. YouTube & YouTube Shorts
    const ytHook = `Do NOT make this $18,000 mistake when building your ${niche} business.`;
    const ytBody = `Most people think failing fast means breaking things.\n` +
      `It actually means verifying your numbers before writing a single line of copy.\n` +
      `In this video, I walk through the 3 things that saved our agency.\n` +
      `Subscribe for weekly tactical breakdowns.`;

    const ytPiece: PlatformTailoredPiece = {
      platform: 'youtube',
      format: 'Reel/Short',
      headline: `How 1 Mistake Cost Us $18,000 (And How to Fix It)`,
      hook: ytHook,
      body: ytBody,
      callToAction: 'Subscribe and check pinned comment for free template',
      hashtags: ['#shorts', '#business', '#entrepreneur'],
      feedCutoutPreview: ytHook.slice(0, 60),
      characterCount: (ytHook + ytBody).length,
      platformSpecificTips: [
        'Hook within 1.8 seconds with bold on-screen title text',
        'Keep length under 45 seconds to maximize completion percentage',
        'Title must create curiosity gap matching thumbnail visual'
      ]
    };

    // 5. Facebook: Storytelling & Share Trigger
    const fbHook = `If you run a ${niche} business or know someone who does, read this before signing your next client:`;
    const fbBody = `Last month, a single overlooked detail cost our team $18,000.\n\n` +
      `It was embarrassing. But fixing it taught us the most valuable lesson of the year.\n\n` +
      `Here is what you need to look out for:\n` +
      `• Never allow open-ended revision clauses.\n` +
      `• Put payment milestone dates in bold on page one.\n` +
      `• Always require signed confirmation before initiating kickoff.\n\n` +
      `Share this with a fellow business owner who needs to protect their revenue this quarter!`;

    const fbPiece: PlatformTailoredPiece = {
      platform: 'facebook',
      format: 'Text/Thread',
      headline: raw,
      hook: fbHook,
      body: fbBody,
      callToAction: 'Share this with a founder who needs to hear it today',
      hashtags: ['#smallbusiness', '#entrepreneurship'],
      feedCutoutPreview: fbHook.slice(0, 150),
      characterCount: (fbHook + fbBody).length,
      platformSpecificTips: [
        'Facebook rewards community and Group shares over hashtags',
        'Use relatable emotional stakes and high utility checklists',
        'Cross-post as a Facebook Reel for extra organic distribution'
      ]
    };

    return {
      coreIdea: raw,
      niche,
      pieces: {
        instagram: igPiece,
        linkedin: liPiece,
        twitter: twPiece,
        x: twPiece,
        youtube: ytPiece,
        facebook: fbPiece
      },
      repurposingBlueprint: {
        heroAsset: '1 Core Timed Video Script (165 WPM, 30s)',
        derivatives: [
          'Instagram Reel + 5-Slide Carousel Deck',
          'LinkedIn 7-Slide PDF Document + B2B Text Post',
          'Twitter/X 4-Tweet Thread with Bookmark Trigger',
          'YouTube Shorts with Cold Open',
          'Facebook Community Story with Group Share Call'
        ],
        timelinePlan: 'Publish Reel Monday 9 AM -> LinkedIn PDF Tuesday 8 AM -> Twitter Thread Wednesday 12 PM -> FB Story Thursday 6 PM.'
      }
    };
  }

  /**
   * Outbound comment sniper for any of the 5 platforms
   */
  public static generatePlatformComments(platform: SupportedPlatform, postContext: string) {
    const p = platform.toLowerCase();
    if (p === 'linkedin') {
      return [
        {
          archetype: 'The Datum & B2B Case',
          text: 'We saw the exact same pattern when we shifted from monthly to quarterly reviews: retention jumped 38%. Spot on advice.',
          whyItWorks: 'Establishes enterprise authority and draws profile views from decision makers.'
        },
        {
          archetype: 'The Missing Edge',
          text: 'This holds true until team size crosses 20. Then communication overhead requires an asynchronous SOP layer.',
          whyItWorks: 'Thought leadership fork that earns the top-pinned spot.'
        }
      ];
    }

    if (p === 'twitter' || p === 'x') {
      return [
        {
          archetype: 'The Receipt',
          text: 'Can confirm: deleted 4 steps from our onboarding funnel and conversion went from 14% to 31% in 3 weeks.',
          whyItWorks: 'High signal, zero fluff, encourages retweets.'
        },
        {
          archetype: 'The Contrarian Line',
          text: 'The mistake isn’t charging too little—it’s offering 5 choices instead of 1 recommendation.',
          whyItWorks: 'Pithy aphorism that generates likes from followers of the original account.'
        }
      ];
    }

    // Default: Instagram / FB / YouTube
    return [
      {
        archetype: 'Add a Datum',
        text: 'Same for our agency: 42% lift the moment we removed the second link in bio.',
        whyItWorks: 'Concrete proof without self-promotion.'
      },
      {
        archetype: 'Ask the Real Question',
        text: 'How did you handle client pushback during week two when scope was tightened?',
        whyItWorks: 'Asks the unsaid question everyone in the comments wants answered.'
      }
    ];
  }
}

export const agencyReplacementEngine = new AgencyReplacementEngine();
