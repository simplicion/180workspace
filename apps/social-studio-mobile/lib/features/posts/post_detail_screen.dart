import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/platform.dart';
import '../../data/models/social_post.dart';
import '../../data/models/task.dart';
import '../../data/models/user_assisted_publish_package.dart';
import '../projects/project_provider.dart';
import 'finish_publishing_sheet.dart';
import 'platform_post_preview.dart';
import 'post_providers.dart';

Future<void> openExternal(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null || !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    if (context.mounted) showError(context, 'Could not open $url');
  }
}

void _showPostPreview(BuildContext context, SocialPost post) {
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
                    child: Text('Channel Mockup', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
            ),
            PlatformPostPreview(
              caption: post.content,
              title: post.title,
              hook: post.hook,
              mediaUrls: post.mediaUrls.isNotEmpty ? post.mediaUrls : [if (post.finalVideoUrl != null) post.finalVideoUrl!],
              mediaType: post.mediaType,
              selectedPlatform: post.platforms.firstOrNull ?? SocialPlatform.instagram,
              accountName: post.accountName ?? post.projectName,
              firstComment: post.firstComment,
            ),
          ],
        ),
      ),
    ),
  );
}

/// A single post: content, variants, publishing state, review comments, footage and editing.
class PostDetailScreen extends ConsumerWidget {
  const PostDetailScreen({super.key, required this.postId});
  final String postId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final post = ref.watch(postDetailProvider(postId));
    return Scaffold(
      appBar: AppBar(
        title: Text(post.valueOrNull?.displayTitle ?? 'Post', overflow: TextOverflow.ellipsis),
        actions: [
          if (post.hasValue) ...[
            IconButton(
              tooltip: 'Platform Preview',
              icon: const Icon(Icons.remove_red_eye_rounded),
              onPressed: () => _showPostPreview(context, post.value!),
            ),
            IconButton(
              tooltip: 'Edit',
              icon: const Icon(Icons.edit_rounded),
              onPressed: () => context.push('/posts/$postId/edit'),
            ),
          ],
        ],
      ),
      body: AsyncBody<SocialPost>(
        value: post,
        onRetry: () => ref.invalidate(postDetailProvider(postId)),
        builder: (p) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(postDetailProvider(postId)),
          child: _PostBody(post: p),
        ),
      ),
    );
  }
}

class _PostBody extends ConsumerStatefulWidget {
  const _PostBody({required this.post});
  final SocialPost post;

  @override
  ConsumerState<_PostBody> createState() => _PostBodyState();
}

class _PostBodyState extends ConsumerState<_PostBody> {
  String? _busy;
  double? _progress;

  SocialPost get p => widget.post;

  void _refresh() {
    ref.refreshPost(p.id, projectId: p.projectId);
    if (p.projectId != null) ref.refreshProjectData(p.projectId!);
  }

  Future<void> _run(String label, Future<void> Function() action) async {
    setState(() => _busy = label);
    await guarded(context, action);
    if (mounted) setState(() => _busy = null);
  }

