/**
 * SentenceStreamer
 * 
 * An ultra-low latency streaming sentence chunker for Voice AI pipelines.
 * Buffers incoming LLM token deltas and yields natural spoken sentences as soon
 * as sentence terminators (., ?, !, ;, :) or logical conversational pauses are reached.
 */

export interface SentenceStreamerOptions {
  minWordsPerChunk?: number;
  maxWordsPerChunk?: number;
}

export class SentenceStreamer {
  private buffer: string = '';
  private minWords: number;
  private maxWords: number;
  private isFirstChunk: boolean = true;

  constructor(options: SentenceStreamerOptions = {}) {
    // For the very first chunk, we want minimum words (3-4 words) to achieve sub-300ms Time-To-First-Audio (TTFA)
    this.minWords = options.minWordsPerChunk || 3;
    this.maxWords = options.maxWordsPerChunk || 25;
  }

  /**
   * Push a new token delta into the buffer.
   * Returns an array of completed sentence strings ready for immediate TTS synthesis.
   */
  push(delta: string): string[] {
    if (!delta) return [];
    this.buffer += delta;

    const sentences: string[] = [];
    let extracted: string | null = null;

    while ((extracted = this.extractNextSentence()) !== null) {
      if (extracted.trim().length > 0) {
        sentences.push(extracted.trim());
        this.isFirstChunk = false;
      }
    }

    return sentences;
  }

  /**
   * Flush any remaining text in the buffer when LLM stream finishes.
   */
  flush(): string[] {
    const remaining = this.buffer.trim();
    this.buffer = '';
    this.isFirstChunk = true;
    if (remaining.length > 0) {
      return [remaining];
    }
    return [];
  }

  /**
   * Resets the streamer state for a new turn.
   */
  reset(): void {
    this.buffer = '';
    this.isFirstChunk = true;
  }

  private extractNextSentence(): string | null {
    if (!this.buffer || this.buffer.trim().length === 0) {
      return null;
    }

    const effectiveMinWords = this.isFirstChunk ? 2 : this.minWords;
    const words = this.buffer.trim().split(/\s+/);

    // Regex matching sentence terminators: . ? ! \n ; : followed by whitespace or boundary
    // Avoids splitting on common abbreviations like Dr., Mr., Inc., etc.
    const match = this.buffer.match(/([.!?\n]+|\;|\:)(?:\s+|$)/);

    if (match && match.index !== undefined) {
      const splitIdx = match.index + match[1].length;
      const candidate = this.buffer.substring(0, splitIdx).trim();

      // Check if it's an abbreviation like "Dr." or "U.S."
      const isAbbreviation = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Inc|Ltd|vs|U\.S|e\.g|i\.e)\.$/i.test(candidate);

      if (!isAbbreviation && candidate.length > 0) {
        const isExclamationOrQuestion = /[!?]$/.test(candidate);
        const candidateWords = candidate.split(/\s+/).filter(Boolean);

        // Immediate split if exclamation/question, or if word count >= effectiveMinWords, or length >= 8
        if (isExclamationOrQuestion || candidateWords.length >= effectiveMinWords || candidate.length >= 8) {
          this.buffer = this.buffer.substring(splitIdx).trimStart();
          return candidate;
        }
      }
    }

    // Secondary clause boundary: comma (,) if we exceed max words
    if (words.length >= this.maxWords) {
      const commaMatch = this.buffer.match(/[,]\s+/);
      if (commaMatch && commaMatch.index !== undefined && commaMatch.index > 15) {
        const splitIdx = commaMatch.index + 1;
        const candidate = this.buffer.substring(0, splitIdx).trim();
        this.buffer = this.buffer.substring(splitIdx).trimStart();
        return candidate;
      }

      // Hard split on max words if no punctuation found
      const wordList = this.buffer.split(/\s+/);
      const splitWords = wordList.slice(0, this.maxWords).join(' ');
      this.buffer = wordList.slice(this.maxWords).join(' ');
      return splitWords;
    }

    return null;
  }
}
