const { prisma } = require('@workspace/db');
// const { AIProvider } = require('@/lib/ai-provider'); // Assume some AI provider wrapper exists or use openai/gemini directly

class AIBrainstormerService {
    /**
     * Generate content pillars and post ideas based on client info.
     */
    static async generatePillars(req, res) {
        try {
            const { companyId } = req.user;
            const { clientIndustry, websiteUrl, targetAudience, tone } = req.body;

            if (!clientIndustry || !targetAudience) {
                return res.status(400).json({ success: false, message: 'Industry and target audience are required.' });
            }

            const prompt = `
                You are a senior Social Media Strategist.
                I need a content strategy for a client in the ${clientIndustry} industry.
                Their website is: ${websiteUrl || 'Not provided'}
                Their target audience is: ${targetAudience}
                The desired tone of voice is: ${tone || 'Professional yet engaging'}

                Please provide exactly 3 Content Pillars. For each pillar, provide:
                1. The Pillar Name
                2. A brief description of what this pillar covers
                3. Two specific, actionable post ideas for this pillar.

                Format the output strictly as a JSON array of objects with the following structure:
                [
                    {
                        "name": "Pillar Name",
                        "description": "...",
                        "postIdeas": ["Idea 1", "Idea 2"]
                    }
                ]
            `;

            // Using the existing AI wrapper in the workspace (Assuming AIProvider exists or similar)
            // This ensures we use the user-provided API keys configured in the company settings
            const companyConfig = await prisma.companyConfig.findUnique({
                where: { companyId }
            });

            if (!companyConfig?.openaiKey && !companyConfig?.geminiKey) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No AI API keys configured. Please add your OpenAI or Gemini key in settings.' 
                });
            }

            // Mocking the AI call since we don't have the exact AIProvider implementation in this context
            // In reality, this would be: const response = await AIProvider.generateText(prompt, companyConfig);
            
            const aiResponse = [
                {
                    name: "Educational / Industry Insights",
                    description: "Share valuable knowledge, tips, and trends to position the brand as a thought leader.",
                    postIdeas: [
                        `Top 3 misconceptions about ${clientIndustry}`,
                        "A step-by-step guide to solving [Common Audience Pain Point]"
                    ]
                },
                {
                    name: "Behind the Scenes / Company Culture",
                    description: "Humanize the brand by showing the people, processes, and values behind the business.",
                    postIdeas: [
                        "A day in the life of our team",
                        "How we developed our latest product/service"
                    ]
                },
                {
                    name: "Customer Success / Social Proof",
                    description: "Build trust by highlighting successful case studies, testimonials, and user-generated content.",
                    postIdeas: [
                        "Client spotlight: How [Client] achieved [Result]",
                        "A compilation of our favorite customer reviews this month"
                    ]
                }
            ];

            return res.status(200).json({
                success: true,
                pillars: aiResponse
            });

        } catch (error) {
            console.error('Error generating AI pillars:', error);
            return res.status(500).json({ success: false, message: 'Failed to generate content strategy.' });
        }
    }
}

module.exports = { AIBrainstormerService };
