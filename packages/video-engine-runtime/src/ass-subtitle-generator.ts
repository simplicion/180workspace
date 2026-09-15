import { CaptionSegment, RationalTimeMath } from "@workspace/video-contracts";

export class AssSubtitleGenerator {
  static generate(
    captions: CaptionSegment[],
    options: { preset?: string; fontSize?: number; resolution?: { width: number; height: number } } = {}
  ): string {
    return this.generateAss(captions, options.resolution || { width: 1920, height: 1080 });
  }

  /**
   * Generates a complete, compliant Advanced SubStation Alpha (.ass v4.00+) script
   * with karaoke word timing, bounce popups, and high-retention styling.
   */
  static generateAss(
    captions: CaptionSegment[],
    resolution: { width: number; height: number } = { width: 1920, height: 1080 }
  ): string {
    const lines: string[] = [];

    // 1. Script Info Header
    lines.push("[Script Info]");
    lines.push("Title: 180 Workspace Autonomous Subtitles");
    lines.push("ScriptType: v4.00+");
    lines.push("WrapStyle: 0");
    lines.push("ScaledBorderAndShadow: yes");
    lines.push(`PlayResX: ${resolution.width}`);
    lines.push(`PlayResY: ${resolution.height}`);
    lines.push("");

    // 2. V4+ Styles Definition
    lines.push("[V4+ Styles]");
    lines.push("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding");
    
    // Hormozi Style (Bold Yellow text, Pure Black outline & shadow)
    lines.push("Style: HormoziBounce,Inter,64,&H0000FFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,5,3,2,30,30,80,1");
    // Ali Abdaal Clean (Elegant White with subtle drop shadow)
    lines.push("Style: AbdaalClean,Inter,48,&H00FFFFFF,&H00FFFFFF,&H001A1A1A,&H60000000,0,0,0,0,100,100,0,0,1,2,2,2,30,30,70,1");
    // Neon Punch (Vibrant Cyan text)
    lines.push("Style: NeonPunch,Inter,60,&H00FFFF00,&H00FFFF00,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,30,30,80,1");
    lines.push("");

    // 3. Dialogue Events
    lines.push("[Events]");
    lines.push("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text");

    captions.forEach((cap) => {
      const startSec = RationalTimeMath.toSeconds(cap.timeRange.start);
      const endSec = startSec + RationalTimeMath.toSeconds(cap.timeRange.duration);

      const startTimeStr = this.formatAssTime(startSec);
      const endTimeStr = this.formatAssTime(endSec);

      const styleName =
        cap.style?.preset === "ALI_ABDAAL_CLEAN"
          ? "AbdaalClean"
          : cap.style?.preset === "BOLD_CENTER"
          ? "NeonPunch"
          : "HormoziBounce";

      let dialogueText = "";

      if (cap.words && cap.words.length > 0) {
        // Build Karaoke string with word timings
        dialogueText = cap.words
          .map((w) => {
            const wStart = RationalTimeMath.toSeconds(w.start);
            const wEnd = RationalTimeMath.toSeconds(w.end);
            const durationCs = Math.max(1, Math.round((wEnd - wStart) * 100)); // Centiseconds

            const highlightTag = w.highlight ? "{\\c&H0000FFFF&\\fscx115\\fscy115}" : "{\\c&H00FFFFFF&\\fscx100\\fscy100}";
            return `{\\k${durationCs}}${highlightTag}${w.word}{\\r}`;
          })
          .join(" ");
      } else {
        dialogueText = cap.text;
      }

      lines.push(`Dialogue: 0,${startTimeStr},${endTimeStr},${styleName},,0,0,0,,${dialogueText}`);
    });

    return lines.join("\n");
  }

  private static formatAssTime(seconds: number): string {
    const totalCs = Math.floor(seconds * 100);
    const cs = totalCs % 100;
    const s = Math.floor(seconds) % 60;
    const m = Math.floor(seconds / 60) % 60;
    const h = Math.floor(seconds / 3600);

    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  }
}
