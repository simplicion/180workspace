import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/auth_provider.dart';
import '../models/pitch_post.dart';
import 'widgets/video_reel_player.dart';
import 'widgets/pitch_countdown_ring.dart';
import 'widgets/comment_sheet.dart';

class PitchFeedScreen extends ConsumerStatefulWidget {
  const PitchFeedScreen({super.key});

  @override
  ConsumerState<PitchFeedScreen> createState() => _PitchFeedScreenState();
}

class _PitchFeedScreenState extends ConsumerState<PitchFeedScreen> {
  final PageController _pageController = PageController();
  final List<PitchPost> _pitches = [];
  bool _loading = true;
  int _currentIndex = 0;
  double _currentSeconds = 0.0;
  String _selectedCategory = 'all';

  final List<String> _categories = [
    'all',
    'startups',
    'ai',
    'saas',
    'fintech',
    'health',
    'creator',
  ];

  @override
  void initState() {
    super.initState();
    _fetchFeed();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _fetchFeed({String? category}) async {
    setState(() => _loading = true);
    try {
      final dio = Dio();
      final auth = ref.read(authStateProvider);
      final headers = <String, String>{};
      if (auth is Authenticated) {
        headers['Authorization'] = 'Bearer ${auth.accessToken}';
      }

      final queryParams = <String, dynamic>{'limit': 15};
      if (category != null && category != 'all') {
        queryParams['category'] = category;
      }

      final res = await dio.get(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/posts/feed',
        queryParameters: queryParams,
        options: Options(headers: headers),
      );

      if (res.data['success'] == true) {
        final list = (res.data['items'] as List)
            .map((item) => PitchPost.fromJson(item))
            .toList();

        if (mounted) {
          setState(() {
            _pitches.clear();
            _pitches.addAll(list);
            _loading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleUpvote(PitchPost post) async {
    final auth = ref.read(authStateProvider);
    if (auth is! Authenticated) {
      ref.read(authStateProvider.notifier).launchSso();
      return;
    }

    setState(() {
      if (post.isUpvoted) {
        post.isUpvoted = false;
        post.upvotesCount = (post.upvotesCount - 1).clamp(0, 999999);
      } else {
        post.isUpvoted = true;
        post.upvotesCount++;
      }
    });

    try {
      final dio = Dio();
      await dio.post(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/posts/${post.id}/upvote',
        options: Options(headers: {'Authorization': 'Bearer ${auth.accessToken}'}),
      );
    } catch (_) {
      // Revert if API failed
    }
  }

  void _sharePitch(PitchPost post) {
    SharePlus.instance.share(
      ShareParams(
        text: 'Watch "${post.title}" on Pitch in 180: https://app.180workspace.com/pitch/${post.id}\n#180pitch #startup',
        subject: post.title,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final userToken = auth is Authenticated ? auth.accessToken : null;

    return Scaffold(
      backgroundColor: PitchTheme.background,
      body: Stack(
        children: [
          // 1. Fullscreen Vertical Feed or Empty State
          if (_loading)
            const Center(child: CircularProgressIndicator(color: PitchTheme.primary))
          else if (_pitches.isEmpty)
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.videocam_off_rounded, size: 56, color: PitchTheme.textSecondary),
                  const SizedBox(height: 16),
                  const Text('No pitches in this category yet.', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text('Be the first founder to post a 180s elevator pitch!', style: TextStyle(color: PitchTheme.textSecondary)),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: PitchTheme.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () => _fetchFeed(category: _selectedCategory),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Refresh Feed'),
                  ),
                ],
              ),
            )
          else
            PageView.builder(
              controller: _pageController,
              scrollDirection: Axis.vertical,
              itemCount: _pitches.length,
              onPageChanged: (idx) {
                setState(() {
                  _currentIndex = idx;
                  _currentSeconds = 0.0;
                });
              },
              itemBuilder: (ctx, idx) {
                final post = _pitches[idx];
                final isCurrent = idx == _currentIndex;

                return Stack(
                  fit: StackFit.expand,
                  children: [
                    // Video Layer
                    VideoReelPlayer(
                      videoUrl: post.videoUrl,
                      hlsMasterUrl: post.hlsMasterUrl,
                      isCurrent: isCurrent,
                      onProgressSeconds: (sec) {
                        if (isCurrent && mounted) {
                          setState(() => _currentSeconds = sec);
                        }
                      },
                    ),

                    // Subtle Bottom Gradient Scrim for Legibility
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.2),
                              Colors.black.withValues(alpha: 0.85),
                            ],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            stops: const [0.5, 0.75, 1.0],
                          ),
                        ),
                      ),
                    ),

                    // Left Bottom: Pitch Metadata & Author Info
                    Positioned(
                      left: 16,
                      bottom: 24,
                      right: 80,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Author Pill
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.4),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                CircleAvatar(
                                  radius: 14,
                                  backgroundImage: post.user.photoUrl != null
                                      ? NetworkImage(post.user.photoUrl!)
                                      : null,
                                  child: post.user.photoUrl == null
                                      ? Text(
                                          post.user.name.isNotEmpty ? post.user.name[0] : 'U',
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
                                        )
                                      : null,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '@${post.user.username}',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.white),
                                ),
                                const SizedBox(width: 4),
                                const Icon(Icons.verified_rounded, size: 14, color: PitchTheme.verifiedBlue),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Pitch Title
                          Text(
                            post.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 6),

                          // Pitch Description
                          if (post.description.isNotEmpty)
                            Text(
                              post.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.white.withValues(alpha: 0.85),
                                height: 1.3,
                              ),
                            ),
                          const SizedBox(height: 10),

                          // Category Badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: PitchTheme.primary.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: PitchTheme.primary.withValues(alpha: 0.6)),
                            ),
                            child: Text(
                              '#${post.category.toUpperCase()}',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Right Side Floating Interaction Rail
                    Positioned(
                      right: 14,
                      bottom: 40,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // 180s Countdown Ring
                          PitchCountdownRing(
                            currentSeconds: _currentSeconds,
                            maxSeconds: post.duration > 0 ? post.duration : 180.0,
                            size: 50,
                          ),
                          const SizedBox(height: 24),

                          // Upvote Button
                          IconButton(
                            icon: Icon(
                              post.isUpvoted ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                              color: post.isUpvoted ? PitchTheme.accent : Colors.white,
                              size: 32,
                            ),
                            onPressed: () => _toggleUpvote(post),
                          ),
                          Text(
                            '${post.upvotesCount}',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Colors.white),
                          ),
                          const SizedBox(height: 18),

                          // Comments Button
                          IconButton(
                            icon: const Icon(Icons.mode_comment_outlined, color: Colors.white, size: 28),
                            onPressed: () {
                              CommentBottomSheet.show(
                                context,
                                pitchId: post.id,
                                userToken: userToken,
                                onCommentAdded: () {
                                  setState(() => post.upvotesCount);
                                },
                              );
                            },
                          ),
                          Text(
                            '${post.commentsCount}',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Colors.white),
                          ),
                          const SizedBox(height: 18),

                          // Share Button
                          IconButton(
                            icon: const Icon(Icons.share_rounded, color: Colors.white, size: 28),
                            onPressed: () => _sharePitch(post),
                          ),
                          const Text(
                            'Share',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),

          // 2. Top Header with Categories Filter Chips
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 0,
            right: 0,
            child: SizedBox(
              height: 38,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (ctx, i) {
                  final cat = _categories[i];
                  final isSelected = cat == _selectedCategory;
                  return GestureDetector(
                    onTap: () {
                      setState(() => _selectedCategory = cat);
                      _fetchFeed(category: cat);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? PitchTheme.primary : Colors.black.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? PitchTheme.primary : Colors.white.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Text(
                        cat == 'all' ? '🔥 Featured' : '#${cat.toUpperCase()}',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
