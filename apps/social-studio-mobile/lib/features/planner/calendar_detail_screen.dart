import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/universal_skeleton.dart';
import '../../data/models/autopilot.dart';
import '../../data/models/content_calendar.dart';
import '../posts/platform_post_preview.dart';
import '../projects/project_provider.dart';
import 'carousel_sheet.dart';
import 'planner_providers.dart';
import 'raw_footage_upload.dart';

/// Calendar detail (web `content-calendar/[id]`): stats, goal, pillars, pieces by week.
class CalendarDetailScreen extends ConsumerWidget {
  const CalendarDetailScreen({super.key, required this.calendarId});
  final String calendarId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cal = ref.watch(calendarDetailProvider(calendarId));
    return Scaffold(
      appBar: AppBar(
        title: Text(cal.valueOrNull?.displayName ?? 'Calendar'),
        actions: [
          if (cal.hasValue)
            PopupMenuButton<String>(
              color: AppTheme.surfaceElevated,
              onSelected: (v) async {
                final c = cal.value!;
                if (v == 'extend') {
                  context.push('/planner/new', extra: c);
                } else if (v == 'delete') {
                  if (!await confirm(context, title: 'Delete calendar?', message: 'All ${c.totalPieces} pieces are removed.', action: 'Delete', destructive: true)) {
                    return;
                  }
                  if (!context.mounted) return;
                  final ok = await guarded(context, () async {
                    await ref.read(socialApiProvider).deleteCalendar(c.id);
                    return true;
                  });
                  if (ok == true && context.mounted) {
                    ref.invalidate(calendarsProvider);
                    context.pop();
                  }
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'extend', child: Text('Extend for next period')),
                PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: AppTheme.error))),
              ],
            ),
        ],
      ),
      body: AsyncBody<ContentCalendar>(
        value: cal,
        skeleton: SkeletonType.calendar,
        onRetry: () => ref.invalidate(calendarDetailProvider(calendarId)),
        builder: (c) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(calendarDetailProvider(calendarId)),
          child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 48), children: [
            SectionCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(c.displayName, style: Theme.of(context).textTheme.titleLarge)),
                  StatusChip(label: c.status.label, color: c.status.color),
                ]),
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  if (c.calendarDuration != null) StatusChip(label: c.calendarDuration!, color: AppTheme.textSecondary, icon: Icons.timelapse_rounded),
                  if (c.frequency != null) StatusChip(label: c.frequency!, color: AppTheme.textSecondary, icon: Icons.repeat_rounded),
                  StatusChip(label: '${c.totalPieces} pieces', color: AppTheme.accentBlue),
                  if (c.reelsCount > 0) StatusChip(label: '${c.reelsCount} reels', color: AppTheme.accent),
                  if (c.postsCount > 0) StatusChip(label: '${c.postsCount} posts', color: AppTheme.accentCyan),
                  if (c.carouselsCount > 0) StatusChip(label: '${c.carouselsCount} carousels', color: AppTheme.success),
                ]),
                if (c.engagementGoal?.isNotEmpty ?? false) ...[
                  const SizedBox(height: 10),
                  Text('Goal: ${c.engagementGoal}', style: Theme.of(context).textTheme.bodyMedium),
                ],
                if (c.contentPillars.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('Pillars: ${c.contentPillars.join(', ')}', style: Theme.of(context).textTheme.bodyMedium),
                ],
              ]),
            ),
            if (c.pieces.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 24),
                child: EmptyView(icon: Icons.hourglass_empty_rounded, title: 'No pieces yet', message: 'If the calendar is still processing, pull to refresh.'),
              ),
            for (final week in c.piecesByWeek.entries) ...[
              SectionHeader('Week ${week.key}'),
              for (final p in week.value) _PieceTile(calendar: c, piece: p),
            ],
          ]),
        ),
      ),
    );
  }
}

