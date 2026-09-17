import { z } from "zod";
import * as path from "path";
import * as fs from "fs";
import { VideoDirectorTool, DirectorExecutionContext } from "../base-tool";
import { VisualCueTarget } from "../analysis/mood-classifier.tool";

export interface SourcedVisualAsset {
  cueId: string;
  assetId: string;
  query: string;
  category: string;
  localCachedPngPath: string;
  width: number;
  height: number;
  hasAlphaTransparency: boolean;
  timestampSec: number;
  durationSec: number;
  position: "UPPER_RIGHT" | "UPPER_LEFT" | "CENTER_RIGHT" | "LOWER_THIRD";
  sfxType: "POP" | "WHOOSH" | "DING" | "ALERT" | "CHIME";
}

export const AssetSearchInputSchema = z.object({
  cues: z.array(z.any()).optional(),
});

export type AssetSearchInput = z.infer<typeof AssetSearchInputSchema>;

export interface AssetSearchOutput {
  sourcedAssets: SourcedVisualAsset[];
}

export class AssetSearchTool extends VideoDirectorTool<AssetSearchInput, AssetSearchOutput> {
  readonly name = "asset_search";
  readonly description = "Searches, downloads, and renders transparent vector illustrations, medical diagrams, 3D emojis, and warning badges from the web and procedural vector engines.";
  readonly stage = "TIMELINE_COMPOSITION" as const;
  readonly inputSchema = AssetSearchInputSchema;

