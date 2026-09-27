import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/auth/local_user_profile.dart';
import '../../company_pages/presentation/company_page_screen.dart';
import 'edit_profile_sheet.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _openEditProfile() {
    EditProfileSheet.show(context);
  }

  void _openCompanyPage() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const CompanyPageScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(localUserProfileProvider);
    final auth = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                gradient: PitchTheme.primaryGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                '180 PROFILE',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '@${profile.username}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'View Company Page',
            icon: const Icon(Icons.business_rounded,
                color: PitchTheme.accentAmber, size: 22),
            onPressed: _openCompanyPage,
          ),
          IconButton(
            tooltip: 'Edit Profile',
            icon: const Icon(Icons.edit_outlined,
                color: PitchTheme.primary, size: 22),
            onPressed: _openEditProfile,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: NestedScrollView(
        headerSliverBuilder: (ctx, innerBoxIsScrolled) {
          return [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),

                    // Header Avatar & Stats Row
                    Row(
                      children: [
                        Stack(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(3),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: PitchTheme.primaryGradient,
                              ),
                              child: CircleAvatar(
                                radius: 36,
                                backgroundImage: NetworkImage(profile.avatarUrl),
                                onBackgroundImageError: (_, __) {},
                              ),
                            ),
                            if (profile.isVerified)
                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: const BoxDecoration(
                                    color: PitchTheme.surface,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.verified_rounded,
                                    color: PitchTheme.primary,
                                    size: 20,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildStat('3', 'Pitches'),
                              _buildStat('${profile.upvotedPitchIds.length + 890}', 'Upvotes'),
                              _buildStat('2.4k', 'Views'),
                              _buildStat('420', 'Network'),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Name & Badge
                    Row(
                      children: [
                        Text(
                          profile.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2.5),
                          decoration: BoxDecoration(
                            color: PitchTheme.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                                color: PitchTheme.primary.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            profile.badge.toUpperCase(),
                            style: const TextStyle(
                              color: PitchTheme.primary,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 4),

                    // Headline
                    Text(
                      profile.headline,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        height: 1.3,
                      ),
                    ),

                    const SizedBox(height: 6),

                    // Bio
                    Text(
                      profile.bio,
                      style: TextStyle(
                        fontSize: 12,
                        color: PitchTheme.textSecondary,
                        height: 1.35,
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Location
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 14, color: PitchTheme.textSecondary),
                        const SizedBox(width: 4),
                        Text(
                          profile.location,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: PitchTheme.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Social Links Row
                    Row(
                      children: [
                        if (profile.websiteUrl.isNotEmpty)
                          _buildSocialChip(
                            icon: Icons.language_rounded,
                            label: 'Website',
                            onTap: () => _openUrl(profile.websiteUrl),
                          ),
                        if (profile.githubUrl.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          _buildSocialChip(
                            icon: Icons.code_rounded,
                            label: 'GitHub',
                            onTap: () => _openUrl(profile.githubUrl),
                          ),
                        ],
                        if (profile.twitterUrl.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          _buildSocialChip(
                            icon: Icons.alternate_email_rounded,
                            label: 'Twitter',
                            onTap: () => _openUrl(profile.twitterUrl),
                          ),
                        ],
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Pinned 180s Pitch Video Reel Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1E2038), Color(0xFF131422)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: PitchTheme.primary.withValues(alpha: 0.35),
                          width: 1.2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: PitchTheme.primary.withValues(alpha: 0.12),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Image.network(
                                  profile.pitchVideoThumbnail,
                                  width: 64,
                                  height: 64,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 64,
                                    height: 64,
                                    color: const Color(0xFF222538),
                                  ),
                                ),
                                Container(
                                  width: 64,
                                  height: 64,
                                  color: Colors.black.withValues(alpha: 0.3),
                                ),
                                const Icon(Icons.play_circle_fill_rounded,
                                    color: Colors.white, size: 28),
                              ],
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text(
                                      'PINNED 180s PITCH',
                                      style: TextStyle(
                                        color: PitchTheme.accentAmber,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 5, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: PitchTheme.accentAmber
                                            .withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        '178s',
                                        style: TextStyle(
                                          color: PitchTheme.accentAmber,
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Simplicion Work Graph: The Universal Work Mesh',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    height: 1.25,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.share_outlined,
                                color: PitchTheme.primary, size: 20),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Pinned pitch link copied to clipboard'),
                                  backgroundColor: PitchTheme.surfaceElevated,
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    // 180 Sovereign Identity Status Card
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF141624),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x226366F1)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.security_rounded,
                              color: PitchTheme.accentEmerald, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  '180 Sovereign Work Graph Ready',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  auth is Authenticated
                                      ? 'Connected to live 180 Identity Provider'
                                      : 'Local founder session active (OAuth 2.0 PKCE ready)',
                                  style: TextStyle(
                                    color: PitchTheme.textSecondary,
                                    fontSize: 10.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverAppBarDelegate(
                TabBar(
                  controller: _tabController,
                  indicatorColor: PitchTheme.primary,
                  indicatorWeight: 3,
                  labelColor: Colors.white,
                  unselectedLabelColor: PitchTheme.textSecondary,
                  labelStyle: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 13),
                  tabs: const [
                    Tab(text: 'Pitches'),
                    Tab(text: 'Skills Matrix'),
                    Tab(text: 'Work Graph'),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildPitchesTab(),
            _buildSkillsTab(profile.skills),
            _buildWorkGraphTab(profile.portfolioProjects),
          ],
        ),
      ),
    );
  }

  Widget _buildStat(String value, String label) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: PitchTheme.textSecondary,
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget _buildSocialChip({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: PitchTheme.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0x22FFFFFF)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: PitchTheme.primary),
            const SizedBox(width: 5),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPitchesTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      children: [
        _buildPitchItem(
          title: 'Simplicion Work Graph: The Universal Work Mesh',
          duration: '178s',
          upvotes: '890',
          views: '8.9k',
          date: '3 days ago',
          category: 'B2B SaaS',
        ),
        const SizedBox(height: 12),
        _buildPitchItem(
          title: 'Pitch in 180: The 180s Elevator Pitch Network',
          duration: '180s',
          upvotes: '640',
          views: '6.1k',
          date: '2 weeks ago',
          category: 'Creator Tech',
        ),
      ],
    );
  }

  Widget _buildPitchItem({
    required String title,
    required String duration,
    required String upvotes,
    required String views,
    required String date,
    required String category,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1A6366F1)),
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: PitchTheme.primary.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.play_circle_fill_rounded,
                color: PitchTheme.primary, size: 30),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: PitchTheme.accentAmber.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        duration,
                        style: const TextStyle(
                          color: PitchTheme.accentAmber,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Text(
                      date,
                      style: TextStyle(
                        color: PitchTheme.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.local_fire_department_rounded,
                        color: PitchTheme.accentPink, size: 13),
                    const SizedBox(width: 2),
                    Text(
                      upvotes,
                      style: const TextStyle(
                        color: PitchTheme.accentPink,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Icon(Icons.visibility_rounded,
                        color: Colors.white60, size: 13),
                    const SizedBox(width: 3),
                    Text(
                      views,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkillsTab(List<String> skills) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Founder & Engineering Competencies',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: skills.map((s) {
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: PitchTheme.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: PitchTheme.primary.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle_outline_rounded,
                        color: PitchTheme.primary, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      s,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkGraphTab(List<PortfolioProject> projects) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      itemCount: projects.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) {
        final p = projects[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: PitchTheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0x1A6366F1)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      p.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                      ),
                    ),
                  ),
                  if (p.metric != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: PitchTheme.accentEmerald.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        p.metric!,
                        style: const TextStyle(
                          color: PitchTheme.accentEmerald,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                p.description,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.8),
                  fontSize: 12,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: p.techStack.map((t) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF141624),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(
                      t,
                      style: TextStyle(
                        color: PitchTheme.textSecondary,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _SliverAppBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: PitchTheme.surface,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
