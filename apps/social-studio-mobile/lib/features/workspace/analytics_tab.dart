import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/util/json.dart';
import '../../core/widgets/common.dart';
import '../../data/models/platform.dart';
import '../../data/models/project.dart';

final projectAnalyticsProvider = FutureProvider.autoDispose.family<Json, (String, String)>(
    (ref, key) => ref.watch(socialApiProvider).projectAnalytics(key.$1, range: key.$2));

/// Comprehensive Social Media Analytics and Real-Time Performance Dashboard.
/// Powered by the backend social insights aggregation engine.
class AnalyticsTab extends ConsumerStatefulWidget {
  const AnalyticsTab({super.key, required this.project});
  final Project project;

  @override
  ConsumerState<AnalyticsTab> createState() => _AnalyticsTabState();
}

class _AnalyticsTabState extends ConsumerState<AnalyticsTab> {
  String _range = '30d';

  @override
  Widget build(BuildContext context) {
    final key = (widget.project.id, _range);
    final data = ref.watch(projectAnalyticsProvider(key));
    final m = widget.project.metrics;

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(projectAnalyticsProvider(key)),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
        children: [
          // Time range selector
          Center(
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: '7d', label: Text('7 Days')),
                ButtonSegment(value: '30d', label: Text('30 Days')),
                ButtonSegment(value: '90d', label: Text('90 Days')),
              ],
              selected: {_range},
              onSelectionChanged: (s) => setState(() => _range = s.first),
            ),
          ),
          const SizedBox(height: 16),

          // Analytics Data Body
          data.when(
            loading: () => const Padding(padding: EdgeInsets.all(32), child: LoadingView(label: 'Computing analytics…')),
            error: (e, _) => ErrorView(
              error: e,
              compact: true,
              onRetry: () => ref.invalidate(projectAnalyticsProvider(key)),
            ),
            data: (j) {
              final a = jMap(j['analytics'] ?? j['data'] ?? j);
              final postsPublished = (a['postsPublished'] as num?)?.toInt() ?? 0;
              final postsCreated = (a['postsCreated'] as num?)?.toInt() ?? 0;
              final postsScheduledInRange = (a['postsScheduledInRange'] as num?)?.toInt() ?? 0;
              final postsAwaitingApproval = (a['postsAwaitingApproval'] as num?)?.toInt() ?? 0;
              final postsFailed = (a['postsFailed'] as num?)?.toInt() ?? 0;

              // Approval stats
              final sessionsSent = (a['reviewSessionsSent'] as num?)?.toInt() ?? 0;
              final sessionsApproved = (a['reviewSessionsApproved'] as num?)?.toInt() ?? 0;
              final avgHours = (a['approvalTurnaroundHoursAvg'] as num?)?.toDouble();
              final medianHours = (a['approvalTurnaroundHoursMedian'] as num?)?.toDouble();

              // Inbox / Leads
              final conversations = (a['inboxConversations'] as num?)?.toInt() ?? 0;
              final unread = (a['inboxUnread'] as num?)?.toInt() ?? 0;
              final convertedLeads = (a['inboxConvertedToLeads'] as num?)?.toInt() ?? 0;

              // Platform distribution
              final platforms = <SocialPlatform, int>{};
              for (final p in SocialPlatform.values) {
                final count = (a['published_${p.id}'] as num?)?.toInt() ?? 0;
                if (count > 0) platforms[p] = count;
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // KPI Cards Grid
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.8,
                    children: [
                      _kpiCard(
                        'Published ($_range)',
                        '$postsPublished',
                        Icons.rocket_launch_rounded,
                        AppTheme.success,
                        subtitle: '$postsCreated created in range',
                      ),
                      _kpiCard(
                        'Scheduled',
                        '$postsScheduledInRange',
                        Icons.calendar_today_rounded,
                        AppTheme.accentBlue,
                        subtitle: 'In this $_range window',
                      ),
                      _kpiCard(
                        'In Review',
                        '$postsAwaitingApproval',
                        Icons.hourglass_top_rounded,
                        AppTheme.warning,
                        subtitle: '$sessionsSent client sessions',
                      ),
                      _kpiCard(
                        'Failed / Blocked',
                        '$postsFailed',
                        Icons.error_outline_rounded,
                        postsFailed > 0 ? AppTheme.error : AppTheme.textMuted,
                        subtitle: postsFailed > 0 ? 'Action required' : 'Clean pipeline',
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Platform Distribution
                  const SectionHeader('Publishing by Channel'),
                  SectionCard(
                    child: platforms.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              'No posts published yet in this date range.',
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                            ),
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (final entry in platforms.entries) ...[
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                  child: Row(
                                    children: [
                                      Icon(entry.key.icon, size: 18, color: entry.key.color),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          entry.key.label,
                                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                        ),
                                      ),
                                      Text(
                                        '${entry.value} posts',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: postsPublished > 0 ? entry.value / postsPublished : 0,
                                    backgroundColor: AppTheme.surfaceElevated,
                                    valueColor: AlwaysStoppedAnimation<Color>(entry.key.color),
                                    minHeight: 6,
                                  ),
                                ),
                                const SizedBox(height: 6),
                              ],
                            ],
                          ),
                  ),
                  const SizedBox(height: 16),

                  // Approval Velocity
                  const SectionHeader('Client Review Velocity'),
                  SectionCard(
                    child: Column(
                      children: [
                        _metricRow('Review Sessions Sent', '$sessionsSent'),
                        const Divider(height: 16),
                        _metricRow('Sessions Approved', '$sessionsApproved'),
                        const Divider(height: 16),
                        _metricRow(
                          'Average Turnaround',
                          avgHours != null ? '${avgHours.toStringAsFixed(1)} hours' : 'N/A',
                        ),
                        if (medianHours != null) ...[
                          const Divider(height: 16),
                          _metricRow('Median Turnaround', '${medianHours.toStringAsFixed(1)} hours'),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Social CRM & Inbox Conversion
                  const SectionHeader('Inquiries & Lead Generation'),
                  SectionCard(
                    child: Column(
                      children: [
                        _metricRow('Total Conversations', '$conversations'),
                        const Divider(height: 16),
                        _metricRow(
                          'Unread Messages',
                          '$unread',
                          highlightColor: unread > 0 ? AppTheme.warning : null,
                        ),
                        const Divider(height: 16),
                        _metricRow(
                          'Converted to CRM Leads',
                          '$convertedLeads',
                          highlightColor: convertedLeads > 0 ? AppTheme.success : null,
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),

          const SizedBox(height: 16),

          // All-Time Project Metrics
          const SectionHeader('All-Time Project Summary'),
          SectionCard(
            child: Column(
              children: [
                _metricRow('Total posts', '${m.totalPosts}'),
                const Divider(height: 16),
                _metricRow('Published posts', '${m.publishedPosts}'),
                const Divider(height: 16),
                _metricRow('Scheduled posts', '${m.scheduledPosts}'),
                const Divider(height: 16),
                _metricRow('Pending approvals', '${m.pendingApprovals}'),
                const Divider(height: 16),
                _metricRow('Outstanding tasks', '${m.outstandingTasks}'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kpiCard(String label, String value, IconData icon, Color color, {String? subtitle}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.5),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }

  Widget _metricRow(String label, String value, {Color? highlightColor}) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 14,
            color: highlightColor,
          ),
        ),
      ],
    );
  }
}
