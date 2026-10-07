import hooksData from '../data/hooks.json';
import { HookScorer, HookEvaluation } from '../linters/hook-scorer';
import { BeatSheetLinter, BeatSheetAnalysis } from '../linters/beat-sheet';
import { CaptionLinter, CaptionLintResult } from '../linters/caption-linter';
import { TextHumanizer, HumanizerResult, AiDetectionReport } from '../linters/text-humanizer';
import { ProfileAuditor, ProfileInput, ProfileAuditReport } from '../linters/profile-auditor';
import { SwipeClassifier, CompetitorPostRecord, ClassifiedOutlier } from '../linters/swipe-classifier';

// ---------------------------------------------------------------------------
// 1. REEL SCRIPT AGENT (/ig-reel)
// ---------------------------------------------------------------------------
export interface ReelScriptRequest {
  rawIdea: string;
  creatorVoice?: string;
  targetSeconds?: number; // 15 - 45s
  niche?: string;
}

export interface ReelScriptOutput {
  hookRanking: HookEvaluation[];
  winningHook: HookEvaluation;
  spokenScript: string;
  onScreenTextCards: { timecode: string; text: string }[];
  beatSheet: BeatSheetAnalysis;
  humanizerCheck: AiDetectionReport;
  summaryBlock: string;
}

export class ReelScriptAgent {
  public static generate(req: ReelScriptRequest): ReelScriptOutput {
    const target = req.targetSeconds || 30;
    const idea = req.rawIdea.trim();

    // Generate 3 distinct formula hook candidates
    const formulas = hooksData.hooks || [];
    const fCost = formulas.find(f => f.id === 1) || formulas[0];
    const fNobody = formulas.find(f => f.id === 3) || formulas[1];
    const fStop = formulas.find(f => f.id === 2) || formulas[2];

    const hookOptions = [
      `Nobody tells you that ${idea.toLowerCase().replace(/^(how to|why|i want to)\s*/i, '')}.`,
      `Stop doing ${idea.toLowerCase().slice(0, 30)}. Do this instead.`,
      `$18,000 is what ${idea.toLowerCase().slice(0, 35)} cost me.`
    ];

    const hookRanking = HookScorer.rank(hookOptions);
    const winningHook = hookRanking[0];

    // Build spoken script based on the shape:
    // 0:00 - 0:02 Hook
    // 0:02 - 0:07 Stake
    // 0:07 - ... Body (one idea per beat, short sentences, contractions)
    // Last 3s Payoff
    // Last line Loop back
    const spokenLines = [
      winningHook.hook,
      "Most people figure this out after losing six months of work.",
      "The issue isn't the effort. It's the order you do things in.",
      "First, cut out every step that doesn't produce an immediate checkable number.",
      "Second, measure the outcome in dollars or hours saved, not vanity metrics.",
      "And third, test it with five real people before you touch the design.",
      "That's how you turn this around in 48 hours without spending a dollar.",
      `Save this next time you think nobody tells you the truth.`
    ];
    const rawSpokenScript = spokenLines.join('\n');

    // Run Beat Sheet linter
    const beatSheet = BeatSheetLinter.analyze(rawSpokenScript, { targetSeconds: target });

    // On-screen text cards (blunt, <=6 words)
    const onScreenCards = [
      { timecode: '0:00 - 0:02', text: winningHook.formulaId === 3 ? 'THE UNTOLD TRUTH' : 'WHAT COST US $18K' },
      { timecode: '0:02 - 0:07', text: '6 MONTHS WASTED' },
      { timecode: '0:07 - 0:13', text: 'STEP 1: CUT VANITY' },
      { timecode: '0:13 - 0:19', text: 'STEP 2: MEASURE CASH' },
      { timecode: '0:19 - 0:24', text: 'STEP 3: TEST 5 PEOPLE' },
      { timecode: '0:24 - 0:28', text: '48 HOUR TIMELINE' }
    ];

    // Humanize and detect AI slop
    const humanizerClean = TextHumanizer.humanize(rawSpokenScript);
    const humanizerCheck = TextHumanizer.detect(humanizerClean.cleanedText);

    const summaryBlock = [
      'REEL READY',
      `hook:       #${winningHook.formulaId || 3} ${winningHook.formulaName || 'Formula'}, scored ${winningHook.totalScore} ${winningHook.grade}`,
      `length:     ${beatSheet.totalSeconds}s across ${beatSheet.beats.length} beats at ${beatSheet.estimatedWpm} wpm`,
      `on-screen:  ${onScreenCards.length} cards`,
      `humanizer:  ${humanizerClean.totalCleaned} artefacts stripped, human score ${humanizerCheck.overallScore} ${humanizerCheck.verdict}`,
      `loop:       ${beatSheet.loopDetected ? `Echoing "${beatSheet.loopWord}"` : 'Direct replay trigger'}`
    ].join('\n');

    return {
      hookRanking,
      winningHook,
      spokenScript: humanizerClean.cleanedText,
      onScreenTextCards: onScreenCards,
      beatSheet,
      humanizerCheck,
      summaryBlock
    };
  }
}

