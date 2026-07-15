'use strict';
const { prisma } = require('@workspace/db');

// User actions
exports.listPosts = async (req, res) => {
    try {
        const { category, search, authorUserId } = req.query;
        const where = { status: 'active' };
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
        const mappedPosts = posts.map(post => ({
            ...post,
            _id: post.id,
            author: {
                userId: post.authorUserId,
                name: post.authorName,
                companyName: post.authorCompany,
                photoUrl: post.authorPhotoUrl
            }
        }));

        res.json(mappedPosts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPost = async (req, res) => {
    try {
        const post = await prisma.forumPost.findUnique({
            where: { id: req.params.id }
        });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        
        // Increment views
        const updatedPost = await prisma.forumPost.update({
            where: { id: req.params.id },
            data: { viewCount: { increment: 1 } },
            include: { pollOptions: { include: { pollVotes: true } }, mentions: true, hashtags: true }
        });

        const replies = await prisma.forumReply.findMany({
            where: { postId: req.params.id, status: 'active' },
            orderBy: { createdAt: 'asc' }
        });

        // Compatibility mapping for frontend expecting _id and nested author object
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

        res.json({ post: mappedPost, replies: mappedReplies });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const Filter = require('bad-words');
const filter = new Filter();

exports.createPost = async (req, res) => {
    try {
        const { title, content, category, tags, mediaUrls, rawVideoUrl, postType, mentions, hashtags, pollOptions, isAnonymous } = req.body;

        if (title && filter.isProfane(title)) {
            return res.status(400).json({ error: 'Your post title contains inappropriate language.' });
        }
        if (content && filter.isProfane(content)) {
            return res.status(400).json({ error: 'Your post content contains inappropriate language.' });
        }

        const connectMentions = mentions?.length > 0 ? mentions.map(id => ({ id })) : undefined;
        const connectOrCreateHashtags = hashtags?.length > 0 ? hashtags.map(tag => ({
            where: { name: tag },
            create: { name: tag }
        })) : undefined;
        const createPollOptions = (postType === 'poll' && pollOptions?.length > 0) ? {
            create: pollOptions.map(text => ({ text, votes: 0 }))
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
                authorUserId: req.user.id,
                authorName: isAnonymous ? 'Anonymous' : req.user.name,
                authorCompany: isAnonymous ? null : (req.user.companyName || null),
                authorPhotoUrl: isAnonymous ? null : (req.user.photoUrl || null),
                mentions: connectMentions ? { connect: connectMentions } : undefined,
                hashtags: connectOrCreateHashtags ? { connectOrCreate: connectOrCreateHashtags } : undefined,
                pollOptions: createPollOptions
            },
            include: { mentions: true, hashtags: true, pollOptions: true }
        });

        if (rawVideoUrl) {
            try {
                const { mediaQueue } = require('../assets-app/queues/media.queue');
                await mediaQueue.add('process_community_video', {
                    mediaId: post.id,
                    mediaType: 'community'
                });
            } catch (err) {
                console.error("Failed to enqueue media job:", err);
            }
        }

        const mappedPost = {
            ...post,
            _id: post.id,
            author: {
                userId: post.authorUserId,
                name: post.authorName,
                companyName: post.authorCompany,
                photoUrl: post.authorPhotoUrl
            }
        };

        res.status(201).json(mappedPost);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.createReply = async (req, res) => {
    try {
        const { content, parentReplyId, isAnonymous } = req.body;
        
        const reply = await prisma.forumReply.create({
            data: {
                postId: req.params.postId,
                content: content,
                parentReplyId: parentReplyId || null,
                authorUserId: req.user.id,
                authorName: isAnonymous ? 'Anonymous' : req.user.name,
                authorCompany: isAnonymous ? null : (req.user.companyName || null),
                authorPhotoUrl: isAnonymous ? null : (req.user.photoUrl || null)
            }
        });

        // Update post reply count
        await prisma.forumPost.update({
            where: { id: req.params.postId },
            data: { replyCount: { increment: 1 } }
        });

        const mappedReply = {
            ...reply,
            _id: reply.id,
            author: {
                userId: reply.authorUserId,
                name: reply.authorName,
                companyName: reply.authorCompany,
                photoUrl: reply.authorPhotoUrl
            }
        };

        res.status(201).json(mappedReply);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const post = await prisma.forumPost.findUnique({
            where: { id: req.params.postId }
        });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        
        const userId = req.user.id;
        const upvotes = [...(post.upvotes || [])];
        const idx = upvotes.indexOf(userId);
        
        if (idx > -1) {
            upvotes.splice(idx, 1);
        } else {
            upvotes.push(userId);
        }
        
        const updatedPost = await prisma.forumPost.update({
            where: { id: req.params.postId },
            data: { upvotes }
        });

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

        res.json(mappedPost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Superadmin actions
exports.deletePost = async (req, res) => {
    try {
        const postId = req.params.id || req.params.postId;
        const post = await prisma.forumPost.findUnique({
            where: { id: postId }
        });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        
        // Check if user is author or superadmin
        if (post.authorUserId !== req.user.id && req.user.role !== 'SUPERADMIN') {
            return res.status(403).json({ error: 'You do not have permission to delete this post' });
        }
        
        await prisma.forumPost.update({
            where: { id: postId },
            data: { status: 'deleted' }
        });

        res.json({ message: 'Post removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.reportPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }

        const report = await prisma.postReport.create({
            data: {
                postId,
                reporterId: req.user.id,
                reason
            }
        });
        
        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteReply = async (req, res) => {
    try {
        const reply = await prisma.forumReply.findUnique({
            where: { id: req.params.id }
        });
        if (!reply) return res.status(404).json({ error: 'Reply not found' });
        
        await prisma.forumReply.update({
            where: { id: req.params.id },
            data: { status: 'deleted' }
        });
        
        await prisma.forumPost.update({
            where: { id: reply.postId },
            data: { replyCount: { decrement: 1 } }
        });

        res.json({ message: 'Reply removed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPostLikes = async (req, res) => {
    try {
        const post = await req.prisma.forumPost.findUnique({
            where: { id: req.params.postId },
            select: { upvotes: true }
        });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        
        // Fetch user details for these IDs
        if (!post.upvotes || post.upvotes.length === 0) {
            return res.json({ users: [] });
        }
        
        const users = await req.prisma.user.findMany({
            where: { id: { in: post.upvotes } },
            select: { id: true, name: true, photoUrl: true, headline: true }
        });
        
        res.json({ users });
    } catch (error) {
        console.error('Error fetching likes:', error);
        res.status(500).json({ error: 'Failed to fetch likes' });
    }
};

exports.toggleSave = async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.postId;
        
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
            return res.json({ saved: false });
        } else {
            await prisma.savedPost.create({
                data: {
                    userId,
                    postId
                }
            });
            return res.json({ saved: true });
        }
    } catch (error) {
        console.error('Error toggling save:', error);
        res.status(500).json({ error: 'Failed to toggle save' });
    }
};

exports.getSavedPosts = async (req, res) => {
    try {
        const userId = req.user.id;
        
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
        
        res.json({ posts: saved.map(s => s.post) });
    } catch (error) {
        console.error('Error fetching saved posts:', error);
        res.status(500).json({ error: 'Failed to fetch saved posts' });
    }
};

exports.getPostReplies = async (req, res) => {
    try {
        const replies = await req.prisma.forumReply.findMany({
            where: { postId: req.params.postId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ replies });
    } catch (error) {
        console.error('Error fetching replies:', error);
        res.status(500).json({ error: 'Failed to fetch replies' });
    }
};

exports.getHashtags = async (req, res) => {
    try {
        const { q } = req.query;
        const hashtags = await prisma.hashtag.findMany({
            where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
            take: 10
        });
        res.json(hashtags);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.votePoll = async (req, res) => {
    try {
        const { optionId } = req.params;
        const userId = req.user.id;
        
        // Find the poll option to get the postId
        const targetOption = await prisma.pollOption.findUnique({
            where: { id: optionId }
        });
        
        if (!targetOption) {
            return res.status(404).json({ error: 'Poll option not found' });
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
        
        const io = require('../../system-configs/sockets/index.js').getIo();

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

                if (io) {
                    io.emit('poll-updated', { postId, optionId, votes: existingVote.pollOption.votes - 1 });
                }
                
                return res.json({ success: true, action: 'unvoted' });
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

                if (io) {
                    io.emit('poll-updated', { postId, optionId: existingVote.pollOptionId, votes: existingVote.pollOption.votes - 1 });
                    const newOption = await prisma.pollOption.findUnique({ where: { id: optionId } });
                    if (newOption) {
                        io.emit('poll-updated', { postId, optionId, votes: newOption.votes });
                    }
                }

                return res.json({ success: true, action: 'switched' });
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
        
        if (io) {
            const option = await prisma.pollOption.findUnique({ where: { id: optionId }});
            if (option) {
                io.emit('poll-updated', { postId: option.postId, optionId, votes: option.votes });
            }
        }
        
        res.json({ success: true, action: 'voted' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const cheerio = require('cheerio');
exports.getLinkPreview = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        const getMetaTag = (name) => 
            $(`meta[property="${name}"]`).attr('content') || 
            $(`meta[name="${name}"]`).attr('content');

        const preview = {
            title: getMetaTag('og:title') || $('title').text(),
            description: getMetaTag('og:description') || getMetaTag('description'),
            image: getMetaTag('og:image'),
            url: getMetaTag('og:url') || url,
            siteName: getMetaTag('og:site_name')
        };

        res.json(preview);
    } catch (error) {
        console.error('Error fetching link preview:', error);
        res.status(500).json({ error: 'Failed to fetch link preview' });
    }
};
