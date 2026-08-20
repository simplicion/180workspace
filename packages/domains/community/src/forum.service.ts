import { prisma } from '@workspace/db';
import Filter from 'bad-words';
import * as cheerio from 'cheerio';

const filter = new Filter();

export class ForumService {
    static async listPosts(query: any) {
        const { category, search, authorUserId } = query;
        const where: any = { status: 'active' };
        if (category) where.category = category;
        if (authorUserId) where.authorUserId = authorUserId;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
                { authorName: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } }
            ];
        }

        const posts = await prisma.forumPost.findMany({
            where,
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            include: { pollOptions: { include: { pollVotes: true } }, mentions: true, hashtags: true }
        });

        // Compatibility mapping for frontend expecting _id and nested author object
        return posts.map(post => ({
            ...post,
            _id: post.id,
            author: {
                userId: post.authorUserId,
                name: post.authorName,
                companyName: post.authorCompany,
                photoUrl: post.authorPhotoUrl
            }
        }));
    }

    static async getPostAndReplies(postId: string) {
        const post = await prisma.forumPost.findUnique({
            where: { id: postId }
        });
        if (!post) throw new Error('Post not found');
        
        // Increment views
        const updatedPost = await prisma.forumPost.update({
            where: { id: postId },
            data: { viewCount: { increment: 1 } },
            include: { pollOptions: { include: { pollVotes: true } }, mentions: true, hashtags: true }
        });

        const replies = await prisma.forumReply.findMany({
            where: { postId: postId, status: 'active' },
            orderBy: { createdAt: 'asc' }
        });

        // Compatibility mapping
        const mappedPost = {
            ...updatedPost,
            _id: updatedPost.id,
            author: {
                userId: updatedPost.authorUserId,
                name: updatedPost.authorName,
                companyName: updatedPost.authorCompany,
                photoUrl: updatedPost.authorPhotoUrl
            }
        };

        const mappedReplies = replies.map(reply => ({
            ...reply,
            _id: reply.id,
            author: {
                userId: reply.authorUserId,
                name: reply.authorName,
                companyName: reply.authorCompany,
                photoUrl: reply.authorPhotoUrl
            }
        }));

        return { post: mappedPost, replies: mappedReplies };
    }

    static async createPost(data: any, user: any, enqueueMediaJob?: (mediaId: string) => Promise<void>) {
        const { title, content, category, tags, mediaUrls, rawVideoUrl, postType, mentions, hashtags, pollOptions, isAnonymous } = data;

        if (title && filter.isProfane(title)) {
            throw new Error('Your post title contains inappropriate language.');
        }
        if (content && filter.isProfane(content)) {
            throw new Error('Your post content contains inappropriate language.');
        }

        const connectMentions = mentions?.length > 0 ? mentions.map((id: string) => ({ id })) : undefined;
        const connectOrCreateHashtags = hashtags?.length > 0 ? hashtags.map((tag: string) => ({
            where: { name: tag },
            create: { name: tag }
        })) : undefined;
        const createPollOptions = (postType === 'poll' && pollOptions?.length > 0) ? {
            create: pollOptions.map((text: string) => ({ text, votes: 0 }))
        } : undefined;

        const post = await prisma.forumPost.create({
            data: {
                title: title,
                content: content,
                category: category || 'general',
                postType: postType || 'general',
                tags: tags || [],
                mediaUrls: mediaUrls || [],
                rawVideoUrl: rawVideoUrl || null,
                status: rawVideoUrl ? 'processing' : 'active',
                authorUserId: user.id,
                authorName: isAnonymous ? 'Anonymous' : user.name,
                authorCompany: isAnonymous ? null : (user.companyName || null),
                authorPhotoUrl: isAnonymous ? null : (user.photoUrl || null),
                mentions: connectMentions ? { connect: connectMentions } : undefined,
                hashtags: connectOrCreateHashtags ? { connectOrCreate: connectOrCreateHashtags } : undefined,
                pollOptions: createPollOptions
            },
            include: { mentions: true, hashtags: true, pollOptions: true }
        });

        if (rawVideoUrl && enqueueMediaJob) {
            await enqueueMediaJob(post.id);
        }

        return {
            ...post,
            _id: post.id,
            author: {
                userId: post.authorUserId,
                name: post.authorName,
                companyName: post.authorCompany,
                photoUrl: post.authorPhotoUrl
            }
        };
    }

    static async createReply(postId: string, data: any, user: any) {
        const { content, parentReplyId, isAnonymous } = data;
        
        const reply = await prisma.forumReply.create({
            data: {
                postId: postId,
                content: content,
                parentReplyId: parentReplyId || null,
                authorUserId: user.id,
                authorName: isAnonymous ? 'Anonymous' : user.name,
                authorCompany: isAnonymous ? null : (user.companyName || null),
                authorPhotoUrl: isAnonymous ? null : (user.photoUrl || null)
            }
        });

        // Update post reply count
        await prisma.forumPost.update({
            where: { id: postId },
            data: { replyCount: { increment: 1 } }
        });

        return {
            ...reply,
            _id: reply.id,
            author: {
                userId: reply.authorUserId,
                name: reply.authorName,
                companyName: reply.authorCompany,
                photoUrl: reply.authorPhotoUrl
            }
        };
    }

    static async toggleLike(postId: string, userId: string) {
        const post = await prisma.forumPost.findUnique({
            where: { id: postId }
        });
        if (!post) throw new Error('Post not found');
        
        const upvotes = [...(post.upvotes || [])];
        const idx = upvotes.indexOf(userId);
        
        if (idx > -1) {
            upvotes.splice(idx, 1);
        } else {
            upvotes.push(userId);
        }
        
        const updatedPost = await prisma.forumPost.update({
            where: { id: postId },
            data: { upvotes }
        });

        return {
            ...updatedPost,
            _id: updatedPost.id,
            author: {
                userId: updatedPost.authorUserId,
                name: updatedPost.authorName,
                companyName: updatedPost.authorCompany,
                photoUrl: updatedPost.authorPhotoUrl
            }
        };
    }

    static async deletePost(postId: string, user: any) {
        const post = await prisma.forumPost.findUnique({
            where: { id: postId }
        });
        if (!post) throw new Error('Post not found');
        
        // Check if user is author or superadmin
        if (post.authorUserId !== user.id && user.role !== 'SUPERADMIN') {
            throw new Error('Forbidden');
        }
        
        await prisma.forumPost.update({
            where: { id: postId },
            data: { status: 'deleted' }
        });
        
        return { message: 'Post removed' };
    }

    static async reportPost(postId: string, reason: string, reporterId: string) {
        if (!reason) throw new Error('Reason is required');

        return await prisma.postReport.create({
            data: {
                postId,
                reporterId,
                reason
            }
        });
    }

    static async deleteReply(replyId: string) {
        const reply = await prisma.forumReply.findUnique({
            where: { id: replyId }
        });
        if (!reply) throw new Error('Reply not found');
        
        await prisma.forumReply.update({
            where: { id: replyId },
            data: { status: 'deleted' }
        });
        
        await prisma.forumPost.update({
            where: { id: reply.postId },
            data: { replyCount: { decrement: 1 } }
        });

        return { message: 'Reply removed' };
    }

    static async getPostLikes(postId: string) {
        const post = await prisma.forumPost.findUnique({
            where: { id: postId },
            select: { upvotes: true }
        });
        if (!post) throw new Error('Post not found');
        
        // Fetch user details for these IDs
        if (!post.upvotes || post.upvotes.length === 0) {
            return [];
        }
        
        return await prisma.user.findMany({
            where: { id: { in: post.upvotes } },
            select: { id: true, name: true, photoUrl: true, headline: true }
        });
    }

    static async toggleSave(postId: string, userId: string) {
        const existing = await prisma.savedPost.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId
                }
            }
        });
        
        if (existing) {
            await prisma.savedPost.delete({
                where: { id: existing.id }
            });
            return { saved: false };
        } else {
            await prisma.savedPost.create({
                data: {
                    userId,
                    postId
                }
            });
            return { saved: true };
        }
    }

    static async getSavedPosts(userId: string) {
        const saved = await prisma.savedPost.findMany({
            where: { userId },
            include: {
                post: {
                    include: {
                        replies: {
                            select: { id: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        return saved.map(s => s.post);
    }

    static async getPostReplies(postId: string) {
        return await prisma.forumReply.findMany({
            where: { postId: postId },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async getHashtags(query: string) {
        return await prisma.hashtag.findMany({
            where: query ? { name: { contains: query, mode: 'insensitive' } } : undefined,
            take: 10
        });
    }

    static async votePoll(optionId: string, userId: string, emitPollUpdated?: (postId: string, optionId: string, votes: number) => void) {
        const targetOption = await prisma.pollOption.findUnique({
            where: { id: optionId }
        });
        
        if (!targetOption) {
            throw new Error('Poll option not found');
        }

        const postId = targetOption.postId;

        // Check if user already voted in this poll
        const existingVote = await prisma.pollVote.findFirst({
            where: {
                userId,
                pollOption: {
                    postId
                }
            },
            include: {
                pollOption: true
            }
        });

        if (existingVote) {
            // If they clicked the exact same option, they want to unvote
            if (existingVote.pollOptionId === optionId) {
                await prisma.$transaction([
                    prisma.pollVote.delete({
                        where: { id: existingVote.id }
                    }),
                    prisma.pollOption.update({
                        where: { id: optionId },
                        data: { votes: { decrement: 1 } }
                    })
                ]);

                if (emitPollUpdated) {
                    emitPollUpdated(postId, optionId, existingVote.pollOption.votes - 1);
                }
                
                return { success: true, action: 'unvoted' };
            } else {
                // If they clicked a different option, switch vote
                await prisma.$transaction([
                    prisma.pollVote.delete({
                        where: { id: existingVote.id }
                    }),
                    prisma.pollOption.update({
                        where: { id: existingVote.pollOptionId },
                        data: { votes: { decrement: 1 } }
                    }),
                    prisma.pollVote.create({
                        data: {
                            pollOptionId: optionId,
                            userId
                        }
                    }),
                    prisma.pollOption.update({
                        where: { id: optionId },
                        data: { votes: { increment: 1 } }
                    })
                ]);

                if (emitPollUpdated) {
                    emitPollUpdated(postId, existingVote.pollOptionId, existingVote.pollOption.votes - 1);
                    const newOption = await prisma.pollOption.findUnique({ where: { id: optionId } });
                    if (newOption) {
                        emitPollUpdated(postId, optionId, newOption.votes);
                    }
                }

                return { success: true, action: 'switched' };
            }
        }
        
        // No existing vote, just add the new one
        await prisma.$transaction([
            prisma.pollVote.create({
                data: {
                    pollOptionId: optionId,
                    userId
                }
            }),
            prisma.pollOption.update({
                where: { id: optionId },
                data: { votes: { increment: 1 } }
            })
        ]);
        
        if (emitPollUpdated) {
            const option = await prisma.pollOption.findUnique({ where: { id: optionId }});
            if (option) {
                emitPollUpdated(postId, optionId, option.votes);
            }
        }
        
        return { success: true, action: 'voted' };
    }

    static async getLinkPreview(url: string) {
        if (!url) throw new Error('URL is required');

        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        const getMetaTag = (name: string) => 
            $(`meta[property="${name}"]`).attr('content') || 
            $(`meta[name="${name}"]`).attr('content');

        return {
            title: getMetaTag('og:title') || $('title').text(),
            description: getMetaTag('og:description') || getMetaTag('description'),
            image: getMetaTag('og:image'),
            url: getMetaTag('og:url') || url,
            siteName: getMetaTag('og:site_name')
        };
    }
}
