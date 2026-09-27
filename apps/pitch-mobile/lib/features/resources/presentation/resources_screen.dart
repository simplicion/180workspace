import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/pitch_theme.dart';
import '../models/resource_model.dart';
import 'widgets/submit_resource_sheet.dart';

class ResourcesScreen extends StatefulWidget {
  const ResourcesScreen({super.key});

  @override
  State<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends State<ResourcesScreen> {
  final List<PitchResource> _resources = [];
  bool _loading = true;
  String _selectedCategory = 'all';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  final List<String> _categories = [
    'all',
    'dev_tools',
    'ai',
    'funding',
    'growth',
    'legal',
    'design',
  ];

  @override
  void initState() {
    super.initState();
    _fetchResources();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<PitchResource> _getDefaultResources() {
    return [
      PitchResource(
        id: 'res_1',
        title: 'PostHog Product OS',
        description:
            'Open-source product analytics, session replay, feature flags, and A/B testing suite built for modern engineering teams.',
        url: 'https://posthog.com',
        category: 'dev_tools',
        tags: ['#Analytics', '#SessionReplay', '#OpenSource'],
        pricing: 'Freemium',
        submittedBy: 'Alex Rivers',
        upvotes: 412,
        isUpvoted: true,
      ),
      PitchResource(
        id: 'res_2',
        title: 'Y Combinator Standard SAFE Financing Documents',
        description:
            'Official post-money and pre-money Simple Agreement for Future Equity templates used across 90%+ of seed fundings.',
        url: 'https://www.ycombinator.com/documents',
        category: 'funding',
        tags: ['#Legal', '#SeedRound', '#SAFE', '#Fundraising'],
        pricing: 'Free',
        submittedBy: '180 Network',
        upvotes: 685,
        isUpvoted: false,
      ),
      PitchResource(
        id: 'res_3',
        title: 'v0.dev by Vercel',
        description:
            'Generative AI system that turns natural language prompts and screenshots into production-ready React/Tailwind UI components.',
        url: 'https://v0.dev',
        category: 'ai',
        tags: ['#GenAI', '#Frontend', '#Prototyping'],
        pricing: 'Freemium',
        submittedBy: 'Sarah Chen',
        upvotes: 530,
        isUpvoted: true,
      ),
      PitchResource(
        id: 'res_4',
        title: 'Clerk.dev Authentication & User Management',
        description:
            'Drop-in authentication and user session management with Passkeys, multi-tenant RBAC, and modern dark mode UI.',
        url: 'https://clerk.com',
        category: 'dev_tools',
        tags: ['#Auth', '#Passkeys', '#RBAC', '#Security'],
        pricing: 'Freemium',
        submittedBy: 'David Kumar',
        upvotes: 389,
        isUpvoted: false,
      ),
      PitchResource(
        id: 'res_5',
        title: 'OpenVC: Open Investor Directory',
        description:
            'Free global directory of 7,000+ angel investors and venture capital firms with direct verified submission emails.',
        url: 'https://openvc.app',
        category: 'funding',
        tags: ['#Investors', '#Angels', '#VC', '#Directory'],
        pricing: 'Free',
        submittedBy: '180 Network',
        upvotes: 490,
        isUpvoted: false,
      ),
      PitchResource(
        id: 'res_6',
        title: 'Plausible Analytics: Lightweight Privacy Web Metrics',
        description:
            'Cookieless, lightweight (<1KB) open-source Google Analytics alternative compliant with GDPR, CCPA and PECR.',
        url: 'https://plausible.io',
        category: 'growth',
        tags: ['#Privacy', '#Growth', '#OpenSource'],
        pricing: 'Paid',
        submittedBy: 'Marcus Vance',
        upvotes: 275,
        isUpvoted: false,
      ),
    ];
  }

  Future<void> _fetchResources({String? category}) async {
    setState(() => _loading = true);
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      ));
      final q = <String, dynamic>{'limit': 50};
      if (category != null && category != 'all') {
        q['category'] = category;
      }

      final res = await dio.get(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/resources',
        queryParameters: q,
      );
      if (res.data['success'] == true) {
        final list = (res.data['resources'] as List)
            .map((r) => PitchResource.fromJson(r))
            .toList();
        if (mounted) {
          setState(() {
            _resources.clear();
            if (list.isNotEmpty) {
              _resources.addAll(list);
            } else {
              _resources.addAll(_getDefaultResources());
            }
            _loading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _resources.clear();
            _resources.addAll(_getDefaultResources());
            _loading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _resources.clear();
          _resources.addAll(_getDefaultResources());
          _loading = false;
        });
      }
    }
  }

