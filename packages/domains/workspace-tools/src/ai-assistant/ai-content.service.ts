// @ts-nocheck
import { prisma } from '@workspace/db';
// @ts-nocheck
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class AiContentService {
    /**
     * Get the company-specific AI settings
     * @param {Object} companyPrisma - The company's database connection
     * @returns {Object|null} - The AI settings or null if not configured
     */
    async getAiSettings(companyId) {
        if (!companyId) return null;
        
        const { prisma } = require('@workspace/db');
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        let metadata = company?.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }
        
        if (!metadata || !metadata.aiProvider || metadata.aiProvider === 'none') {
            return null;
        }
        
        return metadata;
    }

    /**
     * Generates the master prompt for the AI based on user configuration
     * @param {Object} config - The calendar configuration from the frontend
     * @returns {string} - The configured master prompt
     */
    buildMasterPrompt(config) {
        const {
            durationWords = '1 month',
            startDate,
            endDate,
            frequency = 'Weekly',
            industry = config.industry || config.brand_industry,
            brandVoice = config.brandVoice || config.brand_voice,
            targetAudience = config.targetAudience || config.target_audience,
            platforms = config.platforms || [],
            contentTypeMix = config.contentTypeMix || config.content_type_mix || {},
            engagementGoal = config.engagementGoal || config.engagement_goal || 'Growth'
        } = config;

        // Calculate expected number of pieces
        let weeks = 4;
        if (durationWords.includes('1 week')) weeks = 1;
        if (durationWords.includes('2 weeks')) weeks = 2;
        if (durationWords.includes('month')) weeks = 4.3; // Approx for month

        let postsPerWeek = 3;
        if (frequency.toLowerCase() === 'daily') postsPerWeek = 7;
        else if (frequency.includes('1x')) postsPerWeek = 1;
        else if (frequency.includes('3x')) postsPerWeek = 3;
        else if (frequency.includes('5x')) postsPerWeek = 5;

        const targetCount = Math.floor(weeks * postsPerWeek);

        // Calculate distribution
        let mixInstructions = '';
        if (Object.keys(contentTypeMix).length > 0) {
            mixInstructions = Object.entries(contentTypeMix)
                .map(([type, percentage]) => `- ${percentage}% ${type}`)
                .join('\n');
        } else {
            mixInstructions = 'Balanced mix of educational, promotional, and engaging content.';
        }

        const prompt = `
SYSTEM ROLE: Content Calendar Creator Engine for 180workspace Digital Marketing App

YOU ARE: An enterprise-grade content calendar creation assistant skilled in viral marketing and brand strategy.
YOUR GOAL: Generate a high-quality, perfectly structured social media content calendar based on the user's specific parameters.

PARAMETERS SET BY USER:
- Duration: ${durationWords} (From ${startDate} to ${endDate})
- Posting Frequency: ${frequency}
- REQUIRED TOTAL CONTENT PIECES: ${targetCount}
- Industry/Niche: ${industry || 'General Business'}
- Brand Voice: ${brandVoice}
- Target Audience: ${targetAudience || 'General Audience'}
- Selected Platforms: ${platforms.join(', ')}
- Main Goal: ${engagementGoal}
- Content Mix Distribution:
${mixInstructions}

CRITICAL INSTRUCTIONS (MUST FOLLOW):
1. **QUANTITY IS MANDATORY**: You MUST generate exactly ${targetCount} content pieces. Failure to provide all ${targetCount} pieces is a failure of the task. Do NOT truncate, do NOT use "..." or examples.
2. **Hooks ONLY on Reels/Videos**: Detailed scripts and "hooks" should only be provided for Video/Reel content types. For static Posts or Carousels, focus on the Headline and Caption.
3. **Full Ad Copy**: Provide COMPLETE, ready-to-publish captions and ad copy. Do NOT use summaries, placeholders, or bullet points.
4. **Researched Hashtags**: Provide high-performance, niche-relevant hashtags. Avoid generic sets like #marketing #business.
5. **Realistic Engagement**: Target realistic reach and engagement percentages based on the platform and industry benchmarks.
6. **No Generic Content**: Avoid clichÃ©s. Focus on value-driven pillars.

INSTRUCTIONS:
1. Generate a comprehensive content calendar covering the requested duration.
2. For EACH of the ${targetCount} posts, provide the following details:
   - Date & Time (ISO format, suggested posting time based on best practices)
   - Platform (Mapped from selected platforms)
   - Content Type (Post, Reel, or Carousel)
   - Content Category/Pillar (Educational, Promotional, Entertaining, etc.)
   - Headline (Catchy opening)
   - Copy (Full text caption in the specified brand voice)
   - Visual Description (Brief for a designer/editor)
   - Hashtags (Array of relevant tags)
   - Call to Action (CTA)
   - Engagement Target (Estimated reach and engagement rate)

OUTPUT FORMAT:
You MUST return ONLY a valid JSON array of objects. DO NOT wrap the JSON in Markdown formatting blocks.
Ensure the structure exactly matches this format:

[
  {
    "dateScheduled": "2024-05-01T10:00:00Z",
    "platform": "LinkedIn", 
    "contentType": "Post", 
    "pillar": "Educational",
    "headline": "...",
    "adCopyFull": "...",
    "videoScriptOrHooks": "...",
    "visualAssetsBrief": "...",
    "hashtags": ["#tag1", "#tag2"],
    "callToAction": "...",
    "engagementTarget": {
        "estimatedImpressions": 1200,
        "estimatedEngagementPercent": 4.5
    }
  }
]
`;
        return prompt;
    }

    /**
     * Generate the content calendar using the configured AI provider
     * @param {Object} companyId - The company's database connection
     * @param {Object} config - The calendar configuration
     * @param {string} userId - The ID of the user requesting the calendar
     * @returns {Object} - Result object containing { success, data, error }
     */
     async generateContentCalendar(companyId, config, userId) {
        const startTime = Date.now();
        let providerUsed = 'unknown';
        let promptContent = this.buildMasterPrompt(config);

        try {
            const settings = await this.getAiSettings(companyId);
            
            if (!settings) {
                return { 
                    success: false, 
                    error: "AI Provider is not configured or disabled for this workspace. Please update your Settings." 
                };
            }

            providerUsed = settings.aiProvider;
            let rawAiResponse = '';

            // --- Execute based on provider ---
            
            if (providerUsed === 'openai') {
                if (!settings.openaiKey) throw new Error("OpenAI API key is missing in settings.");
                const openai = new OpenAI({ apiKey: settings.openaiKey });
                
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are a helpful assistant designed to output strict JSON arrays only." },
                        { role: "user", content: promptContent }
                    ],
                    model: "gpt-3.5-turbo", // Or gpt-4o depending on tier preference
                    temperature: 0.7,
                    response_format: { type: "json_object" } // Using json_object might require prompting to return an object wrapping the array. Let's rely on strict prompting first, or try/catch parsing.
                });
                rawAiResponse = completion.choices[0].message.content;
            } 
            else if (providerUsed === 'gemini') {
                if (!settings.geminiKey) throw new Error("Gemini API key is missing in settings.");
                const genAI = new GoogleGenerativeAI(settings.geminiKey);
                const model = genAI.getGenerativeModel({ 
                    model: "gemini-1.5-flash",
                    generationConfig: { responseMimeType: "application/json" } // Force JSON
                });
                
                const result = await model.generateContent(promptContent);
                rawAiResponse = result.response.text();
            }
            else if (providerUsed === 'claude') {
                if (!settings.claudeKey) throw new Error("Claude API key is missing in settings.");
                const anthropic = new Anthropic({ apiKey: settings.claudeKey });
                
                const msg = await anthropic.messages.create({
                    model: "claude-3-5-sonnet-20240620",
                    max_tokens: 4000,
                    system: "You are a helpful assistant designed to output strict JSON arrays only. Do not wrap in markdown tags.",
                    messages: [
                         { role: "user", content: promptContent }
                    ]
                });
                rawAiResponse = msg.content[0]?.text || '';
            }

            // --- Parse and Validate Response ---
            let parsedData;
            try {
                // Sometimes AI still wraps in markdown despite instructions
                let cleanResponse = rawAiResponse;
                if (cleanResponse.startsWith('\`\`\`json')) {
                    cleanResponse = cleanResponse.replace(/^\`\`\`json\s*/, '').replace(/\s*\`\`\`$/, '');
                } else if (cleanResponse.startsWith('\`\`\`')) {
                     cleanResponse = cleanResponse.replace(/^\`\`\`\s*/, '').replace(/\s*\`\`\`$/, '');
                }
                
                // If OpenAI returned an object { "data": [...] } due to response_format constraint
                parsedData = JSON.parse(cleanResponse);
                if (!Array.isArray(parsedData) && parsedData.data && Array.isArray(parsedData.data)) {
                    parsedData = parsedData.data;
                } else if (!Array.isArray(parsedData)) {
                     // Try to extract array if wrapped in some other object root
                      const possibleArrayMatch = Object.values(parsedData).find(val => Array.isArray(val));
                      if (possibleArrayMatch) {
                          parsedData = possibleArrayMatch;
                      } else {
                           throw new Error("AI response was JSON but root is not an array");
                      }
                }
            } catch (parseError) {
                console.error("[AiContentService] Failed to parse AI response:", parseError);
                console.error("Raw Response:", rawAiResponse);
                
                // Log failure
                await this.logAiRequest(companyPrisma, {
                    provider: providerUsed,
                    endpoint: 'generateContentCalendar',
                    durationMs: Date.now() - startTime,
                    status: 'failed',
                    errorMessage: 'Failed to parse JSON response from AI',
                    requestedBy: userId
                });
                
                return { success: false, error: "AI generated invalid data format. Please try again." };
            }

            // Map parsed data to standard CalendarContentPiece structure
            const contentPieces = parsedData.map(item => ({
                platform: item.platform || 'General',
                contentType: item.contentType || 'Text',
                pillar: item.pillar || item.category || 'General',
                dateScheduled: item.dateScheduled ? new Date(item.dateScheduled) : (item.scheduledDate ? new Date(item.scheduledDate) : (item.date ? new Date(item.date) : new Date())),
                headline: item.headline || '',
                adCopyFull: item.adCopyFull || item.copy || '',
                videoScriptOrHooks: item.videoScriptOrHooks || item.script || '',
                visualAssetsBrief: item.visualAssetsBrief || item.visualDescription || '',
                hashtagsResearched: Array.isArray(item.hashtags) ? item.hashtags.join(' ') : (item.hashtags || ''),
                callToAction: item.callToAction || '',
                status: 'ready',
                engagementTarget: {
                    estimatedImpressions: item.engagementTarget?.estimatedImpressions?.toString() || '0',
                    estimatedEngagementPercent: item.engagementTarget?.estimatedEngagementPercent || 0,
                    estimatedShares: item.engagementTarget?.estimatedShares?.toString() || '0'
                }
            }));

            return {
                success: true,
                data: contentPieces,
                meta: {
                    provider: providerUsed,
                    durationMs: Date.now() - startTime
                }
            };

        } catch (error) {
            console.error(`[AiContentService] Error generating calendar (${providerUsed}):`, error);
            
            return { 
                success: false, 
                error: "An error occurred while communicating with the AI provider.",
                meta: {
                    provider: providerUsed,
                    durationMs: Date.now() - startTime
                }
            };
        }
    }

    /**
     * Log an AI request to the company's database
     * @param {Object} companyPrisma - The company's database connection
     * @param {Object} data - The log data
     */
    async logAiRequest(companyPrisma, data) {
        try {
            if (!companyPrisma) return;
            const AiRequestLog = companyPrisma.model('AiRequestLog');
            await AiRequestLog.create(data);
        } catch (err) {
            console.error('[AiContentService] Failed to log AI request:', err.message);
        }
    }
}

module.exports = new AiContentService();
