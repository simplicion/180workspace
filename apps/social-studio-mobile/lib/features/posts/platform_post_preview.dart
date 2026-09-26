import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/platform.dart';

/// Interactive, pixel-faithful preview of how a post renders across social channels.
/// Matches the web platform previews (InstagramFeedPreview, LinkedInPreview, TikTokPreview, YouTubeShortsPreview).
class PlatformPostPreview extends StatefulWidget {
  const PlatformPostPreview({
    super.key,
    required this.caption,
    this.title,
    this.hook,
    this.mediaUrls = const [],
    this.mediaType,
    this.selectedPlatform = SocialPlatform.instagram,
    this.accountName,
    this.username,
    this.avatarUrl,
    this.firstComment,
  });

  final String caption;
  final String? title;
  final String? hook;
  final List<String> mediaUrls;
  final String? mediaType;
  final SocialPlatform selectedPlatform;
  final String? accountName;
  final String? username;
  final String? avatarUrl;
  final String? firstComment;

  @override
  State<PlatformPostPreview> createState() => _PlatformPostPreviewState();
}

class _PlatformPostPreviewState extends State<PlatformPostPreview> {
  late SocialPlatform _platform = widget.selectedPlatform;
  bool _expandedCaption = false;

  static const _supportedPreviewPlatforms = [
    SocialPlatform.instagram,
    SocialPlatform.tiktok,
    SocialPlatform.youtube,
    SocialPlatform.linkedin,
    SocialPlatform.facebook,
    SocialPlatform.x,
    SocialPlatform.reddit,
  ];

