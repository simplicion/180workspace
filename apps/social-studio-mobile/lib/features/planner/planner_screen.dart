import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/universal_skeleton.dart';
import '../../data/models/content_calendar.dart';
import '../dashboard/studio_dashboard_screen.dart';
import '../projects/project_provider.dart';
import 'planner_providers.dart';

/// Planner tab: AI content calendars (web `/content-calendar`). Calendars for the active
/// project are shown first; calendars not tied to a project follow.
class PlannerScreen extends ConsumerStatefulWidget {
  const PlannerScreen({super.key});

  @override
  ConsumerState<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends ConsumerState<PlannerScreen> {
  CalendarStatus? _status;

  @override
  Widget build(BuildContext context) {
    final calendars = ref.watch(calendarsProvider);
    final projectId = ref.watch(activeProjectProvider).valueOrNull?.id;
    return Scaffold(
      appBar: workspaceAppBar(context, ref),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'planner.new',
        onPressed: () => context.push('/planner/new'),
        icon: const Icon(Icons.auto_awesome_rounded),
        label: const Text('Generate calendar'),
      ),
      body: Column(children: [
        SizedBox(
          height: 52,
          child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), children: [
            ChoiceChip(label: const Text('All'), selected: _status == null, onSelected: (_) => setState(() => _status = null)),
            for (final s in CalendarStatus.filters)
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: ChoiceChip(label: Text(s.label), selected: _status == s, onSelected: (_) => setState(() => _status = s)),
              ),
          ]),
        ),
        Expanded(
          child: AsyncBody<List<ContentCalendar>>(
            value: calendars,
            skeleton: SkeletonType.projects,
            onRetry: () => ref.invalidate(calendarsProvider),
            builder: (all) {
              final list = all.where((c) => _status == null || c.status == _status).toList();
              if (list.isEmpty) {
                return EmptyView(
                  icon: Icons.calendar_month_rounded,
                  title: all.isEmpty ? 'No content calendars yet' : 'No calendars with this status',
                  message: 'Generate a month of platform-ready ideas from your brand in about a minute.',
                  actionLabel: 'Generate calendar',
                  onAction: () => context.push('/planner/new'),
                );
              }
              final mine = list.where((c) => projectId != null && c.projectId == projectId).toList();
              final rest = list.where((c) => !mine.contains(c)).toList();
              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(calendarsProvider),
                child: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 96), children: [
                  if (mine.isNotEmpty) ...[
                    const SectionHeader('This project'),
                    for (final c in mine) _CalendarCard(calendar: c),
                    const SectionHeader('Other calendars'),
                  ],
                  for (final c in rest) _CalendarCard(calendar: c),
                ]),
              );
            },
          ),
        ),
      ]),
    );
  }
}

class _CalendarCard extends StatelessWidget {
  const _CalendarCard({required this.calendar});
  final ContentCalendar calendar;

  @override
  Widget build(BuildContext context) {
    final c = calendar;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SectionCard(
        onTap: () => context.push('/planner/${c.id}'),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(c.displayName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
            StatusChip(label: c.status.label, color: c.status.color),
          ]),
          const SizedBox(height: 4),
          Text(
            [
              if (c.industry?.isNotEmpty ?? false) c.industry!,
              if (c.calendarDuration != null) c.calendarDuration!,
              if (c.frequency != null) c.frequency!,
            ].join(' · '),
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 10),
          Row(children: [
            const Icon(Icons.layers_rounded, size: 14, color: AppTheme.textSecondary),
            const SizedBox(width: 4),
            Text('${c.totalPieces} pieces', style: Theme.of(context).textTheme.labelSmall),
            const SizedBox(width: 12),
            const Icon(Icons.event_rounded, size: 14, color: AppTheme.textSecondary),
            const SizedBox(width: 4),
            Flexible(
              child: Text('${fmtDate(c.startDate)} – ${fmtDate(c.endDate)}',
                  style: Theme.of(context).textTheme.labelSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(c.platforms.take(3).join(', '),
                  style: Theme.of(context).textTheme.labelSmall, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.end),
            ),
          ]),
        ]),
      ),
    );
  }
}
