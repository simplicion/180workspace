'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { socialProjectService, SocialProject } from '@/lib/services/social-project.service';
import { ProjectHeader } from './_components/ProjectHeader';
import { OverviewTab } from './_components/tabs/OverviewTab';
import { CalendarTab } from './_components/tabs/CalendarTab';
import { ContentListTab } from './_components/tabs/ContentListTab';
import { MediaLibraryTab } from './_components/tabs/MediaLibraryTab';
import { TasksTab } from './_components/tabs/TasksTab';
import { ApprovalsTab } from './_components/tabs/ApprovalsTab';
import { PublishingTab } from './_components/tabs/PublishingTab';
import { InboxTab } from './_components/tabs/InboxTab';
import { AnalyticsTab } from './_components/tabs/AnalyticsTab';
import { BrandVoiceTab } from './_components/tabs/BrandVoiceTab';
import { EngagementTab } from './_components/tabs/EngagementTab';
import { SettingsTab } from './_components/tabs/SettingsTab';
import { ContentDetailDrawer } from './_components/ContentDetailDrawer';
import { AssignEditorModal } from './_components/AssignEditorModal';
import { SubmitDeliverableModal } from './_components/SubmitDeliverableModal';
import { SendForApprovalModal } from './_components/SendForApprovalModal';
import { UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';

export default function SocialProjectWorkspacePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const projectId = params?.id as string;
    const currentTab = searchParams.get('tab') || 'overview';

    const [project, setProject] = useState<SocialProject | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal / Drawer States
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [targetPostIdForAssign, setTargetPostIdForAssign] = useState<string | undefined>(undefined);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [selectedTaskIdForSubmit, setSelectedTaskIdForSubmit] = useState<string | null>(null);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

    const loadProject = async () => {
        try {
            setLoading(true);
            const p = await socialProjectService.getProject(projectId);
            setProject(p);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            loadProject();
        }
    }, [projectId]);

    const handleTabChange = (tabId: string) => {
        router.push(`/social-projects/${projectId}?tab=${tabId}`);
    };

    const handleCreateContent = async (scheduledDate?: Date) => {
        try {
            const newPost = await socialProjectService.createPost({
                projectId,
                clientId: project?.clientIds?.[0] || undefined,
                title: 'New Content Piece',
                content: 'Hook: Write your compelling viral opening hook here...\n\nScript Talking Points:\n1. Problem setup\n2. The solution framework\n3. Actionable takeaway\n\nCTA: Follow for more growth frameworks.',
                scheduledFor: scheduledDate || new Date(),
                mediaType: 'video'
            });
            toast.success('New content draft initialized!');
            loadProject();
            setSelectedPost(newPost);
        } catch (err) {
            toast.error('Failed to create content piece');
        }
    };

    const handleCreatePostFromIdea = async (idea: any) => {
        try {
            const newPost = await socialProjectService.createPost({
                projectId,
                clientId: project?.clientIds?.[0] || undefined,
                title: idea.headline || idea.title,
                content: [idea.hook, idea.caption].filter(Boolean).join('\n\n'),
                scheduledFor: new Date(),
                mediaType: idea.format || 'video'
            });
            toast.success('Post concept created!');
            loadProject();
            setSelectedPost(newPost);
        } catch (err) {
            toast.error('Failed to create post from concept');
        }
    };

    if (loading || !project) {
        return (
            <div className="p-8 space-y-6">
                <UniversalSkeleton type="editor" />
                <UniversalSkeleton type="projects" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 flex flex-col justify-between">
            <div>
                {/* Persistent Project Header */}
                <ProjectHeader
                    project={project}
                    activeTab={currentTab}
                    onTabChange={handleTabChange}
                    onCreateContentClick={() => handleCreateContent()}
                    onSendForApprovalClick={() => setIsApprovalModalOpen(true)}
                />

                {/* Tab Views Content Container */}
                <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
                    {currentTab === 'overview' && (
                        <OverviewTab
                            project={project}
                            onSelectPost={(post) => setSelectedPost(post)}
                            onNavigateTab={handleTabChange}
                        />
                    )}

                    {currentTab === 'calendar' && (
                        <CalendarTab
                            project={project}
                            onSelectPost={(post) => setSelectedPost(post)}
                            onCreateContent={(date) => handleCreateContent(date)}
                        />
                    )}

                    {currentTab === 'content' && (
                        <ContentListTab
                            project={project}
                            onSelectPost={(post) => setSelectedPost(post)}
                            onCreateContent={() => handleCreateContent()}
                        />
                    )}

                    {currentTab === 'media' && (
                        <MediaLibraryTab project={project} />
                    )}

                    {currentTab === 'tasks' && (
                        <TasksTab
                            project={project}
                            onAssignTaskClick={() => {
                                setTargetPostIdForAssign(undefined);
                                setIsAssignModalOpen(true);
                            }}
                            onSubmitDeliverableClick={(taskId) => {
                                setSelectedTaskIdForSubmit(taskId);
                                setIsSubmitModalOpen(true);
                            }}
                        />
                    )}

                    {currentTab === 'approvals' && (
                        <ApprovalsTab
                            project={project}
                            onGenerateReviewSessionClick={() => setIsApprovalModalOpen(true)}
                        />
                    )}

                    {currentTab === 'publishing' && (
                        <PublishingTab
                            project={project}
                            onSelectPost={(post) => setSelectedPost(post)}
                        />
                    )}

                    {currentTab === 'inbox' && (
                        <InboxTab project={project} />
                    )}

                    {currentTab === 'engagement' && (
                        <EngagementTab project={project} />
                    )}

                    {currentTab === 'analytics' && (
                        <AnalyticsTab project={project} />
                    )}

                    {currentTab === 'brand' && (
                        <BrandVoiceTab
                            project={project}
                            onCreatePostFromIdea={handleCreatePostFromIdea}
                        />
                    )}

                    {currentTab === 'settings' && (
                        <SettingsTab
                            project={project}
                            onProjectUpdated={loadProject}
                        />
                    )}
                </main>
            </div>

            {/* Content Detail Drawer */}
            {selectedPost && (
                <ContentDetailDrawer
                    post={selectedPost}
                    project={project}
                    onClose={() => setSelectedPost(null)}
                    onUpdated={() => { loadProject(); }}
                    onAssignEditorClick={(postId) => {
                        setTargetPostIdForAssign(postId);
                        setIsAssignModalOpen(true);
                    }}
                    onSubmitDeliverableClick={(taskId) => {
                        setSelectedTaskIdForSubmit(taskId);
                        setIsSubmitModalOpen(true);
                    }}
                    onSendForApprovalClick={() => setIsApprovalModalOpen(true)}
                />
            )}

            {/* Assign Editor Modal */}
            {isAssignModalOpen && (
                <AssignEditorModal
                    projectId={project.id}
                    postId={targetPostIdForAssign}
                    onClose={() => { setIsAssignModalOpen(false); setTargetPostIdForAssign(undefined); }}
                    onAssigned={() => { loadProject(); }}
                />
            )}

            {/* Submit Deliverable Modal */}
            {isSubmitModalOpen && selectedTaskIdForSubmit && (
                <SubmitDeliverableModal
                    taskId={selectedTaskIdForSubmit}
                    onClose={() => { setIsSubmitModalOpen(false); setSelectedTaskIdForSubmit(null); }}
                    onSubmitted={() => { loadProject(); }}
                />
            )}

            {/* Send For Approval Modal */}
            {isApprovalModalOpen && (
                <SendForApprovalModal
                    project={project}
                    onClose={() => setIsApprovalModalOpen(false)}
                    onCreated={() => { loadProject(); }}
                />
            )}
        </div>
    );
}