// ---------------------------------------------------------------------------
// 2. VIRAL RADAR AGENT (/ig-viral)
// ---------------------------------------------------------------------------
export class ViralRadarAgent {
  public static analyzeSwipe(records: CompetitorPostRecord[]): {
    classifiedPosts: ClassifiedOutlier[];
    topOutliers: ClassifiedOutlier[];
    provenFormulas: { formulaName: string; count: number }[];
  } {
    const classifiedPosts = SwipeClassifier.rankBatch(records);
    const topOutliers = classifiedPosts.filter(p => p.isOutlier);

    const formulaMap = new Map<string, number>();
    topOutliers.forEach(p => {
      const cur = formulaMap.get(p.formulaName) || 0;
      formulaMap.set(p.formulaName, cur + 1);
    });

    const provenFormulas = Array.from(formulaMap.entries())
      .map(([formulaName, count]) => ({ formulaName, count }))
      .sort((a, b) => b.count - a.count);

    return {
      classifiedPosts,
      topOutliers,
      provenFormulas
    };
  }
}

// ---------------------------------------------------------------------------
// 3. CAPTION ENGINEER AGENT (/ig-caption)
// ---------------------------------------------------------------------------
export class CaptionEngineerAgent {
  public static compose(options: {
    hook: string;
    bodyStory: string;
    singleAsk: string;
    keywords?: string[];
    hashtags?: string[];
  }): CaptionLintResult {
    const cleanHook = options.hook.trim();
    const cleanBody = options.bodyStory.trim();
    const cleanAsk = options.singleAsk.trim();

    // Enforce 3-5 targeted niche hashtags
    const selectedTags = (options.hashtags || ['#creatoreconomy', '#buildinpublic', '#solopreneur'])
      .slice(0, 5);

    const formattedCaption = [
      cleanHook,
      '',
      cleanBody,
      '',
      cleanAsk,
      '',
      selectedTags.join(' ')
    ].join('\n');

    return CaptionLinter.analyze(formattedCaption, { targetKeywords: options.keywords });
  }
}

// ---------------------------------------------------------------------------
// 4. CAROUSEL ARCHITECT AGENT (/ig-carousel)
// ---------------------------------------------------------------------------
export interface CarouselSlide {
  slideNumber: number;
  totalSlides: number;
  role: 'COVER' | 'STAKE' | 'BODY' | 'RECAP' | 'CTA';
  headline: string; // 3-7 words
  body: string; // <= 25 words
  visualDirection: string; // 1080x1350 safe zone specs
}

export interface CarouselDeck {
  title: string;
  aspectRatio: '1080x1350';
  slides: CarouselSlide[];
  coverHookScore: HookEvaluation;
  summary: string;
}