  /**
   * Broadcast-grade Procedural Vector Asset Definitions (renders 100% crisp with transparent alpha channel)
   */
  private static readonly VECTOR_GRAPHICS_LIBRARY: Record<string, string> = {
    sciatica_spine_nerve_diagram: `
      <svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="spineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#E2E8F0"/>
            <stop offset="100%" stop-color="#94A3B8"/>
          </linearGradient>
          <linearGradient id="nerveGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FF3366"/>
            <stop offset="100%" stop-color="#FFE600"/>
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        <!-- Dark Translucent Glass Card Background -->
        <rect x="20" y="20" width="560" height="560" rx="40" fill="#0F172A" fill-opacity="0.88" stroke="#38BDF8" stroke-width="4"/>
        
        <!-- Header Tag -->
        <rect x="180" y="45" width="240" height="42" rx="21" fill="#EF4444" fill-opacity="0.25" stroke="#EF4444" stroke-width="2"/>
        <text x="300" y="72" text-anchor="middle" fill="#FF4444" font-family="Arial, sans-serif" font-weight="900" font-size="22" letter-spacing="1">⚠️ SCIATIC NERVE</text>
        
        <!-- Lumbar Spine Vertebrae (L4-L5-S1) -->
        <g transform="translate(190, 110)">
          <!-- L3 -->
          <rect x="30" y="10" width="160" height="45" rx="12" fill="url(#spineGrad)" stroke="#FFFFFF" stroke-width="2"/>
          <text x="110" y="38" text-anchor="middle" fill="#1E293B" font-family="Arial, sans-serif" font-weight="bold" font-size="18">L3 VERTEBRA</text>
          
          <!-- Disc -->
          <rect x="45" y="60" width="130" height="16" rx="8" fill="#38BDF8" stroke="#0284C7" stroke-width="2"/>
          
          <!-- L4 -->
          <rect x="30" y="82" width="160" height="45" rx="12" fill="url(#spineGrad)" stroke="#FFFFFF" stroke-width="2"/>
          <text x="110" y="110" text-anchor="middle" fill="#1E293B" font-family="Arial, sans-serif" font-weight="bold" font-size="18">L4 VERTEBRA</text>
          
          <!-- Herniated Disc / Pinch Point -->
          <rect x="45" y="132" width="130" height="18" rx="9" fill="#EF4444" stroke="#B91C1C" stroke-width="2"/>
          <circle cx="175" cy="141" r="14" fill="#FF0000" filter="url(#glow)"/>
          <text x="175" y="146" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="bold" font-size="14">⚡</text>
          
          <!-- L5 -->
          <rect x="30" y="156" width="160" height="45" rx="12" fill="url(#spineGrad)" stroke="#FFFFFF" stroke-width="2"/>
          <text x="110" y="184" text-anchor="middle" fill="#1E293B" font-family="Arial, sans-serif" font-weight="bold" font-size="18">L5 VERTEBRA</text>
          
          <!-- Sacrum S1 Base -->
          <polygon points="10,210 210,210 160,290 60,290" fill="url(#spineGrad)" stroke="#FFFFFF" stroke-width="2"/>
          <text x="110" y="245" text-anchor="middle" fill="#1E293B" font-family="Arial, sans-serif" font-weight="bold" font-size="20">SACRUM (S1)</text>
        </g>
        
        <!-- Radiating Sciatic Nerve Branch -->
        <path d="M 370 250 Q 420 310 400 390 T 360 480" fill="none" stroke="url(#nerveGlow)" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>
        
        <!-- Callout Banner -->
        <rect x="60" y="475" width="480" height="60" rx="18" fill="#1E293B" stroke="#FFE600" stroke-width="3"/>
        <text x="300" y="512" text-anchor="middle" fill="#FFE600" font-family="Arial, sans-serif" font-weight="bold" font-size="24">💥 NERVE COMPRESSION POINT</text>
      </svg>
    `,
    gluteal_massage_therapy_illustration: `
      <svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="alertGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#DC2626"/>
            <stop offset="100%" stop-color="#991B1B"/>
          </linearGradient>
        </defs>
        <rect x="20" y="20" width="560" height="560" rx="40" fill="#0F172A" fill-opacity="0.90" stroke="#EF4444" stroke-width="4"/>
        
        <!-- Header -->
        <rect x="130" y="45" width="340" height="46" rx="23" fill="url(#alertGrad)"/>
        <text x="300" y="76" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-size="22">🚫 WRONG MASSAGE AREA</text>
        
        <!-- Gluteal Anatomy Diagram -->
        <circle cx="300" cy="270" r="140" fill="#334155" stroke="#64748B" stroke-width="4"/>
        
        <!-- Piriformis Muscle Band -->
        <path d="M 200 230 Q 300 280 400 260" stroke="#F43F5E" stroke-width="32" stroke-linecap="round" fill="none"/>
        <text x="300" y="270" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="bold" font-size="16">PIRIFORMIS MUSCLE</text>
        
        <!-- Tennis Ball / Massage Tool Red X -->
        <circle cx="350" cy="290" r="38" fill="#FACC15" stroke="#CA8A04" stroke-width="4"/>
        <text x="350" y="298" text-anchor="middle" fill="#000000" font-family="Arial, sans-serif" font-weight="900" font-size="24">🎾</text>
        <line x1="310" y1="250" x2="390" y2="330" stroke="#EF4444" stroke-width="12" stroke-linecap="round"/>
        <line x1="390" y1="250" x2="310" y2="330" stroke="#EF4444" stroke-width="12" stroke-linecap="round"/>
        
        <!-- Footer Warning -->
        <rect x="50" y="470" width="500" height="65" rx="20" fill="#450A0A" stroke="#EF4444" stroke-width="2"/>
        <text x="300" y="510" text-anchor="middle" fill="#FCA5A5" font-family="Arial, sans-serif" font-weight="bold" font-size="22">⚠️ Direct Pressure Irritates Sciatic Nerve</text>
      </svg>
    `,
    medical_caution_warning_badge: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <polygon points="256,30 490,440 22,440" fill="#DC2626" stroke="#FFFFFF" stroke-width="16" stroke-linejoin="round"/>
        <polygon points="256,70 455,420 57,420" fill="#FEF08A"/>
        <text x="256" y="320" text-anchor="middle" fill="#1E293B" font-family="Arial, sans-serif" font-weight="900" font-size="180">!</text>
        <rect x="106" y="350" width="300" height="50" rx="14" fill="#DC2626"/>
        <text x="256" y="384" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-size="28" letter-spacing="2">DANGER</text>
      </svg>
    `,
    verified_doctor_badge: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="230" fill="#0F172A" stroke="#38BDF8" stroke-width="14"/>
        <circle cx="256" cy="256" r="195" fill="#1E293B"/>
        <text x="256" y="240" text-anchor="middle" font-size="110">🩺</text>
        <circle cx="256" cy="340" r="32" fill="#00FF88"/>
        <text x="256" y="352" text-anchor="middle" fill="#064E3B" font-family="Arial, sans-serif" font-weight="900" font-size="36">✓</text>
        <text x="256" y="425" text-anchor="middle" fill="#38BDF8" font-family="Arial, sans-serif" font-weight="900" font-size="26" letter-spacing="1">VERIFIED DOCTOR</text>
      </svg>
    `,
    medical_health_cross_checkmark: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="220" fill="#059669" stroke="#34D399" stroke-width="16"/>
        <path d="M 150 260 L 225 335 L 365 185" fill="none" stroke="#FFFFFF" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    fluent_money_bag_3d: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="220" fill="#14532D" stroke="#22C55E" stroke-width="12"/>
        <text x="256" y="320" text-anchor="middle" font-size="200">💰</text>
      </svg>
    `,
    fluent_fire_flame_3d: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="220" fill="#7C2D12" stroke="#F97316" stroke-width="12"/>
        <text x="256" y="320" text-anchor="middle" font-size="200">🔥</text>
      </svg>
    `,
    ant_insect_danger_icon: `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="220" fill="#450A0A" stroke="#EF4444" stroke-width="12"/>
        <text x="256" y="320" text-anchor="middle" font-size="200">🐜</text>
        <polygon points="256,70 300,140 212,140" fill="#EF4444"/>
      </svg>
    `,
  };

