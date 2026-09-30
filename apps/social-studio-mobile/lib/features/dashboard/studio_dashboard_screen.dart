import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/sync_indicator.dart';
import '../../core/widgets/universal_skeleton.dart';
import '../../data/models/project.dart';
import '../../data/models/social_account.dart';
import '../../data/models/social_post.dart';
import '../auth/auth_provider.dart';
import '../manager/manager_copilot_sheet.dart';
import '../planner/planner_providers.dart';
import '../projects/project_provider.dart';
import '../projects/project_switcher.dart';

/// One entry per web workspace tab (`/social-projects/:id?tab=`), plus mobile extras.
class ProjectSection {
  const ProjectSection(this.tab, this.label, this.icon);
  final String tab;
  final String label;
  final IconData icon;

  static const all = [
    ProjectSection('calendar', 'Calendar', Icons.calendar_month_rounded),
    ProjectSection('content', 'Content', Icons.view_list_rounded),
    ProjectSection('tasks', 'Editing tasks', Icons.assignment_rounded),
    ProjectSection('approvals', 'Approvals', Icons.verified_rounded),
    ProjectSection('publishing', 'Publishing', Icons.send_rounded),
    ProjectSection('inbox', 'Inbox', Icons.forum_rounded),
    ProjectSection('engagement', 'Engagement', Icons.bolt_rounded),
    ProjectSection('analytics', 'Analytics', Icons.insights_rounded),
    ProjectSection('brand', 'Brand identity', Icons.record_voice_over_rounded),
    ProjectSection('accounts', 'Channels', Icons.hub_rounded),
    ProjectSection('evergreen', 'Evergreen queue', Icons.autorenew_rounded),
    ProjectSection('settings', 'Settings', Icons.tune_rounded),
  ];

  static ProjectSection? byTab(String tab) => all.where((s) => s.tab == tab).firstOrNull;
}

/// Standard workspace app bar: project switcher, sync badge, account profile & channels sheet.
PreferredSizeWidget workspaceAppBar(BuildContext context, WidgetRef ref, {List<Widget> actions = const []}) {
  return AppBar(
    titleSpacing: 16,
    title: ProjectSwitcher(),
    actions: [
      ...actions,
      IconButton(
        icon: Icon(Icons.auto_awesome_rounded, color: AppTheme.accent),
        tooltip: '180 Manager AI',
        onPressed: () {
          final p = ref.read(activeProjectProvider).valueOrNull;
          show180ManagerCopilot(context, projectId: p?.id);
        },
      ),
      SyncIndicator(),
      IconButton(
        icon: Icon(Icons.account_circle_rounded, color: AppTheme.textSecondary),
        tooltip: 'Profile & Accounts',
        onPressed: () => showProfileAndAccountsSheet(context, ref),
      ),
      SizedBox(width: 4),
    ],
  );
}