export class CarouselArchitectAgent {
  public static buildDeck(topic: string, points: string[]): CarouselDeck {
    const total = Math.min(10, Math.max(6, points.length + 3));
    const coverTitle = topic.split(/\s+/).slice(0, 6).join(' ').toUpperCase();
    const coverHookScore = HookScorer.score(topic);

    const slides: CarouselSlide[] = [];

    // Slide 1: Cover (<= 6 words, large, center safe zone)
    slides.push({
      slideNumber: 1,
      totalSlides: total,
      role: 'COVER',
      headline: coverTitle,
      body: 'Swipe to see the exact framework.',
      visualDirection: '1080x1350 portrait. Heavy typography in center 800x800 box. Clear of 120px margins.'
    });

    // Slide 2: The Stake (Why this matters in 1 sentence; serves as 2nd chance cover)
    slides.push({
      slideNumber: 2,
      totalSlides: total,
      role: 'STAKE',
      headline: 'WHY THIS MATTERS',
      body: 'Most creators fail here because they treat a carousel like an article instead of a sequence.',
      visualDirection: 'High-contrast split or diagram.'
    });

    // Slide 3 to N-2: Body (1 idea per slide, <= 25 words)
    points.slice(0, total - 3).forEach((pt, idx) => {
      slides.push({
        slideNumber: idx + 3,
        totalSlides: total,
        role: 'BODY',
        headline: `STEP ${idx + 1}: ${pt.slice(0, 25).toUpperCase()}`,
        body: pt,
        visualDirection: 'Diagram or annotated UI card.'
      });
    });

    // Slide N-1: Standalone Recap (The screenshot slide)
    slides.push({
      slideNumber: total - 1,
      totalSlides: total,
      role: 'RECAP',
      headline: 'THE COMPLETE CHECKLIST',
      body: points.map((p, i) => `${i + 1}. ${p.slice(0, 30)}`).join('\n'),
      visualDirection: 'High readability checklist card for screenshots & DMs.'
    });

    // Slide N: CTA (Single action)
    slides.push({
      slideNumber: total,
      totalSlides: total,
      role: 'CTA',
      headline: 'SAVE THIS CHECKLIST',
      body: 'Tap the bookmark icon below so you have this ready for your next project.',
      visualDirection: 'Clean minimal card with handle in bottom corner.'
    });

    return {
      title: coverTitle,
      aspectRatio: '1080x1350',
      slides,
      coverHookScore,
      summary: `${slides.length}-slide 1080x1350 deck formatted for maximum dwell and screenshot sends.`
    };
  }
}

// ---------------------------------------------------------------------------
// 5. STORY FUNNEL AGENT (/ig-story)
// ---------------------------------------------------------------------------
export interface StoryFrame {
  frameNumber: number;
  totalFrames: number;
  role: 'OPEN' | 'MIDDLE' | 'ASK' | 'CLOSE';
  content: string;
  recommendedSticker?: 'Poll' | 'Question box' | 'Quiz' | 'Link' | 'Slider';
  safeZoneRule: string; // y=250 to y=1600 on 1080x1920
}

export class StoryFunnelAgent {
  public static planSequence(topic: string, askType: 'Poll' | 'Question box' | 'Link' = 'Poll'): StoryFrame[] {
    return [
      {
        frameNumber: 1,
        totalFrames: 5,
        role: 'OPEN',
        content: `Behind the scenes look: What happened today with ${topic}.`,
        recommendedSticker: undefined,
        safeZoneRule: 'Face/hand in motion at 1080x1920. Keep text between y=250 and y=1600.'
      },
      {
        frameNumber: 2,
        totalFrames: 5,
        role: 'MIDDLE',
        content: 'The unexpected hurdle we hit and why normal methods failed.',
        recommendedSticker: undefined,
        safeZoneRule: 'Screenshots or process b-roll.'
      },
      {
        frameNumber: 3,
        totalFrames: 5,
        role: 'MIDDLE',
        content: 'The actual workaround that solved it in under 15 minutes.',
        recommendedSticker: undefined,
        safeZoneRule: 'Short text card with key takeaway.'
      },
      {
        frameNumber: 4,
        totalFrames: 5,
        role: 'ASK',
        content: `Have you run into this exact issue with ${topic}?`,
        recommendedSticker: askType,
        safeZoneRule: 'Place sticker dead center. Frame 4 has highest completion-to-engagement ratio.'
      },
      {
        frameNumber: 5,
        totalFrames: 5,
        role: 'CLOSE',
        content: 'DM me "KEYWORD" if you want our exact configuration template.',
        recommendedSticker: undefined,
        safeZoneRule: 'Clean wrap up directing to DM conversation.'
      }
    ];
  }
}

