import {
  HookScorer,
  BeatSheetLinter,
  CaptionLinter,
  TextHumanizer,
  ProfileAuditor,
  SwipeClassifier,
  ReelScriptAgent,
  CarouselArchitectAgent,
  StoryFunnelAgent,
  TriageReplyAgent,
  EditorialPlannerAgent,
  instagramTeamService
} from '../src/instagram-team';

describe('Instagram Team & 13 Skills Suite', () => {
  describe('1. HookScorer (/ig-reel)', () => {
    it('catches "stop scrolling" as dealbreaker', () => {
      const res = HookScorer.score('Stop scrolling right now and listen');
      expect(res.totalScore).toBe(0);
      expect(res.dealbreaker).toBeDefined();
      expect(res.grade).toBe('FAIL');
    });

    it('scores strong concrete hook with high rating', () => {
      const res = HookScorer.score('$18,000 is what one missing contract cost me.');
      expect(res.totalScore).toBeGreaterThanOrEqual(65);
      expect(res.formulaId).toBe(1); // Cost Confession
      expect(res.grade).toMatch(/STRONG|EXCELLENT/);
    });

    it('ranks multiple hooks from best to worst', () => {
      const ranked = HookScorer.rank([
        'Hello guys today I wanted to talk about proposals',
        '$18,000 is what one missing contract cost me.',
        'Nobody tells you that your first 30 reels are supposed to flop.'
      ]);
      expect(ranked[0].totalScore).toBeGreaterThan(ranked[2].totalScore);
    });
  });

  describe('2. BeatSheetLinter (/ig-reel)', () => {
    it('computes 165 WPM pacing and timecodes', () => {
      const script = [
        'Nobody tells you that your first 30 reels will flop.',
        'Most people quit when views stay under 200.',
        'The secret is simple: measure shares, not views.',
        'Save this next time nobody tells you the truth.'
      ].join('\n');

      const analysis = BeatSheetLinter.analyze(script, { targetSeconds: 30 });
      expect(analysis.beats.length).toBe(4);
      expect(analysis.hookDurationSec).toBeLessThanOrEqual(3.5);
      expect(analysis.loopDetected).toBe(true);
      expect(analysis.loopWord).toBe('nobody');
    });
  });

  describe('3. CaptionLinter (/ig-caption)', () => {
    it('enforces 5-hashtag cap and flags dead links', () => {
      const badCaption = 'Check out our site at https://example.com/product #viral #fyp #reels #explore #trending #marketing #growth';
      const res = CaptionLinter.analyze(badCaption);
      expect(res.passed).toBe(false);
      expect(res.checks.some(c => c.check === 'HASHTAG_COUNT' && c.status === 'FAIL')).toBe(true);
      expect(res.checks.some(c => c.check === 'UNCLICKABLE_LINKS' && c.status === 'FAIL')).toBe(true);
      expect(res.checks.some(c => c.check === 'FILLER_HASHTAGS' && c.status === 'FAIL')).toBe(true);
    });

    it('passes clean compliant caption', () => {
      const goodCaption = [
        'Nobody tells you that your first 30 reels will flop.',
        '',
        'We tested this across 12 agency accounts over six months.',
        '',
        'Comment the word PLAYBOOK and I will DM you our exact swipe file.',
        '',
        '#creatoreconomy #socialmediatips #solopreneur'
      ].join('\n');

      const res = CaptionLinter.analyze(goodCaption);
      expect(res.passed).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('4. TextHumanizer (/ig-human)', () => {
    it('purges invisible unicode tags and em dashes', () => {
      const synthetic = 'This is\u200B a game-changer—it will foster unprecedented growth.';
      const cleaned = TextHumanizer.humanize(synthetic);
      expect(cleaned.cleanedText).not.toContain('\u200B');
      expect(cleaned.cleanedText).not.toContain('—');
      expect(cleaned.totalCleaned).toBeGreaterThanOrEqual(2);
    });

    it('detects AI slop vs human voice', () => {
      const aiSlop = 'In today’s fast-paced digital landscape, it is crucial to delve into the multifaceted tapestry of modern marketing.';
      const report = TextHumanizer.detect(aiSlop);
      expect(report.verdict).toMatch(/SLIGHT_AI_PATTERNS|HEAVY_AI_SLOP/);
    });
  });

  describe('5. ProfileAuditor (/ig-profile)', () => {
    it('scores profile and generates prioritized action plan', () => {
      const report = ProfileAuditor.audit({
        handle: 'danaruiz.studio',
        nameField: 'Dana Ruiz | Proposal Templates',
        bio: 'Helping design studios close 5-figure projects without pitching\nOver $2.4M in client revenue generated\nGrab free template below 👇',
        pinnedPostCount: 3,
        linkCount: 1,
        hasProfilePhoto: true,
        photoIsFaceCloseUp: true,
        highlights: ['Results', 'Pricing', 'How It Works', 'About']
      });

      expect(report.totalScore).toBeGreaterThanOrEqual(80);
      expect(report.grade).toMatch(/A|A\+/);
      expect(report.items.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('6. Outlier Radar (/ig-viral)', () => {
    it('calculates outlier multiple over baseline', () => {
      const outliers = SwipeClassifier.rankBatch([
        { account: '@someone', medianViews: 10000, views: 420000, hook: 'Nobody tells you your first 30 flop' },
        { account: '@other', medianViews: 50000, views: 20000, hook: 'Today I went to the coffee shop' }
      ]);

      expect(outliers[0].outlierMultiple).toBe(42.0);
      expect(outliers[0].isOutlier).toBe(true);
      expect(outliers[1].isOutlier).toBe(false);
    });
  });

  describe('7. End-to-End Instagram Crew Service', () => {
    it('executes full Reel pipeline', () => {
      const output = instagramTeamService.createReel({
        rawIdea: 'Client contract mistakes that cost money',
        targetSeconds: 30
      });
      expect(output.winningHook).toBeDefined();
      expect(output.spokenScript).toBeDefined();
      expect(output.beatSheet.beats.length).toBeGreaterThan(0);
      expect(output.onScreenTextCards.length).toBeGreaterThan(0);
      expect(output.summaryBlock).toContain('REEL READY');
    });

    it('builds 1080x1350 carousel deck', () => {
      const deck = instagramTeamService.buildCarousel('3 proposal mistakes costing you clients', [
        'Sending pricing before scope is locked',
        'Giving 5 options instead of 1 clear recommendation',
        'Missing an automatic expiration date'
      ]);
      expect(deck.aspectRatio).toBe('1080x1350');
      expect(deck.slides.length).toBe(6);
      expect(deck.slides[0].role).toBe('COVER');
      expect(deck.slides[deck.slides.length - 1].role).toBe('CTA');
    });

    it('plans story funnel sequence', () => {
      const frames = instagramTeamService.planStories('New pricing tier launch', 'Poll');
      expect(frames.length).toBe(5);
      expect(frames[3].role).toBe('ASK');
      expect(frames[3].recommendedSticker).toBe('Poll');
    });

    it('triages comments and identifies Question-to-Reel candidates', () => {
      const triage = instagramTeamService.triageComments([
        { id: '1', author: 'mark', text: 'PLAYBOOK' },
        { id: '2', author: 'sarah', text: 'How do you handle scope creep when clients ask for revisions?' },
        { id: '3', author: 'spambot', text: 'DM me on Telegram to invest in crypto' }
      ]);
      expect(triage.bucketCounts.KEYWORD).toBe(1);
      expect(triage.bucketCounts.QUESTION).toBe(1);
      expect(triage.bucketCounts.NOISE).toBe(1);
      expect(triage.reelCandidates.length).toBe(1);
      expect(triage.reelCandidates[0].author).toBe('sarah');
    });

    it('plans balanced weekly schedule matrix', () => {
      const schedule = instagramTeamService.planWeeklySchedule(['Agency proposals', 'Client onboarding']);
      expect(schedule.length).toBe(4);
      expect(schedule.some(s => s.contentType === 'Proof')).toBe(true);
      expect(schedule.some(s => s.contentType === 'Teach')).toBe(true);
    });
  });
});