class _PieceTile extends StatelessWidget {
  const _PieceTile({required this.calendar, required this.piece});
  final ContentCalendar calendar;
  final CalendarPiece piece;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: SectionCard(
          padding: const EdgeInsets.all(12),
          onTap: () => showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            backgroundColor: AppTheme.surface,
            builder: (_) => PieceSheet(calendar: calendar, piece: piece),
          ),
          child: Row(children: [
            Container(width: 4, height: 40, decoration: BoxDecoration(color: piece.status.color, borderRadius: BorderRadius.circular(2))),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(piece.headline.isEmpty ? '(no headline)' : piece.headline,
                    maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(
                  [fmtDate(piece.dateScheduled), piece.platform, piece.contentType, piece.status.label].where((s) => s.isNotEmpty).join(' · '),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ]),
            ),
          ]),
        ),
      );
}

class PieceSheet extends ConsumerStatefulWidget {
  const PieceSheet({super.key, required this.calendar, required this.piece});
  final ContentCalendar calendar;
  final CalendarPiece piece;

  @override
  ConsumerState<PieceSheet> createState() => _PieceSheetState();
}

class _PieceSheetState extends ConsumerState<PieceSheet> {
  late PieceStatus _status = widget.piece.status;
  late CalendarPiece _currentPiece = widget.piece;
  bool _isEditing = false;
  bool _saving = false;
  bool _regenerating = false;

  late final _headline = TextEditingController(text: _currentPiece.headline);
  late final _adCopy = TextEditingController(text: _currentPiece.adCopyFull);
  late final _script = TextEditingController(text: _currentPiece.videoScriptOrHooks);
  late final _cta = TextEditingController(text: _currentPiece.callToAction);
  late final _hashtags = TextEditingController(text: _currentPiece.hashtags.join(' '));
  late final _visualBrief = TextEditingController(text: _currentPiece.visualAssetsBrief);

  /// Autopilot pieces store a structured brief (JSON) in `videoScriptOrHooks`; older ones are plain text.
  PieceBrief? get _brief => PieceBrief.parse(_script.text);
  String? get _hookLine => _brief?.openingHook ?? _script.text.split('\n').firstOrNull;
  String get _prompterScript {
    final b = _brief;
    if (b == null) return _script.text;
    return b.hasScript ? b.teleprompterText : '';
  }

  bool get _isCarousel =>
      _currentPiece.contentType.toLowerCase().contains('carousel') || _brief?.format?.toLowerCase().contains('carousel') == true;

  List<Widget> _briefBlocks(PieceBrief b) => [
        _block('Hook (say this)', b.spokenHook ?? b.hook ?? ''),
        _block('On-screen hook', b.onScreenHook ?? ''),
        _block('Script${b.durationSec == null ? '' : ' · ~${b.durationSec}s'}',
            [for (var i = 0; i < b.body.length; i++) '${i + 1}. ${b.body[i].beat}'].join('\n')),
        _block('Loop back', b.retentionLoop ?? ''),
        _block('Spoken CTA', b.cta ?? ''),
        _block('Shot notes', b.shotNotes.map((n) => '• $n').join('\n')),
        _block(
            'Carousel${b.carouselTitle == null ? '' : ': ${b.carouselTitle}'}',
            [
              for (var i = 0; i < b.carouselSlides.length; i++)
                '${i + 1}. ${b.carouselSlides[i].headline}${b.carouselSlides[i].body == null ? '' : '\n   ${b.carouselSlides[i].body}'}',
            ].join('\n')),
        _block('Visual idea', b.visualBrief ?? ''),
      ];

  @override
  void dispose() {
    _headline.dispose();
    _adCopy.dispose();
    _script.dispose();
    _cta.dispose();
    _hashtags.dispose();
    _visualBrief.dispose();
    super.dispose();
  }

  Future<void> _setStatus(PieceStatus s) async {
    final outcome = await guarded(
        context, () => ref.read(socialApiProvider).updatePiece(widget.calendar.id, _currentPiece.id, {'status': s.id}));
    if (outcome == null || !mounted) return;
    setState(() => _status = s);
    showMutation(context, outcome, 'Status updated');
    ref.invalidate(calendarDetailProvider(widget.calendar.id));
  }