/// Bottom sheet displaying the real logged-in user profile, connected social media accounts,
/// and primary workspace navigation options (All projects, Settings, Sync status, Sign out).
void showProfileAndAccountsSheet(BuildContext context, WidgetRef ref) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppTheme.surfaceElevated,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) {
      return Consumer(
        builder: (_, sheetRef, child) {
          final session = sheetRef.watch(sessionProvider).valueOrNull;
          final project = sheetRef.watch(activeProjectProvider).valueOrNull;
          final socialAccounts = project?.socialAccounts ?? const <SocialAccount>[];

          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Grab handle
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppTheme.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Real Profile Header
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [AppTheme.primary, AppTheme.accent],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primary.withValues(alpha: 0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: session?.user.imageUrl != null && session!.user.imageUrl!.isNotEmpty
                            ? ClipOval(
                                child: Image.network(
                                  session.user.imageUrl!,
                                  width: 52,
                                  height: 52,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) => Text(
                                    session.user.name.isNotEmpty ? session.user.name[0].toUpperCase() : 'U',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                                  ),
                                ),
                              )
                            : Text(
                                (session?.user.name.isNotEmpty ?? false)
                                    ? session!.user.name[0].toUpperCase()
                                    : 'U',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                              ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    session?.user.name ?? 'Simplicion',
                                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.accent.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                                  ),
                                  child: Text(
                                    session?.company.name ?? 'Simplicion',
                                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppTheme.accent),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              session?.user.email ?? 'Logged in user',
                              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close_rounded, size: 20, color: AppTheme.textMuted),
                        onPressed: () => Navigator.of(sheetContext).pop(),
                      ),
                    ],
                  ),

                  const SizedBox(height: 18),
                  Divider(color: AppTheme.border, height: 1),
                  const SizedBox(height: 16),

                  // Connected Social Media Accounts Section
                  Row(
                    children: [
                      Icon(Icons.hub_rounded, size: 16, color: AppTheme.accent),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'Connected Channels',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${socialAccounts.length}',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                        ),
                      ),
                      if (project != null) ...[
                        const Spacer(),
                        TextButton(
                          onPressed: () {
                            Navigator.of(sheetContext).pop();
                            context.push('/projects/${project.id}/accounts');
                          },
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text('Manage', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (socialAccounts.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.link_off_rounded, color: AppTheme.textMuted, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'No social media accounts connected yet.',
                              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            ),
                          ),
                          if (project != null)
                            FilledButton.tonal(
                              onPressed: () {
                                Navigator.of(sheetContext).pop();
                                context.push('/projects/${project.id}/accounts');
                              },
                              style: FilledButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                minimumSize: Size.zero,
                              ),
                              child: const Text('Connect', style: TextStyle(fontSize: 11)),
                            ),
                        ],
                      ),
                    )
                  else
                    Column(
                      children: [
                        for (final a in socialAccounts)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: a.needsAttention
                                      ? AppTheme.error.withValues(alpha: 0.3)
                                      : AppTheme.border,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 34,
                                    height: 34,
                                    decoration: BoxDecoration(
                                      color: a.platform.color.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(a.platform.icon, size: 18, color: a.platform.color),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          a.accountName,
                                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textPrimary),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          a.platform.label + (a.username != null && a.username != a.accountName ? ' · @${a.username}' : ''),
                                          style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (a.needsAttention)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: AppTheme.error.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.warning_amber_rounded, size: 12, color: AppTheme.error),
                                          const SizedBox(width: 4),
                                          Text('Re-auth', style: TextStyle(color: AppTheme.error, fontSize: 10, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    )
                                  else
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          width: 7,
                                          height: 7,
                                          decoration: BoxDecoration(
                                            color: AppTheme.success,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        const SizedBox(width: 5),
                                        Text('Connected', style: TextStyle(color: AppTheme.success, fontSize: 11, fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),

                  const SizedBox(height: 14),
                  Divider(color: AppTheme.border, height: 1),
                  const SizedBox(height: 10),

                  // The 4 Core Navigation Options
                  _ProfileSheetTile(
                    icon: Icons.folder_special_rounded,
                    iconColor: AppTheme.accentBlue,
                    title: 'All projects',
                    subtitle: 'Switch workspace or client brand',
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      context.push('/projects');
                    },
                  ),
                  _ProfileSheetTile(
                    icon: Icons.tune_rounded,
                    iconColor: AppTheme.accent,
                    title: 'Settings & Devices',
                    subtitle: 'Studio preferences & device storage',
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      context.push('/settings');
                    },
                  ),
                  _ProfileSheetTile(
                    icon: Icons.sync_rounded,
                    iconColor: AppTheme.warning,
                    title: 'Sync status',
                    subtitle: 'Offline queue & replication health',
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      context.push('/sync');
                    },
                  ),
                  _ProfileSheetTile(
                    icon: Icons.logout_rounded,
                    iconColor: AppTheme.error,
                    title: 'Sign out',
                    titleColor: AppTheme.error,
                    subtitle: 'Sign out from this device',
                    onTap: () async {
                      final notifier = ref.read(sessionProvider.notifier);
                      Navigator.of(sheetContext).pop();
                      final ok = await confirm(
                        context,
                        title: 'Sign out?',
                        message: 'Queued offline changes stay on this device until you sign back in.',
                        action: 'Sign out',
                      );
                      if (ok) await notifier.logout();
                    },
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}

class _ProfileSheetTile extends StatelessWidget {
  const _ProfileSheetTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.titleColor,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Color? titleColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        leading: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: titleColor ?? AppTheme.textPrimary,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(fontSize: 11.5, color: AppTheme.textSecondary),
        ),
        trailing: Icon(Icons.chevron_right_rounded, size: 20, color: AppTheme.textMuted),
        onTap: onTap,
      ),
    );
  }
}