  async execute(input: AssetSearchInput, context: DirectorExecutionContext): Promise<AssetSearchOutput> {
    context.log?.("[AssetSearchTool] Sourcing visual assets matching mood and cue anchors...");

    const assetCacheDir = path.join(context.tempDir, "assets");
    if (!fs.existsSync(assetCacheDir)) {
      fs.mkdirSync(assetCacheDir, { recursive: true });
    }

    const cues: VisualCueTarget[] = input.cues || context.artifacts.get("extracted_visual_cues") || [];
    const sourcedAssets: SourcedVisualAsset[] = [];

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require("sharp");

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      const assetId = `asset_${cue.assetQuery}_${i + 1}`;
      const pngPath = path.join(assetCacheDir, `${assetId}.png`);

      context.log?.(`[AssetSearchTool] Resolving asset for query: "${cue.assetQuery}" (${cue.category})...`);

      let resolved = false;

      // Tier 1: Check built-in procedural vector library
      const vectorSvg = AssetSearchTool.VECTOR_GRAPHICS_LIBRARY[cue.assetQuery];
      if (vectorSvg) {
        try {
          await sharp(Buffer.from(vectorSvg.trim()))
            .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(pngPath);
          resolved = true;
        } catch {
          // Fall through
        }
      }

      // Tier 2: Microsoft Fluent 3D Emoji / Twemoji CDN (Pandas, Dinosaurs, Fire, Money, etc.)
      if (!resolved) {
        const queryLower = cue.assetQuery.toLowerCase().replace(/_/g, "");
        const fluentMap: Record<string, string> = {
          panda: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Panda/3D/panda_3d.png",
          dinosaur: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/T-rex/3D/t-rex_3d.png",
          trex: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/T-rex/3D/t-rex_3d.png",
          ant: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Ant/3D/ant_3d.png",
          fire: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png",
          flame: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png",
          money: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money%20bag/3D/money_bag_3d.png",
          moneybag: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money%20bag/3D/money_bag_3d.png",
          rocket: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png",
          brain: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Brain/3D/brain_3d.png",
          warning: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Warning/3D/warning_3d.png",
          star: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Glowing%20star/3D/glowing_star_3d.png",
        };

        const cdnUrl = fluentMap[queryLower];
        if (cdnUrl) {
          try {
            const res = await fetch(cdnUrl);
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              const buf = Buffer.from(arrayBuf);
              await sharp(buf)
                .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toFile(pngPath);
              resolved = true;
              context.log?.(`[AssetSearchTool] Sourced 3D sticker from Fluent CDN for "${cue.assetQuery}".`);
            }
          } catch {
            // Fall through
          }
        }
      }