  Future<void> _upvoteResource(PitchResource res) async {
    setState(() {
      if (res.isUpvoted) {
        res.isUpvoted = false;
        res.upvotes = (res.upvotes - 1).clamp(0, 999999);
      } else {
        res.isUpvoted = true;
        res.upvotes++;
      }
    });

    try {
      final dio = Dio();
      await dio.post('${AppConfig.apiBaseUrl}/api/v1/pitch/resources/${res.id}/vote');
    } catch (_) {}
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _openSubmitSheet() {
    SubmitResourceSheet.show(
      context,
      onResourceSubmitted: (newRes) {
        setState(() => _resources.insert(0, newRes));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Tool "${newRes.title}" submitted to 180 Vault!'),
            backgroundColor: PitchTheme.surfaceElevated,
          ),
        );
      },
    );
  }

  List<PitchResource> get _filteredResources {
    return _resources.where((r) {
      final matchesQuery = _searchQuery.isEmpty ||
          r.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          r.description.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          r.tags.any((t) => t.toLowerCase().contains(_searchQuery.toLowerCase()));

      final matchesCategory = _selectedCategory == 'all' ||
          r.category.toLowerCase() == _selectedCategory.toLowerCase();

      return matchesQuery && matchesCategory;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredResources;

    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: PitchTheme.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: PitchTheme.primary.withValues(alpha: 0.5),
                  width: 0.8,
                ),
              ),
              child: const Text(
                'VAULT',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                  color: PitchTheme.primary,
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Startup Tools & Vault',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Submit Tool',
            icon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: PitchTheme.primaryGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.add_rounded, size: 18, color: Colors.white),
            ),
            onPressed: _openSubmitSheet,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 1. Search Box
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: PitchTheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x1A6366F1)),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Search tools, docs, frameworks...',
                hintStyle: TextStyle(color: PitchTheme.textSecondary, fontSize: 12),
                prefixIcon: const Icon(Icons.search_rounded,
                    color: PitchTheme.primary, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded,
                            color: PitchTheme.textSecondary, size: 16),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),

          // 2. Categories
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
                  label: Text(cat == 'all' ? 'All Tools' : '#${cat.toUpperCase()}'),
                  selected: isSelected,
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
                  onSelected: (selected) {
                    setState(() => _selectedCategory = selected ? cat : 'all');
                  },
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          // 3. Vault Items
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
                            const Icon(Icons.handyman_outlined,
                                size: 48, color: PitchTheme.textSecondary),
                            const SizedBox(height: 12),
                            const Text(
                              'No tools found',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 14),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: PitchTheme.primary,
                              ),
                              onPressed: _openSubmitSheet,
                              child: const Text('Submit a Startup Tool'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: PitchTheme.primary,
                        onRefresh: () =>
                            _fetchResources(category: _selectedCategory),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: list.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 12),
                          itemBuilder: (ctx, i) {
                            final res = list[i];
                            return _buildResourceCard(res);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildResourceCard(PitchResource res) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: PitchTheme.primary.withValues(alpha: 0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            res.title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: PitchTheme.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            res.pricing.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 9,
                              color: PitchTheme.primary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Curated by ${res.submittedBy}',
                      style: TextStyle(
                        fontSize: 11,
                        color: PitchTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              // Upvote Button
              GestureDetector(
                onTap: () => _upvoteResource(res),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: res.isUpvoted
                        ? PitchTheme.accentPink.withValues(alpha: 0.15)
                        : const Color(0xFF16182B),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: res.isUpvoted
                          ? PitchTheme.accentPink
                          : Colors.white12,
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        res.isUpvoted
                            ? Icons.local_fire_department_rounded
                            : Icons.local_fire_department_outlined,
                        color: res.isUpvoted
                            ? PitchTheme.accentPink
                            : PitchTheme.textSecondary,
                        size: 15,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${res.upvotes}',
                        style: TextStyle(
                          color: res.isUpvoted
                              ? PitchTheme.accentPink
                              : Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          Text(
            res.description,
            style: TextStyle(
              fontSize: 12.5,
              color: Colors.white.withValues(alpha: 0.8),
              height: 1.35,
            ),
          ),

          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Wrap(
                spacing: 6,
                children: res.tags.take(3).map((t) {
                  return Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF141624),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      t,
                      style: const TextStyle(
                        fontSize: 10,
                        color: PitchTheme.accentAmber,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  );
                }).toList(),
              ),

              // Visit Website Link
              TextButton.icon(
                style: TextButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => _openUrl(res.url),
                icon: const Icon(Icons.open_in_new_rounded,
                    size: 13, color: PitchTheme.primary),
                label: const Text(
                  'Visit Tool',
                  style: TextStyle(
                    color: PitchTheme.primary,
                    fontWeight: FontWeight.w700,
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
