import api from '@/lib/api';

export interface SocialProject {
    id: string;
    name: string;
    description?: string;
    status: string;
    priority: string;
    startDate?: string;
    deadline?: string;
    ownerId?: string;
    clientIds?: string[];
    memberIds?: string[];
    socialServices?: string[];
    socialSettings?: Record<string, any>;
    socialAccounts?: any[];
    brandVoiceProfile?: any;
    metrics?: {
        scheduledPosts: number;
        pendingApprovals: number;
        outstandingTasks: number;
        publishedPosts: number;
        totalPosts: number;
    };
    pendingReviewSessions?: any[];
    client?: any;
    createdAt?: string;
    updatedAt?: string;
}

export interface DashboardMetrics {
    postsScheduledThisWeek: number;
    postsAwaitingApproval: number;
    editingTasksInProgress: number;
    overdueTasks: number;
    postsPublishedThisMonth: number;
    publishingFailures: number;
    unreadInboxCount: number;
}

export interface AttentionItem {
    id: string;
    type: 'approval_required' | 'publishing_failed' | 'overdue_task' | 'unread_inbox' | 'reauth_needed';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'critical';
    actionLink: string;
}

export type BrandType = 'company' | 'creator' | 'agency';
export type BrandPlatform = 'instagram' | 'facebook' | 'youtube' | 'linkedin' | 'twitter' | 'tiktok';
export type CaptionStylePreset = 'HORMOZI_BOUNCE' | 'ALI_ABDAAL_CLEAN' | 'MINIMAL_SUBTITLE' | 'BOLD_CENTER';
export interface BrandColors { primary: string | null; accent: string | null; background: string | null; text: string | null }

/** Mirrors `BrandConsciousness` in packages/domains/social-media/src/brand-consciousness.ts. */
export interface BrandConsciousness {
    projectId: string;
    projectName: string | null;
    brandName: string | null;
    brandType: BrandType | null;
    positioning: string | null;
    tagline: string | null;
    description: string | null;
    ideation: string | null;
    ideology: string | null;
    colors: BrandColors;
    logoUrl: string | null;
    font: string | null;
    tone: string | null;
    audience: string | null;
    forbiddenWords: string[];
    ctas: string[];
    hashtags: string[];
    contentPillars: string[];
    sampleViralPosts: string[];
    targetPlatforms: BrandPlatform[];
    captionStylePreset: CaptionStylePreset | null;
    watermarkEnabled: boolean | null;
    customGuidelines: string | null;
    updatedAt: string | null;
    completeness: { percent: number; isComplete: boolean; missingRequired: string[]; missingRecommended: string[] };
}

export type BrandConsciousnessPatch = Partial<Omit<BrandConsciousness, 'projectId' | 'projectName' | 'updatedAt' | 'completeness' | 'colors'>> & {
    colors?: Partial<BrandColors> | null;
};

export const socialProjectService = {
    async getProjects(params?: { search?: string; status?: string; clientId?: string; limit?: number; offset?: number }) {
        const { data } = await api.get('/api/social-media/projects', { params });
        return data;
    },

    async getProject(id: string) {
        const { data } = await api.get(`/api/social-media/projects/${id}`);
        return data.project as SocialProject;
    },

    async createProject(payload: any) {
        const { data } = await api.post('/api/social-media/projects', payload);
        return data.project as SocialProject;
    },

    async updateProject(id: string, payload: any) {
        const { data } = await api.put(`/api/social-media/projects/${id}`, payload);
        return data.project as SocialProject;
    },

    async deleteProject(id: string) {
        const { data } = await api.delete(`/api/social-media/projects/${id}`);
        return data;
    },

    /** Brand profile exactly as the user gave it, plus `completeness`. See docs/social-studio-mobile/BRAND_CONSCIOUSNESS_API.md */
    async getBrandConsciousness(id: string) {
        const { data } = await api.get(`/api/social-media/projects/${id}/brand-consciousness`);
        return data.brand as BrandConsciousness;
    },

    /** Partial update: absent = unchanged, null / "" / [] = clear. Validation errors come back as 400 with `details`. */
    async updateBrandConsciousness(id: string, patch: BrandConsciousnessPatch) {
        const { data } = await api.put(`/api/social-media/projects/${id}/brand-consciousness`, patch);
        return data.brand as BrandConsciousness;
    },

    /** PNG / JPEG / WebP / SVG, max 2 MB. Saves and returns the new logoUrl. */
    async uploadBrandLogo(id: string, file: File) {
        const form = new FormData();
        form.append('logo', file);
        const { data } = await api.post(`/api/social-media/projects/${id}/brand-consciousness/logo`, form);
        return { logoUrl: data.logoUrl as string, brand: data.brand as BrandConsciousness };
    },

    async getProjectDashboard(id: string) {
        const { data } = await api.get(`/api/social-media/projects/${id}/dashboard`);
        return data.dashboard as {
            projectId: string;
            metrics: DashboardMetrics;
            attentionItems: AttentionItem[];
            upcomingContent: any[];
        };
    },

    async getProjectActivity(id: string, limit?: number) {
        const { data } = await api.get(`/api/social-media/projects/${id}/activity`, { params: { limit } });
        return data.activity || [];
    },

    async getPosts(params?: { projectId?: string; clientId?: string; status?: string; calendarId?: string; isEvergreen?: boolean }) {
        const { data } = await api.get('/api/social-media/posts', { params });
        return data.posts || [];
    },

    async getPost(id: string) {
        const { data } = await api.get(`/api/social-media/posts/${id}`);
        return data.post;
    },

    async createPost(payload: any) {
        const { data } = await api.post('/api/social-media/posts', payload);
        return data.post;
    },

    async updatePost(id: string, payload: any) {
        const { data } = await api.put(`/api/social-media/posts/${id}`, payload);
        return data.post;
    },

    async submitFootage(postId: string, payload: { rawMediaUrls?: string[]; externalStorageLinks?: any[] }) {
        const { data } = await api.post(`/api/social-media/posts/${postId}/footage`, payload);
        return data;
    },

    async assignEditor(postId: string, payload: any) {
        const { data } = await api.post(`/api/social-media/posts/${postId}/assign-editor`, payload);
        return data.task;
    },

    async submitDeliverable(taskId: string, payload: { deliverableUrl: string; thumbnailUrl?: string; notes?: string }) {
        const { data } = await api.post(`/api/social-media/posts/tasks/${taskId}/submit-deliverable`, payload);
        return data;
    },

    async validatePublish(postId: string) {
        const { data } = await api.get(`/api/social-media/posts/${postId}/validate-publish`);
        return data;
    },

    async publishPostNow(postId: string) {
        const { data } = await api.post(`/api/social-media/posts/${postId}/publish`);
        return data;
    },

    async retryVariant(postId: string, platform: string) {
        const { data } = await api.post(`/api/social-media/posts/${postId}/retry-variant`, { platform });
        return data;
    },

    async repurposePost(postId: string, payload?: any) {
        const { data } = await api.post(`/api/social-media/posts/${postId}/repurpose`, payload);
        return data.post;
    }
};