      // Tier 3: Iconify Universal Vector API (100,000+ vector icons with dynamic theme colors)
      if (!resolved) {
        try {
          const themeColor =
            cue.mood === "CLINICAL_AUTHORITY"
              ? "%2338BDF8"
              : cue.mood === "URGENT_WARNING"
              ? "%23EF4444"
              : cue.mood === "EXCITED_VIRAL"
              ? "%23FFE600"
              : "%2300FF88";

          const cleanQuery = cue.assetQuery.replace(/_/g, " ");
          const searchRes = await fetch(
            `https://api.iconify.design/search?query=${encodeURIComponent(cleanQuery)}&limit=5`
          );
          const searchData: any = await searchRes.json();
          if (searchData.icons && searchData.icons.length > 0) {
            const iconName = searchData.icons[0];
            const [prefix, name] = iconName.split(":");
            const svgRes = await fetch(
              `https://api.iconify.design/${prefix}/${name}.svg?color=${themeColor}`
            );
            const svgText = await svgRes.text();
            if (svgText.includes("<svg")) {
              await sharp(Buffer.from(svgText))
                .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toFile(pngPath);
              resolved = true;
              context.log?.(`[AssetSearchTool] Sourced Iconify vector "${iconName}" for "${cue.assetQuery}".`);
            }
          }
        } catch {
          // Fall through
        }
      }

      // Tier 4: Wikimedia Commons Open API (Diagrams, Medical & Educational Illustrations)
      if (!resolved && (cue.category === "ANATOMICAL_DIAGRAM" || cue.category === "CALLOUT_CARD")) {
        try {
          const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
            cue.assetQuery.replace(/_/g, " ")
          )}+filetype:bitmap|drawing&gsrlimit=1&prop=imageinfo&iiprop=url|mime&format=json`;
          const wikiRes = await fetch(wikiUrl);
          const wikiData: any = await wikiRes.json();
          const pages = wikiData.query?.pages;
          if (pages) {
            const firstKey = Object.keys(pages)[0];
            const imgInfo = pages[firstKey]?.imageinfo?.[0];
            if (imgInfo?.url) {
              const imgRes = await fetch(imgInfo.url);
              if (imgRes.ok) {
                const arrayBuf = await imgRes.arrayBuffer();
                await sharp(Buffer.from(arrayBuf))
                  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                  .png()
                  .toFile(pngPath);
                resolved = true;
                context.log?.(`[AssetSearchTool] Sourced Wikimedia Commons illustration for "${cue.assetQuery}".`);
              }
            }
          }
        } catch {
          // Fall through
        }
      }

      // Tier 5: Procedural Glass Badge Card Synthesizer
      if (!resolved) {
        const themeColor =
          cue.mood === "CLINICAL_AUTHORITY"
            ? "#38BDF8"
            : cue.mood === "URGENT_WARNING"
            ? "#EF4444"
            : cue.mood === "EXCITED_VIRAL"
            ? "#FFE600"
            : "#00FF88";

        const iconEmoji =
          cue.category === "ANATOMICAL_DIAGRAM"
            ? "🩺"
            : cue.category === "WARNING_BADGE"
            ? "⚠️"
            : cue.category === "METRIC_STAT"
            ? "📈"
            : "💡";

        const proceduralSvg = `
          <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="20" width="472" height="472" rx="40" fill="#0F172A" fill-opacity="0.94" stroke="${themeColor}" stroke-width="8"/>
            <text x="256" y="240" text-anchor="middle" font-size="120">${iconEmoji}</text>
            <text x="256" y="380" text-anchor="middle" fill="${themeColor}" font-family="Arial, sans-serif" font-weight="900" font-size="32" letter-spacing="1">${cue.assetQuery
          .replace(/_/g, " ")
          .toUpperCase()}</text>
          </svg>
        `;
        await sharp(Buffer.from(proceduralSvg.trim()))
          .png()
          .toFile(pngPath);
      }

      sourcedAssets.push({
        cueId: cue.id,
        assetId,
        query: cue.assetQuery,
        category: cue.category,
        localCachedPngPath: pngPath,
        width: 512,
        height: 512,
        hasAlphaTransparency: true,
        timestampSec: cue.timestampSec,
        durationSec: cue.durationSec,
        position: cue.position,
        sfxType: cue.sfxType,
      });

      context.onProgress?.(Math.round(((i + 1) / cues.length) * 100), `Sourced ${cue.assetQuery}`);
    }

    const output: AssetSearchOutput = { sourcedAssets };
    context.artifacts.set("sourced_visual_assets", sourcedAssets);
    context.log?.(`[AssetSearchTool] Sourced and normalized ${sourcedAssets.length} transparent visual asset(s).`);
    return output;
  }
}
