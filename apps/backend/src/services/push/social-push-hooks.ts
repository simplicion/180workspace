/**
 * Connects social publishing events to push notifications without changing the social domain: the exported
 * `PublishDispatcher.summarize` (every publish / retry / processing-reconciliation ends there) and
 * `SocialPostService.updatePost` (edits that send a post to review) are wrapped once at startup.
 *
 *   publish_succeeded   post became `published` / `partially_published`          → post author
 *   publish_failed      post `failed` with no retry left                         → post author
 *   reconnect_needed    a variant failed with REAUTH_REQUIRED                     → post author
 *   approval_requested  post moved to `in_review`                                → project owner (if not the editor)
 *
 * Pushes are deduplicated per post + status + attempt (Redis SET NX when available) so re-summaries don't re-notify.
 * Every failure is swallowed (notifyUserSafe): push can never break publishing.
 */
import { notifyUserSafe, postDeepLink, type PushPayload } from './push.service';

export interface HookDeps {
  dispatcher: { summarize: (...args: any[]) => Promise<any> };
  postService?: { updatePost: (...args: any[]) => Promise<any> };
  loadProject?: (projectId: string, companyId: string) => Promise<{ ownerId?: string | null } | null>;
  notify?: (companyId: string, userId: string, payload: PushPayload) => Promise<unknown>;
  claimOnce?: (key: string) => Promise<boolean>;
}

const memorySeen = new Map<string, number>();
async function claimOnceDefault(key: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { redis } = require('../../system-configs/config/redis');
    if (redis) return (await redis.set(`push:once:${key}`, '1', 'EX', 86_400, 'NX')) === 'OK';
  } catch {
    /* fall back to process memory */
  }
  const now = Date.now();
  for (const [k, t] of memorySeen) if (now - t > 86_400_000) memorySeen.delete(k);
  if (memorySeen.has(key)) return false;
  memorySeen.set(key, now);
  return true;
}

const labelOf = (post: any) => String(post?.title || String(post?.content || '').split('\n')[0] || 'Your post').slice(0, 60);

/** Pure: which push (if any) a summarize() result warrants. Exported for tests. */
export function pushForPublishResult(result: any): { payload: PushPayload; userId: string; companyId: string; key: string } | null {
  const post = result?.post;
  if (!post?.id || !post.createdById || !post.companyId) return null;
  const sim = result.simulated ? '[Simulated] ' : '';
  const link = postDeepLink(post.id);
  const base = { postId: post.id, projectId: post.projectId || undefined, link };
  const attempt = post.publishAttemptCount ?? 0;
  const variants: any[] = result.variants || [];
  const reauth = variants.filter((v) => v.errorCode === 'REAUTH_REQUIRED').map((v) => v.platform);

  if (reauth.length) {
    return {
      userId: post.createdById,
      companyId: post.companyId,
      key: `${post.id}:reauth:${attempt}`,
      payload: { ...base, kind: 'reconnect_needed', title: `${sim}Reconnect ${reauth.join(', ')}`, body: `"${labelOf(post)}" could not be published: the account needs to be reconnected.` },
    };
  }
  if (result.status === 'published' || result.status === 'partially_published') {
    const platforms = Object.keys(result.publishedLinks || {});
    return {
      userId: post.createdById,
      companyId: post.companyId,
      key: `${post.id}:${result.status}:${attempt}`,
      payload: {
        ...base,
        kind: result.status === 'published' ? 'publish_succeeded' : 'publish_failed',
        title: `${sim}${result.status === 'published' ? 'Published' : 'Partly published'}: ${labelOf(post)}`,
        body: result.status === 'published' ? `Live on ${platforms.join(', ') || 'your channels'}.` : `Some platforms failed: ${Object.keys(result.errors || {}).join(', ')}. Tap to retry.`,
      },
    };
  }
  if (result.status === 'failed' && !result.retryScheduledFor) {
    return {
      userId: post.createdById,
      companyId: post.companyId,
      key: `${post.id}:failed:${attempt}`,
      payload: { ...base, kind: 'publish_failed', title: `${sim}Publishing failed: ${labelOf(post)}`, body: Object.entries(result.errors || {}).map(([p, e]) => `${p}: ${e}`).join('; ').slice(0, 300) || 'Tap to see why and retry.' },
    };
  }
  return null;
}

let installed = false;

export function installSocialPushHooks(deps?: HookDeps): boolean {
  if (installed && !deps) return false;
  // Unit tests of unrelated routers must not boot the social domain (Redis, Prisma); hook tests pass deps explicitly.
  if (!deps && process.env.NODE_ENV === 'test') return false;
  let d: HookDeps;
  if (deps) d = deps;
  else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const social = require('@workspace/social-media');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { prisma } = require('@workspace/db');
      d = {
        dispatcher: social.PublishDispatcher,
        postService: social.SocialPostService,
        loadProject: (projectId, companyId) => prisma.project.findFirst({ where: { id: projectId, companyId }, select: { ownerId: true } }),
      };
    } catch (err: any) {
      console.warn('[Push] social hooks not installed:', err?.message || err);
      return false;
    }
  }
  const notify = d.notify || notifyUserSafe;
  const claimOnce = d.claimOnce || claimOnceDefault;

  const originalSummarize = d.dispatcher.summarize;
  d.dispatcher.summarize = async function (this: any, ...args: any[]) {
    const result = await originalSummarize.apply(this, args);
    try {
      const push = pushForPublishResult(result);
      if (push && (await claimOnce(push.key))) void notify(push.companyId, push.userId, push.payload);
    } catch (err: any) {
      console.error('[Push] publish hook error:', err?.message || err);
    }
    return result;
  };

  if (d.postService) {
    const originalUpdate = d.postService.updatePost;
    d.postService.updatePost = async function (this: any, id: string, data: any, userId?: string, ...rest: any[]) {
      const result = await originalUpdate.call(this, id, data, userId, ...rest);
      try {
        const movedToReview = result?.status === 'in_review' && (result.reapprovalRequired || data?.status === 'in_review');
        if (movedToReview && result.projectId && result.companyId && d.loadProject) {
          const project = await d.loadProject(result.projectId, result.companyId);
          const owner = project?.ownerId;
          if (owner && owner !== userId && (await claimOnce(`${result.id}:review:${result.versionNumber ?? 0}`))) {
            void notify(result.companyId, owner, {
              kind: 'approval_requested',
              title: `Approval needed: ${labelOf(result)}`,
              body: result.reapprovalRequired ? 'An approved post was edited and needs approval again.' : 'A post is waiting for your review.',
              postId: result.id,
              projectId: result.projectId,
              link: postDeepLink(result.id),
            });
          }
        }
      } catch (err: any) {
        console.error('[Push] approval hook error:', err?.message || err);
      }
      return result;
    };
  }
  installed = true;
  return true;
}