/// Home tab: the active project's overview (web OverviewTab) and its workspace sections.
class StudioDashboardScreen extends ConsumerWidget {
  const StudioDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final active = ref.watch(activeProjectProvider);
    return Scaffold(
      appBar: workspaceAppBar(context, ref),
      body: active.when(
        // Page load: a skeleton, not a spinner (ui-architecture §5).
        loading: () => SingleChildScrollView(padding: EdgeInsets.all(16), child: UniversalSkeleton(type: SkeletonType.projects)),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(allProjectsProvider)),
        data: (project) => project == null
            ? EmptyView(
                icon: Icons.business_center_rounded,
                title: 'Create your first project',
                message: 'A project holds one client or brand: its identity, channels, calendar, posts, reviews and inbox.',
                actionLabel: 'New project',
                onAction: () => context.push('/projects/new'),
              )
            : _Overview(project: project),
      ),
      floatingActionButton: active.valueOrNull == null
          ? null
          : FloatingActionButton.extended(
              heroTag: 'home.create',
              onPressed: () => context.push('/posts/new?projectId=${active.valueOrNull!.id}'),
              icon: Icon(Icons.add_rounded),
              label: Text('Create content'),
            ),
    );
  }
}

class _Overview extends ConsumerWidget {
  const _Overview({required this.project});
  final Project project;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(projectDashboardProvider(project.id));
    final activity = ref.watch(projectActivityProvider(project.id));

    final now = DateTime.now();
    final lastDayOfMonth = DateTime(now.year, now.month + 1, 0);
    final daysLeftInMonth = (lastDayOfMonth.day - now.day).clamp(0, 31);
    final monthName = DateFormat('MMMM').format(now);

    return RefreshIndicator(
      onRefresh: () async => ref.refreshProjectData(project.id),
      child: ListView(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 96),
        children: [
          _Header(project: project),
          dashboard.when(
            loading: () => Padding(padding: EdgeInsets.all(32), child: LoadingView()),
            error: (e, _) => ErrorView(error: e, compact: true, onRetry: () => ref.invalidate(projectDashboardProvider(project.id))),
            data: (d) {
              final scheduledThisWeek = d.metric('postsScheduledThisWeek');
              final scheduledThisMonth = d.metrics['postsScheduledThisMonth'] ?? project.metrics.scheduledPosts;
              final postedThisMonth = d.metric('postsPublishedThisMonth');
              final calAsync = ref.watch(projectCalendarsProvider(project.id));
              final hasCalendar = calAsync.valueOrNull?.isNotEmpty ?? false;
              final filteredAttention = d.attentionItems.where((item) =>
                  item.type != 'approval_required' &&
                  item.type != 'overdue_task' &&
                  !item.type.toLowerCase().contains('approval') &&
                  !item.type.toLowerCase().contains('overdue')).toList();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (filteredAttention.isNotEmpty) ...[
                    SectionHeader('Action required'),
                    for (final item in filteredAttention)
                      Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: SectionCard(
                          borderColor: item.priority == 'high' ? AppTheme.error.withValues(alpha: 0.5) : null,
                          child: Row(children: [
                            Icon(_attentionIcon(item.type), color: item.priority == 'high' ? AppTheme.error : AppTheme.warning),
                            SizedBox(width: 12),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(item.title, style: TextStyle(fontWeight: FontWeight.w600)),
                                if (item.description != null) Text(item.description!, style: Theme.of(context).textTheme.bodyMedium),
                              ]),
                            ),
                            if (item.targetTab != null)
                              TextButton(
                                onPressed: () => context.push('/projects/${project.id}/${item.targetTab}'),
                                child: Text('Resolve'),
                              ),
                          ]),
                        ),
                      ),
                  ],

                  SectionHeader('Performance & Momentum'),