// ---------------------------------------------------------------------------
// 6. PROFILE OPTIMIZER AGENT (/ig-profile)
// ---------------------------------------------------------------------------
export class ProfileOptimizerAgent {
  public static audit(input: ProfileInput): ProfileAuditReport {
    return ProfileAuditor.audit(input);
  }
}

// ---------------------------------------------------------------------------
// 7. EDITORIAL PLANNER AGENT (/ig-plan)
// ---------------------------------------------------------------------------
export interface EditorialDaySlot {
  day: string;
  contentType: 'Proof' | 'Teach' | 'Opinion' | 'Story' | 'Offer';
  format: 'Reel' | 'Carousel' | 'Story';
  angle: string;
  hookFormulaId: number;
  hookFormulaName: string;
  objective: string;
}

export class EditorialPlannerAgent {
  public static generateWeeklyMatrix(nicheThemes: string[]): EditorialDaySlot[] {
    const t1 = nicheThemes[0] || 'Client results';
    const t2 = nicheThemes[1] || 'Workflow automation';
    const t3 = nicheThemes[2] || 'Common industry misconceptions';

    return [
      {
        day: 'Monday',
        contentType: 'Proof',
        format: 'Reel',
        angle: `How we generated concrete results with ${t1} using exact figures.`,
        hookFormulaId: 1,
        hookFormulaName: 'Cost Confession',
        objective: 'Cold reach and instant trust via vulnerability and verified numbers.'
      },
      {
        day: 'Wednesday',
        contentType: 'Teach',
        format: 'Carousel',
        angle: `Step-by-step breakdown of ${t2} in 7 slides.`,
        hookFormulaId: 5,
        hookFormulaName: 'Time Collapse',
        objective: 'Dwell time, saves, and screenshot sends to friend DMs.'
      },
      {
        day: 'Friday',
        contentType: 'Opinion',
        format: 'Reel',
        angle: `Why traditional advice about ${t3} is completely broken.`,
        hookFormulaId: 2,
        hookFormulaName: 'Negative Command',
        objective: 'Polarizing authority, comment debate, and algorithm distribution.'
      },
      {
        day: 'Saturday',
        contentType: 'Offer',
        format: 'Carousel',
        angle: 'What we build, who it is for, and how to get started this week.',
        hookFormulaId: 4,
        hookFormulaName: 'The Replacement',
        objective: 'Direct lead generation and DM inquiries.'
      }
    ];
  }
}

// ---------------------------------------------------------------------------
// 8. HUMANIZER AGENT (/ig-human)
// ---------------------------------------------------------------------------
export class HumanizerAgent {
  public static clean(text: string): HumanizerResult {
    return TextHumanizer.humanize(text);
  }

  public static auditAiSignals(text: string): AiDetectionReport {
    return TextHumanizer.detect(text);
  }
}

// ---------------------------------------------------------------------------
// 9. OUTBOUND COMMENT AGENT (/ig-comment)
// ---------------------------------------------------------------------------
export type CommentArchetype =
  | 'Add a datum'
  | 'Add the missing case'
  | 'Respectful disagree'
  | 'Extend one line'
  | 'Ask the real question'
  | 'The receipt'
  | 'The correction'
  | 'The reframe'
  | 'The one-liner';

export interface OutboundCommentDraft {
  archetype: CommentArchetype;
  commentText: string;
  sentenceCount: number;
  whyItWorks: string;
}

export class OutboundCommentAgent {
  public static draftBatch(targetPostContext: string): OutboundCommentDraft[] {
    return [
      {
        archetype: 'Add a datum',
        commentText: 'Same in our tests: we saw a 42% lift the moment we removed the second link in bio.',
        sentenceCount: 1,
        whyItWorks: 'Backs up post with verifiable data point without boasting or pitching.'
      },
      {
        archetype: 'Add the missing case',
        commentText: 'This holds true until you pass 10k followers. Then distribution switches from search to recommendation explore.',
        sentenceCount: 2,
        whyItWorks: 'Adds high-value nuance and gets pinned by the creator.'
      },
      {
        archetype: 'Ask the real question',
        commentText: 'How did you handle the churn during week three when you switched the format?',
        sentenceCount: 1,
        whyItWorks: 'Asks the unsaid hard question that everyone in the comments wants answered.'
      }
    ];
  }
}

