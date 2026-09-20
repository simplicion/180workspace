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
