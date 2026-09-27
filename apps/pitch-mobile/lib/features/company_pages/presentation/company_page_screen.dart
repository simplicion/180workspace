import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/pitch_theme.dart';
import '../models/company_page_model.dart';

class CompanyPageScreen extends StatefulWidget {
  final CompanyPageModel? company;

  const CompanyPageScreen({super.key, this.company});

  @override
  State<CompanyPageScreen> createState() => _CompanyPageScreenState();
}

class _CompanyPageScreenState extends State<CompanyPageScreen>
    with SingleTickerProviderStateMixin {
  late final CompanyPageModel _company;
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _company = widget.company ?? CompanyPageModel.simplicion();
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

  void _toggleFollow() {
    setState(() {
      _company.isFollowing = !_company.isFollowing;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_company.isFollowing
            ? 'Following ${_company.name}!'
            : 'Unfollowed ${_company.name}'),
        backgroundColor: PitchTheme.surfaceElevated,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PitchTheme.background,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              backgroundColor: PitchTheme.surface,
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(
                      _company.bannerUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          Container(color: const Color(0xFF191B2E)),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Colors.black.withValues(alpha: 0.3),
                            PitchTheme.background,
                          ],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Logo & Actions Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: PitchTheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                                color: PitchTheme.primary.withValues(alpha: 0.5),
                                width: 2),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Image.network(
                            _company.logoUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Center(
                              child: Icon(Icons.business_rounded,
                                  color: PitchTheme.primary, size: 32),
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                side: BorderSide(
                                  color: _company.isFollowing
                                      ? PitchTheme.accentEmerald
                                      : PitchTheme.primary,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: _toggleFollow,
                              icon: Icon(
                                _company.isFollowing
                                    ? Icons.check_rounded
                                    : Icons.add_rounded,
                                size: 16,
                                color: _company.isFollowing
                                    ? PitchTheme.accentEmerald
                                    : PitchTheme.primary,
                              ),
                              label: Text(
                                _company.isFollowing ? 'Following' : 'Follow',
                                style: TextStyle(
                                  color: _company.isFollowing
                                      ? PitchTheme.accentEmerald
                                      : Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: PitchTheme.primary,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                        'Connecting with ${_company.name} founders...'),
                                    backgroundColor: PitchTheme.surfaceElevated,
                                  ),
                                );
                              },
                              child: const Text(
                                'Connect',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Company Name & Stage
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            _company.name,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: PitchTheme.accentAmber.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                                color: PitchTheme.accentAmber
                                    .withValues(alpha: 0.5)),
                          ),
                          child: Text(
                            _company.stage.toUpperCase(),
                            style: const TextStyle(
                              color: PitchTheme.accentAmber,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 4),

                    // Tagline
                    Text(
                      _company.tagline,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.9),
                        height: 1.3,
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Quick metadata chips
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _buildMetaChip(
                            Icons.location_on_outlined, _company.location),
                        _buildMetaChip(Icons.calendar_today_outlined,
                            'Founded ${_company.foundedYear}'),
                        _buildMetaChip(
                            Icons.people_outline_rounded, _company.teamSize),
                        _buildMetaChip(Icons.language_rounded,
                            _company.websiteUrl, onTap: () => _openUrl(_company.websiteUrl)),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Pinned Company Pitch Deck Video
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1F223D), Color(0xFF141628)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: PitchTheme.primary.withValues(alpha: 0.35),
                          width: 1.2,
                        ),
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Image.network(
                                  _company.pitchThumbnail,
                                  width: 60,
                                  height: 60,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 60,
                                    height: 60,
                                    color: const Color(0xFF22253A),
                                  ),
                                ),
                                Container(
                                  width: 60,
                                  height: 60,
                                  color: Colors.black.withValues(alpha: 0.3),
                                ),
                                const Icon(Icons.play_circle_fill_rounded,
                                    color: Colors.white, size: 28),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text(
                                      'COMPANY PITCH DECK',
                                      style: TextStyle(
                                        color: PitchTheme.accentAmber,
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w900,
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
                                      child: Text(
                                        '${_company.pitchDuration.toInt()}s',
                                        style: const TextStyle(
                                          color: PitchTheme.accentAmber,
                                          fontSize: 9,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  _company.pitchTitle,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
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
              delegate: _CompanyTabBarDelegate(
                TabBar(
                  controller: _tabController,
                  indicatorColor: PitchTheme.primary,
                  indicatorWeight: 3,
                  labelColor: Colors.white,
                  unselectedLabelColor: PitchTheme.textSecondary,
                  labelStyle: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 13),
                  tabs: const [
                    Tab(text: 'Vision & Thesis'),
                    Tab(text: 'Products'),
                    Tab(text: 'Team'),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildVisionTab(),
            _buildProductsTab(),
            _buildTeamTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildMetaChip(IconData icon, String text, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: PitchTheme.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0x18FFFFFF)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: PitchTheme.textSecondary),
            const SizedBox(width: 4),
            Text(
              text,
              style: TextStyle(
                color: onTap != null ? PitchTheme.primary : PitchTheme.textSecondary,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVisionTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      children: [
        _buildSectionCard(
          title: 'The Problem We Solve',
          content: _company.problem,
          icon: Icons.error_outline_rounded,
          color: PitchTheme.accentPink,
        ),
        const SizedBox(height: 12),
        _buildSectionCard(
          title: 'Our Solution',
          content: _company.solution,
          icon: Icons.lightbulb_outline_rounded,
          color: PitchTheme.accentAmber,
        ),
        const SizedBox(height: 12),
        _buildSectionCard(
          title: 'Long-Term Vision',
          content: _company.vision,
          icon: Icons.rocket_launch_outlined,
          color: PitchTheme.accentEmerald,
        ),
      ],
    );
  }

  Widget _buildSectionCard({
    required String title,
    required String content,
    required IconData icon,
    required Color color,
  }) {
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
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 13.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.8),
              fontSize: 12.5,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductsTab() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      itemCount: _company.products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) {
        final prod = _company.products[i];
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
                  Text(
                    prod.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5,
                    ),
                  ),
                  if (prod.metric != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: PitchTheme.accentEmerald.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        prod.metric!,
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
                prod.description,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.8),
                  fontSize: 12,
                  height: 1.35,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTeamTab() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      itemCount: _company.team.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, i) {
        final m = _company.team[i];
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: PitchTheme.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x1A6366F1)),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundImage: NetworkImage(m.avatarUrl),
                onBackgroundImageError: (_, __) {},
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      m.role,
                      style: TextStyle(
                        color: PitchTheme.textSecondary,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0x22FFFFFF)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: Size.zero,
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Connected with ${m.name}!'),
                      backgroundColor: PitchTheme.surfaceElevated,
                    ),
                  );
                },
                child: const Text('Connect',
                    style: TextStyle(fontSize: 11, color: Colors.white)),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CompanyTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _CompanyTabBarDelegate(this.tabBar);

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
  bool shouldRebuild(_CompanyTabBarDelegate oldDelegate) {
    return false;
  }
}
