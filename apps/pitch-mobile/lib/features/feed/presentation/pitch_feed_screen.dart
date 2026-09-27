import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/auth/local_user_profile.dart';
import '../models/pitch_post.dart';
import 'widgets/video_reel_player.dart';
import 'widgets/pitch_countdown_ring.dart';
import 'widgets/comment_sheet.dart';
import 'widgets/share_pitch_sheet.dart';

class PitchFeedScreen extends ConsumerStatefulWidget {
  const PitchFeedScreen({super.key});

  @override
  ConsumerState<PitchFeedScreen> createState() => _PitchFeedScreenState();
}

class _PitchFeedScreenState extends ConsumerState<PitchFeedScreen>
    with SingleTickerProviderStateMixin {
  final PageController _pageController = PageController();
  final List<PitchPost> _pitches = [];
  bool _loading = true;
  int _currentIndex = 0;
  double _currentSeconds = 0.0;
  String _selectedTab = 'For You';
  String _selectedCategory = 'all';

  // Double tap flame burst animation
  bool _showFlameBurst = false;
  late final AnimationController _flameAnimController;
  late final Animation<double> _flameScale;

  final List<String> _feedTabs = ['For You', 'Trending', 'Following'];

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
    _flameAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _flameScale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.4), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 1.4, end: 1.0), weight: 30),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.0), weight: 30),
    ]).animate(CurvedAnimation(
      parent: _flameAnimController,
      curve: Curves.easeOutBack,
    ));

    _flameAnimController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        setState(() => _showFlameBurst = false);
      }
    });

    _fetchFeed();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _flameAnimController.dispose();
    super.dispose();
  }

  List<PitchPost> _getDefaultDemoPitches() {
    return [
      PitchPost(
        id: 'post_demo_1',
        title: 'Simplicion Work Graph: The Universal Work Mesh',
        description:
            'A unified multi-app ecosystem connecting identity, communications, and knowledge graphs into one sovereign platform.',
        videoUrl:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        hlsMasterUrl: null,
        durationSeconds: 178.0,
        authorName: 'Alex Rivers',
        authorUsername: 'alexrivers',
        authorAvatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        authorCompany: 'Simplicion & 180 Workspace',
        upvotesCount: 890,
        commentsCount: 42,
        isUpvoted: true,
        tags: ['#180workspace', '#WorkGraph', '#SaaS', '#Founders'],
        category: 'saas',
        createdAt: DateTime.now().subtract(const Duration(hours: 3)),
      ),
      PitchPost(
        id: 'post_demo_2',
        title: 'Synthetix AI: Autonomous Contract Audits in 60s',
        description:
            'Eliminating 3-week legal reviews by verifying indemnities, IP clauses, and GDPR compliance with multi-agent reasoning.',
        videoUrl:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        hlsMasterUrl: null,
        durationSeconds: 176.0,
        authorName: 'Sarah Chen',
        authorUsername: 'sarahchen',
        authorAvatar:
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        authorCompany: 'Synthetix AI',
        upvotesCount: 420,
        commentsCount: 28,
        isUpvoted: false,
        tags: ['#AI', '#LegalTech', '#Enterprise'],
        category: 'ai',
        createdAt: DateTime.now().subtract(const Duration(hours: 7)),
      ),
      PitchPost(
        id: 'post_demo_3',
        title: 'VaultZero: Instant Multi-Party Cross-Border Settlement',
        description:
            'Hardware-grade zero-knowledge vaults for cross-border payroll, eliminating multi-day SWIFT wire bottlenecks.',
        videoUrl:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        hlsMasterUrl: null,
        durationSeconds: 180.0,
        authorName: 'David Kumar',
        authorUsername: 'davidk',
        authorAvatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        authorCompany: 'VaultZero',
        upvotesCount: 388,
        commentsCount: 19,
        isUpvoted: false,
        tags: ['#Fintech', '#Payroll', '#Security'],
        category: 'fintech',
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
    ];
  }

  Future<void> _fetchFeed({String? category}) async {
    setState(() => _loading = true);
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      ));
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
            if (list.isNotEmpty) {
              _pitches.addAll(list);
            } else {
              _pitches.addAll(_getDefaultDemoPitches());
            }
            _loading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _pitches.clear();
            _pitches.addAll(_getDefaultDemoPitches());
            _loading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _pitches.clear();
          _pitches.addAll(_getDefaultDemoPitches());
          _loading = false;
        });
      }
    }
  }

  void _triggerDoubleTapLike(PitchPost post) {
    setState(() => _showFlameBurst = true);
    _flameAnimController.forward(from: 0.0);

    if (!post.isUpvoted) {
      _toggleUpvote(post);
    }
  }

  Future<void> _toggleUpvote(PitchPost post) async {
    final localProfileNotifier = ref.read(localUserProfileProvider.notifier);
    localProfileNotifier.toggleUpvote(post.id);

    setState(() {
      if (post.isUpvoted) {
        post.isUpvoted = false;
        post.upvotesCount = (post.upvotesCount - 1).clamp(0, 999999);
      } else {
        post.isUpvoted = true;
        post.upvotesCount++;
      }
    });

    final auth = ref.read(authStateProvider);
    if (auth is Authenticated) {
      try {
        final dio = Dio();
        await dio.post(
          '${AppConfig.apiBaseUrl}/api/v1/pitch/posts/${post.id}/upvote',
          options:
              Options(headers: {'Authorization': 'Bearer ${auth.accessToken}'}),
        );
      } catch (_) {}
    }
  }

  void _sharePitch(PitchPost post) {
    SharePitchSheet.show(context, post);
  }

  void _openComments(PitchPost post) {
    final auth = ref.read(authStateProvider);
    final userToken = auth is Authenticated ? auth.accessToken : null;

    CommentBottomSheet.show(
      context,
      pitchId: post.id,
      userToken: userToken,
      onCommentAdded: () {
        setState(() => post.commentsCount++);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PitchTheme.background,
      body: Stack(
        children: [
          // 1. Fullscreen Vertical Feed
          if (_loading)
            const Center(
              child: CircularProgressIndicator(color: PitchTheme.primary),
            )
          else if (_pitches.isEmpty)
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.videocam_off_rounded,
                      size: 56, color: PitchTheme.textSecondary),
                  const SizedBox(height: 16),
                  const Text('No pitches in this category yet.',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text('Be the first founder to post a 180s elevator pitch!',
                      style: TextStyle(color: PitchTheme.textSecondary)),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: PitchTheme.primary,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () => _fetchFeed(category: _selectedCategory),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Refresh Feed'),
                  ),
                ],
              ),
            )
          else
            GestureDetector(
              onDoubleTap: () {
                if (_pitches.isNotEmpty && _currentIndex < _pitches.length) {
                  _triggerDoubleTapLike(_pitches[_currentIndex]);
                }
              },
              child: PageView.builder(
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
                      // Video Player Layer
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

                      // Gradient Scrim for Legibility
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Colors.black.withValues(alpha: 0.35),
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.85),
                              ],
                              stops: const [0.0, 0.5, 1.0],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                          ),
                        ),
                      ),

                      // Right Action Column
                      Positioned(
                        right: 14,
                        bottom: 90,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // 180s Countdown Ring Widget
                            PitchCountdownRing(
                              currentSeconds: isCurrent ? _currentSeconds : 0.0,
                              totalDurationSeconds: post.durationSeconds,
                              size: 52,
                            ),
                            const SizedBox(height: 22),

                            // Upvote Flame Action
                            _buildActionButton(
                              icon: post.isUpvoted
                                  ? Icons.local_fire_department_rounded
                                  : Icons.local_fire_department_outlined,
                              color: post.isUpvoted
                                  ? PitchTheme.accentPink
                                  : Colors.white,
                              label: '${post.upvotesCount}',
                              onTap: () => _toggleUpvote(post),
                            ),
                            const SizedBox(height: 18),

                            // Comment Action
                            _buildActionButton(
                              icon: Icons.chat_bubble_outline_rounded,
                              label: '${post.commentsCount}',
                              onTap: () => _openComments(post),
                            ),
                            const SizedBox(height: 18),

                            // Share Action
                            _buildActionButton(
                              icon: Icons.share_rounded,
                              label: 'Share',
                              onTap: () => _sharePitch(post),
                            ),
                          ],
                        ),
                      ),

                      // Bottom Info Details
                      Positioned(
                        left: 16,
                        right: 80,
                        bottom: 24,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Founder Bio Bar
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 18,
                                  backgroundImage:
                                      NetworkImage(post.authorAvatar),
                                  onBackgroundImageError: (_, __) {},
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(
                                              post.authorName,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w800,
                                                fontSize: 14,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          const Icon(Icons.verified_rounded,
                                              color: PitchTheme.primary,
                                              size: 15),
                                        ],
                                      ),
                                      if (post.authorCompany != null)
                                        Text(
                                          post.authorCompany!,
                                          style: TextStyle(
                                            color: Colors.white
                                                .withValues(alpha: 0.75),
                                            fontSize: 11,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // Pitch Title
                            Text(
                              post.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                height: 1.25,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),

                            // Pitch Description
                            Text(
                              post.description,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.85),
                                fontSize: 12.5,
                                height: 1.3,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),

                            // Tags
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              children: post.tags.take(3).map((t) {
                                return Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color:
                                        Colors.black.withValues(alpha: 0.45),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                        color: Colors.white12, width: 0.5),
                                  ),
                                  child: Text(
                                    t,
                                    style: const TextStyle(
                                      color: PitchTheme.accentAmber,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),

          // 2. Double-tap Flame Burst Overlay
          if (_showFlameBurst)
            Center(
              child: AnimatedBuilder(
                animation: _flameAnimController,
                builder: (ctx, child) {
                  return Transform.scale(
                    scale: _flameScale.value,
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: PitchTheme.accentPink.withValues(alpha: 0.5),
                            blurRadius: 36,
                            spreadRadius: 8,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.local_fire_department_rounded,
                        color: PitchTheme.accentPink,
                        size: 96,
                      ),
                    ),
                  );
                },
              ),
            ),

          // 3. Top Navigation Bar (Tabs & Category Filter)
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 0,
            right: 0,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Segmented For You / Trending / Following
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: _feedTabs.map((tab) {
                    final isSelected = tab == _selectedTab;
                    return GestureDetector(
                      onTap: () {
                        setState(() => _selectedTab = tab);
                        _fetchFeed(category: _selectedCategory);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 6),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              tab,
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.6),
                                fontSize: isSelected ? 15 : 14,
                                fontWeight: isSelected
                                    ? FontWeight.w800
                                    : FontWeight.w600,
                                shadows: const [
                                  Shadow(
                                    color: Colors.black54,
                                    blurRadius: 4,
                                    offset: Offset(0, 1),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 3),
                            if (isSelected)
                              Container(
                                width: 20,
                                height: 2.5,
                                decoration: BoxDecoration(
                                  color: PitchTheme.primary,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 6),

                // Category Chips
                SizedBox(
                  height: 32,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 6),
                    itemBuilder: (ctx, i) {
                      final cat = _categories[i];
                      final isSelected = cat == _selectedCategory;
                      return GestureDetector(
                        onTap: () {
                          setState(() => _selectedCategory = cat);
                          _fetchFeed(category: cat);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? PitchTheme.primary
                                : Colors.black.withValues(alpha: 0.45),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? PitchTheme.primary
                                  : Colors.white24,
                              width: 0.8,
                            ),
                          ),
                          child: Text(
                            cat == 'all' ? 'All' : '#${cat.toUpperCase()}',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: isSelected
                                  ? FontWeight.w800
                                  : FontWeight.w500,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color color = Colors.white,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.45),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white12, width: 0.8),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              shadows: [
                Shadow(
                  color: Colors.black87,
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