                  // 3 Key Data Points in 1 Single Row
                  Row(
                    children: [
                      Expanded(
                        child: _KpiCompact(
                          'Scheduled this week',
                          scheduledThisWeek,
                          Icons.event_rounded,
                          AppTheme.accentBlue,
                        ),
                      ),
                      SizedBox(width: 8),
                      Expanded(
                        child: _KpiCompact(
                          'Scheduled this month',
                          scheduledThisMonth,
                          Icons.calendar_month_rounded,
                          AppTheme.accent,
                        ),
                      ),
                      SizedBox(width: 8),
                      Expanded(
                        child: _KpiCompact(
                          'Posted this month',
                          postedThisMonth,
                          Icons.rocket_launch_rounded,
                          AppTheme.success,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 10),

                  // Content Calendar & Runway Row
                  Row(
                    children: [
                      Expanded(
                        child: SectionCard(
                          padding: EdgeInsets.all(12),
                          onTap: () => context.push('/projects/${project.id}/calendar'),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.calendar_month_rounded, color: AppTheme.accent, size: 18),
                                  SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      'Content Calendar',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 6),
                              Text(
                                hasCalendar ? 'Created (30-Day)' : 'Not created',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: hasCalendar ? AppTheme.success : AppTheme.warning,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                hasCalendar ? 'Autopilot synced' : 'Tap to generate',
                                style: TextStyle(fontSize: 10.5, color: AppTheme.textMuted),
                              ),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(width: 8),
                      Expanded(
                        child: SectionCard(
                          padding: EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.timelapse_rounded, color: AppTheme.accentBlue, size: 18),
                                  SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      '$monthName Runway',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 6),
                              Text(
                                '$daysLeftInMonth days left',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                              ),
                              SizedBox(height: 2),
                              Text(
                                '${now.day}/${lastDayOfMonth.day} month elapsed',
                                style: TextStyle(fontSize: 10.5, color: AppTheme.textMuted),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 10),

                  // 180 Manager AI · Social Growth Pulse (3-4 lines summary)
                  _buildAiSocialPulseCard(context, project, d, daysLeftInMonth, monthName),
                  SizedBox(height: 10),

                  // Secondary Workflow Metrics
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 2.1,
                    children: [
                      _Kpi('In editing', d.metric('editingTasksInProgress'), Icons.movie_creation_rounded, AppTheme.accent),
                      _Kpi('Publishing failures', d.metric('publishingFailures'), Icons.report_rounded, AppTheme.error),
                    ],
                  ),

                  SectionHeader(
                    'Upcoming content',
                    trailing: TextButton(onPressed: () => context.push('/projects/${project.id}/calendar'), child: Text('Calendar')),
                  ),
                  if (d.upcomingContent.isEmpty)
                    SectionCard(child: Text('No upcoming posts scheduled.'))
                  else
                    for (final post in d.upcomingContent.take(6)) PostTile(post: post),
                ],
              );
            },
          ),
          SectionHeader('Workspace'),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.1,
            children: [
              for (final s in ProjectSection.all)
                SectionCard(
                  padding: EdgeInsets.all(10),
                  onTap: () => context.push('/projects/${project.id}/${s.tab}'),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(s.icon, color: AppTheme.primary),
                    SizedBox(height: 6),
                    // Two lines max so long labels never overflow a tile on small phones.
                    Text(s.label,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, height: 1.15)),
                  ]),
                ),
            ],
          ),
          SectionHeader('Recent activity'),
          activity.when(
            loading: () => Padding(padding: EdgeInsets.all(16), child: LoadingView()),
            error: (e, _) => ErrorView(error: e, compact: true, onRetry: () => ref.invalidate(projectActivityProvider(project.id))),
            data: (items) => items.isEmpty
                ? SectionCard(child: Text('No activity yet.'))
                : SectionCard(
                    padding: EdgeInsets.zero,
                    child: Column(children: [
                      for (final a in items)
                        ListTile(
                          dense: true,
                          leading: Icon(
                              a.type == 'task'
                                  ? Icons.assignment_rounded
                                  : a.type == 'approval'
                                      ? Icons.verified_rounded
                                      : Icons.article_rounded,
                              color: AppTheme.textSecondary),
                          title: Text(a.title),
                          subtitle: Text([a.action, a.description].whereType<String>().join(' · ')),
                          trailing: Text(timeAgo(a.timestamp), style: Theme.of(context).textTheme.labelSmall),
                        ),
                    ]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildAiSocialPulseCard(BuildContext context, Project project, ProjectDashboard d, int daysLeft, String monthName) {
    final scheduledWeek = d.metric('postsScheduledThisWeek');
    final postedMonth = d.metric('postsPublishedThisMonth');
    final accounts = project.socialAccounts;

    final bool hasChannels = accounts.isNotEmpty;
    final isConsistent = scheduledWeek > 0 || postedMonth > 0;
    final growthStatus = !hasChannels
        ? 'Channels needed'
        : isConsistent
            ? 'Active & Consistent'
            : 'Pacing needed';

    final String presenceText;
    if (!hasChannels) {
      presenceText = '• Multi-channel Presence: No channels linked yet for ${project.name}. Connect your accounts in Channels to enable automated scheduling, audience reach, and cross-channel growth tracking.';
    } else {
      final accountNames = accounts.map((a) => a.platform.label).toSet().join(', ');
      presenceText = '• Multi-channel Presence: Analyzing your linked ${project.name} channels ($accountNames). Overall publishing cadence is active with $scheduledWeek posts queued this week.';
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primary.withValues(alpha: 0.12),
            AppTheme.accent.withValues(alpha: 0.08),
            AppTheme.surfaceElevated,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.auto_awesome_rounded, color: AppTheme.accent, size: 16),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '180 Manager AI · Social Growth Pulse',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textPrimary),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: (!hasChannels
                          ? AppTheme.warning
                          : isConsistent
                              ? AppTheme.success
                              : AppTheme.accentBlue)
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  growthStatus,
                  style: TextStyle(
                    color: !hasChannels
                        ? AppTheme.warning
                        : isConsistent
                            ? AppTheme.success
                            : AppTheme.accentBlue,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '$presenceText\n'
            '• Growth Reality: $postedMonth posts delivered this month with $daysLeft days remaining in $monthName. Pacing is consistent across feed and video formats.\n'
            '• AI Manager Recommendation: Publish short-form video hooks before 6 PM UTC to maximize audience retention and conversion.',
            style: TextStyle(fontSize: 12, height: 1.45, color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }

  static IconData _attentionIcon(String type) => switch (type) {
        'approval_required' => Icons.verified_rounded,
        'publishing_failed' => Icons.report_rounded,
        'overdue_task' => Icons.alarm_rounded,
        'unread_inbox' => Icons.mark_chat_unread_rounded,
        'reauth_needed' => Icons.link_off_rounded,
        _ => Icons.info_rounded,
      };
}

/// Clean Hero card showing active project info, status, description, and timezone.
class _Header extends StatelessWidget {
  const _Header({required this.project});
  final Project project;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Text(
              project.name,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          StatusChip(label: project.status.label, color: project.status.color),
        ]),
        if (project.description?.isNotEmpty ?? false) ...[
          SizedBox(height: 6),
          Text(
            project.description!,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textSecondary),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ]),
    );
  }
}

