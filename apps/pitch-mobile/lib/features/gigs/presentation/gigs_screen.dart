import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/local_user_profile.dart';
import '../models/gig_model.dart';
import 'widgets/one_tap_apply_modal.dart';
import 'widgets/post_gig_sheet.dart';

class GigsScreen extends ConsumerStatefulWidget {
  const GigsScreen({super.key});

  @override
  ConsumerState<GigsScreen> createState() => _GigsScreenState();
}

class _GigsScreenState extends ConsumerState<GigsScreen> {
  final List<PitchGig> _allOpportunities = [];
  bool _loading = true;
  String _selectedType = 'all'; // 'all', 'gig', 'job'
  String _selectedCategory = 'all';

  final List<String> _categories = [
    'all',
    'tech',
    'design',
    'marketing',
    'finance',
    'ai',
  ];

  @override
  void initState() {
    super.initState();
    _fetchGigs();
  }

  List<PitchGig> _getDefaultOpportunities() {
    return [
      PitchGig(
        id: 'gig_demo_1',
        title: 'Build Flutter Audio Waveform Visualizer for 180s Pitch Reels',
        description:
            'Need an expert Flutter developer to build a high-performance 60fps real-time audio waveform painter for our 180s reel recording studio.',
        category: 'tech',
        opportunityType: 'gig',
        companyName: 'Pitch in 180',
        budget: 2500.0,
        currency: 'USD',
        location: 'Remote',
        isRemote: true,
        userName: 'Alex Rivers',
        userPhoto:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        tags: ['#Flutter', '#CustomPainter', '#Audio', '#HighBounty'],
        applicantsCount: 7,
        createdAt: DateTime.now().subtract(const Duration(hours: 4)),
      ),
      PitchGig(
        id: 'gig_demo_2',
        title: 'Founding Distributed Systems Engineer (Go / Rust)',
        description:
            'Lead the architecture of our sovereign Work Graph syncing engine, handling multi-tenant enterprise encryption and offline-first CRDTs.',
        category: 'tech',
        opportunityType: 'job',
        companyName: 'Simplicion Inc.',
        salaryMin: 160000.0,
        salaryMax: 210000.0,
        equity: '1.0% - 2.5%',
        seniority: 'Lead / Staff',
        currency: 'USD',
        location: 'Remote (US/EU) or San Francisco',
        isRemote: true,
        userName: 'Alex Rivers',
        userPhoto:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        tags: ['#Go', '#Rust', '#DistributedSystems', '#CRDT', '#FoundingTeam'],
        applicantsCount: 14,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
      PitchGig(
        id: 'gig_demo_3',
        title: 'Synthetix AI: Product Designer for Multi-Agent Workflows',
        description:
            'Design Figma micro-interactions and dark neon design systems for autonomous agent workflows and automated compliance audits.',
        category: 'design',
        opportunityType: 'gig',
        companyName: 'Synthetix AI',
        budget: 3500.0,
        currency: 'USD',
        location: 'Remote',
        isRemote: true,
        userName: 'Sarah Chen',
        userPhoto:
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        tags: ['#Figma', '#UIDesign', '#DesignSystem', '#AI'],
        applicantsCount: 11,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
      PitchGig(
        id: 'gig_demo_4',
        title: 'Founding Growth Lead & Developer Evangelist',
        description:
            'Drive dev community adoption across YC founders and GitHub open-source ecosystems. Run virtual demo days and founder hackathons.',
        category: 'marketing',
        opportunityType: 'job',
        companyName: 'VaultZero',
        salaryMin: 130000.0,
        salaryMax: 175000.0,
        equity: '0.75% - 1.8%',
        seniority: 'Director / Lead',
        currency: 'USD',
        location: 'New York, NY or Remote',
        isRemote: true,
        userName: 'David Kumar',
        userPhoto:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        tags: ['#Growth', '#DevRel', '#Fintech', '#Community'],
        applicantsCount: 9,
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
      ),
    ];
  }

  Future<void> _fetchGigs({String? category}) async {
    setState(() => _loading = true);
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      ));
      final q = <String, dynamic>{'limit': 30};
      if (category != null && category != 'all') {
        q['category'] = category;
      }

      final res = await dio.get(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/gigs',
        queryParameters: q,
      );
      if (res.data['success'] == true) {
        final list = (res.data['gigs'] as List)
            .map((g) => PitchGig.fromJson(g))
            .toList();
        if (mounted) {
          setState(() {
            _allOpportunities.clear();
            if (list.isNotEmpty) {
              _allOpportunities.addAll(list);
            } else {
              _allOpportunities.addAll(_getDefaultOpportunities());
            }
            _loading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _allOpportunities.clear();
            _allOpportunities.addAll(_getDefaultOpportunities());
            _loading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _allOpportunities.clear();
          _allOpportunities.addAll(_getDefaultOpportunities());
          _loading = false;
        });
      }
    }
  }

