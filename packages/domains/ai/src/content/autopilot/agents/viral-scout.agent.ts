/**
 * Agent 5: Viral Scout & Outlier Hook Hunter Agent
 *
 * Implements Viral Outlier Discovery and Hook Scoring across the proven formulas.
 * Evaluates hook tension, delivery time (<3.0s), concreteness, and second-person relevance
 * so that no weak or generic hook is ever scheduled in the content calendar.
 */

export interface ViralHookEvaluation {
  hook: string;
  totalScore: number;
  grade: 'EXCELLENT' | 'STRONG' | 'MEDIOCRE' | 'WEAK' | 'FAIL';
  dealbreaker?: string;
  formulaId?: number;
  formulaName?: string;
  breakdown: {
    lengthScore: number;
    concretenessScore: number;
    stakesScore: number;
    frontLoadScore: number;
    audienceScore: number;
  };
  recommendations: string[];
}

export interface EvaluatedHookCandidate {
  rawHook: string;
  evaluation: ViralHookEvaluation;
  formulaId?: number;
  formulaName?: string;
  isHighValue: boolean;
}

export class ViralScoutAgent {
  private static readonly DEALBREAKERS = [
    { pattern: /^(hey|hi|hello|what's up|welcome back)/i, reason: 'Generic greeting wastes the first 1.5 seconds.' },
    { pattern: /^(today i want to talk about|in this video)/i, reason: 'Announcing the topic instead of opening a loop causes instant swipe.' },
    { pattern: /^(have you ever wondered)/i, reason: 'Cliche question hook is universally ignored.' },
  ];

  private static readonly FORMULAS = [
    { id: 1, name: 'The Expensive Mistake', pattern: /\$|\bcost\b|\blost\b|\bwasted\b/i },
    { id: 2, name: 'Contrarian Belief Break', pattern: /\bstop\b|\bnever\b|\bwrong\b|\blie\b|\bnobody tells you\b/i },
    { id: 3, name: 'Forbidden Knowledge', pattern: /\bsecret\b|\bhack\b|\bhidden\b|\bsteal\b|\bblueprint\b/i },
    { id: 4, name: 'Curiosity Gap Challenge', pattern: /\bwhy\b|\bhow this\b|\bthis 1 thing\b/i },
    { id: 5, name: '1-Second Specific Breakdown', pattern: /\b\d+\b/ },
  ];

  public static scoreHook(hookText: string): ViralHookEvaluation {
    const text = hookText.trim();
    const words = text.split(/\s+/).filter(Boolean);
    const recs: string[] = [];

    // Check dealbreakers
    let dealbreaker: string | undefined;
    for (const d of this.DEALBREAKERS) {
      if (d.pattern.test(text)) {
        dealbreaker = d.reason;
        recs.push(`Eliminate opener: ${d.reason}`);
        break;
      }
    }

    // Length score: 6-12 words is ideal
    let lengthScore = 20;
    if (words.length < 4) lengthScore = 10;
    else if (words.length > 14) lengthScore = 8;
    else if (words.length > 11) lengthScore = 15;

    // Concreteness score: numbers, currency, specific nouns
    let concretenessScore = 10;
    if (/\$|\b\d[\d,.]*\b/.test(text)) {
      concretenessScore = 20;
    } else if (/[A-Z][a-z]{2,}/.test(text)) {
      concretenessScore = 16;
    }

    // Front-load score: punchy start
    let frontLoadScore = 14;
    const firstTwo = words.slice(0, 2).join(' ').toLowerCase();
    if (/stop|nobody|why|\$|\d/.test(firstTwo)) {
      frontLoadScore = 20;
    }

    // Audience score: "you", "your", imperative
    let audienceScore = 12;
    if (/\b(you|your|you're)\b/i.test(text)) {
      audienceScore = 20;
    }

    // Stakes score
    let stakesScore = 14;
    if (/\b(save|lose|gain|kill|break|fail|win|cost|double)\b/i.test(text)) {
      stakesScore = 20;
    }

    let totalScore = lengthScore + concretenessScore + frontLoadScore + audienceScore + stakesScore;
    if (dealbreaker) totalScore = Math.min(totalScore, 45);

    // Identify formula
    let formulaId = 4;
    let formulaName = 'Curiosity Gap Challenge';
    for (const f of this.FORMULAS) {
      if (f.pattern.test(text)) {
        formulaId = f.id;
        formulaName = f.name;
        break;
      }
    }

    let grade: ViralHookEvaluation['grade'] = 'MEDIOCRE';
    if (totalScore >= 85) grade = 'EXCELLENT';
    else if (totalScore >= 70) grade = 'STRONG';
    else if (totalScore >= 50) grade = 'MEDIOCRE';
    else if (totalScore >= 35) grade = 'WEAK';
    else grade = 'FAIL';

    return {
      hook: text,
      totalScore,
      grade,
      dealbreaker,
      formulaId,
      formulaName,
      breakdown: {
        lengthScore,
        concretenessScore,
        stakesScore,
        frontLoadScore,
        audienceScore,
      },
      recommendations: recs,
    };
  }

  public static evaluateAndElevateHook(hook: string, topic: string): EvaluatedHookCandidate {
    let evalResult = this.scoreHook(hook);

    // If initial hook is weak or has a dealbreaker, elevate it using proven formula
    if (evalResult.totalScore < 60 || evalResult.dealbreaker) {
      const cleanTopic = topic.replace(/^(how to|why|i want to|tips on)\s*/i, '').trim();
      const elevatedHooks = [
        `Nobody tells you that ${cleanTopic.toLowerCase()}.`,
        `Stop doing ${cleanTopic.toLowerCase().slice(0, 30)}. Do this instead.`,
        `$18,000 is what ${cleanTopic.toLowerCase().slice(0, 35)} cost me.`
      ];

      const scored = elevatedHooks.map((h) => this.scoreHook(h)).sort((a, b) => b.totalScore - a.totalScore);
      evalResult = scored[0];
    }

    return {
      rawHook: evalResult.hook,
      evaluation: evalResult,
      formulaId: evalResult.formulaId,
      formulaName: evalResult.formulaName,
      isHighValue: evalResult.totalScore >= 65,
    };
  }
}
