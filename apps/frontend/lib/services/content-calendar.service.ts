import api from '../api';

export interface CalendarConfig {
    calendarType: 'company' | 'personal';
    brand_name: string;
    industry: string;
    subdomain?: string;
    target_audience: string;
    platforms: string[];
    durationWords: string;
    frequency: string;
    startDate: string;
    timezone: string;
    contentPillars: string[];
    brandVoice: string;
    engagementGoal: string;
    hashtagStrategy: string;
    competitors: string[];
    marketingBudget?: string;
    personalGoals?: string;
    contentCategoryMix?: Record<string, number>;
}

export interface ContentPiece { id?: string;
    _id: string;
    calendarId: string;
    weekNumber: number;
    dateScheduled: string;
    platform: string;
    contentType: string;
    pillar: string;
    headline: string;
    adCopyFull: string;
    videoScriptOrHooks: string;
    callToAction: string;
    hashtagsResearched: string;
    visualAssetsBrief: string;
    engagementTarget: {
        estimatedImpressions: string;
        estimatedEngagementPercent: number;
        estimatedShares: string;
    };
    postingTimeTz: string;
    notes: string;
    status: 'ready' | 'in_progress' | 'pending_review' | 'published';
    viralScore: number;
    createdAt: string;
    updatedAt: string;
}

export interface ContentCalendar { id?: string;
    _id: string;
    userId: string;
    calendarType: 'company' | 'personal';
    brandName: string;
    industry: string;
    subdomain: string;
    targetAudience: string;
    platforms: string[];
    calendarDuration: string;
    frequency: string;
    startDate: string;
    timezone: string;
    contentPillars: string[];
    tone: string;
    engagementGoal: string;
    hashtagStrategy: string;
    competitors: string[];
    status: 'draft' | 'active' | 'archived' | 'processing' | 'failed';
    isTemplate: boolean;
    templateName: string;
    totalPieces: number;
    reelsCount: number;
    postsCount: number;
    carouselsCount: number;
    metadata: any;
    createdAt: string;
    updatedAt: string;
}

class ContentCalendarService {
    // Calendars
    async getCalendars(limit = 10, offset = 0): Promise<{ calendars: ContentCalendar[] }> {
        const response = await api.get(`/api/content-calendar?limit=${limit}&offset=${offset}`);
        return response.data;
    }

    async getCalendar(id: string): Promise<{ calendar: ContentCalendar; pieces: ContentPiece[] }> {
        const response = await api.get(`/api/content-calendar/${id}`);
        return response.data;
    }

    async createCalendar(config: CalendarConfig): Promise<{ status: string; calendar_id: string; message: string; total_pieces: number; preview_url: string }> {
        const response = await api.post('/api/content-calendar/create', config);
        return response.data;
    }

    async updateCalendar(id: string, data: Partial<ContentCalendar>): Promise<{ calendar: ContentCalendar }> {
        const response = await api.put(`/api/content-calendar/${id}`, data);
        return response.data;
    }

    async deleteCalendar(id: string): Promise<{ success: boolean; message: string }> {
        const response = await api.delete(`/api/content-calendar/${id}`);
        return response.data;
    }

    async saveAsTemplate(id: string, templateName: string): Promise<{ calendar: ContentCalendar }> {
        const response = await api.put(`/api/content-calendar/${id}`, { isTemplate: true, templateName });
        return response.data;
    }

    // Pieces
    async getCalendarPieces(calendarId: string): Promise<{ pieces: ContentPiece[] }> {
        const response = await api.get(`/api/content-calendar/${calendarId}/pieces`);
        return response.data;
    }

    async updateCalendarPiece(calendarId: string, pieceId: string, data: Partial<ContentPiece>): Promise<{ piece: ContentPiece }> {
        const response = await api.put(`/api/content-calendar/${calendarId}/pieces/${pieceId}`, data);
        return response.data;
    }
}

export const contentCalendarService = new ContentCalendarService();