/// Compact 1-row KPI card.
class _KpiCompact extends StatelessWidget {
  const _KpiCompact(this.label, this.value, this.icon, this.color);
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => SectionCard(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 20),
                Text(
                  '$value',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, height: 1.15),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      );
}

class _Kpi extends StatelessWidget {
  const _Kpi(this.label, this.value, this.icon, this.color);
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => SectionCard(
        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(children: [
          Icon(icon, color: color, size: 18),
          SizedBox(width: 8),
          Expanded(
            child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('$value', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              Text(label, style: TextStyle(fontSize: 10.5, color: AppTheme.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
        ]),
      );
}

/// Compact post row used across the app.
class PostTile extends StatelessWidget {
  const PostTile({super.key, required this.post, this.trailing});
  final SocialPost post;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(bottom: 8),
        child: SectionCard(
          padding: EdgeInsets.all(12),
          onTap: () => context.push('/posts/${post.id}'),
          child: Row(children: [
            Container(
              width: 4,
              height: 40,
              decoration: BoxDecoration(color: post.status.color, borderRadius: BorderRadius.circular(2)),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(post.displayTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: FontWeight.w600)),
                SizedBox(height: 4),
                Row(children: [
                  for (final p in post.platforms) Padding(padding: EdgeInsets.only(right: 4), child: Icon(p.icon, size: 14, color: p.color)),
                  Flexible(
                    child: Text(
                      '${post.status.label} · ${fmtDateTime(post.scheduledFor)}${post.versionNumber > 1 ? ' · v${post.versionNumber}' : ''}',
                      style: Theme.of(context).textTheme.labelSmall,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ]),
              ]),
            ),
            ?trailing,
          ]),
        ),
      );
}
