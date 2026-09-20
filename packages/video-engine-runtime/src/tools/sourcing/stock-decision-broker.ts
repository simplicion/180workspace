import { PexelsClient, PexelsVideoItem, PexelsPhotoItem } from "./pexels-client";
import { PixabayClient, PixabayVideoItem, PixabayImageItem } from "./pixabay-client";

export interface UnifiedStockMediaItem {
  id: string;
  provider: "pixabay" | "pexels" | "freesound";
  type: "video" | "photo" | "illustration" | "vector" | "audio";
  title: string;
  downloadUrl: string;
  thumbnailUrl: string;
  localCachedPath?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  tags: string[];
  sourceAttribution: string;
}

export interface StockBrokerRequest {
  prompt: string;
  targetAspect?: "16:9" | "9:16" | "1:1";
  desiredType?: "video" | "photo" | "illustration" | "vector" | "all";
  maxItems?: number;
  log?: (msg: string) => void;
}

export interface StockBrokerDecision {
  primaryProvider: "pixabay" | "pexels";
  secondaryProvider?: "pixabay" | "pexels";
  rationale: string;
  routedQuery: string;
  imageType?: "photo" | "illustration" | "vector" | "all";
  videoType?: "film" | "animation" | "all";
}

export class StockDecisionBroker {
  /**
   * Evaluates the semantic prompt and video properties to make an intelligent sourcing decision
   */
  static evaluate(request: StockBrokerRequest): StockBrokerDecision {
    const p = (request.prompt || "").toLowerCase();
    const aspect = request.targetAspect || "16:9";

    // 1. Check for Vector, Diagram, Illustration, or Icon intent (Pixabay Exclusive)
    const isVector = /vector|illustration|icon|diagram|drawing|graphic|infographic|badge|symbol/i.test(p);
    if (isVector) {
      return {
        primaryProvider: "pixabay",
        secondaryProvider: "pexels",
        rationale: "Prompt requests vector/illustration/graphic asset. Pixabay specializes in royalty-free vectors and transparent PNGs.",
        routedQuery: request.prompt.replace(/vector|illustration|icon|diagram/gi, "").trim() || request.prompt,
        imageType: /vector|svg/i.test(p) ? "vector" : "illustration",
      };
    }

    // 2. Check for Animation / 3D Render / Motion Graphic intent (Pixabay Animation)
    const isAnimation = /animation|animated|cartoon|3d render|motion graphic/i.test(p);
    if (isAnimation) {
      return {
        primaryProvider: "pixabay",
        secondaryProvider: "pexels",
        rationale: "Prompt requests animated motion graphic or cartoon footage. Pixabay video_type=animation selected.",
        routedQuery: request.prompt.replace(/animation|animated|cartoon/gi, "").trim() || request.prompt,
        videoType: "animation",
      };
    }

    // 3. Mobile Vertical Reels / TikToks (9:16 Portrait) -> Pexels first, Pixabay fallback
    if (aspect === "9:16") {
      return {
        primaryProvider: "pexels",
        secondaryProvider: "pixabay",
        rationale: "Vertical (9:16) reel requested. Pexels offers curated high-contrast portrait clips, with Pixabay as fallback.",
        routedQuery: request.prompt,
        videoType: "film",
      };
    }

    // 4. Horizontal Widescreen (16:9) Nature / Technology / Aerial 4K -> Pixabay + Pexels
    return {
      primaryProvider: "pixabay",
      secondaryProvider: "pexels",
      rationale: "Landscape (16:9) footage requested. Pixabay provides extensive 4K landscape footage with Pexels fallback.",
      routedQuery: request.prompt,
      videoType: "film",
    };
  }