  Future<void> _openFinishPublishingSheet() async {
    final xVariant = p.variants.where((v) => v.platform == SocialPlatform.x).firstOrNull;
    final redditVariant = p.variants.where((v) => v.platform == SocialPlatform.reddit).firstOrNull;
    final videoUrl = p.finalVideoUrl ?? p.mediaUrls.where((u) => u.endsWith('.mp4')).firstOrNull ?? p.mediaUrls.firstOrNull;

    final redditMeta = redditVariant?.platformMeta ?? {};

    final package = UserAssistedPublishPackage(
      id: p.id,
      projectId: p.projectId ?? '',
      calendarItemId: p.calendarPieceId,
      mediaPath: videoUrl,
      title: p.title,
      caption: p.content,
      xPayload: XPublishPayload(
        text: xVariant?.customContent?.isNotEmpty == true ? xVariant!.customContent! : p.content,
        mediaPath: videoUrl,
        projectId: p.projectId,
      ),
      redditPayload: RedditPublishPayload(
        subreddit: redditMeta['subreddit']?.toString() ?? 'socialmedia',
        title: redditMeta['title']?.toString() ?? ((p.title?.isNotEmpty ?? false) ? p.title! : p.content),
        body: redditVariant?.customContent?.isNotEmpty == true ? redditVariant!.customContent! : p.content,
        mediaPath: videoUrl,
        projectId: p.projectId,
      ),
    );

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => FinishPublishingSheet(
        package: package,
        targetPlatforms: p.platforms.where((pl) => pl.isUserAssisted).toSet(),
        onStatusUpdated: (platform, status) => _refresh(),
      ),
    );
    _refresh();
  }

  Future<void> _publish() => _run('publish', () async {
        final api = ref.read(socialApiProvider);
        final assistedPlatforms = p.platforms.where((pl) => pl.isUserAssisted).toList();
        final apiPlatforms = p.platforms.where((pl) => !pl.isUserAssisted).toList();

        // If ONLY assisted platforms are selected (e.g. X and/or Reddit only), open FinishPublishingSheet directly
        if (apiPlatforms.isEmpty && assistedPlatforms.isNotEmpty) {
          await _openFinishPublishingSheet();
          return;
        }

        final readiness = await api.validatePublish(p.id);
        if (!mounted) return;
        if (!readiness.isReady) {
          await showDialog<void>(
            context: context,
            builder: (ctx) => AlertDialog(
              backgroundColor: AppTheme.surfaceElevated,
              title: const Text('Not ready to publish'),
              content: Text(readiness.issues.isEmpty ? 'The server reported the post is not ready.' : '• ${readiness.issues.join('\n• ')}'),
              actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
            ),
          );
          return;
        }
        final ok = await confirm(context,
            title: 'Publish now?', message: 'This posts to ${p.platforms.map((x) => x.label).join(', ')} immediately.', action: 'Publish');
        if (!ok) return;
        final result = await api.publish(p.id);
        _refresh();
        if (!mounted) return;
        await showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppTheme.surfaceElevated,
            title: Text('Publish: ${result.status}'),
            content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (result.message.isNotEmpty) Text(result.message),
              for (final e in result.publishedLinks.entries)
                Text('✓ ${e.key}: ${e.value}', style: const TextStyle(color: AppTheme.success)),
              for (final e in result.errors.entries) Text('✗ ${e.key}: ${e.value}', style: const TextStyle(color: AppTheme.error)),
            ]),
            actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
          ),
        );

        // If user also selected X or Reddit in a hybrid post, open the sheet after API publishing
        if (assistedPlatforms.isNotEmpty && mounted) {
          await _openFinishPublishingSheet();
        }
      });

  Future<void> _uploadDeliverable() async {
    final file = await ImagePicker().pickVideo(source: ImageSource.gallery);
    if (file == null || !mounted) return;
    final notes = await promptText(context, title: 'Notes for the reviewer', label: 'Optional', action: 'Upload', maxLines: 3);
    if (notes == null || !mounted) return;
    setState(() {
      _busy = 'upload';
      _progress = 0;
    });
    final updated = await guarded(
      context,
      () => ref.read(socialApiProvider).submitForApproval(p.id, videoPath: file.path, notes: notes, onProgress: (s, t) {
        if (mounted && t > 0) setState(() => _progress = s / t);
      }),
    );
    if (!mounted) return;
    setState(() {
      _busy = null;
      _progress = null;
    });
    if (updated != null) {
      showInfo(context, 'Uploaded. The post is now ${updated.status.label}.', color: AppTheme.success);
      _refresh();
    }
  }

  Future<void> _addFootageLink() async {
    final url = await promptText(context, title: 'Add raw footage link', label: 'Drive, Dropbox, WeTransfer… URL', action: 'Add');
    if (url == null || url.isEmpty || !mounted) return;
    if (Uri.tryParse(url)?.hasScheme != true) {
      showError(context, 'Enter a full URL starting with https://');
      return;
    }
    await _run('footage', () async {
      await ref.read(socialApiProvider).submitFootage(p.id, links: [ExternalLink(url: url)]);
      _refresh();
      if (mounted) showInfo(context, 'Footage link added', color: AppTheme.success);
    });
  }

  Future<void> _assignEditor() async {
    final body = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      builder: (_) => _AssignEditorSheet(post: p),
    );
    if (body == null || !mounted) return;
    await _run('assign', () async {
      await ref.read(socialApiProvider).assignEditor(p.id, body);
      _refresh();
      if (mounted) showInfo(context, 'Editing task created', color: AppTheme.success);
    });
  }

  Future<void> _repurpose() async {
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      helpText: 'Schedule the copy for',
    );
    if (d == null || !mounted) return;
    await _run('repurpose', () async {
      final copy = await ref.read(socialApiProvider).repurpose(p.id, newScheduleDate: d);
      _refresh();
      if (mounted) context.push('/posts/${copy.id}');
    });
  }

  Future<void> _retry(SocialPlatform platform) => _run('retry', () async {
        await ref.read(socialApiProvider).retryVariant(p.id, platform.id);
        _refresh();
        if (mounted) showInfo(context, 'Retried ${platform.label}');
      });

  @override
  Widget build(BuildContext context) {
    final errors = p.platformErrors;
    final busy = _busy != null;
    return ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 48), children: [
      SectionCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
            StatusChip(label: p.status.label, color: p.status.color),
            if (p.versionNumber > 1) StatusChip(label: 'v${p.versionNumber}', color: AppTheme.textSecondary),
            if (p.isEvergreen) const StatusChip(label: 'Evergreen', color: AppTheme.success, icon: Icons.autorenew_rounded),
            if (p.mediaType != null) StatusChip(label: p.mediaType!, color: AppTheme.textSecondary),
            for (final pl in p.platforms) StatusChip(label: pl.label, color: pl.color, icon: pl.icon),
          ]),
          const SizedBox(height: 10),
          Text(p.displayTitle, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 6),
          Text(
            [
              if (p.projectName != null) p.projectName!,
              if (p.accountName != null) 'from ${p.accountName}',
              p.scheduledFor == null ? 'Not scheduled' : 'Scheduled ${fmtDateTime(p.scheduledFor)}',
              if (p.publishedAt != null) 'Published ${fmtDateTime(p.publishedAt)}',
            ].join(' · '),
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ]),
      ),
      if (busy)
        Padding(padding: const EdgeInsets.only(top: 12), child: LinearProgressIndicator(value: _progress)),
      const SizedBox(height: 12),
      Wrap(spacing: 8, runSpacing: 8, children: [
        ElevatedButton.icon(
          onPressed: busy ? null : _publish,
          icon: const Icon(Icons.send_rounded, size: 18),
          label: const Text('Publish'),
        ),
        if (p.platforms.any((pl) => pl.isUserAssisted))
          OutlinedButton.icon(
            onPressed: busy ? null : _openFinishPublishingSheet,
            icon: const Icon(Icons.open_in_new_rounded, size: 18),
            label: const Text('Finish in X / Reddit'),
          ),
        OutlinedButton.icon(
          onPressed: busy ? null : () => context.push('/studio/session?postId=${p.id}${p.projectId == null ? '' : '&projectId=${p.projectId}'}'),
          icon: const Icon(Icons.auto_awesome_rounded, size: 18),
          label: const Text('Edit in Studio'),
        ),
        OutlinedButton.icon(
          onPressed: busy ? null : _uploadDeliverable,
          icon: const Icon(Icons.upload_rounded, size: 18),
          label: const Text('Upload final video'),
        ),
        OutlinedButton.icon(
          onPressed: busy ? null : _assignEditor,
          icon: const Icon(Icons.person_add_alt_rounded, size: 18),
          label: const Text('Assign editor'),
        ),
        OutlinedButton.icon(
          onPressed: busy ? null : _repurpose,
          icon: const Icon(Icons.copy_all_rounded, size: 18),
          label: const Text('Repurpose'),
        ),
      ]),
      if (p.revisionNotes?.isNotEmpty ?? false) ...[
        const SectionHeader('Revision notes'),
        SectionCard(borderColor: AppTheme.warning.withValues(alpha: 0.5), child: Text(p.revisionNotes!)),
      ],
      if (errors.isNotEmpty) ...[
        const SectionHeader('Publishing errors'),
        SectionCard(
          borderColor: AppTheme.error.withValues(alpha: 0.5),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            for (final e in errors.entries)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(children: [
                  Expanded(child: Text('${e.key}: ${e.value}', style: const TextStyle(color: AppTheme.error))),
                  if (SocialPlatform.parse(e.key) != SocialPlatform.unknown)
                    TextButton(onPressed: busy ? null : () => _retry(SocialPlatform.parse(e.key)), child: const Text('Retry')),
                ]),
              ),
          ]),
        ),
      ],
      if (p.finalVideoUrl != null || p.thumbnailUrl != null || p.mediaUrls.isNotEmpty) ...[
        const SectionHeader('Media'),
        if (p.thumbnailUrl != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(p.thumbnailUrl!, height: 200, fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const SizedBox.shrink()),
          ),
        if (p.finalVideoUrl != null)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.movie_rounded, color: AppTheme.success),
            title: const Text('Final video'),
            subtitle: Text(p.finalVideoUrl!, maxLines: 1, overflow: TextOverflow.ellipsis),
            onTap: () => openExternal(context, p.finalVideoUrl!),
          ),
        for (final url in p.mediaUrls)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.attachment_rounded),
            title: Text(url, maxLines: 1, overflow: TextOverflow.ellipsis),
            onTap: () => openExternal(context, url),
          ),
      ],
      const SectionHeader('Caption'),
      SectionCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (p.hook != null) ...[
            Text('HOOK', style: Theme.of(context).textTheme.labelSmall),
            Text(p.hook!, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
          ],
          SelectableText(p.content),
          if (p.objective != null) ...[
            const SizedBox(height: 10),
            Text('Objective: ${p.objective}', style: Theme.of(context).textTheme.bodyMedium),
          ],
          if (p.firstComment != null) ...[
            const SizedBox(height: 6),
            Text('First comment: ${p.firstComment}', style: Theme.of(context).textTheme.bodyMedium),
          ],
        ]),
      ),
      if (p.variants.isNotEmpty) ...[
        const SectionHeader('Per-platform'),
        for (final v in p.variants)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SectionCard(
              padding: const EdgeInsets.all(12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Icon(v.platform.icon, color: v.platform.color, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text(v.platform.label, style: const TextStyle(fontWeight: FontWeight.w600))),
                  if (v.status != null) StatusChip(label: v.status!, color: v.status == 'failed' ? AppTheme.error : AppTheme.textSecondary),
                ]),
                if (v.customContent?.isNotEmpty ?? false) Padding(padding: const EdgeInsets.only(top: 6), child: Text(v.customContent!)),
                if (v.errorMessage != null)
                  Row(children: [
                    Expanded(child: Text(v.errorMessage!, style: const TextStyle(color: AppTheme.error))),
                    TextButton(onPressed: busy ? null : () => _retry(v.platform), child: const Text('Retry')),
                  ]),
                if (v.publishedUrl != null)
                  TextButton.icon(
                    onPressed: () => openExternal(context, v.publishedUrl!),
                    icon: const Icon(Icons.open_in_new_rounded, size: 16),
                    label: const Text('View live post'),
                  ),
              ]),
            ),
          ),
      ],
      if (p.publishedLinks.isNotEmpty) ...[
        const SectionHeader('Live links'),
        for (final e in p.publishedLinks.entries)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(SocialPlatform.parse(e.key).icon, color: SocialPlatform.parse(e.key).color),
            title: Text(e.key),
            subtitle: Text(e.value, maxLines: 1, overflow: TextOverflow.ellipsis),
            onTap: () => openExternal(context, e.value),
          ),
      ],
      SectionHeader('Raw footage',
          trailing: TextButton.icon(
              onPressed: busy ? null : _addFootageLink, icon: const Icon(Icons.add_link_rounded, size: 16), label: const Text('Add link'))),
      if (p.rawMediaUrls.isEmpty && p.externalStorageLinks.isEmpty)
        const SectionCard(child: Text('No footage yet. Shoot in Studio, or add a cloud link.'))
      else ...[
        for (final url in p.rawMediaUrls)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.video_file_rounded),
            title: Text(url, maxLines: 1, overflow: TextOverflow.ellipsis),
            onTap: () => openExternal(context, url),
          ),
        for (final l in p.externalStorageLinks)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.cloud_rounded),
            title: Text(l.label ?? l.provider ?? 'Link'),
            subtitle: Text(l.url, maxLines: 1, overflow: TextOverflow.ellipsis),
            onTap: () => openExternal(context, l.url),
          ),
      ],
      SectionHeader('Review comments (${p.unresolvedComments} open)'),
      if (p.reviewComments.isEmpty)
        const SectionCard(child: Text('No comments yet.'))
      else
        for (final c in p.reviewComments)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SectionCard(
              padding: const EdgeInsets.all(12),
              borderColor: c.resolved ? null : AppTheme.warning.withValues(alpha: 0.4),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(
                    child: Text('${c.authorName ?? c.authorType ?? 'Reviewer'} · ${timeAgo(c.createdAt)}',
                        style: Theme.of(context).textTheme.labelSmall),
                  ),
                  if (c.resolved) const StatusChip(label: 'Resolved', color: AppTheme.success),
                ]),
                const SizedBox(height: 4),
                Text(c.text),
              ]),
            ),
          ),
    ]);
  }
}

