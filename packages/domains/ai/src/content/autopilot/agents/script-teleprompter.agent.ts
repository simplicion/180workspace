/**
 * Agent 6: Script & Beat Sheet Teleprompter Director Agent
 *
 * Implements 165 WPM Spoken Pacing, Beat Sheet Pacing Checks,
 * Retention Loop Bridges, and Camera Teleprompter Formatting.
 * Ensures creators have an exact second-by-second teleprompter script
 * that eliminates mid-video drop-off.
 */

export interface TimedBeatDto {
  index: number;
  timecode: string;
  startSec: number;
  durationSec: number;
  wordCount: number;
  spokenWords: string;
  screenText?: string;
  visualAction?: string;
  retentionDevice?: string;
  isConcrete: boolean;
}

export interface ScriptDirectorResult {
  totalSeconds: number;
  totalWords: number;
  estimatedWpm: number;
  hookDurationSec: number;
  hookPassed: boolean;
  beats: TimedBeatDto[];
  teleprompterText: string;
  retentionLoopPhrase: string;
  pacingFlags: string[];
}

export class ScriptTeleprompterAgent {
  private static readonly WPM = 165;
  private static readonly WORDS_PER_SEC = 165 / 60; // 2.75 words/sec
  private static readonly HOOK_LIMIT_SEC = 3.0;

  /**
   * Formats seconds into MM:SS.s timecode.
   */
  public static formatTimecode(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  }

  /**
   * Builds timed beats, calculates pacing, and outputs teleprompter text.
   */
  public static directScript(params: {
    hook: string;
    onScreenHook?: string;
    bodyBeats: Array<{ beat: string; retentionDevice?: string }>;
    retentionLoop?: string;
    cta?: string;
    shotNotes?: string[];
  }): ScriptDirectorResult {
    const { hook, onScreenHook, bodyBeats, retentionLoop, cta, shotNotes = [] } = params;
    const beats: TimedBeatDto[] = [];
    const pacingFlags: string[] = [];
    let currentClock = 0;

    // 1. Beat 1: The Spoken Hook
    const hookWords = hook.trim().split(/\s+/).filter(Boolean);
    const hookDuration = Math.round((hookWords.length / this.WORDS_PER_SEC) * 10) / 10;
    const hookPassed = hookDuration <= this.HOOK_LIMIT_SEC;

    if (!hookPassed) {
      pacingFlags.push(`Hook runs ${hookDuration}s (target is <${this.HOOK_LIMIT_SEC}s). Consider trimming words to deliver punchline faster.`);
    }

    beats.push({
      index: 1,
      timecode: this.formatTimecode(currentClock),
      startSec: Math.round(currentClock * 10) / 10,
      durationSec: hookDuration,
      wordCount: hookWords.length,
      spokenWords: hook,
      screenText: onScreenHook || hook,
      visualAction: shotNotes[0] || 'Direct eye contact to camera lens. High energy cold open.',
      retentionDevice: 'Pattern Interrupt Cold Open',
      isConcrete: /\d|\$|[A-Z][a-z]{2,}/.test(hook),
    });

    currentClock += hookDuration;

    // 2. Body Beats
    bodyBeats.forEach((b, idx) => {
      const words = b.beat.trim().split(/\s+/).filter(Boolean);
      const duration = Math.round((words.length / this.WORDS_PER_SEC) * 10) / 10;

      if (duration > 5.5) {
        pacingFlags.push(`Beat ${idx + 2} runs ${duration}s without a visual change. Add B-roll or dynamic graphic.`);
      }

      beats.push({
        index: idx + 2,
        timecode: this.formatTimecode(currentClock),
        startSec: Math.round(currentClock * 10) / 10,
        durationSec: duration,
        wordCount: words.length,
        spokenWords: b.beat,
        screenText: undefined,
        visualAction: shotNotes[idx + 1] || 'Camera angle push-in or visual graphic callout.',
        retentionDevice: b.retentionDevice || (idx === 0 ? 'Context & Problem Bridge' : 'Core Value Insight'),
        isConcrete: /\d|\$|[A-Z][a-z]{2,}/.test(b.beat),
      });

      currentClock += duration;
    });

    // 3. Retention Loop Beat
    const loopText = retentionLoop?.trim() || `And that's why ${hookWords.slice(0, 5).join(' ')} matters.`;
    const loopWords = loopText.split(/\s+/).filter(Boolean);
    const loopDuration = Math.round((loopWords.length / this.WORDS_PER_SEC) * 10) / 10;

    beats.push({
      index: beats.length + 1,
      timecode: this.formatTimecode(currentClock),
      startSec: Math.round(currentClock * 10) / 10,
      durationSec: loopDuration,
      wordCount: loopWords.length,
      spokenWords: loopText,
      screenText: undefined,
      visualAction: 'Snap visual cut / emphasize key lesson.',
      retentionDevice: 'Retention Loopback',
      isConcrete: true,
    });

    currentClock += loopDuration;

    // 4. CTA Beat
    if (cta?.trim()) {
      const ctaWords = cta.trim().split(/\s+/).filter(Boolean);
      const ctaDuration = Math.round((ctaWords.length / this.WORDS_PER_SEC) * 10) / 10;

      beats.push({
        index: beats.length + 1,
        timecode: this.formatTimecode(currentClock),
        startSec: Math.round(currentClock * 10) / 10,
        durationSec: ctaDuration,
        wordCount: ctaWords.length,
        spokenWords: cta.trim(),
        screenText: 'Follow for more / Save this reel',
        visualAction: 'Hand gesture or pointing to bio / comment prompt.',
        retentionDevice: 'Conversion CTA',
        isConcrete: true,
      });

      currentClock += ctaDuration;
    }

    const totalWords = beats.reduce((acc, b) => acc + b.wordCount, 0);
    const totalSeconds = Math.round(currentClock * 10) / 10;

    // Generate formatted teleprompter lines (clean text with pause markers for high readability)
    const teleprompterLines = beats.map((b) => b.spokenWords.trim());
    const teleprompterText = teleprompterLines.join('\n\n');

    return {
      totalSeconds,
      totalWords,
      estimatedWpm: this.WPM,
      hookDurationSec: hookDuration,
      hookPassed,
      beats,
      teleprompterText,
      retentionLoopPhrase: loopText,
      pacingFlags,
    };
  }
}