  List<PitchGig> get _filteredOpportunities {
    final userAppliedIds = ref.watch(localUserProfileProvider).appliedGigIds;

    return _allOpportunities.where((item) {
      final matchesCategory = _selectedCategory == 'all' ||
          item.category.toLowerCase() == _selectedCategory.toLowerCase();
      final matchesType = _selectedType == 'all' ||
          item.opportunityType.toLowerCase() == _selectedType.toLowerCase();

      // Sync applied status with user profile
      if (userAppliedIds.contains(item.id)) {
        item.isApplied = true;
      }

      return matchesCategory && matchesType;
    }).toList();
  }

  void _onApplyTapped(PitchGig gig) {
    OneTapApplyModal.show(
      context,
      gig: gig,
      onApplicationSubmitted: () {
        setState(() {
          gig.isApplied = true;
        });
      },
    );
  }

  void _openPostGigSheet() {
    PostGigSheet.show(
      context,
      onGigPosted: (newGig) {
        setState(() {
          _allOpportunities.insert(0, newGig);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Opportunity "${newGig.title}" posted successfully!'),
            backgroundColor: PitchTheme.surfaceElevated,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredOpportunities;

    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: PitchTheme.accentAmber.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: PitchTheme.accentAmber.withValues(alpha: 0.5),
                  width: 0.8,
                ),
              ),
              child: const Text(
                'OPPORTUNITIES',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                  color: PitchTheme.accentAmber,
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Gigs & Startup Jobs',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Post Opportunity',
            icon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: PitchTheme.primaryGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.add_rounded, size: 18, color: Colors.white),
            ),
            onPressed: _openPostGigSheet,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 1. Type Switcher: All | Freelance Gigs | Full-Time Roles
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: PitchTheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x1A6366F1)),
            ),
            child: Row(
              children: [
                _buildSegmentTab('All', 'all'),
                _buildSegmentTab('Freelance Gigs', 'gig'),
                _buildSegmentTab('Full-Time Roles', 'job'),
              ],
            ),
          ),

          // 2. Category Filter Chips
          SizedBox(
            height: 38,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final cat = _categories[i];
                final isSelected = cat == _selectedCategory;
                return ChoiceChip(
                  label: Text(cat == 'all' ? 'All Skills' : '#${cat.toUpperCase()}'),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() => _selectedCategory = selected ? cat : 'all');
                  },
                  selectedColor: PitchTheme.primary,
                  backgroundColor: PitchTheme.surface,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : PitchTheme.textSecondary,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    fontSize: 11,
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

          const SizedBox(height: 8),

          // 3. Opportunities List
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: PitchTheme.primary),
                  )
                : list.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.work_off_rounded,
                                size: 48, color: PitchTheme.textSecondary),
                            const SizedBox(height: 12),
                            const Text(
                              'No opportunities in this category',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: PitchTheme.primary,
                              ),
                              onPressed: _openPostGigSheet,
                              child: const Text('Post the First Opportunity'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: PitchTheme.primary,
                        onRefresh: () => _fetchGigs(category: _selectedCategory),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: list.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 14),
                          itemBuilder: (ctx, i) {
                            final gig = list[i];
                            return _buildGigCard(gig);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentTab(String title, String type) {
    final isSelected = _selectedType == type;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedType = type),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? PitchTheme.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? Colors.white : PitchTheme.textSecondary,
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGigCard(PitchGig gig) {
    final isGig = gig.opportunityType == 'gig';

    return Container(
      decoration: BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: PitchTheme.primary.withValues(alpha: 0.22),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Type Badge + Location/Remote Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isGig
                      ? PitchTheme.accentAmber.withValues(alpha: 0.15)
                      : PitchTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isGig
                        ? PitchTheme.accentAmber.withValues(alpha: 0.4)
                        : PitchTheme.primary.withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isGig
                          ? Icons.flash_on_rounded
                          : Icons.business_center_rounded,
                      size: 13,
                      color: isGig
                          ? PitchTheme.accentAmber
                          : PitchTheme.primary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isGig ? 'FREELANCE BOUNTY' : 'FULL-TIME ROLE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                        color: isGig
                            ? PitchTheme.accentAmber
                            : PitchTheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF16182B),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.public_rounded,
                        size: 12, color: PitchTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      gig.location,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Colors.white70,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Title
          Text(
            gig.title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 4),

          // Company & Poster Row
          Row(
            children: [
              CircleAvatar(
                radius: 10,
                backgroundImage: gig.userPhoto != null
                    ? NetworkImage(gig.userPhoto!)
                    : null,
                child: gig.userPhoto == null
                    ? const Icon(Icons.person, size: 12)
                    : null,
              ),
              const SizedBox(width: 6),
              Text(
                '${gig.companyName} • Posted by ${gig.userName}',
                style: TextStyle(
                  fontSize: 12,
                  color: PitchTheme.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Description
          Text(
            gig.description,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12.5,
              color: Colors.white.withValues(alpha: 0.8),
              height: 1.35,
            ),
          ),

          const SizedBox(height: 12),

          // Tags
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: gig.tags.map((t) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF181A2D),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  t,
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: PitchTheme.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: Color(0x1AFFFFFF)),
          const SizedBox(height: 12),

          // Compensation & Action Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Compensation text
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isGig ? 'Bounty / Payout' : 'Salary + Equity',
                    style: TextStyle(
                      fontSize: 10.5,
                      color: PitchTheme.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  if (isGig)
                    Text(
                      gig.budget != null
                          ? '\$${gig.budget!.toInt()} ${gig.currency}'
                          : 'Negotiable',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: PitchTheme.accentEmerald,
                      ),
                    )
                  else
                    Row(
                      children: [
                        Text(
                          '\$${((gig.salaryMin ?? 130000) / 1000).toInt()}k-\$${((gig.salaryMax ?? 180000) / 1000).toInt()}k',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: PitchTheme.accentEmerald,
                          ),
                        ),
                        if (gig.equity != null) ...[
                          const SizedBox(width: 4),
                          Text(
                            '• ${gig.equity}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: PitchTheme.accentAmber,
                            ),
                          ),
                        ],
                      ],
                    ),
                ],
              ),

              // 1-Tap Apply Action
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: gig.isApplied
                      ? PitchTheme.accentEmerald.withValues(alpha: 0.2)
                      : PitchTheme.primary,
                  foregroundColor:
                      gig.isApplied ? PitchTheme.accentEmerald : Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: gig.isApplied
                          ? PitchTheme.accentEmerald
                          : Colors.transparent,
                    ),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
                onPressed:
                    gig.isApplied ? null : () => _onApplyTapped(gig),
                icon: Icon(
                  gig.isApplied
                      ? Icons.check_circle_rounded
                      : Icons.video_call_rounded,
                  size: 16,
                ),
                label: Text(
                  gig.isApplied ? 'Pitch Sent' : '1-Tap Pitch Apply',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
