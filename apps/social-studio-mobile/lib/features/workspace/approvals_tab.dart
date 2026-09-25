import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/project.dart';
import '../../data/models/review.dart';
import '../../data/models/social_post.dart';
import '../dashboard/studio_dashboard_screen.dart';
import '../projects/project_provider.dart';

/// Client approvals (web `tabs/ApprovalsTab.tsx` + `SendForApprovalModal.tsx`).
///
/// Sessions come from `GET /projects/:id` (`clientReviewSessions`) because the web's
/// `GET /reviews/sessions` endpoint does not exist.
class ApprovalsTab extends ConsumerStatefulWidget {
  const ApprovalsTab({super.key, required this.detail, this.openSendForm = false});
  final ProjectDetail detail;
  final bool openSendForm;

  @override
  ConsumerState<ApprovalsTab> createState() => _ApprovalsTabState();
}

class _ApprovalsTabState extends ConsumerState<ApprovalsTab> {
  Project get project => widget.detail.project;

  @override
  void initState() {
    super.initState();
    if (widget.openSendForm) WidgetsBinding.instance.addPostFrameCallback((_) => _send());
  }

  Future<void> _send() async {
    final clientId = project.primaryClientId;
    if (clientId == null) {
      showError(context, 'This project has no client. Review links are sent to a client, so add one to the project on the web first.');
      return;
    }
    final session = await showModalBottomSheet<ReviewSession>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      builder: (_) => _SendForApprovalSheet(project: project, clientId: clientId, posts: widget.detail.posts),
    );
    if (session == null || !mounted) return;
    ref.refreshProjectData(project.id);
    await _shareSheet(session);
  }

  Future<void> _shareSheet(ReviewSession s) => showModalBottomSheet<void>(
        context: context,
        backgroundColor: AppTheme.surface,
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('Review link ready', style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 8),
              SelectableText(s.shareUrl),
              const SizedBox(height: 16),
              _LinkActions(session: s),
            ]),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final sessions = [...widget.detail.reviewSessions]..sort((a, b) => (b.endDate ?? DateTime(0)).compareTo(a.endDate ?? DateTime(0)));
    final inReview = widget.detail.posts.where((p) => p.status == PostStatus.inReview || p.status == PostStatus.pendingReview).toList();
    return RefreshIndicator(
      onRefresh: () async => ref.refreshProjectData(project.id),
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 96), children: [
        ElevatedButton.icon(
          onPressed: _send,
          icon: const Icon(Icons.send_rounded),
          label: const Text('Send for client approval'),
        ),
        if (project.primaryClientId == null)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text('No client is attached to this project, so review links cannot be created.',
                style: TextStyle(color: AppTheme.warning)),
          ),
        SectionHeader('Review sessions (${sessions.length})'),
        if (sessions.isEmpty) const SectionCard(child: Text('No review links sent yet.')),
        for (final s in sessions)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SectionCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700))),
                  StatusChip(label: s.isExpired && s.status == ReviewStatus.pending ? 'Expired' : s.status.label,
                      color: s.isExpired && s.status == ReviewStatus.pending ? AppTheme.textMuted : s.status.color),
                ]),
                const SizedBox(height: 4),
                Text('Window ${fmtDate(s.startDate)} – ${fmtDate(s.endDate)} · expires ${fmtDate(s.expiresAt)}',
                    style: Theme.of(context).textTheme.labelSmall),
                if (s.clientNotes?.isNotEmpty ?? false) ...[
                  const SizedBox(height: 6),
                  Text('Client: ${s.clientNotes}'),
                ],
                if (s.comments.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('${s.comments.length} comment${s.comments.length == 1 ? '' : 's'} · ${s.comments.where((c) => !c.resolved).length} open',
                      style: Theme.of(context).textTheme.bodyMedium),
                ],
                const SizedBox(height: 8),
                _LinkActions(session: s),
              ]),
            ),
          ),
        SectionHeader('Posts in review (${inReview.length})'),
        if (inReview.isEmpty) const SectionCard(child: Text('No posts are waiting on the client.')),
        for (final p in inReview) PostTile(post: p),
      ]),
    );
  }
}

class _LinkActions extends StatelessWidget {
  const _LinkActions({required this.session});
  final ReviewSession session;

  @override
  Widget build(BuildContext context) => Wrap(spacing: 8, children: [
        OutlinedButton.icon(
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: session.shareUrl));
            if (context.mounted) showInfo(context, 'Link copied', color: AppTheme.success);
          },
          icon: const Icon(Icons.copy_rounded, size: 16),
          label: const Text('Copy'),
        ),
        OutlinedButton.icon(
          onPressed: () => SharePlus.instance.share(ShareParams(text: '${session.name}: ${session.shareUrl}')),
          icon: const Icon(Icons.share_rounded, size: 16),
          label: const Text('Share'),
        ),
        TextButton(onPressed: () => context.push('/review/${session.token}'), child: const Text('Preview')),
      ]);
}

class _SendForApprovalSheet extends ConsumerStatefulWidget {
  const _SendForApprovalSheet({required this.project, required this.clientId, required this.posts});
  final Project project;
  final String clientId;
  final List<SocialPost> posts;

  @override
  ConsumerState<_SendForApprovalSheet> createState() => _SendForApprovalSheetState();
}

class _SendForApprovalSheetState extends ConsumerState<_SendForApprovalSheet> {
  late final _name = TextEditingController(text: '${widget.project.name} review');
  DateTimeRange _range = DateTimeRange(start: DateTime.now(), end: DateTime.now().add(const Duration(days: 14)));
  int _expires = 14;
  bool _sending = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  List<SocialPost> get _covered => widget.posts
      .where((p) => p.scheduledFor != null && !p.scheduledFor!.isBefore(_range.start) && !p.scheduledFor!.isAfter(_range.end.add(const Duration(days: 1))))
      .toList();

  Future<void> _create() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _sending = true);
    final s = await guarded(
      context,
      () => ref.read(socialApiProvider).createReviewSession(
            clientId: widget.clientId,
            projectId: widget.project.id,
            name: _name.text.trim(),
            startDate: _range.start,
            endDate: _range.end,
            postIds: _covered.map((p) => p.id).toList(),
            expiresInDays: _expires,
          ),
    );
    if (!mounted) return;
    setState(() => _sending = false);
    if (s != null) Navigator.pop(context, s);
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(context).viewInsets.bottom + 16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Send for client approval', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(controller: _name, decoration: fieldDecoration('Title')),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            icon: const Icon(Icons.date_range_rounded),
            label: Text('${fmtDate(_range.start)} – ${fmtDate(_range.end)}'),
            onPressed: () async {
              final r = await showDateRangePicker(
                context: context,
                initialDateRange: _range,
                firstDate: DateTime.now().subtract(const Duration(days: 60)),
                lastDate: DateTime.now().add(const Duration(days: 365)),
              );
              if (r != null) setState(() => _range = r);
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            initialValue: _expires,
            decoration: fieldDecoration('Link expires after'),
            items: [for (final d in const [3, 7, 14, 30]) DropdownMenuItem(value: d, child: Text('$d days'))],
            onChanged: (v) => setState(() => _expires = v ?? 14),
          ),
          const SizedBox(height: 12),
          Text(
            '${_covered.length} post${_covered.length == 1 ? '' : 's'} of this project fall in the window. '
            'The server also includes every other post for this client in the same dates.',
            style: Theme.of(context).textTheme.labelSmall,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _sending ? null : _create,
            child: _sending
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Create review link'),
          ),
        ]),
      );
}