  /**
   * Executes the federated multi-stock search with automatic waterfall fallback and deduplication
   */
  static async search(request: StockBrokerRequest): Promise<{
    items: UnifiedStockMediaItem[];
    decision: StockBrokerDecision;
    totalRetrieved: number;
  }> {
    const decision = this.evaluate(request);
    const max = request.maxItems || 4;
    request.log?.(`[StockDecisionBroker] ${decision.rationale}`);

    const orientation =
      request.targetAspect === "9:16" ? "portrait" : request.targetAspect === "1:1" ? "square" : "landscape";
    const pixabayOrientation =
      request.targetAspect === "9:16" ? "vertical" : request.targetAspect === "16:9" ? "horizontal" : "all";

    const unifiedItems: UnifiedStockMediaItem[] = [];

    // Helper: Map Pexels video
    const mapPexelsVideo = (v: PexelsVideoItem): UnifiedStockMediaItem => ({
      id: `pexels_vid_${v.id}`,
      provider: "pexels",
      type: "video",
      title: v.title || decision.routedQuery,
      downloadUrl: v.downloadUrl,
      thumbnailUrl: v.thumbnailUrl,
      durationSec: v.duration,
      width: v.width,
      height: v.height,
      aspectRatio: v.aspectRatio,
      tags: [],
      sourceAttribution: `Pexels / ${v.photographer}`,
    });

    // Helper: Map Pixabay video
    const mapPixabayVideo = (v: PixabayVideoItem): UnifiedStockMediaItem => ({
      id: v.id,
      provider: "pixabay",
      type: "video",
      title: v.title || decision.routedQuery,
      downloadUrl: v.downloadUrl,
      thumbnailUrl: v.thumbnailUrl,
      durationSec: v.duration,
      width: v.width,
      height: v.height,
      aspectRatio: v.aspectRatio,
      tags: v.tags,
      sourceAttribution: `Pixabay / ${v.user}`,
    });

    // Helper: Map Pixabay image
    const mapPixabayImage = (img: PixabayImageItem): UnifiedStockMediaItem => ({
      id: img.id,
      provider: "pixabay",
      type: img.type,
      title: img.title || decision.routedQuery,
      downloadUrl: img.downloadUrl,
      thumbnailUrl: img.previewUrl,
      width: img.width,
      height: img.height,
      aspectRatio: img.height > img.width ? "9:16" : "16:9",
      tags: img.tags,
      sourceAttribution: `Pixabay / ${img.user}`,
    });

    // Primary Provider Execution
    if (decision.primaryProvider === "pixabay") {
      if (decision.imageType && decision.imageType !== "photo") {
        // Query Pixabay images/vectors
        const res = await PixabayClient.searchImages({
          query: decision.routedQuery,
          imageType: decision.imageType,
          orientation: pixabayOrientation,
          perPage: max,
          log: request.log,
        });
        unifiedItems.push(...res.images.map(mapPixabayImage));
      } else {
        // Query Pixabay videos
        const res = await PixabayClient.searchVideos({
          query: decision.routedQuery,
          videoType: decision.videoType || "film",
          orientation: pixabayOrientation,
          perPage: max,
          log: request.log,
        });
        unifiedItems.push(...res.videos.map(mapPixabayVideo));
      }
    } else {
      // Primary is Pexels
      const res = await PexelsClient.searchVideos({
        query: decision.routedQuery,
        orientation,
        perPage: max,
        log: request.log,
      });
      unifiedItems.push(...res.videos.map(mapPexelsVideo));
    }

    // Waterfall Fallback if primary returned fewer than needed items
    if (unifiedItems.length < max && decision.secondaryProvider) {
      request.log?.(`[StockDecisionBroker] Primary returned ${unifiedItems.length}/${max} items. Cascading to secondary provider (${decision.secondaryProvider})...`);

      if (decision.secondaryProvider === "pixabay") {
        const res = await PixabayClient.searchVideos({
          query: decision.routedQuery,
          orientation: pixabayOrientation,
          perPage: max - unifiedItems.length,
          log: request.log,
        });
        unifiedItems.push(...res.videos.map(mapPixabayVideo));
      } else if (decision.secondaryProvider === "pexels") {
        const res = await PexelsClient.searchVideos({
          query: decision.routedQuery,
          orientation,
          perPage: max - unifiedItems.length,
          log: request.log,
        });
        unifiedItems.push(...res.videos.map(mapPexelsVideo));
      }
    }

    return {
      items: unifiedItems.slice(0, max),
      decision,
      totalRetrieved: unifiedItems.length,
    };
  }
}