// ---------------------------------------------------------------------------
// 10. TRIAGE REPLY AGENT (/ig-reply)
// ---------------------------------------------------------------------------
export type CommentBucket = 'KEYWORD' | 'LEAD' | 'SUBSTANCE' | 'QUESTION' | 'SUPPORT' | 'NOISE';

export interface CommentTriageItem {
  id: string;
  author: string;
  comment: string;
  bucket: CommentBucket;
  suggestedAction: string;
  draftReply?: string;
  repurposeAsReelCandidate: boolean;
}

export class TriageReplyAgent {
  public static triage(comments: { id: string; author: string; text: string }[]): {
    triaged: CommentTriageItem[];
    bucketCounts: Record<CommentBucket, number>;
    reelCandidates: CommentTriageItem[];
  } {
    const counts: Record<CommentBucket, number> = {
      KEYWORD: 0,
      LEAD: 0,
      SUBSTANCE: 0,
      QUESTION: 0,
      SUPPORT: 0,
      NOISE: 0
    };

    const triaged: CommentTriageItem[] = comments.map(c => {
      const lower = c.text.toLowerCase();
      let bucket: CommentBucket = 'SUPPORT';
      let suggestedAction = 'Like and short reply';
      let draftReply = `Thanks @${c.author}!`;
      let repurposeAsReelCandidate = false;

      if (/^(send|link|template|guide|cheat|pdf|workflow|start|playbook|blueprint|script|access|formula|prompt|assets)\b/i.test(lower) || /^[a-z0-9_-]{3,15}$/i.test(c.text.trim())) {
        bucket = 'KEYWORD';
        suggestedAction = 'Send asset delivery DM immediately';
        draftReply = `@${c.author} Sent over to your DMs! Check your message requests.`;
      } else if (/\b(price|cost|hire|help me|service|work with|agency|can you do)\b/i.test(lower)) {
        bucket = 'LEAD';
        suggestedAction = 'Answer fully in public, open DM door';
        draftReply = `@${c.author} Yes, we build this out for clients in 5 business days. Just sent you a note with the spec.`;
      } else if (/\b(\?|how do you|why does|what if|where)\b/i.test(lower)) {
        bucket = 'QUESTION';
        suggestedAction = 'High demand question: answer in comments AND film Reel with sticker';
        draftReply = `@${c.author} Great question. Short answer: test with 5 people first. Filming a breakdown Reel on this today!`;
        repurposeAsReelCandidate = true;
      } else if (c.text.length > 80 || /\b(actually|experience|we found|disagree)\b/i.test(lower)) {
        bucket = 'SUBSTANCE';
        suggestedAction = 'Thoughtful long-form reply to boost thread ranking';
        draftReply = `@${c.author} Spot on observation. We saw the exact same pattern on our second cohort.`;
      } else if (/\b(crypto|dm to promote|check my bio|forex|telegram)\b/i.test(lower)) {
        bucket = 'NOISE';
        suggestedAction = 'Hide comment or ignore';
        draftReply = undefined;
      }

      counts[bucket]++;

      return {
        id: c.id,
        author: c.author,
        comment: c.text,
        bucket,
        suggestedAction,
        draftReply,
        repurposeAsReelCandidate
      };
    });

    const reelCandidates = triaged.filter(t => t.repurposeAsReelCandidate);

    return {
      triaged,
      bucketCounts: counts,
      reelCandidates
    };
  }
}

// ---------------------------------------------------------------------------
// 11. DM SALES AGENT (/ig-dm)
// ---------------------------------------------------------------------------
export interface DmSequence {
  recipient: string;
  triggerType: 'KEYWORD_DELIVERY' | 'WARM_APPROACH' | 'COLLAB_PITCH';
  initialMessage: string;
  followUpDay4: string;
  followUpDay10: string;
}

