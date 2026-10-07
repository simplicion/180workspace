import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import 'instagram_providers.dart';

class InstagramCommandScreen extends ConsumerStatefulWidget {
  const InstagramCommandScreen({super.key});

  @override
  ConsumerState<InstagramCommandScreen> createState() => _InstagramCommandScreenState();
}

class _InstagramCommandScreenState extends ConsumerState<InstagramCommandScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Controllers for Hook & Reel
  final _hookController = TextEditingController(
    text: '\$18,000 is what one missing clause in our client contract cost us.',
  );
  final _reelIdeaController = TextEditingController(
    text: 'Why your first 30 reels are supposed to flop before anything works',
  );

  // Caption Controller
  final _captionController = TextEditingController(
    text: 'Nobody tells you that your first 30 reels are supposed to flop.\n\n'
        'We tested this across 12 creator accounts over six months.\n\n'
        'Comment the word PLAYBOOK and I will send over our complete hook swipe file.\n\n'
        '#creatoreconomy #socialmediatips #reelsviral #solopreneur',
  );

  // Profile Controllers
  final _handleController = TextEditingController(text: 'danaruiz.studio');
  final _nameFieldController = TextEditingController(text: 'Dana Ruiz | Proposal Templates');
  final _bioController = TextEditingController(
    text: 'Helping design studios close 5-figure projects without pitching\n'
        'Over \$2.4M in proposals generated for 340+ agency owners\n'
        'Free template below 👇',
  );

  // State maps
  Map<String, dynamic>? _hookResult;
  Map<String, dynamic>? _reelResult;
  Map<String, dynamic>? _captionResult;
  Map<String, dynamic>? _profileResult;
  Map<String, dynamic>? _humanizeResult;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _hookController.dispose();
    _reelIdeaController.dispose();
    _captionController.dispose();
    _handleController.dispose();
    _nameFieldController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _scoreHook() async {
    setState(() => _isLoading = true);
    try {
      final client = ref.read(instagramClientProvider);
      final res = await client.scoreHook(_hookController.text);
      setState(() => _hookResult = res['evaluation']);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error scoring hook: $e'), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _generateReel() async {
    setState(() => _isLoading = true);
    try {
      final client = ref.read(instagramClientProvider);
      final res = await client.generateReel(_reelIdeaController.text);
      setState(() => _reelResult = res);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error generating reel: $e'), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _lintCaption() async {
    setState(() => _isLoading = true);
    try {
      final client = ref.read(instagramClientProvider);
      final res = await client.lintCaption(
        _captionController.text,
        keywords: ['proposal', 'templates', 'reels'],
      );
      setState(() => _captionResult = res);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error linting caption: $e'), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _auditProfile() async {
    setState(() => _isLoading = true);
    try {
      final client = ref.read(instagramClientProvider);
      final res = await client.auditProfile({
        'handle': _handleController.text,
        'nameField': _nameFieldController.text,
        'bio': _bioController.text,
        'pinnedPostCount': 3,
        'linkCount': 1,
        'hasProfilePhoto': true,
        'photoIsFaceCloseUp': true,
        'highlights': ['Results', 'Pricing', 'How It Works', 'About Us'],
        'gridCoverHasText': true,
      });
      setState(() => _profileResult = res);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error auditing profile: $e'), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _humanizeCurrent() async {
    setState(() => _isLoading = true);
    try {
      final client = ref.read(instagramClientProvider);
      final res = await client.humanizeText(_captionController.text);
      setState(() => _humanizeResult = res);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error humanizing text: $e'), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF833AB4), Color(0xFFFD1D1D), Color(0xFFFCB045)],
                ),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'IG CREW',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
              ),
            ),
            const SizedBox(width: 8),
            const Text('Instagram Command Center'),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primary,
          indicatorWeight: 3,
          tabs: const [
            Tab(icon: Icon(Icons.video_library_rounded), text: 'Reels & Hooks'),
            Tab(icon: Icon(Icons.crop_16_9_rounded), text: 'Feed & Captions'),
            Tab(icon: Icon(Icons.person_pin_rounded), text: 'Profile Audit'),
            Tab(icon: Icon(Icons.security_rounded), text: 'AI Humanizer'),
            Tab(icon: Icon(Icons.radar_rounded), text: 'Triage & Viral'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildReelHookTab(),
          _buildFeedCaptionTab(),
          _buildProfileAuditTab(),
          _buildHumanizerTab(),
          _buildTriageRadarTab(),
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // TAB 1: REEL & HOOK STUDIO
  // -------------------------------------------------------------------------
  Widget _buildReelHookTab() {
    final eval = _hookResult;
    final reel = _reelResult;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            '1. HOOK SCORER (/ig-reel)',
            'Scores first 3 seconds on 5 local heuristics (Length, Concreteness, Stakes, Front-Load, Audience).',
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _hookController,
            maxLines: 2,
            decoration: InputDecoration(
              filled: true,
              fillColor: AppTheme.surface,
              hintText: 'Enter spoken hook line...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.border),
              ),
            ),
          ),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: _isLoading ? null : _scoreHook,
            icon: const Icon(Icons.speed_rounded),
            label: const Text('Score Hook (0-100)'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          if (eval != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.glassCardDecoration(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'HOOK SCORE: ${eval['totalScore']}/100',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: (eval['totalScore'] as num) >= 65
                              ? AppTheme.success
                              : AppTheme.warning,
                        ),
                      ),
                      Chip(
                        label: Text(eval['grade'] ?? 'SCORE'),
                        backgroundColor: (eval['totalScore'] as num) >= 65
                            ? AppTheme.success.withValues(alpha: 0.15)
                            : AppTheme.warning.withValues(alpha: 0.15),
                      ),
                    ],
                  ),
                  if (eval['dealbreaker'] != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline_rounded, color: AppTheme.error, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              eval['dealbreaker'],
                              style: TextStyle(color: AppTheme.error, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  if (eval['formulaName'] != null)
                    Text(
                      'Classified Formula: #${eval['formulaId']} ${eval['formulaName']}',
                      style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.accent),
                    ),
                  const Divider(height: 24),
                  _buildMetricRow('Delivery Length', eval['breakdown']?['lengthDetail'] ?? ''),
                  _buildMetricRow('Concreteness', eval['breakdown']?['concretenessDetail'] ?? ''),
                  _buildMetricRow('Stakes & Tension', eval['breakdown']?['stakesDetail'] ?? ''),
                  _buildMetricRow('Front-Load', eval['breakdown']?['frontLoadDetail'] ?? ''),
                  _buildMetricRow('Audience Address', eval['breakdown']?['audienceDetail'] ?? ''),
                ],
              ),
            ),
          ],
          const SizedBox(height: 28),
          _buildSectionHeader(
            '2. FULL REEL ENGINE & TIMED BEAT SHEET',
            'Generates spoken script + 165 WPM timed beats with loopback replay mechanic.',
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _reelIdeaController,
            maxLines: 2,
            decoration: InputDecoration(
              filled: true,
              fillColor: AppTheme.surface,
              hintText: 'Enter raw concept / lesson...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.border),
              ),
            ),
          ),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: _isLoading ? null : _generateReel,
            icon: const Icon(Icons.auto_awesome_rounded),
            label: const Text('Generate Timed Reel Script'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accent,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          if (reel != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.glassCardDecoration(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Spoken Script (165 WPM Paced):',
                      style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceElevated,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      reel['spokenScript'] ?? '',
                      style: const TextStyle(fontSize: 14, height: 1.5),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('On-Screen Cards (<=6 words):',
                      style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                  const SizedBox(height: 8),
                  ...?((reel['onScreenTextCards'] as List?)?.map((card) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                card['timecode'] ?? '',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primary),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                card['text'] ?? '',
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // TAB 2: FEED & CAPTION SIMULATOR
  // -------------------------------------------------------------------------
  Widget _buildFeedCaptionTab() {
    final lint = _captionResult;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            'FEED CUTOUT SIMULATOR (/ig-caption)',
            'Shows exact 125-character mobile feed cutoff before "... more" and enforces 5-hashtag cap.',
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _captionController,
            maxLines: 5,
            decoration: InputDecoration(
              filled: true,
              fillColor: AppTheme.surface,
              hintText: 'Paste or draft caption...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.border),
              ),
            ),
          ),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: _isLoading ? null : _lintCaption,
            icon: const Icon(Icons.fact_check_rounded),
            label: const Text('Simulate Feed & Run Linter'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          if (lint != null) ...[
            const SizedBox(height: 20),
            // Mobile Feed Simulation Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        radius: 14,
                        backgroundColor: Color(0xFFE1306C),
                        child: Icon(Icons.person, size: 16, color: Colors.white),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _handleController.text,
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      const Spacer(),
                      const Icon(Icons.more_horiz, color: Colors.white54),
                    ],
                  ),
                  const SizedBox(height: 12),
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: '${_handleController.text} ',
                          style: const TextStyle(
                              color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        TextSpan(
                          text: lint['feedCutout'] ?? '',
                          style: const TextStyle(color: Colors.white70, fontSize: 14),
                        ),
                        if (lint['isTruncated'] == true)
                          const TextSpan(
                            text: ' ... more',
                            style: TextStyle(color: Colors.white38, fontWeight: FontWeight.bold),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.glassCardDecoration(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Caption Score: ${lint['score']}/100',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: (lint['passed'] == true) ? AppTheme.success : AppTheme.error,
                        ),
                      ),
                      Chip(
                        label: Text(lint['passed'] == true ? 'PASS' : 'REWRITE NEEDED'),
                        backgroundColor: lint['passed'] == true
                            ? AppTheme.success.withValues(alpha: 0.15)
                            : AppTheme.error.withValues(alpha: 0.15),
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  Text('Diagnostic Checks:',
                      style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                  const SizedBox(height: 8),
                  ...?((lint['checks'] as List?)?.map((c) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              c['status'] == 'PASS'
                                  ? Icons.check_circle_rounded
                                  : c['status'] == 'WARN'
                                      ? Icons.warning_rounded
                                      : Icons.cancel_rounded,
                              size: 18,
                              color: c['status'] == 'PASS'
                                  ? AppTheme.success
                                  : c['status'] == 'WARN'
                                      ? AppTheme.warning
                                      : AppTheme.error,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${c['check']}: ${c['detail']}',
                                style: const TextStyle(fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // TAB 3: PROFILE 12-FACTOR AUDIT
  // -------------------------------------------------------------------------
  Widget _buildProfileAuditTab() {
    final audit = _profileResult;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            '12-FACTOR PROFILE AUDIT (/ig-profile)',
            'Audits Search-Indexed Name Field, Bio Line 1 transformation statement, and Pinned 3 slots.',
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _handleController,
            decoration: InputDecoration(
              labelText: 'Handle (@)',
              filled: true,
              fillColor: AppTheme.surface,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _nameFieldController,
            decoration: InputDecoration(
              labelText: 'Name Field (Max 30 chars, indexed for search)',
              filled: true,
              fillColor: AppTheme.surface,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _bioController,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: 'Bio (150 chars)',
              filled: true,
              fillColor: AppTheme.surface,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _isLoading ? null : _auditProfile,
            icon: const Icon(Icons.analytics_rounded),
            label: const Text('Run 12-Factor Profile Audit'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          if (audit != null) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.glassCardDecoration(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Audit Score: ${audit['totalScore']}/100',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: (audit['totalScore'] as num) >= 70
                              ? AppTheme.success
                              : AppTheme.warning,
                        ),
                      ),
                      Chip(
                        label: Text('Grade: ${audit['grade']}'),
                        backgroundColor: (audit['totalScore'] as num) >= 70
                            ? AppTheme.success.withValues(alpha: 0.15)
                            : AppTheme.warning.withValues(alpha: 0.15),
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  Text('Prioritized Action Plan:',
                      style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                  const SizedBox(height: 8),
                  ...?((audit['prioritizedActionPlan'] as List?)?.map((plan) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Text('• $plan', style: const TextStyle(fontSize: 13, height: 1.4)),
                      ))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // TAB 4: AI HUMANIZER & DETECTOR
  // -------------------------------------------------------------------------
  Widget _buildHumanizerTab() {
    final clean = _humanizeResult;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            '3-PASS TEXT HUMANIZER & AI DETECTOR (/ig-human)',
            'Purges invisible Unicode tags, normalizes typography (em dashes, curly quotes), and strips 154 buzzwords.',
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _isLoading ? null : _humanizeCurrent,
            icon: const Icon(Icons.cleaning_services_rounded),
            label: const Text('Clean & Audit Active Copy'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          if (clean != null) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.glassCardDecoration(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Human Score: ${clean['aiDetection']?['overallScore']}/100',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: (clean['aiDetection']?['overallScore'] as num) >= 70
                              ? AppTheme.success
                              : AppTheme.warning,
                        ),
                      ),
                      Chip(
                        label: Text(clean['aiDetection']?['verdict'] ?? ''),
                        backgroundColor: AppTheme.primary.withValues(alpha: 0.15),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Stripped ${clean['cleaned']?['totalCleaned']} mechanical artefacts.',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                  ),
                  const Divider(height: 20),
                  Text('5-Factor Detector Panel:',
                      style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                  const SizedBox(height: 8),
                  ...?((clean['aiDetection']?['checks'] as List?)?.map((c) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              c['status'] == 'PASS'
                                  ? Icons.check_circle_rounded
                                  : Icons.warning_rounded,
                              size: 16,
                              color: c['status'] == 'PASS' ? AppTheme.success : AppTheme.warning,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${c['name']} (${c['humanScore']}/100): ${c['detail']}',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // TAB 5: TRIAGE & VIRAL RADAR
  // -------------------------------------------------------------------------
  Widget _buildTriageRadarTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            'INBOUND COMMENT TRIAGE (/ig-reply)',
            'Sorts comments into 6 buckets and converts high-demand questions into Reels with sticker.',
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: AppTheme.glassCardDecoration(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildBucketRow('KEYWORD', '2 items', AppTheme.primary, 'Sends asset DM immediately'),
                _buildBucketRow('LEAD', '1 item', AppTheme.success, 'Public reply + DM door'),
                _buildBucketRow('QUESTION', '3 items', AppTheme.accent, 'Film Reel with sticker response'),
                _buildBucketRow('SUBSTANCE', '4 items', Colors.purple, 'Thoughtful thread reply'),
                _buildBucketRow('SUPPORT', '12 items', Colors.grey, 'Like + short acknowledgment'),
                _buildBucketRow('NOISE', '2 items', AppTheme.error, 'Hide or ignore'),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _buildSectionHeader(
            'OUTLIER VIRAL RADAR (/ig-viral)',
            'Ranks competitor reels on Outlier Multiple (>3.0x baseline). Views alone mean nothing.',
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: AppTheme.glassCardDecoration(),
            child: Column(
              children: [
                _buildCompetitorOutlierCard(
                  '@scale_growth',
                  '412,000 views',
                  '11,000 baseline (37.4x OUTLIER)',
                  '#3 Nobody Tells You: "Nobody tells you your first 30 flop"',
                  AppTheme.success,
                ),
                const SizedBox(height: 10),
                _buildCompetitorOutlierCard(
                  '@agency_lead',
                  '85,000 views',
                  '18,000 baseline (4.7x OUTLIER)',
                  '#1 Cost Confession: "\$18,000 is what one missing contract cost me"',
                  AppTheme.accent,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
        ),
      ],
    );
  }

  Widget _buildMetricRow(String label, String detail) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label,
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          ),
          Expanded(
            child: Text(detail, style: const TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _buildBucketRow(String bucket, String count, Color color, String action) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 90,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              bucket,
              style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: 12),
          Text(count, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(action,
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          ),
        ],
      ),
    );
  }

  Widget _buildCompetitorOutlierCard(
      String handle, String views, String outlier, String hook, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(handle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  outlier,
                  style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(hook,
              style: TextStyle(fontSize: 12, color: AppTheme.textPrimary, fontStyle: FontStyle.italic)),
        ],
      ),
    );
  }
}