  Future<void> _saveChanges() async {
    setState(() => _saving = true);
    final tags = _hashtags.text
        .split(RegExp(r'[\s,]+'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .map((s) => s.startsWith('#') ? s : '#$s')
        .toList();

    final outcome = await guarded(
      context,
      () => ref.read(socialApiProvider).updatePiece(widget.calendar.id, _currentPiece.id, {
        'headline': _headline.text.trim(),
        'adCopyFull': _adCopy.text.trim(),
        'videoScriptOrHooks': _script.text.trim(),
        'callToAction': _cta.text.trim(),
        'hashtags': tags,
        'visualAssetsBrief': _visualBrief.text.trim(),
      }),
    );
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (outcome != null) _isEditing = false;
    });
    if (outcome != null) {
      showSuccess(context, 'Piece updated');
      ref.invalidate(calendarDetailProvider(widget.calendar.id));
    }
  }

  Future<void> _regenerateWithAi() async {
    final projectId = widget.calendar.projectId ?? ref.read(activeProjectProvider).valueOrNull?.id;
    if (projectId == null) {
      showError(context, 'Project context is required for AI regeneration.');
      return;
    }

    final instruction = await promptText(
      context,
      title: 'AI Autopilot Rewrite',
      label: 'Specific guidance (optional)',
      action: 'Rewrite Piece',
    );
    if (!mounted) return;

    setState(() => _regenerating = true);
    final rewritten = await guarded(
      context,
      () => ref.read(socialApiProvider).regeneratePiece(
            projectId,
            _currentPiece.id,
            instruction: instruction?.trim().isEmpty ?? true ? null : instruction!.trim(),
          ),
    );
    if (!mounted) return;
    setState(() => _regenerating = false);
    if (rewritten != null) {
      setState(() {
        _currentPiece = rewritten;
        _headline.text = rewritten.headline;
        _adCopy.text = rewritten.adCopyFull;
        _script.text = rewritten.videoScriptOrHooks;
        _cta.text = rewritten.callToAction;
        _hashtags.text = rewritten.hashtags.join(' ');
        _visualBrief.text = rewritten.visualAssetsBrief;
      });
      showSuccess(context, 'Piece rewritten by AI Autopilot!');
      ref.invalidate(calendarDetailProvider(widget.calendar.id));
    }
  }

