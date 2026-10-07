import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/autopilot.dart';
import '../../data/models/content_calendar.dart';

/// Detailed script & 165 WPM beat sheet screen for short-form video creators.
/// Displays hook tension score, timed beat sheet, retention loopback, and
/// connects directly into the Studio Teleprompter Camera.
class DetailedScriptScreen extends StatefulWidget {
  const DetailedScriptScreen({
    super.key,
    required this.piece,
    this.calendar,
  });

  final CalendarPiece piece;
  final ContentCalendar? calendar;

  @override
  State<DetailedScriptScreen> createState() => _DetailedScriptScreenState();
}

class _DetailedScriptScreenState extends State<DetailedScriptScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _copyFullScript(PieceBrief brief) {
    Clipboard.setData(ClipboardData(text: brief.teleprompterText));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Teleprompter script copied to clipboard!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _launchTeleprompterCamera(PieceBrief brief) {
    context.push('/camera', extra: {
      'hook': brief.openingHook ?? widget.piece.headline,
      'script': brief.teleprompterText,
      'projectId': widget.calendar?.projectId,
      'pieceId': widget.piece.id,
    });
  }

  @override
  Widget build(BuildContext context) {
    final brief = PieceBrief.parse(widget.piece.videoScriptOrHooks) ??
        PieceBrief(
          spokenHook: widget.piece.headline,
          cta: widget.piece.callToAction,
        );

    final beats = brief.timedBeats;
    final hookScore = brief.hookScore ?? 85;
    final hookFormula = brief.hookFormula ?? 'Curiosity Gap Challenge';
    final humanScore = brief.humanScore ?? 95;
    final estDuration = brief.durationSec ?? (beats.isNotEmpty ? (beats.last.startSec + beats.last.durationSec).round() : 30);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detailed Script Studio'),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy_all_rounded),
            tooltip: 'Copy Script',
            onPressed: () => _copyFullScript(brief),
          ),
          IconButton(
            icon: Icon(Icons.videocam_rounded, color: AppTheme.accent),
            tooltip: 'Record with Teleprompter',
            onPressed: () => _launchTeleprompterCamera(brief),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.accent,
          tabs: const [
            Tab(icon: Icon(Icons.speed_rounded, size: 18), text: '165 WPM Beats'),
            Tab(icon: Icon(Icons.share_rounded, size: 18), text: '5-Platform Matrix'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildBeatsTab(context, brief, beats, hookScore, hookFormula, humanScore, estDuration),
          _buildPlatformMatrixTab(context, brief),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: AppTheme.surfaceElevated,
            border: Border(top: BorderSide(color: AppTheme.border.withValues(alpha: 0.6))),
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _copyFullScript(brief),
                  icon: const Icon(Icons.copy_rounded, size: 18),
                  label: const Text('Copy Script'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () => _launchTeleprompterCamera(brief),
                  icon: const Icon(Icons.videocam_rounded, size: 20),
                  label: const Text(
                    'Record with Teleprompter',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBeatsTab(
    BuildContext context,
    PieceBrief brief,
    List<TimedBeatModel> beats,
    int hookScore,
    String hookFormula,
    int humanScore,
    int estDuration,
  ) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Headline
        Text(
          widget.piece.headline.isEmpty ? 'Short-Form Video Master Script' : widget.piece.headline,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),

        // Metrics Row
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                icon: Icons.flash_on_rounded,
                color: AppTheme.accent,
                title: 'Hook Score',
                value: '$hookScore/100',
                subtitle: hookScore >= 80 ? 'Viral Potential' : 'Solid Retention',
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildMetricTile(
                icon: Icons.timer_outlined,
                color: AppTheme.primary,
                title: 'Duration',
                value: '${estDuration}s',
                subtitle: '165 WPM Pace',
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildMetricTile(
                icon: Icons.verified_user_outlined,
                color: AppTheme.success,
                title: 'Voice Guard',
                value: '$humanScore%',
                subtitle: 'De-robotized',
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Formula badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: AppTheme.primary.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Icon(Icons.auto_awesome_rounded, size: 16, color: AppTheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Hook Formula: $hookFormula',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primary,
                  ),
                ),
              ),
              StatusChip(label: '< 3.0s Target', color: AppTheme.accent),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Section: Cold Open Hook
        _buildSectionHeader('Cold Open Hook (First 3 Seconds)', Icons.record_voice_over_rounded),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surfaceElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.accent.withValues(alpha: 0.4), width: 1.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.accent.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'SPOKEN HOOK',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.accent,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text('0:00.0 - 0:02.8', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                '“${brief.openingHook ?? widget.piece.headline}”',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  fontStyle: FontStyle.italic,
                  height: 1.35,
                ),
              ),
              if (brief.onScreenHook?.isNotEmpty == true) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black45,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.subtitles_rounded, size: 14, color: AppTheme.accentBlue),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'On-Screen Text: ${brief.onScreenHook}',
                          style: const TextStyle(fontSize: 12, color: Colors.white70),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Section: Timed Beat-by-Beat Script
        _buildSectionHeader('Timed Beat-by-Beat Delivery (165 WPM)', Icons.queue_music_rounded),
        const SizedBox(height: 8),
        for (final beat in beats) ...[
          _buildBeatCard(beat),
          const SizedBox(height: 10),
        ],

        if (brief.retentionLoop?.isNotEmpty == true) ...[
          const SizedBox(height: 14),
          _buildSectionHeader('Retention Loopback (Infinite Watch-Time Bridge)', Icons.loop_rounded),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.all_inclusive_rounded, size: 20, color: AppTheme.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Loopback Transition Phrase:',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '“${brief.retentionLoop!}”',
                        style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],

        if (brief.cta?.isNotEmpty == true) ...[
          const SizedBox(height: 14),
          _buildSectionHeader('Spoken Call to Action (CTA)', Icons.ads_click_rounded),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.success.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.campaign_rounded, size: 20, color: AppTheme.success),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    brief.cta!,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],

        if (brief.shotNotes.isNotEmpty) ...[
          const SizedBox(height: 20),
          _buildSectionHeader('Director & Camera Notes', Icons.movie_creation_outlined),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.surfaceElevated,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final note in brief.shotNotes)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.fiber_manual_record, size: 8, color: AppTheme.accent),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(note, style: const TextStyle(fontSize: 13, color: Colors.white70)),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildBeatCard(TimedBeatModel beat) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  beat.timecode,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primary,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Beat ${beat.index} (${beat.durationSec.toStringAsFixed(1)}s)',
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              const Spacer(),
              if (beat.retentionDevice?.isNotEmpty == true)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.accentBlue.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    beat.retentionDevice!,
                    style: TextStyle(fontSize: 10, color: AppTheme.accentBlue, fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            beat.spokenWords,
            style: const TextStyle(fontSize: 14.5, height: 1.4),
          ),
          if (beat.visualAction?.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.videocam_outlined, size: 14, color: Colors.white54),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    beat.visualAction!,
                    style: const TextStyle(fontSize: 11.5, color: Colors.white54, fontStyle: FontStyle.italic),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPlatformMatrixTab(BuildContext context, PieceBrief brief) {
    final hook = brief.openingHook ?? widget.piece.headline;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Agency-Grade 5-Platform Strategy',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        Text(
          'Every platform has strict feed truncation cutoffs and native consumption mechanics.',
          style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 16),

        _buildPlatformCard(
          platformName: 'Instagram (Reel & Carousel)',
          icon: Icons.camera_alt_outlined,
          color: const Color(0xFFE1306C),
          cutoff: '125 chars before "... more"',
          format: 'Vertical Reel (9:16) / 1080x1350 Carousel',
          advice: 'Front-load hook in first 125 chars to force caption expand. Cap hashtags to 5.',
          preview: hook.length > 125 ? '${hook.substring(0, 125)}... more' : '$hook\n\n... more',
        ),
        const SizedBox(height: 12),

        _buildPlatformCard(
          platformName: 'LinkedIn (Thought Leadership)',
          icon: Icons.business_center_outlined,
          color: const Color(0xFF0A66C2),
          cutoff: '140 chars / 2 lines before "...see more"',
          format: 'PDF Slide Document / Professional Post',
          advice: 'Create professional tension. End with a discussion trigger. 3 high-authority hashtags.',
          preview: hook.length > 140 ? '${hook.substring(0, 140)}...see more' : '$hook\n\n...see more',
        ),
        const SizedBox(height: 12),

        _buildPlatformCard(
          platformName: 'Twitter / X (Thread & Video)',
          icon: Icons.tag_rounded,
          color: const Color(0xFF1DA1F2),
          cutoff: '280 chars per tweet',
          format: 'Hook Tweet + 4-Tweet Educational Thread',
          advice: 'Optimize opening tweet for bookmarking and quote retweets. No hashtags in tweet 1.',
          preview: hook.length > 270 ? '${hook.substring(0, 267)}... 🧵👇' : '$hook\n\n🧵👇',
        ),
        const SizedBox(height: 12),

        _buildPlatformCard(
          platformName: 'YouTube Shorts',
          icon: Icons.play_circle_outline_rounded,
          color: const Color(0xFFFF0000),
          cutoff: '60 chars title cutoff',
          format: 'Shorts (60s max, vertical)',
          advice: 'First 1.8 seconds must be a cold open. Title must not truncate on mobile screens.',
          preview: hook.length > 60 ? '${hook.substring(0, 57)}...' : hook,
        ),
        const SizedBox(height: 12),

        _buildPlatformCard(
          platformName: 'Facebook Feed & Groups',
          icon: Icons.people_alt_outlined,
          color: const Color(0xFF1877F2),
          cutoff: '150 chars fold cutoff',
          format: 'Conversation Post & Short Video',
          advice: 'Trigger comment interactions in first 30 minutes to activate algorithmic distribution.',
          preview: hook.length > 150 ? '${hook.substring(0, 150)}... See More' : '$hook\n\nSee More',
        ),
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildPlatformCard({
    required String platformName,
    required IconData icon,
    required Color color,
    required String cutoff,
    required String format,
    required String advice,
    required String preview,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 8),
              Text(
                platformName,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  cutoff,
                  style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(format, style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          const SizedBox(height: 6),
          Text(advice, style: const TextStyle(fontSize: 12, color: Colors.white70)),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.black38,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: AppTheme.border.withValues(alpha: 0.4)),
            ),
            child: Text(
              preview,
              style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: Colors.white60),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppTheme.accent),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.3),
        ),
      ],
    );
  }

  Widget _buildMetricTile({
    required IconData icon,
    required Color color,
    required String title,
    required String value,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(title, style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
            ],
          ),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          Text(subtitle, style: TextStyle(fontSize: 10, color: color)),
        ],
      ),
    );
  }
}