class _AssignEditorSheet extends ConsumerStatefulWidget {
  const _AssignEditorSheet({required this.post});
  final SocialPost post;

  @override
  ConsumerState<_AssignEditorSheet> createState() => _AssignEditorSheetState();
}

class _AssignEditorSheetState extends ConsumerState<_AssignEditorSheet> {
  String? _assigneeId;
  DateTime? _deadline;
  String _priority = 'medium';
  final _instructions = TextEditingController();

  @override
  void dispose() {
    _instructions.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final users = ref.watch(workspaceUsersProvider);
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Assign an editor', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        users.when(
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => ErrorView(error: e, compact: true, onRetry: () => ref.invalidate(workspaceUsersProvider)),
          data: (list) => DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: _assigneeId,
            decoration: fieldDecoration('Editor *'),
            items: [
              for (final WorkspaceUser u in list)
                DropdownMenuItem(value: u.id, child: Text(u.email == null ? u.name : '${u.name} (${u.email})', overflow: TextOverflow.ellipsis)),
            ],
            onChanged: (v) => setState(() => _assigneeId = v),
          ),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _priority,
          decoration: fieldDecoration('Priority'),
          items: const [
            DropdownMenuItem(value: 'low', child: Text('Low')),
            DropdownMenuItem(value: 'medium', child: Text('Medium')),
            DropdownMenuItem(value: 'high', child: Text('High')),
            DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
          ],
          onChanged: (v) => setState(() => _priority = v ?? 'medium'),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          icon: const Icon(Icons.event_rounded),
          label: Text(_deadline == null ? 'Set deadline' : 'Due ${fmtDate(_deadline)}'),
          onPressed: () async {
            final d = await showDatePicker(
              context: context,
              initialDate: DateTime.now().add(const Duration(days: 2)),
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 365)),
            );
            if (d != null) setState(() => _deadline = d);
          },
        ),
        const SizedBox(height: 12),
        TextField(controller: _instructions, minLines: 2, maxLines: 5, decoration: fieldDecoration('Editing instructions')),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _assigneeId == null
              ? null
              : () => Navigator.pop(context, <String, dynamic>{
                    'assigneeId': _assigneeId,
                    'priority': _priority,
                    'deadline': ?_deadline?.toUtc().toIso8601String(),
                    if (_instructions.text.trim().isNotEmpty) 'editingInstructions': _instructions.text.trim(),
                    'sourceMediaUrls': [...widget.post.rawMediaUrls, ...widget.post.externalStorageLinks.map((l) => l.url)],
                    'projectId': ?widget.post.projectId,
                    'clientId': ?widget.post.clientId,
                  }),
          child: const Text('Create editing task'),
        ),
      ]),
    );
  }
}
