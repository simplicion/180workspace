import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/pitch_theme.dart';
import '../models/resource_model.dart';

class ResourcesScreen extends StatefulWidget {
  const ResourcesScreen({super.key});

  @override
  State<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends State<ResourcesScreen> {
  final List<PitchResource> _resources = [];
  bool _loading = true;
  String _selectedCategory = 'all';

  final List<String> _categories = [
    'all',
    'ai',
    'dev_tools',
    'funding',
    'marketing',
    'design',
  ];

  @override
  void initState() {
    super.initState();
    _fetchResources();
  }

  Future<void> _fetchResources({String? category}) async {
    setState(() => _loading = true);
    try {
      final dio = Dio();
      final q = <String, dynamic>{'limit': 50};
      if (category != null && category != 'all') {
        q['category'] = category;
      }

      final res = await dio.get('${AppConfig.apiBaseUrl}/api/v1/pitch/resources', queryParameters: q);
      if (res.data['success'] == true) {
        final list = (res.data['resources'] as List)
            .map((r) => PitchResource.fromJson(r))
            .toList();
        if (mounted) {
          setState(() {
            _resources.clear();
            _resources.addAll(list);
            _loading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _upvoteResource(PitchResource res) async {
    setState(() => res.upvotes++);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: const Text('Startup Tools & Vault', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: SizedBox(
            height: 40,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final cat = _categories[i];
                final isSelected = cat == _selectedCategory;
                return ChoiceChip(
                  label: Text('#${cat.toUpperCase()}'),
                  selected: isSelected,
                  selectedColor: PitchTheme.primary,
                  backgroundColor: PitchTheme.surface,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : PitchTheme.textSecondary,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    fontSize: 11,
                  ),
                  onSelected: (val) {
                    if (val) {
                      setState(() => _selectedCategory = cat);
                      _fetchResources(category: cat);
                    }
                  },
                );
              },
            ),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: PitchTheme.primary))
          : _resources.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.handyman_outlined, size: 54, color: PitchTheme.textSecondary),
                      const SizedBox(height: 12),
                      const Text('No tools found in this category yet.', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text('Check back soon as founders submit top tools!', style: TextStyle(color: PitchTheme.textSecondary)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _resources.length,
                  itemBuilder: (ctx, i) {
                    final r = _resources[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      color: PitchTheme.surface,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: Color(0x1A6366F1)),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: InkWell(
                          onTap: () => _upvoteResource(r),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: PitchTheme.primary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.arrow_drop_up_rounded, color: PitchTheme.primary, size: 24),
                                Text(
                                  '${r.upvotes}',
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: Colors.white),
                                ),
                              ],
                            ),
                          ),
                        ),
                        title: Text(r.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            r.description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: PitchTheme.textSecondary, fontSize: 12),
                          ),
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.open_in_new_rounded, size: 18, color: PitchTheme.primary),
                          onPressed: () => _openUrl(r.url),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
