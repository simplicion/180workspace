import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/sync_indicator.dart';
import '../../core/widgets/universal_skeleton.dart';
import '../../data/models/project.dart';
import '../../data/models/social_post.dart';
import '../auth/auth_provider.dart';
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
    ProjectSection('media', 'Media library', Icons.perm_media_rounded),
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

/// Standard workspace app bar: project switcher, sync badge, account menu.
PreferredSizeWidget workspaceAppBar(BuildContext context, WidgetRef ref, {List<Widget> actions = const []}) {
  return AppBar(
    titleSpacing: 16,
    title: const ProjectSwitcher(),
    actions: [
      ...actions,
      const SyncIndicator(),
      PopupMenuButton<String>(
        icon: const Icon(Icons.account_circle_rounded, color: AppTheme.textSecondary),
        color: AppTheme.surfaceElevated,
        onSelected: (v) async {
          if (v == 'logout') {
            final ok = await confirm(context, title: 'Sign out?', message: 'Queued offline changes stay on this device until you sign back in.', action: 'Sign out');
            if (ok) await ref.read(sessionProvider.notifier).logout();
          } else if (v == 'projects') {
            if (context.mounted) context.push('/projects');
          } else if (v == 'settings') {
            if (context.mounted) context.push('/settings');
          } else if (v == 'sync') {
            if (context.mounted) context.push('/sync');
          }
        },
        itemBuilder: (_) {
          final s = ref.read(sessionProvider).valueOrNull;
          return [
            if (s != null)
              PopupMenuItem(enabled: false, child: Text('${s.user.name}\n${s.company.name}', style: const TextStyle(color: AppTheme.textSecondary))),
            const PopupMenuItem(value: 'projects', child: Text('All projects')),
            const PopupMenuItem(value: 'settings', child: Text('Settings & Devices')),
            const PopupMenuItem(value: 'sync', child: Text('Sync status')),
            const PopupMenuItem(value: 'logout', child: Text('Sign out')),
          ];
        },
      ),
      const SizedBox(width: 4),
    ],
  );
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
        loading: () => const SingleChildScrollView(padding: EdgeInsets.all(16), child: UniversalSkeleton(type: SkeletonType.projects)),
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
              icon: const Icon(Icons.add_rounded),
              label: const Text('Create content'),
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
    return RefreshIndicator(
      onRefresh: () async => ref.refreshProjectData(project.id),
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 96), children: [
        _Header(project: project),
        dashboard.when(
          loading: () => const Padding(padding: EdgeInsets.all(32), child: LoadingView()),
          error: (e, _) => ErrorView(error: e, compact: true, onRetry: () => ref.invalidate(projectDashboardProvider(project.id))),
          data: (d) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SectionHeader('Action required'),
            if (d.attentionItems.isEmpty)
              const SectionCard(child: Row(children: [
                Icon(Icons.check_circle_rounded, color: AppTheme.success),
                SizedBox(width: 12),
                Expanded(child: Text('Nothing needs your attention right now.')),
              ]))
            else
              for (final item in d.attentionItems)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: SectionCard(
                    borderColor: item.priority == 'high' ? AppTheme.error.withValues(alpha: 0.5) : null,
                    child: Row(children: [
                      Icon(_attentionIcon(item.type), color: item.priority == 'high' ? AppTheme.error : AppTheme.warning),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(item.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                          if (item.description != null) Text(item.description!, style: Theme.of(context).textTheme.bodyMedium),
                        ]),
                      ),
                      if (item.targetTab != null)
                        TextButton(
                          onPressed: () => context.push('/projects/${project.id}/${item.targetTab}'),
                          child: const Text('Resolve'),
                        ),
                    ]),
                  ),
                ),
            const SectionHeader('This week'),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.9,
              children: [
                _Kpi('Scheduled this week', d.metric('postsScheduledThisWeek'), Icons.event_rounded, AppTheme.accentBlue),
                _Kpi('Awaiting approval', d.metric('postsAwaitingApproval'), Icons.hourglass_top_rounded, AppTheme.warning),
                _Kpi('In editing', d.metric('editingTasksInProgress'), Icons.movie_creation_rounded, AppTheme.accent),
                _Kpi('Published this month', d.metric('postsPublishedThisMonth'), Icons.rocket_launch_rounded, AppTheme.success),
                _Kpi('Overdue tasks', d.metric('overdueTasks'), Icons.alarm_rounded, AppTheme.error),
                _Kpi('Publishing failures', d.metric('publishingFailures'), Icons.report_rounded, AppTheme.error),
              ],
            ),
            SectionHeader('Upcoming content',
                trailing: TextButton(onPressed: () => context.push('/projects/${project.id}/calendar'), child: const Text('Calendar'))),
            if (d.upcomingContent.isEmpty)
              const SectionCard(child: Text('No upcoming posts scheduled.'))
            else
              for (final post in d.upcomingContent.take(6)) PostTile(post: post),
          ]),
        ),
        const SectionHeader('Workspace'),
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.1,
          children: [
            for (final s in ProjectSection.all)
              SectionCard(
                padding: const EdgeInsets.all(10),
                onTap: () => context.push('/projects/${project.id}/${s.tab}'),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(s.icon, color: AppTheme.primary),
                  const SizedBox(height: 6),
                  // Two lines max so long labels never overflow a tile on small phones.
                  Text(s.label,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, height: 1.15)),
                ]),
              ),
          ],
        ),
        const SectionHeader('Recent activity'),
        activity.when(
          loading: () => const Padding(padding: EdgeInsets.all(16), child: LoadingView()),
          error: (e, _) => ErrorView(error: e, compact: true, onRetry: () => ref.invalidate(projectActivityProvider(project.id))),
          data: (items) => items.isEmpty
              ? const SectionCard(child: Text('No activity yet.'))
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
      ]),
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

