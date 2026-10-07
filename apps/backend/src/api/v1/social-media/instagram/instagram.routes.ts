import { Router, Request, Response } from 'express';
import { instagramTeamService } from '@workspace/social-media';

const router = Router();

function sendResponse(res: Response, fn: () => any) {
  try {
    const data = fn();
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('[instagram.routes] error:', err);
    return res.status(500).json({
      success: false,
      code: 'INSTAGRAM_TEAM_ERROR',
      error: err?.message || 'Unexpected error occurred'
    });
  }
}

// ---------------------------------------------------------------------------
// 1. Hook Scoring & Ranking (/ig-reel)
// ---------------------------------------------------------------------------
router.post('/hook-score', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { hook, hooks } = req.body;
    if (Array.isArray(hooks) && hooks.length > 0) {
      return {
        ranked: instagramTeamService.rankHooks(hooks)
      };
    }
    if (!hook || typeof hook !== 'string') {
      throw new Error('A valid "hook" string or "hooks" array is required.');
    }
    return {
      evaluation: instagramTeamService.scoreHook(hook)
    };
  });
});

// ---------------------------------------------------------------------------
// 2. Beat Sheet Timing & Pacing (/ig-reel)
// ---------------------------------------------------------------------------
router.post('/beat-sheet', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { script, targetSeconds } = req.body;
    if (!script || typeof script !== 'string') {
      throw new Error('A valid "script" text string is required.');
    }
    return instagramTeamService.analyzeBeatSheet(script, targetSeconds);
  });
});

// ---------------------------------------------------------------------------
// 3. Caption Simulator & Linter (/ig-caption)
// ---------------------------------------------------------------------------
router.post('/caption-lint', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { caption, keywords } = req.body;
    if (!caption || typeof caption !== 'string') {
      throw new Error('A valid "caption" string is required.');
    }
    return instagramTeamService.lintCaption(caption, keywords);
  });
});

// ---------------------------------------------------------------------------
// 4. Text Humanizer & AI Slop Detector (/ig-human)
// ---------------------------------------------------------------------------
router.post('/humanize', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      throw new Error('A valid "text" string is required.');
    }
    const cleanResult = instagramTeamService.humanizeText(text);
    const detection = instagramTeamService.detectAiSlop(cleanResult.cleanedText);
    return {
      cleaned: cleanResult,
      aiDetection: detection
    };
  });
});

// ---------------------------------------------------------------------------
// 5. Profile 12-Factor Audit (/ig-profile)
// ---------------------------------------------------------------------------
router.post('/profile-audit', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const input = req.body;
    if (!input || !input.handle) {
      throw new Error('Profile handle is required for audit.');
    }
    return instagramTeamService.auditProfile(input);
  });
});

// ---------------------------------------------------------------------------
// 6. Viral Radar & Outlier Multiple Classifier (/ig-viral)
// ---------------------------------------------------------------------------
router.post('/swipe-radar', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      throw new Error('"records" array is required.');
    }
    return instagramTeamService.analyzeViralRadar(records);
  });
});

// ---------------------------------------------------------------------------
// 7. Longform Repurposing Engine (/ig-repurpose)
// ---------------------------------------------------------------------------
router.post('/repurpose', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      throw new Error('"text" string from longform asset is required.');
    }
    return instagramTeamService.repurposeContent(text);
  });
});

// ---------------------------------------------------------------------------
// 8. End-to-End Reel Generator (/ig-reel)
// ---------------------------------------------------------------------------
router.post('/crew/reel', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { rawIdea, creatorVoice, targetSeconds, niche } = req.body;
    if (!rawIdea || typeof rawIdea !== 'string') {
      throw new Error('"rawIdea" is required to build a Reel.');
    }
    return instagramTeamService.createReel({
      rawIdea,
      creatorVoice,
      targetSeconds,
      niche
    });
  });
});

// ---------------------------------------------------------------------------
// 9. Carousel Deck Architect (/ig-carousel)
// ---------------------------------------------------------------------------
router.post('/crew/carousel', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { topic, points } = req.body;
    if (!topic || !Array.isArray(points)) {
      throw new Error('"topic" and "points" array are required.');
    }
    return instagramTeamService.buildCarousel(topic, points);
  });
});

// ---------------------------------------------------------------------------
// 10. Daily Story Funnel Sequence (/ig-story)
// ---------------------------------------------------------------------------
router.post('/crew/story', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { topic, askType } = req.body;
    if (!topic) {
      throw new Error('"topic" is required.');
    }
    return {
      frames: instagramTeamService.planStories(topic, askType)
    };
  });
});

// ---------------------------------------------------------------------------
// 11. Weekly Editorial Matrix (/ig-plan)
// ---------------------------------------------------------------------------
router.post('/crew/plan', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { nicheThemes } = req.body;
    const themes = Array.isArray(nicheThemes) ? nicheThemes : ['Growth', 'Systems', 'Mistakes'];
    return {
      schedule: instagramTeamService.planWeeklySchedule(themes)
    };
  });
});

// ---------------------------------------------------------------------------
// 12. Outbound Comment Sniper (/ig-comment)
// ---------------------------------------------------------------------------
router.post('/crew/comments', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { postContext } = req.body;
    if (!postContext) {
      throw new Error('"postContext" is required.');
    }
    return {
      comments: instagramTeamService.generateOutboundComments(postContext)
    };
  });
});

// ---------------------------------------------------------------------------
// 13. Inbound Comment Triage & Question-to-Reel (/ig-reply)
// ---------------------------------------------------------------------------
router.post('/crew/triage', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { comments } = req.body;
    if (!Array.isArray(comments)) {
      throw new Error('"comments" array is required.');
    }
    return instagramTeamService.triageComments(comments);
  });
});

// ---------------------------------------------------------------------------
// 14. Keyword DM Delivery (/ig-dm)
// ---------------------------------------------------------------------------
router.post('/crew/dm', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const { recipient, assetName, assetUrl } = req.body;
    if (!recipient || !assetName || !assetUrl) {
      throw new Error('"recipient", "assetName", and "assetUrl" are required.');
    }
    return instagramTeamService.buildKeywordDm(recipient, assetName, assetUrl);
  });
});

// ---------------------------------------------------------------------------
// 15. Retention Post-Mortem Audit (/ig-audit)
// ---------------------------------------------------------------------------
router.post('/crew/audit', (req: Request, res: Response) => {
  sendResponse(res, () => {
    const metrics = req.body;
    if (!metrics || !metrics.postId) {
      throw new Error('"postId" and performance metrics are required.');
    }
    return instagramTeamService.auditPerformance(metrics);
  });
});

export default router;
