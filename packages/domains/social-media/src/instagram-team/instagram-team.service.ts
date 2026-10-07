import {
  ReelScriptAgent,
  ViralRadarAgent,
  CaptionEngineerAgent,
  CarouselArchitectAgent,
  StoryFunnelAgent,
  ProfileOptimizerAgent,
  EditorialPlannerAgent,
  HumanizerAgent,
  OutboundCommentAgent,
  TriageReplyAgent,
  DMSalesAgent,
  RepurposeEngineAgent,
  PerformanceAuditAgent,
  ReelScriptRequest,
  ReelScriptOutput,
  CarouselDeck,
  StoryFrame,
  CommentTriageItem,
  DmSequence,
  ExtractedAssetItem,
  PostAuditMetric
} from './agents/instagram-crew';
import { HookScorer, HookEvaluation } from './linters/hook-scorer';
import { BeatSheetLinter, BeatSheetAnalysis } from './linters/beat-sheet';
import { CaptionLinter, CaptionLintResult } from './linters/caption-linter';
import { TextHumanizer, HumanizerResult, AiDetectionReport } from './linters/text-humanizer';
import { ProfileAuditor, ProfileInput, ProfileAuditReport } from './linters/profile-auditor';
import { SwipeClassifier, CompetitorPostRecord, ClassifiedOutlier } from './linters/swipe-classifier';

export class InstagramTeamService {
  // 1. Reel creation & scoring (/ig-reel)
  public createReel(req: ReelScriptRequest): ReelScriptOutput {
    return ReelScriptAgent.generate(req);
  }

  // 2. Viral swipe radar (/ig-viral)
  public analyzeViralRadar(records: CompetitorPostRecord[]) {
    return ViralRadarAgent.analyzeSwipe(records);
  }

  // 3. Caption engineering & 125-char mobile feed simulator (/ig-caption)
  public composeCaption(options: {
    hook: string;
    bodyStory: string;
    singleAsk: string;
    keywords?: string[];
    hashtags?: string[];
  }): CaptionLintResult {
    return CaptionEngineerAgent.compose(options);
  }

  // 4. Carousel architecting (/ig-carousel)
  public buildCarousel(topic: string, points: string[]): CarouselDeck {
    return CarouselArchitectAgent.buildDeck(topic, points);
  }

  // 5. Story funnel sequences (/ig-story)
  public planStories(topic: string, askType?: 'Poll' | 'Question box' | 'Link'): StoryFrame[] {
    return StoryFunnelAgent.planSequence(topic, askType);
  }

  // 6. Profile audit (/ig-profile)
  public auditProfile(input: ProfileInput): ProfileAuditReport {
    return ProfileOptimizerAgent.audit(input);
  }

  // 7. Weekly editorial matrix (/ig-plan)
  public planWeeklySchedule(nicheThemes: string[]) {
    return EditorialPlannerAgent.generateWeeklyMatrix(nicheThemes);
  }

  // 8. Text humanizer & AI detector (/ig-human)
  public humanizeText(text: string): HumanizerResult {
    return HumanizerAgent.clean(text);
  }

  public detectAiSlop(text: string): AiDetectionReport {
    return HumanizerAgent.auditAiSignals(text);
  }

  // 9. Outbound comment sniper (/ig-comment)
  public generateOutboundComments(postContext: string) {
    return OutboundCommentAgent.draftBatch(postContext);
  }

  // 10. Inbound comment triage & Question-to-Reel converter (/ig-reply)
  public triageComments(comments: { id: string; author: string; text: string }[]) {
    return TriageReplyAgent.triage(comments);
  }

  // 11. DM conversion & follow-ups (/ig-dm)
  public buildKeywordDm(recipient: string, assetName: string, assetUrl: string): DmSequence {
    return DMSalesAgent.composeKeywordDelivery(recipient, assetName, assetUrl);
  }

  // 12. Longform asset repurposing (/ig-repurpose)
  public repurposeContent(text: string) {
    return RepurposeEngineAgent.extractFromLongform(text);
  }

  // 13. Performance audit & retention diagnosis (/ig-audit)
  public auditPerformance(metrics: {
    postId: string;
    views: number;
    reach: number;
    medianViews: number;
    shares: number;
    saves: number;
    holdAt3sPercent: number;
    nonFollowerReachPercent: number;
  }): PostAuditMetric {
    return PerformanceAuditAgent.auditPost(metrics);
  }

  // Direct Linters Access
  public scoreHook(hook: string): HookEvaluation {
    return HookScorer.score(hook);
  }

  public rankHooks(hooks: string[]): HookEvaluation[] {
    return HookScorer.rank(hooks);
  }

  public analyzeBeatSheet(script: string, targetSeconds?: number): BeatSheetAnalysis {
    return BeatSheetLinter.analyze(script, { targetSeconds });
  }

  public lintCaption(caption: string, keywords?: string[]): CaptionLintResult {
    return CaptionLinter.analyze(caption, { targetKeywords: keywords });
  }
}

export const instagramTeamService = new InstagramTeamService();
