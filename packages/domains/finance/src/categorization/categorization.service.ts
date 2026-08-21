import { prisma } from '@workspace/db';
export class CategorizationService {
    static categories: Record<string, string[]> = {
        'Software/SaaS': ['aws', 'digitalocean', 'google cloud', 'azure', 'slack', 'zoom', 'github', 'vercel', 'atlassian', 'adobe', 'dropbox', 'microsoft'],
        'Office Supplies': ['amazon', 'walmart', 'staples', 'office depot', 'apple', 'dell', 'hp', 'ikea'],
        'Travel & Meals': ['uber', 'lyft', 'airbnb', 'expedia', 'delta', 'indigo', 'starbucks', 'zomato', 'swiggy', 'mcdonalds', 'kfc', 'subway'],
        'Marketing': ['facebook', 'meta', 'google ads', 'linkedin', 'mailchimp', 'hubspot', 'twitter', 'instagram'],
        'Utilities': ['electricity', 'water', 'internet', 'broadband', 'phone', 'jio', 'airtel', 'vi'],
        'Professional Services': ['legal', 'consulting', 'accounting', 'upwork', 'fiverr', 'toptal']
    };

    /**
     * Suggest a category based on description or merchant name
     */
    static suggestCategory(text?: string | null): string | null {
        if (!text) return null;
        const normalized = text.toLowerCase();

        for (const [category, keywords] of Object.entries(this.categories)) {
            if (keywords.some(keyword => normalized.includes(keyword))) {
                return category;
            }
        }

        return null;
    }
}
