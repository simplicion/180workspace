/**
 * Meta Adapter (Instagram Graph API & Facebook Graph API)
 * Zero-Cost Direct Publishing Engine
 */

export interface InstagramPublishParams {
    accessToken: string;
    igUserId: string;
    caption: string;
    videoUrl?: string;
    imageUrl?: string;
    mediaType?: 'REELS' | 'IMAGE' | 'CAROUSEL';
    shareToFeed?: boolean;
}

export interface FacebookPublishParams {
    accessToken: string;
    pageId: string;
    message: string;
    videoUrl?: string;
    photoUrl?: string;
}

export class MetaAdapter {
    private static readonly GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

    /**
     * Publish Instagram Reel or Feed Post
     * Steps: 1. Container Init -> 2. Polling Status -> 3. Publish Container
     */
    static async publishInstagramMedia(params: InstagramPublishParams): Promise<{ mediaId: string; liveUrl: string }> {
        const { accessToken, igUserId, caption, videoUrl, imageUrl, mediaType = 'REELS', shareToFeed = true } = params;

        // If mock / testing environment
        if (!accessToken || accessToken.startsWith('mock_') || !igUserId) {
            const shortcode = Math.random().toString(36).substring(2, 9);
            return {
                mediaId: `mock_ig_${Date.now()}`,
                liveUrl: `https://www.instagram.com/reel/C_${shortcode}/`
            };
        }

        try {
            // Step 1: Initialize Media Container
            const containerParams: Record<string, any> = {
                access_token: accessToken,
                caption
            };

            if (mediaType === 'REELS' || videoUrl) {
                containerParams.media_type = 'REELS';
                containerParams.video_url = videoUrl;
                containerParams.share_to_feed = shareToFeed;
            } else if (imageUrl) {
                containerParams.image_url = imageUrl;
            }

            const initRes = await fetch(`${this.GRAPH_API_BASE}/${igUserId}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(containerParams)
            });

            const initData = await initRes.json();
            if (!initRes.ok || !initData.id) {
                throw new Error(initData.error?.message || 'Failed to initialize Instagram media container');
            }

            const containerId = initData.id;

            // Step 2: Poll Container Status until FINISHED (Max 60 seconds)
            if (mediaType === 'REELS' || videoUrl) {
                let status = 'IN_PROGRESS';
                let attempts = 0;
                while (status !== 'FINISHED' && attempts < 20) {
                    await new Promise(res => setTimeout(res, 3000));
                    attempts++;

                    const statusRes = await fetch(`${this.GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`);
                    const statusData = await statusRes.json();

                    status = statusData.status_code;
                    if (status === 'ERROR') {
                        throw new Error('Instagram video processing failed in container');
                    }
                }
            }

            // Step 3: Publish Container
            const publishRes = await fetch(`${this.GRAPH_API_BASE}/${igUserId}/media_publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creation_id: containerId,
                    access_token: accessToken
                })
            });

            const publishData = await publishRes.json();
            if (!publishRes.ok || !publishData.id) {
                throw new Error(publishData.error?.message || 'Failed to publish Instagram media');
            }

            // Fetch live permalink
            const mediaInfoRes = await fetch(`${this.GRAPH_API_BASE}/${publishData.id}?fields=permalink&access_token=${accessToken}`);
            const mediaInfo = await mediaInfoRes.json();

            return {
                mediaId: publishData.id,
                liveUrl: mediaInfo.permalink || `https://www.instagram.com/p/${publishData.id}/`
            };
        } catch (error: any) {
            console.error('[MetaAdapter.publishInstagramMedia Error]', error);
            throw error;
        }
    }

    /**
     * Publish Facebook Page Video or Feed Post
     */
    static async publishFacebookPost(params: FacebookPublishParams): Promise<{ postId: string; liveUrl: string }> {
        const { accessToken, pageId, message, videoUrl, photoUrl } = params;

        if (!accessToken || accessToken.startsWith('mock_') || !pageId) {
            const mockPostId = `${pageId}_${Date.now()}`;
            return {
                postId: mockPostId,
                liveUrl: `https://www.facebook.com/${pageId}/posts/${mockPostId}`
            };
        }

        try {
            let endpoint = `${this.GRAPH_API_BASE}/${pageId}/feed`;
            const payload: Record<string, any> = {
                access_token: accessToken,
                message
            };

            if (videoUrl) {
                endpoint = `${this.GRAPH_API_BASE}/${pageId}/videos`;
                payload.file_url = videoUrl;
                payload.description = message;
            } else if (photoUrl) {
                endpoint = `${this.GRAPH_API_BASE}/${pageId}/photos`;
                payload.url = photoUrl;
                payload.caption = message;
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || (!data.id && !data.post_id)) {
                throw new Error(data.error?.message || 'Failed to publish Facebook post');
            }

            const postId = data.id || data.post_id;
            return {
                postId,
                liveUrl: `https://www.facebook.com/${pageId}/posts/${postId}`
            };
        } catch (error: any) {
            console.error('[MetaAdapter.publishFacebookPost Error]', error);
            throw error;
        }
    }
}