  void _showPreview() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        builder: (_, scroll) => SingleChildScrollView(
          controller: scroll,
          padding: const EdgeInsets.only(bottom: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
                child: Row(
                  children: [
                    const Icon(Icons.devices_rounded, color: AppTheme.primary),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text('Piece Mockup Preview', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                    IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
              ),
              PlatformPostPreview(
                caption: '${_adCopy.text}\n\n${_cta.text}\n\n${_hashtags.text}'.trim(),
                title: _headline.text.isNotEmpty ? _headline.text : null,
                hook: _hookLine,
                mediaType: _currentPiece.contentType.toLowerCase().contains('carousel')
                    ? 'carousel'
                    : _currentPiece.contentType.toLowerCase().contains('reel') || _currentPiece.contentType.toLowerCase().contains('video')
                        ? 'video'
                        : 'image',
                accountName: widget.calendar.displayName,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _block(String label, String text) => text.trim().isEmpty
      ? const SizedBox.shrink()
      : Padding(
          padding: const EdgeInsets.only(top: 14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(label.toUpperCase(), style: Theme.of(context).textTheme.labelSmall)),
              IconButton(
                tooltip: 'Copy',
                icon: const Icon(Icons.copy_rounded, size: 16),
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: text));
                  if (mounted) showInfo(context, '$label copied');
                },
              ),
            ]),
            SelectableText(text),
          ]),
        );

  @override
  Widget build(BuildContext context) {
    final p = _currentPiece;
    final projectId = widget.calendar.projectId ?? ref.watch(activeProjectProvider).valueOrNull?.id;
    final pieceQuery = 'projectId=${projectId ?? ''}&calendarId=${widget.calendar.id}&pieceId=${p.id}'
        '${p.dateScheduled == null ? '' : '&date=${Uri.encodeQueryComponent(p.dateScheduled!.toIso8601String())}'}';
    final prefill = {
      'title': _headline.text,
      'hook': _hookLine,
      'content': [_adCopy.text, if (_cta.text.isNotEmpty) _cta.text, if (_hashtags.text.isNotEmpty) _hashtags.text].join('\n\n'),
      'platforms': [p.platform],
      'mediaType': p.contentType.toLowerCase().contains('carousel')
          ? 'carousel'
          : p.contentType.toLowerCase().contains('reel') || p.contentType.toLowerCase().contains('video')
              ? 'video'
              : 'image',
    };

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.88,
      maxChildSize: 0.96,
      builder: (_, scroll) => ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(16, 16, 16, 32), children: [
        Row(
          children: [
            Expanded(
              child: Text(p.headline.isEmpty ? '(No headline)' : p.headline, style: Theme.of(context).textTheme.titleLarge),
            ),
            IconButton(
              tooltip: _isEditing ? 'Cancel editing' : 'Edit piece',
              icon: Icon(_isEditing ? Icons.close_rounded : Icons.edit_rounded, color: AppTheme.primary),
              onPressed: () => setState(() => _isEditing = !_isEditing),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(spacing: 6, runSpacing: 6, children: [
          if (p.platform.isNotEmpty) StatusChip(label: p.platform, color: AppTheme.accentBlue),
          if (p.contentType.isNotEmpty) StatusChip(label: p.contentType, color: AppTheme.accent),
          if (p.pillar.isNotEmpty) StatusChip(label: p.pillar, color: AppTheme.textSecondary),
          StatusChip(label: fmtDate(p.dateScheduled), color: AppTheme.textSecondary, icon: Icons.event_rounded),
          if (p.postingTimeTz.isNotEmpty) StatusChip(label: p.postingTimeTz, color: AppTheme.textSecondary, icon: Icons.schedule_rounded),
          if (p.estimatedImpressions != null) StatusChip(label: '~${p.estimatedImpressions} impressions', color: AppTheme.textSecondary),
        ]),
        const SizedBox(height: 12),
        DropdownButtonFormField<PieceStatus>(
          initialValue: PieceStatus.settable.contains(_status) ? _status : null,
          decoration: fieldDecoration('Status'),
          items: [for (final s in PieceStatus.settable) DropdownMenuItem(value: s, child: Text(s.label))],
          onChanged: (s) => s == null || s == _status ? null : _setStatus(s),
        ),
        const SizedBox(height: 12),

        // Action Toolbar
        Row(children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                context.push('/posts/new?$pieceQuery', extra: prefill);
              },
              icon: const Icon(Icons.send_rounded, size: 16),
              label: const Text('To Post'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                context.push('/camera', extra: {'hook': prefill['hook'] ?? p.headline, 'script': _prompterScript, 'projectId': projectId});
              },
              icon: const Icon(Icons.videocam_rounded, size: 16),
              label: const Text('Shoot'),
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton.icon(
            onPressed: _showPreview,
            icon: const Icon(Icons.remove_red_eye_rounded, size: 16),
            label: const Text('Preview'),
          ),
        ]),
        if (p.contentType.toLowerCase().contains('video') ||
            p.contentType.toLowerCase().contains('reel') ||
            p.contentType.toLowerCase().contains('short') ||
            p.contentType.toLowerCase().contains('tiktok')) ...[
          const SizedBox(height: 10),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            onPressed: () async {
              Navigator.pop(context);
              final picker = ImagePicker();
              final choice = await showModalBottomSheet<String>(
                context: context,
                backgroundColor: AppTheme.surfaceElevated,
                builder: (ctx) => SafeArea(
                  child: Wrap(children: [
                    ListTile(
                      leading: const Icon(Icons.video_library_rounded, color: AppTheme.primary),
                      title: const Text('Pick Raw Footage from Gallery'),
                      onTap: () => Navigator.pop(ctx, 'gallery'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.videocam_rounded, color: AppTheme.accent),
                      title: const Text('Record with Teleprompter Camera'),
                      onTap: () => Navigator.pop(ctx, 'camera'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.cloud_upload_rounded),
                      title: const Text('Send raw footage to my editor'),
                      subtitle: const Text('Uploads it to this piece for editing on the desktop app'),
                      onTap: () => Navigator.pop(ctx, 'upload'),
                    ),
                  ]),
                ),
              );

              if (choice == 'camera' && context.mounted) {
                context.push('/camera', extra: {
                  'hook': prefill['hook'] ?? p.headline,
                  'script': _prompterScript,
                  'projectId': projectId,
                  'pieceId': p.id,
                });
              } else if (choice == 'upload') {
                final vid = await picker.pickVideo(source: ImageSource.gallery);
                if (vid != null && context.mounted) await uploadRawFootage(context, ref, p.id, vid.path);
              } else if (choice == 'gallery') {
                final vid = await picker.pickVideo(source: ImageSource.gallery);
                if (vid != null && context.mounted) {
                  context.push('/studio/session', extra: {
                    'sourcePath': vid.path,
                    'projectId': projectId,
                    'pieceId': p.id,
                    'hook': prefill['hook'] ?? p.headline,
                    'script': _prompterScript,
                  });
                }
              }
            },
            icon: const Icon(Icons.movie_creation_rounded, size: 18),
            label: const Text('🎬 Edit in 180 Media Studio'),
          ),
        ],
        if (_isCarousel && projectId != null) ...[
          const SizedBox(height: 10),
          FilledButton.tonalIcon(
            onPressed: () => showCarouselSheet(context, projectId: projectId, pieceId: p.id, title: p.headline),
            icon: const Icon(Icons.view_carousel_rounded, size: 18),
            label: const Text('Design carousel slides'),
          ),
        ],
        const SizedBox(height: 10),

        // AI Autopilot Rewrite Button
        FilledButton.tonalIcon(
          onPressed: _regenerating ? null : _regenerateWithAi,
          icon: _regenerating
              ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.auto_awesome_rounded, size: 16, color: AppTheme.primary),
          label: Text(_regenerating ? 'AI Autopilot Writing…' : 'AI Autopilot Rewrite Piece'),
        ),

        // Editable Form or Display Blocks
        if (_isEditing) ...[
          const SizedBox(height: 16),
          TextField(controller: _headline, decoration: fieldDecoration('Headline')),
          const SizedBox(height: 12),
          if (_brief == null)
            TextField(controller: _script, minLines: 2, maxLines: 6, decoration: fieldDecoration('Script / Hooks'))
          else
            const Text('The hook and script were written by Autopilot. Use "AI Autopilot Rewrite" with an instruction to change them.'),
          const SizedBox(height: 12),
          TextField(controller: _adCopy, minLines: 4, maxLines: 10, decoration: fieldDecoration('Full Caption / Ad Copy')),
          const SizedBox(height: 12),
          TextField(controller: _cta, decoration: fieldDecoration('Call to Action')),
          const SizedBox(height: 12),
          TextField(controller: _hashtags, decoration: fieldDecoration('Hashtags')),
          const SizedBox(height: 12),
          TextField(controller: _visualBrief, minLines: 2, maxLines: 4, decoration: fieldDecoration('Visual Brief')),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _saving ? null : _saveChanges,
            child: _saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save Changes'),
          ),
        ] else ...[
          if (_brief case final b?) ..._briefBlocks(b) else _block('Script / hooks', _script.text),
          _block('Caption', _adCopy.text),
          _block('Call to action', _cta.text),
          _block('Hashtags', _hashtags.text),
          _block('Visual brief', _visualBrief.text),
          _block('Notes', p.notes),
        ],
      ]),
    );
  }
}
