import 'package:flutter/material.dart';
import '../../../core/theme/pitch_theme.dart';
import '../models/explore_item.dart';
import '../widgets/search_header.dart';
import '../widgets/founder_spotlight_card.dart';
import '../widgets/discovery_video_grid.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedCategory = 'all';

  final List<String> _categories = [
    'all',
    'AI & ML',
    'B2B SaaS',
    'Fintech',
    'ClimateTech',
    'DevTools',
    'HealthTech',
    'Creator Tech',
  ];

  final List<FounderSpotlight> _spotlights = const [
    FounderSpotlight(
      id: 'f_1',
      name: 'Sarah Chen',
      username: 'sarahchen',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      startupName: 'Synthetix AI',
      startupTagline: 'Autonomous AI agents for enterprise compliance and contract audits in 60s.',
      pitchTitle: 'Replacing \$50k Legal Audits With 1-Click Autonomous AI Verification',
      pitchThumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      pitchDuration: 176.0,
      upvotes: 420,
      isVerified: true,
      category: 'AI & ML',
    ),
    FounderSpotlight(
      id: 'f_2',
      name: 'David Kumar',
      username: 'davidk',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      startupName: 'VaultZero',
      startupTagline: 'Hardware-grade multi-party zero-knowledge vault for cross-border payroll.',
      pitchTitle: 'Next-Gen Global Contractor Payroll with Instant Sub-Penny Settlement',
      pitchThumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
      pitchDuration: 180.0,
      upvotes: 388,
      isVerified: true,
      category: 'Fintech',
    ),
    FounderSpotlight(
      id: 'f_3',
      name: 'Elena Rostova',
      username: 'elena_bio',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      startupName: 'NeuroPulse',
      startupTagline: 'Non-invasive neural biomarkers for early Alzheimer detection via webcam micro-saccades.',
      pitchTitle: 'Detecting Neurodegenerative Decline 5 Years Earlier in 180 Seconds',
      pitchThumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      pitchDuration: 179.0,
      upvotes: 512,
      isVerified: true,
      category: 'HealthTech',
    ),
  ];

  final List<ExplorePitchItem> _allPitches = [
    ExplorePitchItem(
      id: 'exp_1',
      title: 'Synthetix AI: Autonomous Contract Auditing in 60s',
      description: 'Watch how our multi-agent framework audits 200-page master service agreements in seconds.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      durationSeconds: 176.0,
      viewsCount: 3840,
      upvotesCount: 420,
      authorName: 'Sarah Chen',
      authorUsername: 'sarahchen',
      authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      category: 'AI & ML',
      tags: ['#GenAI', '#LegalTech', '#Enterprise'],
      createdAt: DateTime.now().subtract(const Duration(hours: 12)),
    ),
    ExplorePitchItem(
      id: 'exp_2',
      title: 'VaultZero: Instant Cross-Border Payroll Settlement',
      description: 'Eliminating correspondent banking wire delays with instant multi-party cryptographic locks.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      durationSeconds: 180.0,
      viewsCount: 2910,
      upvotesCount: 388,
      authorName: 'David Kumar',
      authorUsername: 'davidk',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      category: 'Fintech',
      tags: ['#Fintech', '#Payroll', '#ZK'],
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    ExplorePitchItem(
      id: 'exp_3',
      title: 'NeuroPulse: Saccade Biomarkers for Early Detection',
      description: 'Using standard camera frame rates to measure pupil dynamics for early neurodegenerative detection.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      durationSeconds: 179.0,
      viewsCount: 5200,
      upvotesCount: 512,
      authorName: 'Elena Rostova',
      authorUsername: 'elena_bio',
      authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      category: 'HealthTech',
      tags: ['#HealthTech', '#Biotech', '#AI'],
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
    ),
    ExplorePitchItem(
      id: 'exp_4',
      title: 'KubePulse: Real-time Kubernetes Cost Optimization',
      description: 'Dynamically bin-packs cluster nodes down to zero during idle intervals, saving 65% AWS bills.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      durationSeconds: 165.0,
      viewsCount: 1980,
      upvotesCount: 245,
      authorName: 'Marcus Vance',
      authorUsername: 'marcus_dev',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      category: 'DevTools',
      tags: ['#DevOps', '#Kubernetes', '#Cloud'],
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
    ExplorePitchItem(
      id: 'exp_5',
      title: 'TerraCapture: Direct Air Carbon Mineralization',
      description: 'Scaling industrial olivine weathering to permanently turn atmospheric CO2 into solid carbonate rocks.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      durationSeconds: 180.0,
      viewsCount: 4120,
      upvotesCount: 470,
      authorName: 'Dr. Clara Lindqvist',
      authorUsername: 'clara_climate',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      category: 'ClimateTech',
      tags: ['#ClimateTech', '#CarbonRemoval', '#Hardware'],
      createdAt: DateTime.now().subtract(const Duration(days: 4)),
    ),
    ExplorePitchItem(
      id: 'exp_6',
      title: 'Simplicion Work Graph: The Universal Work Mesh',
      description: 'Pioneering unified identity, private vaults, and real-time sovereign collaboration for enterprise.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      durationSeconds: 178.0,
      viewsCount: 8900,
      upvotesCount: 890,
      authorName: 'Alex Rivers',
      authorUsername: 'alexrivers',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      category: 'B2B SaaS',
      tags: ['#180workspace', '#WorkGraph', '#SaaS'],
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<ExplorePitchItem> get _filteredPitches {
    return _allPitches.where((item) {
      final matchesQuery = _searchQuery.isEmpty ||
          item.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          item.authorName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          item.authorUsername.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          item.tags.any((t) => t.toLowerCase().contains(_searchQuery.toLowerCase()));

      final matchesCategory = _selectedCategory == 'all' ||
          item.category.toLowerCase() == _selectedCategory.toLowerCase();

      return matchesQuery && matchesCategory;
    }).toList();
  }

  void _onPitchTapped(ExplorePitchItem item) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Playing 180s pitch: "${item.title}"'),
        backgroundColor: PitchTheme.surface,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredPitches;

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
              child: const Text('EXPLORE',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.0,
                      color: Colors.white)),
            ),
            const SizedBox(width: 8),
            const Text(
              'Founders & Pitches',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Search Bar
            SearchHeader(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
              onClear: () {
                _searchController.clear();
                setState(() => _searchQuery = '');
              },
            ),

            // 2. Category Filter Chips
            SizedBox(
              height: 42,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (ctx, i) {
                  final cat = _categories[i];
                  final isSelected = cat.toLowerCase() == _selectedCategory.toLowerCase();
                  return ChoiceChip(
                    label: Text(cat == 'all' ? 'All Startups' : cat),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() => _selectedCategory = selected ? cat : 'all');
                    },
                    selectedColor: PitchTheme.primary,
                    backgroundColor: PitchTheme.surface,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : PitchTheme.textSecondary,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      fontSize: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(
                        color: isSelected ? PitchTheme.primary : const Color(0x22FFFFFF),
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 18),

            // 3. Founder Spotlight (shown when not searching)
            if (_searchQuery.isEmpty) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.workspace_premium_rounded,
                            color: PitchTheme.accentAmber, size: 20),
                        SizedBox(width: 6),
                        Text(
                          'Founder Spotlight',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'Curated 180s',
                      style: TextStyle(
                        fontSize: 12,
                        color: PitchTheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 240,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: _spotlights.length,
                  itemBuilder: (ctx, i) {
                    final f = _spotlights[i];
                    return FounderSpotlightCard(
                      founder: f,
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Opening ${f.name}\'s profile & pitch'),
                            backgroundColor: PitchTheme.surface,
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),
            ],

            // 4. Discovery Grid Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _searchQuery.isNotEmpty
                        ? 'Search Results (${filtered.length})'
                        : 'Trending Pitches',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    'Max 180s',
                    style: TextStyle(
                      fontSize: 11,
                      color: PitchTheme.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // 5. Grid
            DiscoveryVideoGrid(
              items: filtered,
              onPitchSelected: _onPitchTapped,
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