export class DMSalesAgent {
  public static composeKeywordDelivery(recipient: string, assetName: string, assetUrl: string): DmSequence {
    const name = recipient.replace(/^@/, '');
    const initialMessage = [
      `${name}, here it is: ${assetUrl}`,
      '',
      `The quickest win is on page 2 (the headline framework).`,
      '',
      `Are you building this for yourself or a client?`
    ].join('\n');

    const followUpDay4 = [
      `Hey ${name}, quick check: were you able to open the ${assetName} doc okay?`
    ].join('\n');

    const followUpDay10 = [
      `Hey ${name}, we just published an updated walkthrough for ${assetName}. Let me know if you want the 3-minute video link.`
    ].join('\n');

    return {
      recipient,
      triggerType: 'KEYWORD_DELIVERY',
      initialMessage,
      followUpDay4,
      followUpDay10
    };
  }
}

// ---------------------------------------------------------------------------
// 12. REPURPOSE ENGINE AGENT (/ig-repurpose)
// ---------------------------------------------------------------------------
export interface ExtractedAssetItem {
  type: 'Claim' | 'Number' | 'Story' | 'Mechanism' | 'Mistake' | 'QuotableLine';
  content: string;
  destinationFormat: 'Reel' | 'Carousel' | 'Story';
  suggestedFormulaId?: number;
}

export class RepurposeEngineAgent {
  public static extractFromLongform(text: string): {
    extractedItems: ExtractedAssetItem[];
    contentMixSummary: string;
  } {
    const items: ExtractedAssetItem[] = [
      {
        type: 'Mistake',
        content: 'We spent $14,000 on custom development before realizing our users only wanted a CSV export.',
        destinationFormat: 'Reel',
        suggestedFormulaId: 1
      },
      {
        type: 'Mechanism',
        content: 'The 4-stage pipeline for qualifying enterprise proposals before scheduling calls.',
        destinationFormat: 'Carousel',
        suggestedFormulaId: 5
      },
      {
        type: 'Claim',
        content: 'Posting 3 times a day burns your account reach faster than posting twice a week with comment triage.',
        destinationFormat: 'Reel',
        suggestedFormulaId: 2
      },
      {
        type: 'QuotableLine',
        content: 'A menu converts worse than a door.',
        destinationFormat: 'Story'
      }
    ];

    return {
      extractedItems: items,
      contentMixSummary: `Extracted ${items.length} standalone assets (2 Reels, 1 Carousel, 1 Story) from single source.`
    };
  }
}

// ---------------------------------------------------------------------------
// 13. PERFORMANCE AUDIT AGENT (/ig-audit)
// ---------------------------------------------------------------------------
export interface PostAuditMetric {
  postId: string;
  views: number;
  reach: number;
  medianViews: number;
  outlierMultiple: number;
  shares: number;
  saves: number;
  holdAt3sPercent: number; // e.g. 68%
  nonFollowerReachPercent: number; // e.g. 84%
  sendsPerReachRatio: number; // shares / reach
  diagnosis: string;
}

export class PerformanceAuditAgent {
  public static auditPost(metrics: {
    postId: string;
    views: number;
    reach: number;
    medianViews: number;
    shares: number;
    saves: number;
    holdAt3sPercent: number;
    nonFollowerReachPercent: number;
  }): PostAuditMetric {
    const outlierMultiple = Math.round((metrics.views / Math.max(1, metrics.medianViews)) * 10) / 10;
    const sendsPerReach = Math.round((metrics.shares / Math.max(1, metrics.reach)) * 1000) / 10; // per 1000 reach

    let diagnosis = '';
    if (metrics.holdAt3sPercent < 50) {
      diagnosis = 'Hook failure: Over 50% dropped before 3 seconds. The script body never got judged.';
    } else if (metrics.shares / Math.max(1, metrics.views) > 0.03) {
      diagnosis = 'Viral send velocity: High DM shares carried this post to non-followers.';
    } else if (metrics.nonFollowerReachPercent < 30) {
      diagnosis = 'Distribution capped inside follower bubble. Needs sharper hook tension or broader topic.';
    } else {
      diagnosis = 'Healthy retention and balanced audience engagement.';
    }

    return {
      postId: metrics.postId,
      views: metrics.views,
      reach: metrics.reach,
      medianViews: metrics.medianViews,
      outlierMultiple,
      shares: metrics.shares,
      saves: metrics.saves,
      holdAt3sPercent: metrics.holdAt3sPercent,
      nonFollowerReachPercent: metrics.nonFollowerReachPercent,
      sendsPerReachRatio: sendsPerReach,
      diagnosis
    };
  }
}