  @override
  void didUpdateWidget(covariant PlatformPostPreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedPlatform != widget.selectedPlatform) {
      _platform = widget.selectedPlatform;
    }
  }

  String get _displayAuthor => widget.accountName ?? widget.username ?? '180creator';
  String get _displayHandle => (widget.username != null && widget.username!.isNotEmpty)
      ? (widget.username!.startsWith('@') ? widget.username! : '@${widget.username}')
      : '@$_displayAuthor';
  String get _mediaType => widget.mediaType ?? 'video';

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Platform Switcher Bar
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              for (final p in _supportedPreviewPlatforms)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    avatar: Icon(p.icon, size: 16, color: _platform == p ? Colors.white : p.color),
                    label: Text(p.label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    selected: _platform == p,
                    selectedColor: p.color,
                    onSelected: (selected) {
                      if (selected) setState(() => _platform = p);
                    },
                  ),
                ),
            ],
          ),
        ),

        // Device Frame Container
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 380),
              decoration: BoxDecoration(
                color: _platform == SocialPlatform.tiktok || _platform == SocialPlatform.youtube
                    ? Colors.black
                    : Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Theme.of(context).dividerColor),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: switch (_platform) {
                SocialPlatform.instagram => _buildInstagramPreview(),
                SocialPlatform.tiktok => _buildTikTokPreview(),
                SocialPlatform.youtube => _buildYouTubeShortsPreview(),
                SocialPlatform.linkedin => _buildLinkedInPreview(),
                SocialPlatform.facebook => _buildFacebookPreview(),
                SocialPlatform.x => _buildTwitterPreview(),
                SocialPlatform.reddit => _buildRedditPreview(),
                _ => _buildInstagramPreview(),
              },
            ),
          ),
        ),
      ],
    );
  }

  // ── Instagram Feed Preview ───────────────────────────────────────────────
  Widget _buildInstagramPreview() {
    final hasMedia = widget.mediaUrls.isNotEmpty;
    final firstMedia = widget.mediaUrls.firstOrNull;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Instagram Header
        ListTile(
          dense: true,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
          leading: Container(
            padding: const EdgeInsets.all(2),
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [Color(0xFFF58529), Color(0xFFDD2A7B), Color(0xFF8134AF)],
                begin: Alignment.bottomLeft,
                end: Alignment.topRight,
              ),
            ),
            child: CircleAvatar(
              radius: 16,
              backgroundColor: AppTheme.surfaceElevated,
              backgroundImage: widget.avatarUrl != null ? NetworkImage(widget.avatarUrl!) : null,
              child: widget.avatarUrl == null
                  ? const Icon(Icons.person_rounded, size: 16, color: Colors.white)
                  : null,
            ),
          ),
          title: Text(_displayAuthor, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          subtitle: const Text('Original audio', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
          trailing: const Icon(Icons.more_horiz_rounded, size: 20),
        ),

        // Media Viewport (4:5 vertical feed ratio or fallback)
        AspectRatio(
          aspectRatio: 4 / 5,
          child: Container(
            color: Colors.black,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (hasMedia && firstMedia != null)
                  Image.network(
                    firstMedia,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _mediaPlaceholder(Icons.videocam_rounded, 'Video / Media attached'),
                  )
                else
                  _mediaPlaceholder(
                    widget.mediaType == 'video' ? Icons.videocam_rounded : Icons.image_rounded,
                    widget.mediaType == 'video' ? 'Reel Video (9:16 / 4:5)' : 'Post Image (1:1 / 4:5)',
                  ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(_mediaType == 'video' ? Icons.play_arrow_rounded : Icons.photo_library_rounded,
                            size: 14, color: Colors.white),
                        const SizedBox(width: 4),
                        Text(_mediaType.toUpperCase(),
                            style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Action Bar (Heart, Comment, Share, Save)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: [
              const Icon(Icons.favorite_border_rounded, size: 22),
              const SizedBox(width: 14),
              const Icon(Icons.mode_comment_outlined, size: 20),
              const SizedBox(width: 14),
              const Icon(Icons.send_outlined, size: 20),
              const Spacer(),
              const Icon(Icons.bookmark_border_rounded, size: 22),
            ],
          ),
        ),

        // Likes & Caption
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Liked by 180workspace and 1,248 others',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
              const SizedBox(height: 4),
              RichText(
                maxLines: _expandedCaption ? 100 : 2,
                overflow: TextOverflow.ellipsis,
                text: TextSpan(
                  style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodyMedium?.color),
                  children: [
                    TextSpan(text: '$_displayAuthor ', style: const TextStyle(fontWeight: FontWeight.bold)),
                    TextSpan(text: widget.caption.isEmpty ? 'Your post caption goes here...' : widget.caption),
                  ],
                ),
              ),
              if (widget.caption.length > 80 && !_expandedCaption)
                GestureDetector(
                  onTap: () => setState(() => _expandedCaption = true),
                  child: const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Text('more', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                  ),
                ),
              if (widget.firstComment != null && widget.firstComment!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: AppTheme.surfaceElevated, borderRadius: BorderRadius.circular(6)),
                  child: Row(
                    children: [
                      const Icon(Icons.reply_rounded, size: 12, color: AppTheme.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'First comment: ${widget.firstComment}',
                          style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 10),
            ],
          ),
        ),
      ],
    );
  }

  // ── TikTok Preview ───────────────────────────────────────────────────────
  Widget _buildTikTokPreview() {
    final hasMedia = widget.mediaUrls.isNotEmpty;
    final firstMedia = widget.mediaUrls.firstOrNull;

    return AspectRatio(
      aspectRatio: 9 / 16,
      child: Container(
        color: const Color(0xFF121212),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Background Video Canvas
            if (hasMedia && firstMedia != null)
              Image.network(
                firstMedia,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _mediaPlaceholder(Icons.tiktok_rounded, 'TikTok Vertical Video'),
              )
            else
              _mediaPlaceholder(Icons.music_video_rounded, 'TikTok 9:16 Full Screen'),

            // Subtle dark gradient vignette
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.black.withValues(alpha: 0.2), Colors.transparent, Colors.black.withValues(alpha: 0.85)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: const [0.0, 0.4, 1.0],
                  ),
                ),
              ),
            ),

            // Top Header: Following | For You
            Positioned(
              top: 14,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Following', style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13)),
                  const SizedBox(width: 14),
                  const Text('For You', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                ],
              ),
            ),

            // Right Action Column (Avatar, Heart, Comments, Save, Share, Sound Disc)
            Positioned(
              right: 8,
              bottom: 24,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Stack(
                    alignment: Alignment.bottomCenter,
                    clipBehavior: Clip.none,
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: Colors.white24,
                        backgroundImage: widget.avatarUrl != null ? NetworkImage(widget.avatarUrl!) : null,
                        child: widget.avatarUrl == null
                            ? const Icon(Icons.person_rounded, color: Colors.white, size: 20)
                            : null,
                      ),
                      Positioned(
                        bottom: -5,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: const BoxDecoration(color: Color(0xFFFE2C55), shape: BoxShape.circle),
                          child: const Icon(Icons.add, size: 12, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  _tikTokActionIcon(Icons.favorite_rounded, '84.2K'),
                  const SizedBox(height: 14),
                  _tikTokActionIcon(Icons.mode_comment_rounded, '1,029'),
                  const SizedBox(height: 14),
                  _tikTokActionIcon(Icons.bookmark_rounded, '9,812'),
                  const SizedBox(height: 14),
                  _tikTokActionIcon(Icons.share_rounded, 'Share'),
                  const SizedBox(height: 16),
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF202020),
                      border: Border.all(color: Colors.white30, width: 2),
                    ),
                    child: const Icon(Icons.music_note_rounded, size: 16, color: Colors.white),
                  ),
                ],
              ),
            ),

            // Bottom Info Column (Creator handle, Caption, Sound)
            Positioned(
              left: 12,
              right: 76,
              bottom: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Text(_displayHandle, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(width: 4),
                      const Icon(Icons.verified_rounded, size: 14, color: Color(0xFF20D5EC)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.caption.isEmpty ? 'Compelling short-form caption with #trending tags...' : widget.caption,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.3),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.music_note_rounded, size: 13, color: Colors.white70),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '$_displayAuthor · Original Sound - High Energy',
                          style: const TextStyle(color: Colors.white70, fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── YouTube Shorts Preview ───────────────────────────────────────────────
  Widget _buildYouTubeShortsPreview() {
    final hasMedia = widget.mediaUrls.isNotEmpty;
    final firstMedia = widget.mediaUrls.firstOrNull;

    return AspectRatio(
      aspectRatio: 9 / 16,
      child: Container(
        color: Colors.black,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (hasMedia && firstMedia != null)
              Image.network(
                firstMedia,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _mediaPlaceholder(Icons.play_circle_fill_rounded, 'YouTube Shorts Video'),
              )
            else
              _mediaPlaceholder(Icons.play_circle_fill_rounded, 'Shorts 9:16 Player'),

            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.transparent, Colors.black.withValues(alpha: 0.85)],
                    begin: Alignment.center,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),

            // Top Bar
            const Positioned(
              top: 12,
              left: 14,
              right: 14,
              child: Row(
                children: [
                  Icon(Icons.search_rounded, color: Colors.white),
                  Spacer(),
                  Icon(Icons.camera_alt_outlined, color: Colors.white),
                  SizedBox(width: 14),
                  Icon(Icons.more_vert_rounded, color: Colors.white),
                ],
              ),
            ),

            // Right Action Column
            Positioned(
              right: 8,
              bottom: 20,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _shortsActionIcon(Icons.thumb_up_alt_rounded, '24K'),
                  const SizedBox(height: 14),
                  _shortsActionIcon(Icons.thumb_down_alt_rounded, 'Dislike'),
                  const SizedBox(height: 14),
                  _shortsActionIcon(Icons.comment_rounded, '412'),
                  const SizedBox(height: 14),
                  _shortsActionIcon(Icons.share_rounded, 'Share'),
                  const SizedBox(height: 14),
                  _shortsActionIcon(Icons.loop_rounded, 'Remix'),
                ],
              ),
            ),

            // Bottom Info Column
            Positioned(
              left: 12,
              right: 70,
              bottom: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundImage: widget.avatarUrl != null ? NetworkImage(widget.avatarUrl!) : null,
                        child: widget.avatarUrl == null
                            ? const Icon(Icons.person, size: 14, color: Colors.white)
                            : null,
                      ),
                      const SizedBox(width: 8),
                      Text(_displayHandle,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                        child: const Text('Subscribe',
                            style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 11)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.title ?? (widget.caption.isEmpty ? 'Shorts catchy title goes here' : widget.caption),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── LinkedIn Preview ─────────────────────────────────────────────────────
  Widget _buildLinkedInPreview() {
    final hasMedia = widget.mediaUrls.isNotEmpty;
    final firstMedia = widget.mediaUrls.firstOrNull;

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppTheme.surfaceElevated,
                backgroundImage: widget.avatarUrl != null ? NetworkImage(widget.avatarUrl!) : null,
                child: widget.avatarUrl == null ? const Icon(Icons.business_rounded, color: AppTheme.primary) : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_displayAuthor, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const Text('Industry Leader • 1st', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                    Row(
                      children: [
                        const Text('Just now • ', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                        Icon(Icons.public_rounded, size: 11, color: Theme.of(context).hintColor),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.more_horiz_rounded, size: 18),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            widget.caption.isEmpty ? 'Share professional insights, company milestones, or industry news...' : widget.caption,
            style: const TextStyle(fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: 10),
          if (hasMedia && firstMedia != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  firstMedia,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => _mediaPlaceholder(Icons.article_rounded, 'Media Attachment'),
                ),
              ),
            ),
          const Divider(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _linkedInAction(Icons.thumb_up_alt_outlined, 'Like'),
              _linkedInAction(Icons.comment_outlined, 'Comment'),
              _linkedInAction(Icons.repeat_rounded, 'Repost'),
              _linkedInAction(Icons.send_outlined, 'Send'),
            ],
          ),
        ],
      ),
    );
  }

  // ── Facebook Preview ─────────────────────────────────────────────────────
  Widget _buildFacebookPreview() {
    final hasMedia = widget.mediaUrls.isNotEmpty;
    final firstMedia = widget.mediaUrls.firstOrNull;

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundImage: widget.avatarUrl != null ? NetworkImage(widget.avatarUrl!) : null,
                child: widget.avatarUrl == null ? const Icon(Icons.person, color: Colors.blue) : null,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_displayAuthor, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    Row(
                      children: [
                        const Text('Just now • ', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                        Icon(Icons.public, size: 11, color: Theme.of(context).hintColor),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.more_horiz_rounded),
            ],
          ),
          const SizedBox(height: 8),
          Text(widget.caption.isEmpty ? 'What\'s on your mind?' : widget.caption, style: const TextStyle(fontSize: 13)),
          const SizedBox(height: 8),
          if (hasMedia && firstMedia != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(firstMedia, fit: BoxFit.cover),
              ),
            ),
          const Divider(height: 18),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Row(children: [Icon(Icons.thumb_up_outlined, size: 18), SizedBox(width: 6), Text('Like', style: TextStyle(fontSize: 12))]),
              Row(children: [Icon(Icons.mode_comment_outlined, size: 18), SizedBox(width: 6), Text('Comment', style: TextStyle(fontSize: 12))]),
              Row(children: [Icon(Icons.share_outlined, size: 18), SizedBox(width: 6), Text('Share', style: TextStyle(fontSize: 12))]),
            ],
          ),
        ],
      ),
    );
  }

  // ── Twitter / X Preview ──────────────────────────────────────────────────
  Widget _buildTwitterPreview() {
    final hasMedia = widget.mediaUrls.isNotEmpty;
    final firstMedia = widget.mediaUrls.firstOrNull;

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 18,
            backgroundImage: widget.avatarUrl != null ? NetworkImage(widget.avatarUrl!) : null,
            child: widget.avatarUrl == null ? const Icon(Icons.person) : null,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(_displayAuthor, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(width: 4),
                    Text(_displayHandle, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    const Text(' · now', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(widget.caption.isEmpty ? 'What is happening?!' : widget.caption, style: const TextStyle(fontSize: 13)),
                if (hasMedia && firstMedia != null) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Image.network(firstMedia, fit: BoxFit.cover),
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Icon(Icons.chat_bubble_outline_rounded, size: 16, color: AppTheme.textMuted),
                    Icon(Icons.repeat_rounded, size: 16, color: AppTheme.textMuted),
                    Icon(Icons.favorite_border_rounded, size: 16, color: AppTheme.textMuted),
                    Icon(Icons.bookmark_border_rounded, size: 16, color: AppTheme.textMuted),
                    Icon(Icons.share_outlined, size: 16, color: AppTheme.textMuted),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  Widget _mediaPlaceholder(IconData icon, String label) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 40, color: Colors.white38),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _tikTokActionIcon(IconData icon, String label) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.white, size: 28),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _shortsActionIcon(IconData icon, String label) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.white, size: 24),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 10)),
      ],
    );
  }

  Widget _linkedInAction(IconData icon, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: AppTheme.textSecondary),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
      ],
    );
  }

  // ── Reddit Post Preview ──────────────────────────────────────────────────
  Widget _buildRedditPreview() {
    final hasMedia = widget.mediaUrls.isNotEmpty;
    final firstMedia = widget.mediaUrls.firstOrNull;
    final titleText = widget.title ?? widget.hook ?? 'Discussion & Insights';
    final author = widget.username != null && widget.username!.isNotEmpty
        ? (widget.username!.startsWith('u/') ? widget.username! : 'u/${widget.username}')
        : 'u/$_displayAuthor';

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Reddit Header
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFFFF4500),
                ),
                child: const Icon(Icons.forum_rounded, size: 16, color: Colors.white),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'r/socialmedia',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(width: 4),
                        const Text('• 2h', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                      ],
                    ),
                    Text(
                      author,
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF0045AC),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text('Join', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ],
          ),
        ),

        // Post Title
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Text(
            titleText,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary, height: 1.25),
          ),
        ),

        // Body Text
        if (widget.caption.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: Text(
              widget.caption,
              maxLines: _expandedCaption ? null : 4,
              overflow: _expandedCaption ? null : TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4),
            ),
          ),

        // Media container
        if (hasMedia)
          Container(
            height: 220,
            margin: const EdgeInsets.symmetric(vertical: 4),
            decoration: const BoxDecoration(color: Colors.black),
            child: firstMedia != null && firstMedia.startsWith('http')
                ? Image.network(
                    firstMedia,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _mediaPlaceholder(
                      _mediaType == 'video' ? Icons.videocam_rounded : Icons.image_rounded,
                      _mediaType == 'video' ? 'Reddit Video' : 'Reddit Image',
                    ),
                  )
                : _mediaPlaceholder(
                    _mediaType == 'video' ? Icons.videocam_rounded : Icons.image_rounded,
                    _mediaType == 'video' ? 'Reddit Video (Tap to Play)' : 'Reddit Image',
                  ),
          ),

        // Reddit Engagement Bar
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          child: Row(
            children: [
              // Upvote / Score / Downvote capsule
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceSubtle,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.arrow_upward_rounded, size: 16, color: Color(0xFFFF4500)),
                    SizedBox(width: 4),
                    Text('142', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.textPrimary)),
                    SizedBox(width: 4),
                    Icon(Icons.arrow_downward_rounded, size: 16, color: AppTheme.textSecondary),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Comments capsule
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceSubtle,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.chat_bubble_outline_rounded, size: 14, color: AppTheme.textSecondary),
                    SizedBox(width: 4),
                    Text('28', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const Spacer(),

              // Share button
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceSubtle,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.share_outlined, size: 14, color: AppTheme.textSecondary),
                    SizedBox(width: 4),
                    Text('Share', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