class _Header extends StatelessWidget {
  const _Header({required this.project});
  final Project project;

  @override
  Widget build(BuildContext context) {
    final reauth = project.socialAccounts.where((a) => a.needsAttention).toList();
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(project.name, style: Theme.of(context).textTheme.titleLarge)),
          StatusChip(label: project.status.label, color: project.status.color),
        ]),
        if (project.description?.isNotEmpty ?? false) ...[
          const SizedBox(height: 6),
          Text(project.description!, style: Theme.of(context).textTheme.bodyMedium, maxLines: 3, overflow: TextOverflow.ellipsis),
        ],
        const SizedBox(height: 12),
        Wrap(spacing: 6, runSpacing: 6, children: [
          for (final a in project.socialAccounts)
            StatusChip(label: a.accountName, color: a.needsAttention ? AppTheme.error : a.platform.color, icon: a.platform.icon),
          if (project.socialAccounts.isEmpty)
            const StatusChip(label: 'No channels linked', color: AppTheme.textMuted, icon: Icons.link_off_rounded),
          StatusChip(label: project.settings.defaultTimezone, color: AppTheme.textSecondary, icon: Icons.public_rounded),
          if (project.settings.approvalRequired)
            const StatusChip(label: 'Approval required', color: AppTheme.warning, icon: Icons.verified_rounded),
        ]),
        if (reauth.isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppTheme.error.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              const Icon(Icons.link_off_rounded, color: AppTheme.error, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text('${reauth.map((a) => a.accountName).join(', ')} need re-authorization before posts can publish.')),
              TextButton(onPressed: () => context.push('/projects/${project.id}/accounts'), child: const Text('Fix')),
            ]),
          ),
        ],
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => context.push('/projects/${project.id}/approvals?send=1'),
              icon: const Icon(Icons.send_rounded, size: 16),
              label: const Text('Send for approval'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => context.push('/camera?projectId=${project.id}'),
              icon: const Icon(Icons.videocam_rounded, size: 16),
              label: const Text('Shoot'),
            ),
          ),
        ]),
      ]),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi(this.label, this.value, this.icon, this.color);
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => SectionCard(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Icon(icon, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('$value', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary), maxLines: 2),
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
        padding: const EdgeInsets.only(bottom: 8),
        child: SectionCard(
          padding: const EdgeInsets.all(12),
          onTap: () => context.push('/posts/${post.id}'),
          child: Row(children: [
            Container(
              width: 4,
              height: 40,
              decoration: BoxDecoration(color: post.status.color, borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(post.displayTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Row(children: [
                  for (final p in post.platforms) Padding(padding: const EdgeInsets.only(right: 4), child: Icon(p.icon, size: 14, color: p.color)),
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
