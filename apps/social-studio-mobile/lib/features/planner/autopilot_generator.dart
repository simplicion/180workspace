import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_exception.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/autopilot.dart';
import '../../data/models/project.dart';
import 'planner_providers.dart';

/// Autopilot calendar: the server's research → strategy → hooks & scripts → captions → critic agents,
/// grounded in the project's brand consciousness. Starts a job and follows it until the calendar is saved.
class AutopilotGenerator extends ConsumerStatefulWidget {
  const AutopilotGenerator({super.key, required this.project, required this.onUseClassic, this.pollInterval});
  final Project project;
  final VoidCallback onUseClassic;

  /// Test hook; defaults to 2 s.
  final Duration? pollInterval;

  @override
  ConsumerState<AutopilotGenerator> createState() => _AutopilotGeneratorState();
}

class _AutopilotGeneratorState extends ConsumerState<AutopilotGenerator> {
  static const _platformIds = BrandConsciousness.platforms;

  int _days = 30;
  DateTime _start = DateTime.now().add(const Duration(days: 1));
  late final Set<String> _platforms = {
    for (final a in widget.project.socialAccounts)
      for (final id in _platformIds.keys)
        if (a.platform.id.toLowerCase().startsWith(id.substring(0, 4)) ||
            (id == 'twitter' && a.platform.id.toLowerCase() == 'x'))
          id,
  };
  final _goals = TextEditingController();

  bool _starting = false;
  String? _jobId;
  AutopilotJob? _job;
  Object? _pollError;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _goals.dispose();
    super.dispose();
  }

  Future<void> _start_() async {
    if (_platforms.isEmpty) return showError(context, 'Choose at least one platform.');
    setState(() => _starting = true);
    try {
      final r = await ref.read(socialApiProvider).startAutopilot(
            widget.project.id,
            days: _days,
            startDate: _start,
            platforms: _platforms.toList(),
            goals: splitGoals(_goals.text),
          );
      if (!mounted) return;
      _follow(r.jobId);
    } on ApiException catch (e) {
      if (!mounted) return;
      final running = e.kind == ApiErrorKind.conflict ? _runningJobId(e) : null;
      if (running != null) {
        showInfo(context, 'A calendar is already being written for this project. Showing its progress.');
        _follow(running);
      } else {
        showError(context, e);
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  static String? _runningJobId(ApiException e) {
    final body = e.data;
    if (body is! Map) return null;
    final details = body['details'];
    final id = details is Map ? details['jobId'] : null;
    return id is String && id.isNotEmpty ? id : null;
  }

  static List<String> splitGoals(String text) =>
      text.split(RegExp(r'[\n,]')).map((g) => g.trim()).where((g) => g.isNotEmpty).take(5).toList();

  void _follow(String jobId) {
    setState(() {
      _jobId = jobId;
      _job = null;
      _pollError = null;
    });
    _poll();
  }

  Future<void> _poll() async {
    _timer?.cancel();
    final id = _jobId;
    if (id == null) return;
    try {
      final job = await ref.read(socialApiProvider).getAutopilotJob(widget.project.id, id);
      if (!mounted) return;
      setState(() {
        _job = job;
        _pollError = null;
      });
      if (job.isDone) {
        ref.invalidate(calendarsProvider);
        showInfo(context, 'Calendar ready: ${job.totalPieces ?? 0} pieces');
        context.pushReplacement('/planner/${job.calendarId}');
        return;
      }
      if (job.isFailed) return;
    } catch (e) {
      if (!mounted) return;
      // Network blips while following a job are not fatal: show the error and keep trying.
      setState(() => _pollError = e);
      if (e is ApiException && !e.isTransient) return;
    }
    _timer = Timer(widget.pollInterval ?? const Duration(seconds: 2), _poll);
  }

  @override
  Widget build(BuildContext context) {
    if (_jobId != null) return _progress(context);
    return ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 120), children: [
      SectionCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Autopilot', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(
            'Researches your niche and writes a hook, script, captions and visuals for every day, '
            'using this project\'s brand identity.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ]),
      ),
      const SectionHeader('Length'),
      SegmentedButton<int>(
        segments: const [
          ButtonSegment(value: 7, label: Text('7 days')),
          ButtonSegment(value: 14, label: Text('14 days')),
          ButtonSegment(value: 30, label: Text('30 days')),
        ],
        selected: {_days},
        onSelectionChanged: (s) => setState(() => _days = s.first),
      ),
      const SizedBox(height: 12),
      OutlinedButton.icon(
        icon: const Icon(Icons.event_rounded),
        label: Text('Starts ${fmtDate(_start)}'),
        onPressed: () async {
          final d = await showDatePicker(
            context: context,
            initialDate: _start,
            firstDate: DateTime.now().subtract(const Duration(days: 1)),
            lastDate: DateTime.now().add(const Duration(days: 365)),
          );
          if (d != null) setState(() => _start = d);
        },
      ),
      const SectionHeader('Platforms'),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final e in _platformIds.entries)
          FilterChip(
            label: Text(e.value),
            selected: _platforms.contains(e.key),
            onSelected: (on) => setState(() => on ? _platforms.add(e.key) : _platforms.remove(e.key)),
          ),
      ]),
      const SectionHeader('Goals'),
      TextField(
        controller: _goals,
        minLines: 1,
        maxLines: 4,
        decoration: fieldDecoration('What should this month achieve?',
            hint: 'e.g. 50 trial sign-ups, grow Reels reach', helper: 'Optional. Up to 5, one per line or comma separated'),
      ),
      const SizedBox(height: 20),
      ElevatedButton.icon(
        onPressed: _starting ? null : _start_,
        icon: const Icon(Icons.auto_awesome_rounded),
        label: Text(_starting ? 'Starting…' : 'Generate $_days-day calendar'),
      ),
      TextButton(onPressed: widget.onUseClassic, child: const Text('Use the classic generator instead')),
    ]);
  }

  Widget _progress(BuildContext context) {
    final job = _job;
    if (job != null && job.isFailed) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline_rounded, size: 40, color: AppTheme.error),
            const SizedBox(height: 12),
            Text('The calendar could not be finished', style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(job.errorMessage ?? 'The server stopped at "${job.stageLabel}".', textAlign: TextAlign.center),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: () => setState(() => _jobId = null), child: const Text('Try again')),
            TextButton(onPressed: widget.onUseClassic, child: const Text('Use the classic generator')),
          ]),
        ),
      );
    }
    final pct = job?.progress ?? 0;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(job?.stageLabel ?? 'Starting…', style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
        const SizedBox(height: 12),
        Semantics(
          label: 'Calendar progress',
          value: '$pct percent',
          child: LinearProgressIndicator(value: pct / 100, minHeight: 6),
        ),
        const SizedBox(height: 8),
        Text('$pct%', textAlign: TextAlign.center),
        if (job?.detail != null) ...[
          const SizedBox(height: 8),
          Text(job!.detail!, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
        ],
        const SizedBox(height: 16),
        Text(
          'This runs on the server. You can leave this screen; the calendar appears in Planner when it is done.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (_pollError != null) ...[
          const SizedBox(height: 12),
          ErrorView(error: _pollError!, compact: true, onRetry: _poll),
        ],
        const SizedBox(height: 12),
        TextButton(onPressed: () => context.go('/planner'), child: const Text('Back to Planner')),
      ]),
    );
  }
}
